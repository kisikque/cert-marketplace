import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../auth/middleware.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["ADMIN"]));

adminRouter.get("/users", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [{ email: { contains: q } }, { displayName: { contains: q } }]
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      displayName: true,
      isDeleted: true,
      createdAt: true
    }
  });

  res.json({ users });
});

adminRouter.patch("/users/:id", async (req, res) => {
  const id = req.params.id;
  const { role, displayName } = req.body ?? {};

  const data = {
    ...(role ? { role } : {}),
    ...(displayName !== undefined ? { displayName: displayName || null } : {})
  };

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, displayName: true, isDeleted: true }
  });

  res.json({ user });
});

adminRouter.post("/users/:id/delete", async (req, res) => {
  const id = req.params.id;
  await prisma.user.update({ where: { id }, data: { isDeleted: true } });
  res.json({ ok: true });
});

adminRouter.get("/orders", async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;

  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, email: true, displayName: true } },
      provider: { select: { id: true, orgName: true } },
      items: { include: { service: true } }
    }
  });

  res.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      createdAt: o.createdAt,
      customerEmail: o.customer.email,
      customerName: o.customer.displayName,
      providerName: o.provider.orgName,
      itemsCount: o.items.reduce((sum, it) => sum + it.qty, 0),
      items: o.items.map((it) => `${it.service.title} x${it.qty}`).join("; ")
    }))
  });
});

adminRouter.get("/provider-verifications", async (req, res) => {
  const status = String(req.query.status || "").trim();

  const providerProfiles = await prisma.providerProfile.findMany({
    where: status ? { verificationStatus: status } : undefined,
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      verificationDocuments: { orderBy: { createdAt: "desc" } }
    },
    orderBy: [{ verificationStatus: "asc" }, { submittedAt: "desc" }, { createdAt: "desc" }]
  });

  res.json({
    providers: providerProfiles.map((profile) => ({
      id: profile.id,
      orgName: profile.orgName,
      inn: profile.inn,
      phone: profile.phone,
      address: profile.address,
      description: profile.description,
      verificationStatus: profile.verificationStatus,
      verificationComment: profile.verificationComment,
      submittedAt: profile.submittedAt,
      verifiedAt: profile.verifiedAt,
      createdAt: profile.createdAt,
      publicSlug: profile.publicSlug,
      user: profile.user,
      documents: profile.verificationDocuments.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        size: doc.size,
        documentType: doc.documentType,
        createdAt: doc.createdAt
      }))
    }))
  });
});

adminRouter.get("/provider-verifications/:providerId", async (req, res) => {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: req.params.providerId },
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      verificationDocuments: { orderBy: { createdAt: "desc" } }
    }
  });
  if (!profile) return res.status(404).json({ error: "NOT_FOUND" });

  res.json({
    provider: {
      id: profile.id,
      orgName: profile.orgName,
      inn: profile.inn,
      phone: profile.phone,
      address: profile.address,
      description: profile.description,
      verificationStatus: profile.verificationStatus,
      verificationComment: profile.verificationComment,
      submittedAt: profile.submittedAt,
      verifiedAt: profile.verifiedAt,
      user: profile.user,
      documents: profile.verificationDocuments.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        size: doc.size,
        documentType: doc.documentType,
        createdAt: doc.createdAt
      }))
    }
  });
});

async function updateVerificationStatus(providerId, verificationStatus, verificationComment) {
  return prisma.providerProfile.update({
    where: { id: providerId },
    data: {
      verificationStatus,
      verificationComment: verificationComment || null,
      verifiedAt: verificationStatus === "APPROVED" ? new Date() : null,
      submittedAt: verificationStatus === "PENDING" ? new Date() : undefined
    }
  });
}

adminRouter.post("/provider-verifications/:providerId/approve", async (req, res) => {
  const profile = await prisma.providerProfile.findUnique({ where: { id: req.params.providerId } });
  if (!profile) return res.status(404).json({ error: "NOT_FOUND" });

  await updateVerificationStatus(req.params.providerId, "APPROVED", req.body?.comment);
  res.json({ ok: true });
});

adminRouter.post("/provider-verifications/:providerId/reject", async (req, res) => {
  const profile = await prisma.providerProfile.findUnique({ where: { id: req.params.providerId } });
  if (!profile) return res.status(404).json({ error: "NOT_FOUND" });

  await updateVerificationStatus(req.params.providerId, "REJECTED", req.body?.comment);
  res.json({ ok: true });
});

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[,"]|\n/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}
function toCSV(rows, headers) {
  const head = headers.join(",");
  const lines = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","));
  return [head, ...lines].join("\n");
}

adminRouter.get("/export/users.csv", async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, role: true, displayName: true, isDeleted: true, createdAt: true }
  });

  const rows = users.map((u) => ({
    id: u.id,
    email: u.email,
    role: u.role,
    displayName: u.displayName ?? "",
    isDeleted: u.isDeleted,
    createdAt: u.createdAt.toISOString()
  }));

  const headers = ["id", "email", "role", "displayName", "isDeleted", "createdAt"];
  const csv = toCSV(rows, headers);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=users.csv");
  res.send("\uFEFF" + csv);
});

adminRouter.get("/export/orders.csv", async (req, res) => {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { email: true, displayName: true } },
      provider: { select: { orgName: true } },
      items: { include: { service: true } }
    }
  });

  const rows = orders.map((o) => ({
    id: o.id,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    customerEmail: o.customer.email,
    customerName: o.customer.displayName ?? "",
    providerName: o.provider.orgName,
    items: o.items.map((it) => `${it.service.title} x${it.qty}`).join("; ")
  }));

  const headers = ["id", "status", "createdAt", "customerEmail", "customerName", "providerName", "items"];
  const csv = toCSV(rows, headers);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=orders.csv");
  res.send("\uFEFF" + csv);
});
