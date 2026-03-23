import fs from "fs";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../auth/middleware.js";

export const providerRouter = Router();

const logoUploadDir = path.resolve("provider-logos");
const serviceImageUploadDir = path.resolve("service-images");
if (!fs.existsSync(logoUploadDir)) fs.mkdirSync(logoUploadDir, { recursive: true });
if (!fs.existsSync(serviceImageUploadDir)) fs.mkdirSync(serviceImageUploadDir, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logoUploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    cb(null, `${unique}__${safe}`);
  }
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("INVALID_LOGO_FILE_TYPE"));
  }
});

const serviceImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, serviceImageUploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    cb(null, `${unique}__${safe}`);
  }
});

const serviceImageUpload = multer({
  storage: serviceImageStorage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["image/png", "image/jpeg", "image/webp"].includes(file.mimetype)) cb(null, true);
    else cb(new Error("INVALID_SERVICE_IMAGE_FILE_TYPE"));
  }
});

function canPublishServices(providerProfile) {
  return providerProfile.verificationStatus === "APPROVED";
}

function normalizeOptionalString(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized : null;
}

function normalizeWebsite(value) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `https://${normalized}`;
}

function normalizeCategory(category) {
  return ["CERTIFICATION", "SUPPORT", "CONSULTING"].includes(category) ? category : null;
}

function normalizeCertificationKind(category, certificationKind) {
  if (category !== "CERTIFICATION") return null;
  return ["MANDATORY", "VOLUNTARY"].includes(certificationKind) ? certificationKind : null;
}

async function getProviderProfile(userId) {
  return prisma.providerProfile.findUnique({ where: { userId } });
}

async function removeLogoIfPresent(logoUrl) {
  if (!logoUrl) return;
  const fileName = logoUrl.split("/").pop();
  if (!fileName) return;
  const filePath = path.join(logoUploadDir, fileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

async function removeServiceImageIfPresent(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("/service-images/")) return;
  const fileName = imageUrl.split("/").pop();
  if (!fileName) return;
  const filePath = path.join(serviceImageUploadDir, fileName);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

providerRouter.get("/profile", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const profile = await getProviderProfile(req.session.user.id);
  if (!profile) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  res.json({ profile });
});

providerRouter.patch("/profile", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const profile = await getProviderProfile(req.session.user.id);
  if (!profile) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  const patch = req.body ?? {};
  const data = {
    ...(patch.orgName != null ? { orgName: String(patch.orgName).trim() } : {}),
    ...(patch.description !== undefined ? { description: normalizeOptionalString(patch.description) } : {}),
    ...(patch.website !== undefined ? { website: normalizeWebsite(patch.website) } : {}),
    ...(patch.phone !== undefined ? { phone: normalizeOptionalString(patch.phone) } : {}),
    ...(patch.address !== undefined ? { address: normalizeOptionalString(patch.address) } : {}),
    ...(patch.inn !== undefined ? { inn: normalizeOptionalString(patch.inn) } : {})
  };

  const updated = await prisma.providerProfile.update({
    where: { id: profile.id },
    data
  });

  res.json({ profile: updated });
});

providerRouter.post(
  "/profile/logo",
  requireAuth,
  requireRole(["PROVIDER"]),
  logoUpload.single("file"),
  async (req, res) => {
    const profile = await getProviderProfile(req.session.user.id);
    if (!profile) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });
    if (!req.file) return res.status(400).json({ error: "file required" });

    await removeLogoIfPresent(profile.logoUrl);
    const logoUrl = `/provider-logos/${req.file.filename}`;
    const updated = await prisma.providerProfile.update({
      where: { id: profile.id },
      data: { logoUrl }
    });

    res.json({ profile: updated });
  }
);

providerRouter.delete("/profile/logo", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const profile = await getProviderProfile(req.session.user.id);
  if (!profile) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  await removeLogoIfPresent(profile.logoUrl);
  const updated = await prisma.providerProfile.update({
    where: { id: profile.id },
    data: { logoUrl: null }
  });

  res.json({ profile: updated });
});

providerRouter.get("/orders", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const pp = await getProviderProfile(req.session.user.id);
  if (!pp) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  const orders = await prisma.order.findMany({
    where: { providerId: pp.id },
    include: {
      customer: { select: { id: true, email: true, displayName: true } },
      items: { include: { service: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      createdAt: o.createdAt,
      customer: o.customer,
      items: o.items.map((it) => ({
        serviceTitle: it.service.title,
        qty: it.qty
      }))
    }))
  });
});

providerRouter.get("/orders/:id", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const pp = await getProviderProfile(req.session.user.id);
  if (!pp) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, providerId: pp.id },
    include: {
      customer: { select: { id: true, email: true, displayName: true } },
      items: { include: { service: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!order) return res.status(404).json({ error: "NOT_FOUND" });

  res.json({
    order: {
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      customer: order.customer,
      items: order.items.map((it) => ({
        serviceId: it.serviceId,
        title: it.service.title,
        qty: it.qty
      })),
      statusHistory: order.statusHistory.map((h) => ({
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        comment: h.comment,
        createdAt: h.createdAt
      })),
      documents: order.documents.map((d) => ({
        id: d.id,
        fileName: d.fileName,
        size: d.size,
        mimeType: d.mimeType,
        createdAt: d.createdAt,
        uploadedByUserId: d.uploadedByUserId
      }))
    }
  });
});

providerRouter.post("/orders/:id/status", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const { toStatus, comment } = req.body ?? {};
  if (!toStatus) return res.status(400).json({ error: "toStatus required" });

  const pp = await getProviderProfile(req.session.user.id);
  if (!pp) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  const order = await prisma.order.findFirst({
    where: { id: req.params.id, providerId: pp.id }
  });
  if (!order) return res.status(404).json({ error: "NOT_FOUND" });

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: {
      status: toStatus,
      statusHistory: {
        create: {
          changedByUserId: req.session.user.id,
          fromStatus: order.status,
          toStatus,
          comment: comment || null
        }
      }
    }
  });

  res.json({ ok: true, status: updated.status });
});

providerRouter.get("/services", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const pp = await getProviderProfile(req.session.user.id);
  if (!pp) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  const services = await prisma.service.findMany({
    where: { providerId: pp.id },
    include: {
      tags: {
        include: {
          tag: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ services });
});

providerRouter.post("/services", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const pp = await getProviderProfile(req.session.user.id);
  if (!pp) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  const { internalCode, title, description, category, certificationKind, priceFrom, etaDaysFrom, imageUrl, isActive } = req.body ?? {};
  if (!internalCode || !title || !description) {
    return res.status(400).json({ error: "internalCode/title/description required" });
  }
  const normalizedCategory = normalizeCategory(category);
  if (!normalizedCategory) return res.status(400).json({ error: "VALID_CATEGORY_REQUIRED" });

  try {
    const service = await prisma.service.create({
      data: {
        providerId: pp.id,
        internalCode,
        title,
        description,
        category: normalizedCategory,
        certificationKind: normalizeCertificationKind(normalizedCategory, certificationKind),
        priceFrom: priceFrom == null ? null : Number(priceFrom),
        etaDaysFrom: etaDaysFrom == null ? null : Number(etaDaysFrom),
        imageUrl: imageUrl || null,
        isActive: isActive == null ? canPublishServices(pp) : canPublishServices(pp) && Boolean(isActive)
      }
    });
    res.json({ service });
  } catch {
    return res.status(409).json({ error: "SERVICE_CODE_ALREADY_EXISTS" });
  }
});

providerRouter.post(
  "/services/upload-image",
  requireAuth,
  requireRole(["PROVIDER"]),
  serviceImageUpload.single("file"),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "file required" });
    res.json({ imageUrl: `/service-images/${req.file.filename}` });
  }
);

providerRouter.patch("/services/:id", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const pp = await getProviderProfile(req.session.user.id);
  if (!pp) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  const existing = await prisma.service.findFirst({ where: { id: req.params.id, providerId: pp.id } });
  if (!existing) return res.status(404).json({ error: "NOT_FOUND" });

  const patch = req.body ?? {};
  if (patch.isActive === true && !canPublishServices(pp)) {
    return res.status(403).json({ error: "PROVIDER_NOT_VERIFIED" });
  }
  const normalizedCategory = patch.category !== undefined ? normalizeCategory(patch.category) : undefined;
  if (patch.category !== undefined && !normalizedCategory) {
    return res.status(400).json({ error: "VALID_CATEGORY_REQUIRED" });
  }
  const nextCategory = normalizedCategory ?? existing.category;

  const data = {
    ...(patch.internalCode != null ? { internalCode: patch.internalCode } : {}),
    ...(patch.title != null ? { title: patch.title } : {}),
    ...(patch.description != null ? { description: patch.description } : {}),
    ...(normalizedCategory !== undefined ? { category: normalizedCategory } : {}),
    ...(patch.category !== undefined || patch.certificationKind !== undefined
      ? { certificationKind: normalizeCertificationKind(nextCategory, patch.certificationKind) }
      : {}),
    ...(patch.priceFrom !== undefined ? { priceFrom: patch.priceFrom === null ? null : Number(patch.priceFrom) } : {}),
    ...(patch.etaDaysFrom !== undefined ? { etaDaysFrom: patch.etaDaysFrom === null ? null : Number(patch.etaDaysFrom) } : {}),
    ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl ? String(patch.imageUrl) : null } : {}),
    ...(patch.isActive !== undefined ? { isActive: Boolean(patch.isActive) } : {})
  };

  try {
    if (patch.imageUrl !== undefined && patch.imageUrl !== existing.imageUrl) {
      await removeServiceImageIfPresent(existing.imageUrl);
    }
    const service = await prisma.service.update({ where: { id: req.params.id }, data });
    res.json({ service });
  } catch {
    return res.status(409).json({ error: "SERVICE_CODE_ALREADY_EXISTS" });
  }
});

providerRouter.delete("/services/:id", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const pp = await getProviderProfile(req.session.user.id);
  if (!pp) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  const existing = await prisma.service.findFirst({ where: { id: req.params.id, providerId: pp.id } });
  if (!existing) return res.status(404).json({ error: "NOT_FOUND" });

  await removeServiceImageIfPresent(existing.imageUrl);
  await prisma.service.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ ok: true });
});

providerRouter.get("/tags", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  res.json({ tags });
});

providerRouter.post("/tags", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const { name, slug } = req.body ?? {};
  if (!name || !slug) return res.status(400).json({ error: "name/slug required" });

  try {
    const tag = await prisma.tag.create({ data: { name, slug } });
    res.json({ tag });
  } catch {
    res.status(409).json({ error: "TAG_EXISTS" });
  }
});

providerRouter.put("/services/:id/tags", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const pp = await getProviderProfile(req.session.user.id);
  if (!pp) return res.status(403).json({ error: "NO_PROVIDER_PROFILE" });

  const { tagIds } = req.body ?? {};
  if (!Array.isArray(tagIds)) return res.status(400).json({ error: "tagIds required" });

  const service = await prisma.service.findFirst({ where: { id: req.params.id, providerId: pp.id } });
  if (!service) return res.status(404).json({ error: "NOT_FOUND" });

  await prisma.serviceTag.deleteMany({ where: { serviceId: req.params.id } });
  if (tagIds.length > 0) {
    await prisma.serviceTag.createMany({
      data: tagIds.map((tagId) => ({ serviceId: req.params.id, tagId }))
    });
  }

  res.json({ ok: true });
});
