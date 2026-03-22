import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../auth/middleware.js";

export const providerVerificationRouter = Router();

const uploadDir = path.resolve("provider-uploads");
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
  limits: { fileSize: 10 * 1024 * 1024 }
});

async function getProviderProfileByUserId(userId) {
  return prisma.providerProfile.findUnique({ where: { userId } });
}

providerVerificationRouter.get("/me", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const profile = await getProviderProfileByUserId(req.session.user.id);
  if (!profile) return res.status(404).json({ error: "NO_PROVIDER_PROFILE" });

  const documents = await prisma.providerVerificationDocument.findMany({
    where: { providerProfileId: profile.id },
    orderBy: { createdAt: "desc" }
  });

  res.json({
    providerProfile: {
      id: profile.id,
      orgName: profile.orgName,
      inn: profile.inn,
      phone: profile.phone,
      address: profile.address,
      description: profile.description,
      verificationStatus: profile.verificationStatus,
      verificationComment: profile.verificationComment,
      submittedAt: profile.submittedAt,
      verifiedAt: profile.verifiedAt
    },
    documents: documents.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
      documentType: doc.documentType,
      createdAt: doc.createdAt
    }))
  });
});

providerVerificationRouter.post("/", requireAuth, requireRole(["PROVIDER"]), upload.single("file"), async (req, res) => {
  const profile = await getProviderProfileByUserId(req.session.user.id);
  if (!profile) return res.status(404).json({ error: "NO_PROVIDER_PROFILE" });
  if (!req.file) return res.status(400).json({ error: "file required" });

  const document = await prisma.providerVerificationDocument.create({
    data: {
      providerProfileId: profile.id,
      uploadedByUserId: req.session.user.id,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storagePath: req.file.filename,
      documentType: req.body?.documentType ? String(req.body.documentType) : null
    }
  });

  await prisma.providerProfile.update({
    where: { id: profile.id },
    data: {
      verificationStatus: "PENDING",
      verificationComment: null,
      submittedAt: new Date(),
      verifiedAt: null
    }
  });

  res.json({
    document: {
      id: document.id,
      fileName: document.fileName,
      documentType: document.documentType,
      size: document.size,
      createdAt: document.createdAt
    }
  });
});

providerVerificationRouter.delete("/:id", requireAuth, requireRole(["PROVIDER"]), async (req, res) => {
  const profile = await getProviderProfileByUserId(req.session.user.id);
  if (!profile) return res.status(404).json({ error: "NO_PROVIDER_PROFILE" });

  const document = await prisma.providerVerificationDocument.findFirst({
    where: { id: req.params.id, providerProfileId: profile.id }
  });
  if (!document) return res.status(404).json({ error: "NOT_FOUND" });

  const filePath = path.join(uploadDir, document.storagePath);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await prisma.providerVerificationDocument.delete({ where: { id: document.id } });
  res.json({ ok: true });
});

providerVerificationRouter.get("/:id/download", requireAuth, async (req, res) => {
  const document = await prisma.providerVerificationDocument.findUnique({
    where: { id: req.params.id }
  });
  if (!document) return res.status(404).json({ error: "NOT_FOUND" });

  const user = req.session.user;
  const allowed =
    user.role === "ADMIN" ||
    (user.role === "PROVIDER" && user.providerProfileId === document.providerProfileId);

  if (!allowed) return res.status(403).json({ error: "FORBIDDEN" });

  const filePath = path.join(uploadDir, document.storagePath);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "FILE_MISSING" });

  res.setHeader("Content-Type", document.mimeType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(document.fileName)}"`);
  res.sendFile(filePath);
});
