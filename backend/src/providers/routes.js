import { Router } from "express";
import { prisma } from "../prisma.js";

export const providersRouter = Router();

providersRouter.get("/:slug", async (req, res) => {
  const profile = await prisma.providerProfile.findUnique({
    where: { publicSlug: req.params.slug },
    include: {
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
      services: profile.services.map((service) => ({
        id: service.id,
        title: service.title,
        description: service.description,
        priceFrom: service.priceFrom,
        etaDaysFrom: service.etaDaysFrom,
        imageUrl: service.imageUrl,
        tags: service.tags.map((x) => ({ id: x.tag.id, name: x.tag.name, slug: x.tag.slug }))
      }))
    }
  });
});
