import { Router } from "express";
import { prisma } from "../prisma.js";

export const servicesRouter = Router();

servicesRouter.get("/", async (req, res) => {
  const search = (req.query.search || "").toString().trim();
  const tag = (req.query.tag || "").toString().trim();
  const providerId = (req.query.provider || "").toString().trim();

  const where = {
    isActive: true,
    ...(providerId ? { providerId } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
            { internalCode: { contains: search, mode: "insensitive" } }
          ]
        }
      : {})
  };

  const services = await prisma.service.findMany({
    where,
    include: {
      provider: {
        select: {
          id: true,
          orgName: true,
          publicSlug: true,
          logoUrl: true,
          verificationStatus: true,
          ratingAvg: true,
          ratingCount: true
        }
      },
      tags: { include: { tag: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const filtered = tag
    ? services.filter((s) => s.tags.some((t) => t.tag.slug === tag || t.tag.name === tag))
    : services;

  res.json({
    services: filtered.map((s) => ({
      id: s.id,
      providerId: s.providerId,
      providerName: s.provider.orgName,
      providerSlug: s.provider.publicSlug,
      providerLogoUrl: s.provider.logoUrl,
      providerVerificationStatus: s.provider.verificationStatus,
      internalCode: s.internalCode,
      title: s.title,
      description: s.description,
      priceFrom: s.priceFrom,
      etaDaysFrom: s.etaDaysFrom,
      imageUrl: s.imageUrl,
      ratingAvg: s.ratingAvg,
      ratingCount: s.ratingCount,
      trustSignal: s.provider.verificationStatus === "APPROVED" ? "VERIFIED_PROVIDER" : null,
      tags: s.tags.map((x) => ({ id: x.tag.id, name: x.tag.name, slug: x.tag.slug }))
    }))
  });
});

servicesRouter.get("/:id", async (req, res) => {
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: {
      provider: {
        select: {
          id: true,
          orgName: true,
          publicSlug: true,
          logoUrl: true,
          verificationStatus: true,
          ratingAvg: true,
          ratingCount: true
        }
      },
      tags: { include: { tag: true } }
    }
  });
  if (!service || !service.isActive) return res.status(404).json({ error: "not found" });

  res.json({
    service: {
      id: service.id,
      providerId: service.providerId,
      providerName: service.provider.orgName,
      providerSlug: service.provider.publicSlug,
      providerLogoUrl: service.provider.logoUrl,
      providerVerificationStatus: service.provider.verificationStatus,
      internalCode: service.internalCode,
      title: service.title,
      description: service.description,
      priceFrom: service.priceFrom,
      etaDaysFrom: service.etaDaysFrom,
      imageUrl: service.imageUrl,
      ratingAvg: service.ratingAvg,
      ratingCount: service.ratingCount,
      trustSignal: service.provider.verificationStatus === "APPROVED" ? "VERIFIED_PROVIDER" : null,
      tags: service.tags.map((x) => ({ id: x.tag.id, name: x.tag.name, slug: x.tag.slug }))
    }
  });
});
