import { Router } from "express";
import { prisma } from "../prisma.js";

export const servicesRouter = Router();

// GET /api/services?search=&tag=&provider=
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
      provider: { select: { id: true, orgName: true } },
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
      internalCode: s.internalCode,
      title: s.title,
      description: s.description,
      priceFrom: s.priceFrom,
      etaDaysFrom: s.etaDaysFrom,
      imageUrl: s.imageUrl,
      tags: s.tags.map((x) => ({ id: x.tag.id, name: x.tag.name, slug: x.tag.slug }))
    }))
  });
});

servicesRouter.get("/:id", async (req, res) => {
  const id = req.params.id;
  const s = await prisma.service.findUnique({
    where: { id },
    include: { provider: true, tags: { include: { tag: true } } }
  });
  if (!s || !s.isActive) return res.status(404).json({ error: "not found" });

  res.json({
    service: {
      id: s.id,
      providerId: s.providerId,
      providerName: s.provider.orgName,
      internalCode: s.internalCode,
      title: s.title,
      description: s.description,
      priceFrom: s.priceFrom,
      etaDaysFrom: s.etaDaysFrom,
      imageUrl: s.imageUrl,
      tags: s.tags.map((x) => ({ id: x.tag.id, name: x.tag.name, slug: x.tag.slug }))
    }
  });
});
