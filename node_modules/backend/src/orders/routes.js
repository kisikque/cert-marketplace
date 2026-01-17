import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../auth/middleware.js";

export const ordersRouter = Router();

// CUSTOMER: создать заявку из корзины
ordersRouter.post("/", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const userId = req.session.user.id;
  const { items, customerComment } = req.body ?? {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items required" });
  }

  // items: [{ serviceId, qty }]
  const serviceIds = items.map((x) => x.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, isActive: true },
    include: { provider: true }
  });

  if (services.length !== serviceIds.length) {
    return res.status(400).json({ error: "some services not found" });
  }

  // правило: один провайдер
  const providerId = services[0].providerId;
  if (!services.every((s) => s.providerId === providerId)) {
    return res.status(400).json({ error: "services must belong to one provider" });
  }

  const byId = new Map(services.map((s) => [s.id, s]));
  const normalizedItems = items.map((x) => ({
    serviceId: x.serviceId,
    qty: Math.max(1, Number(x.qty || 1)),
    priceAtPurchase: byId.get(x.serviceId)?.priceFrom ?? null
  }));

  const order = await prisma.order.create({
    data: {
      customerId: userId,
      providerId,
      status: "NEW",
      customerComment: customerComment || null,
      items: { create: normalizedItems },
      statusHistory: {
        create: {
          changedByUserId: userId,
          fromStatus: null,
          toStatus: "NEW",
          comment: "Создана заявка"
        }
      }
    },
    include: {
      items: { include: { service: true } },
      provider: true
    }
  });

  res.json({ orderId: order.id });
});

// CUSTOMER: список своих заявок
ordersRouter.get("/", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const userId = req.session.user.id;

  const orders = await prisma.order.findMany({
    where: { customerId: userId },
    include: {
      provider: { select: { id: true, orgName: true } },
      items: { include: { service: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      createdAt: o.createdAt,
      providerName: o.provider.orgName,
      items: o.items.map((it) => ({
        serviceTitle: it.service.title,
        qty: it.qty,
        priceAtPurchase: it.priceAtPurchase
      }))
    }))
  });
});

// CUSTOMER: одна заявка (детали)
ordersRouter.get("/:id", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const userId = req.session.user.id;
  const id = req.params.id;

  const order = await prisma.order.findFirst({
    where: { id, customerId: userId },
    include: {
      provider: { select: { id: true, orgName: true, phone: true } },
      items: { include: { service: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!order) return res.status(404).json({ error: "not found" });

  res.json({
    order: {
      id: order.id,
      status: order.status,
      customerComment: order.customerComment,
      providerComment: order.providerComment,
      createdAt: order.createdAt,
      provider: order.provider,
      items: order.items.map((it) => ({
        serviceId: it.serviceId,
        title: it.service.title,
        qty: it.qty,
        priceAtPurchase: it.priceAtPurchase
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
        mimeType: d.mimeType,
        size: d.size,
        createdAt: d.createdAt,
        uploadedByUserId: d.uploadedByUserId
      }))
    }
  });
});
