import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../auth/middleware.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["ADMIN"]));

// USERS: list
adminRouter.get("/users", async (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q } },
            { displayName: { contains: q } }
          ]
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

// USERS: update (роль/имя) — минимум
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

// USERS: soft-delete
adminRouter.post("/users/:id/delete", async (req, res) => {
  const id = req.params.id;
  await prisma.user.update({ where: { id }, data: { isDeleted: true } });
  res.json({ ok: true });
});

// ORDERS: list (+ фильтры)
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

// CSV helpers
function csvEscape(v) {
  const s = String(v ?? "");
  if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}
function toCSV(rows, headers) {
  const head = headers.join(",");
  const lines = rows.map((r) => headers.map((h) => csvEscape(r[h])).join(","));
  return [head, ...lines].join("\n");
}

// EXPORT: users.csv
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
  res.send("\uFEFF" + csv); // BOM чтобы Excel нормально открыл UTF-8
});

// EXPORT: orders.csv
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
