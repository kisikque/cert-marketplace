import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { issueCertificatesForOrder, normalizeClientProductPayload, normalizeCustomerProfilePayload } from "../lib/customerData.js";

export const ordersRouter = Router();

async function recalculateRatings(serviceId, providerId) {
  const [serviceAgg, providerAgg] = await Promise.all([
    prisma.serviceReview.aggregate({
      where: { serviceId },
      _avg: { rating: true },
      _count: { rating: true }
    }),
    prisma.serviceReview.aggregate({
      where: { providerId },
      _avg: { rating: true },
      _count: { rating: true }
    })
  ]);

  await Promise.all([
    prisma.service.update({
      where: { id: serviceId },
      data: {
        ratingAvg: serviceAgg._avg.rating ?? 0,
        ratingCount: serviceAgg._count.rating ?? 0
      }
    }),
    prisma.providerProfile.update({
      where: { id: providerId },
      data: {
        ratingAvg: providerAgg._avg.rating ?? 0,
        ratingCount: providerAgg._count.rating ?? 0
      }
    })
  ]);
}

// CUSTOMER: создать заявку из корзины
ordersRouter.post("/", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const userId = req.session.user.id;
  const { items, customerComment, clientProductId } = req.body ?? {};

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "items required" });
  }
  if (!clientProductId) return res.status(400).json({ error: "CLIENT_PRODUCT_REQUIRED" });

  const customerProfile = await getCustomerProfile(userId);
  if (!customerProfile) return res.status(400).json({ error: "NO_CUSTOMER_PROFILE" });

  const clientProduct = await prisma.clientProduct.findFirst({
    where: { id: clientProductId, customerProfileId: customerProfile.id }
  });
  if (!clientProduct) return res.status(400).json({ error: "CLIENT_PRODUCT_NOT_FOUND" });

  const serviceIds = items.map((x) => x.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, isActive: true },
    include: { provider: true }
  });

  if (services.length !== serviceIds.length) {
    return res.status(400).json({ error: "some services not found" });
  }

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
      customerProfileId: customerProfile.id,
      clientProductId: clientProduct.id,
      status: "NEW",
      customerComment: customerComment || null,
      items: { create: normalizedItems },
      statusHistory: {
        create: {
          changedByUserId: userId,
          fromStatus: null,
          toStatus: "NEW",
          comment: `Создана заявка по продукту «${clientProduct.title}»`
        }
      }
    }
  });

  res.json({ orderId: order.id });
});

ordersRouter.get("/", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const userId = req.session.user.id;

  const orders = await prisma.order.findMany({
    where: { customerId: userId },
    include: {
      provider: { select: { id: true, orgName: true } },
      clientProduct: { select: { id: true, title: true, kind: true } },
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
      clientProduct: o.clientProduct,
      providerNeedsAttention: o.providerNeedsAttention,
      items: o.items.map((it) => ({
        serviceTitle: it.service.title,
        qty: it.qty,
        priceAtPurchase: it.priceAtPurchase
      }))
    }))
  });
});

ordersRouter.get("/:id", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const order = await getOrderForCustomer(req.params.id, req.session.user.id);
  if (!order) return res.status(404).json({ error: "not found" });
  res.json({ order: mapOrder(order) });
});

ordersRouter.patch("/:id/profile", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const order = await getOrderForCustomer(req.params.id, req.session.user.id);
  if (!order) return res.status(404).json({ error: "NOT_FOUND" });
  if (!order.customerProfile) return res.status(400).json({ error: "NO_CUSTOMER_PROFILE" });

  try {
    const normalized = normalizeCustomerProfilePayload({ ...order.customerProfile, ...(req.body ?? {}) }, order.customerProfile.accountKind);
    await prisma.customerProfile.update({
      where: { id: order.customerProfile.id },
      data: normalized
    });
    await prisma.order.update({
      where: { id: order.id },
      data: {
        providerNeedsAttention: true,
        lastCustomerDataChangeAt: new Date(),
        lastCustomerDataChangeType: "PROFILE_UPDATED"
      }
    });
    await prisma.orderEventLog.create({
      data: {
        orderId: order.id,
        changedByUserId: req.session.user.id,
        type: "PROFILE_UPDATED",
        message: "Пользователь изменил данные профиля из карточки заявки",
        field: "Профиль",
        oldValue: null,
        newValue: "Данные обновлены"
      }
    });
    const refreshed = await getOrderForCustomer(req.params.id, req.session.user.id);
    res.json({ order: mapOrder(refreshed) });
  } catch (error) {
    res.status(400).json({ error: error.message || "INVALID_PROFILE" });
  }
});

ordersRouter.patch("/:id/product", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const order = await getOrderForCustomer(req.params.id, req.session.user.id);
  if (!order) return res.status(404).json({ error: "NOT_FOUND" });
  if (!order.clientProduct) return res.status(400).json({ error: "NO_PRODUCT" });

  try {
    const normalized = normalizeClientProductPayload({ ...order.clientProduct, ...(req.body ?? {}) });
    await prisma.clientProduct.update({ where: { id: order.clientProduct.id }, data: normalized });
    await prisma.order.update({
      where: { id: order.id },
      data: {
        providerNeedsAttention: true,
        lastCustomerDataChangeAt: new Date(),
        lastCustomerDataChangeType: "PRODUCT_UPDATED"
      }
    });
    await prisma.orderEventLog.create({
      data: {
        orderId: order.id,
        changedByUserId: req.session.user.id,
        type: "PRODUCT_UPDATED",
        message: "Пользователь изменил данные товара/услуги из карточки заявки",
        field: "Продукт",
        oldValue: null,
        newValue: "Данные обновлены"
      }
    });
    const refreshed = await getOrderForCustomer(req.params.id, req.session.user.id);
    res.json({ order: mapOrder(refreshed) });
  } catch (error) {
    res.status(400).json({ error: error.message || "INVALID_PRODUCT" });
  }
});

ordersRouter.post("/:id/items/:itemId/review", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const userId = req.session.user.id;
  const { rating, text, isAnonymous, displayUserId } = req.body ?? {};
  const normalizedRating = Number(rating);
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ error: "RATING_MUST_BE_1_TO_5" });
  }

  const order = await prisma.order.findFirst({
    where: { id, customerId: userId },
    include: {
      provider: { select: { id: true, orgName: true, phone: true } },
      items: { include: { service: true, review: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "desc" } }
    }
  });

  await recalculateRatings(orderItem.serviceId, orderItem.order.providerId);
  res.json({ review });
});

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
        orderItemId: it.id,
        title: it.service.title,
        qty: it.qty,
        priceAtPurchase: it.priceAtPurchase,
        review: it.review
          ? {
              id: it.review.id,
              rating: it.review.rating,
              text: it.review.text,
              isAnonymous: it.review.isAnonymous,
              displayUserId: it.review.displayUserId,
              createdAt: it.review.createdAt,
              updatedAt: it.review.updatedAt
            }
          : null
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

  await recalculateRatings(review.serviceId, review.providerId);
  res.json({ review: updated });
});

ordersRouter.post("/:id/items/:itemId/review", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const userId = req.session.user.id;
  const { rating, text, isAnonymous, displayUserId } = req.body ?? {};
  const normalizedRating = Number(rating);
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ error: "RATING_MUST_BE_1_TO_5" });
  }

  const orderItem = await prisma.orderItem.findFirst({
    where: { id: req.params.itemId, orderId: req.params.id, order: { customerId: userId } },
    include: { order: true, service: true, review: true }
  });
  if (!orderItem) return res.status(404).json({ error: "NOT_FOUND" });
  if (orderItem.review) return res.status(409).json({ error: "REVIEW_ALREADY_EXISTS" });

  const review = await prisma.serviceReview.create({
    data: {
      serviceId: orderItem.serviceId,
      providerId: orderItem.order.providerId,
      customerId: userId,
      orderId: orderItem.orderId,
      orderItemId: orderItem.id,
      rating: normalizedRating,
      text: typeof text === "string" ? text.trim() || null : null,
      isAnonymous: Boolean(isAnonymous ?? true),
      displayUserId: Boolean(displayUserId ?? false)
    }
  });

  await recalculateRatings(orderItem.serviceId, orderItem.order.providerId);
  res.json({ review });
});

ordersRouter.patch("/:id/items/:itemId/review", requireAuth, requireRole(["CUSTOMER"]), async (req, res) => {
  const userId = req.session.user.id;
  const { rating, text, isAnonymous, displayUserId } = req.body ?? {};
  const normalizedRating = Number(rating);
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ error: "RATING_MUST_BE_1_TO_5" });
  }

  const review = await prisma.serviceReview.findFirst({
    where: { orderItemId: req.params.itemId, orderId: req.params.id, customerId: userId }
  });
  if (!review) return res.status(404).json({ error: "NOT_FOUND" });

  const updated = await prisma.serviceReview.update({
    where: { id: review.id },
    data: {
      rating: normalizedRating,
      text: typeof text === "string" ? text.trim() || null : null,
      isAnonymous: Boolean(isAnonymous ?? true),
      displayUserId: Boolean(displayUserId ?? false)
    }
  });

  await recalculateRatings(review.serviceId, review.providerId);
  res.json({ review: updated });
});
