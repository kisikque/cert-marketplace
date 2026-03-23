import { Router } from "express";
import { prisma } from "../prisma.js";

export const providersRouter = Router();

providersRouter.get("/top/list", async (req, res) => {
  const providers = await prisma.providerProfile.findMany({
    where: { verificationStatus: "APPROVED" },
    include: {
      services: {
        where: { isActive: true },
        orderBy: [{ ratingAvg: "desc" }, { createdAt: "desc" }],
        take: 3
      }
    },
    orderBy: [{ ratingAvg: "desc" }, { ratingCount: "desc" }, { createdAt: "asc" }],
    take: 6
  });

  const sorted = [...providers].sort((a, b) => {
    const aQualified = a.ratingCount >= 1 ? 1 : 0;
    const bQualified = b.ratingCount >= 1 ? 1 : 0;
    if (bQualified !== aQualified) return bQualified - aQualified;
    if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
    if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    return b.services.length - a.services.length;
  });

  res.json({
    providers: sorted.map((provider) => ({
      id: provider.id,
      orgName: provider.orgName,
      logoUrl: provider.logoUrl,
      publicSlug: provider.publicSlug,
      ratingAvg: provider.ratingAvg,
      ratingCount: provider.ratingCount,
      verificationStatus: provider.verificationStatus,
      services: provider.services.map((service) => ({
        id: service.id,
        title: service.title,
        category: service.category,
        certificationKind: service.certificationKind,
        priceFrom: service.priceFrom
      }))
    }))
  });
});

providersRouter.get("/:slug", async (req, res) => {
  const profile = await prisma.providerProfile.findUnique({
    where: { publicSlug: req.params.slug },
    include: {
      serviceReviews: {
        orderBy: { createdAt: "desc" },
        take: 10
      },
      services: {
        where: { isActive: true },
        include: {
          tags: { include: { tag: true } }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!profile || profile.verificationStatus !== "APPROVED") {
    return res.status(404).json({ error: "NOT_FOUND" });
  }

  res.json({
    provider: {
      id: profile.id,
      orgName: profile.orgName,
      description: profile.description,
      website: profile.website,
      phone: profile.phone,
      address: profile.address,
      logoUrl: profile.logoUrl,
      publicSlug: profile.publicSlug,
      verificationStatus: profile.verificationStatus,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      reviews: profile.serviceReviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        text: review.text,
        isAnonymous: review.isAnonymous,
        displayUserId: review.displayUserId,
        customerLabel:
          review.isAnonymous ? "Анонимный покупатель" : review.displayUserId ? `Покупатель #${review.customerId.slice(-6)}` : "Покупатель",
        createdAt: review.createdAt
      })),
      services: profile.services.map((service) => ({
        id: service.id,
        title: service.title,
        description: service.description,
        category: service.category,
        certificationKind: service.certificationKind,
        priceFrom: service.priceFrom,
        etaDaysFrom: service.etaDaysFrom,
        imageUrl: service.imageUrl,
        ratingAvg: service.ratingAvg,
        ratingCount: service.ratingCount,
        tags: service.tags.map((x) => ({ id: x.tag.id, name: x.tag.name, slug: x.tag.slug }))
      }))
    }
  });
});
