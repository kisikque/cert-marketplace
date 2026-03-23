import fs from "fs";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../auth/middleware.js";
import {
  buildCustomerProfileResponse,
  diffChangedFields,
  getCustomerProfileByUserId,
  markLinkedOrdersForAttention,
  normalizeClientProductPayload,
  normalizeCustomerProfilePayload
} from "../lib/customerData.js";

export const customerRouter = Router();

const productUploadDir = path.resolve("product-documents");
if (!fs.existsSync(productUploadDir)) fs.mkdirSync(productUploadDir, { recursive: true });

const productStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, productUploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    cb(null, `${unique}__${safe}`);
  }
});

const productUpload = multer({
  storage: productStorage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function requireCustomerProfile(userId) {
  const profile = await getCustomerProfileByUserId(userId);
  return profile;
}

customerRouter.get("/profile", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const profile = await buildCustomerProfileResponse(req.session.user.id);
  if (!profile) return res.status(404).json({ error: "NO_CUSTOMER_PROFILE" });
  res.json({ profile });
});

customerRouter.patch("/profile", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const profile = await requireCustomerProfile(req.session.user.id);
  if (!profile) return res.status(404).json({ error: "NO_CUSTOMER_PROFILE" });

  try {
    const normalized = normalizeCustomerProfilePayload(req.body ?? {}, profile.accountKind);
    const updated = await prisma.customerProfile.update({
      where: { id: profile.id },
      data: normalized
    });

    const changes = diffChangedFields(profile, updated, {
      fullName: "ФИО",
      companyName: "Компания",
      contactName: "Контактное лицо",
      phone: "Телефон",
      address: "Адрес",
      inn: "ИНН",
      kpp: "КПП",
      ogrn: "ОГРН / ОГРНИП",
      position: "Должность"
    });

    if (changes.length) {
      await markLinkedOrdersForAttention({
        customerProfileId: profile.id,
        changedByUserId: req.session.user.id,
        type: "PROFILE_UPDATED",
        message: "Пользователь изменил данные своего профиля",
        changes
      });
    }

    res.json({ profile: await buildCustomerProfileResponse(req.session.user.id) });
  } catch (error) {
    res.status(400).json({ error: error.message || "INVALID_PROFILE" });
  }
});

customerRouter.post("/products", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const profile = await requireCustomerProfile(req.session.user.id);
  if (!profile) return res.status(404).json({ error: "NO_CUSTOMER_PROFILE" });

  try {
    const data = normalizeClientProductPayload(req.body ?? {});
    const product = await prisma.clientProduct.create({
      data: {
        customerProfileId: profile.id,
        ...data
      }
    });
    res.json({ product });
  } catch (error) {
    res.status(400).json({ error: error.message || "INVALID_PRODUCT" });
  }
});

customerRouter.patch("/products/:id", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const profile = await requireCustomerProfile(req.session.user.id);
  if (!profile) return res.status(404).json({ error: "NO_CUSTOMER_PROFILE" });

  const existing = await prisma.clientProduct.findFirst({
    where: { id: req.params.id, customerProfileId: profile.id },
    include: { documents: true }
  });
  if (!existing) return res.status(404).json({ error: "PRODUCT_NOT_FOUND" });

  try {
    const data = normalizeClientProductPayload({ ...existing, ...(req.body ?? {}) });
    const updated = await prisma.clientProduct.update({
      where: { id: existing.id },
      data
    });

    const changes = diffChangedFields(existing, updated, {
      kind: "Тип продукта",
      title: "Название",
      description: "Описание",
      specs: "Спецификации",
      categoryLabel: "Категория"
    });

    if (changes.length) {
      await markLinkedOrdersForAttention({
        clientProductId: existing.id,
        changedByUserId: req.session.user.id,
        type: "PRODUCT_UPDATED",
        message: "Пользователь изменил данные товара/услуги",
        changes
      });
    }

    res.json({ product: updated });
  } catch (error) {
    res.status(400).json({ error: error.message || "INVALID_PRODUCT" });
  }
});

customerRouter.post(
  "/products/:id/documents",
  requireAuth,
  requireRole(["CUSTOMER"]),
  productUpload.single("file"),
  async (req, res) => {
    const profile = await requireCustomerProfile(req.session.user.id);
    if (!profile) return res.status(404).json({ error: "NO_CUSTOMER_PROFILE" });
    if (!req.file) return res.status(400).json({ error: "file required" });

    const product = await prisma.clientProduct.findFirst({
      where: { id: req.params.id, customerProfileId: profile.id }
    });
    if (!product) return res.status(404).json({ error: "PRODUCT_NOT_FOUND" });

    const doc = await prisma.clientProductDocument.create({
      data: {
        clientProductId: product.id,
        uploadedByUserId: req.session.user.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath: req.file.filename
      }
    });

    await markLinkedOrdersForAttention({
      clientProductId: product.id,
      changedByUserId: req.session.user.id,
      type: "PRODUCT_DOCUMENT_UPLOADED",
      message: "Пользователь добавил документ товара/услуги",
      changes: [{ field: "Документы Товара/Услуги", oldValue: "", newValue: req.file.originalname }]
    });

    res.json({ document: doc });
  }
);

customerRouter.get("/products/:id/documents/:docId/download", requireAuth, requireRole(["CUSTOMER", "PROVIDER", "ADMIN"]), async (req, res) => {
  const doc = await prisma.clientProductDocument.findUnique({
    where: { id: req.params.docId },
    include: { clientProduct: { include: { orders: true, customerProfile: true } } }
  });
  if (!doc || doc.clientProductId !== req.params.id) return res.status(404).json({ error: "NOT_FOUND" });

  const user = req.session.user;
  let allowed = user.role === "ADMIN";
  if (user.role === "CUSTOMER") {
    allowed = doc.clientProduct.customerProfile.userId === user.id;
  }
  if (user.role === "PROVIDER") {
    const pp = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
    allowed = doc.clientProduct.orders.some((order) => order.providerId === pp?.id);
  }
  if (!allowed) return res.status(403).json({ error: "FORBIDDEN" });

  const filePath = path.join(productUploadDir, doc.storagePath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "FILE_MISSING" });
  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
  res.sendFile(filePath);
});
