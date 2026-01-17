import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { prisma } from "../prisma.js";
import { requireAuth } from "../auth/middleware.js";

export const documentsRouter = Router();

const uploadDir = path.resolve("uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-() ]+/g, "_");
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    cb(null, `${unique}__${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Проверка, что пользователь имеет доступ к заявке (customer/provider/admin)
async function canAccessOrder(user, orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { provider: true }
  });
  if (!order) return { ok: false, reason: "NOT_FOUND" };

  if (user.role === "ADMIN") return { ok: true, order };
  if (user.role === "CUSTOMER" && order.customerId === user.id) return { ok: true, order };

  if (user.role === "PROVIDER") {
    const pp = await prisma.providerProfile.findUnique({ where: { userId: user.id } });
    if (pp && pp.id === order.providerId) return { ok: true, order };
  }

  return { ok: false, reason: "FORBIDDEN" };
}

// список документов заявки
documentsRouter.get("/orders/:orderId", requireAuth, async (req, res) => {
  const { orderId } = req.params;
  const access = await canAccessOrder(req.session.user, orderId);
  if (!access.ok) return res.status(access.reason === "NOT_FOUND" ? 404 : 403).json({ error: access.reason });

  const docs = await prisma.orderDocument.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" }
  });

  res.json({
    documents: docs.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      mimeType: d.mimeType,
      size: d.size,
      createdAt: d.createdAt,
      uploadedByUserId: d.uploadedByUserId
    }))
  });
});

// загрузка документа к заявке
documentsRouter.post(
  "/orders/:orderId",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    const { orderId } = req.params;
    const access = await canAccessOrder(req.session.user, orderId);
    if (!access.ok) return res.status(access.reason === "NOT_FOUND" ? 404 : 403).json({ error: access.reason });

    if (!req.file) return res.status(400).json({ error: "file required" });

    const doc = await prisma.orderDocument.create({
      data: {
        orderId,
        uploadedByUserId: req.session.user.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storagePath: req.file.filename
      }
    });

    res.json({ documentId: doc.id });
  }
);

// скачать документ
documentsRouter.get("/:docId/download", requireAuth, async (req, res) => {
  const { docId } = req.params;

  const doc = await prisma.orderDocument.findUnique({ where: { id: docId } });
  if (!doc) return res.status(404).json({ error: "NOT_FOUND" });

  const access = await canAccessOrder(req.session.user, doc.orderId);
  if (!access.ok) return res.status(access.reason === "NOT_FOUND" ? 404 : 403).json({ error: access.reason });

  const filePath = path.join(uploadDir, doc.storagePath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "FILE_MISSING" });

  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.fileName)}"`);
  res.sendFile(filePath);
});
