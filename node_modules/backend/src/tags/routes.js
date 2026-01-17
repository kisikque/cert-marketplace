import { Router } from "express";
import { prisma } from "../prisma.js";

export const tagsRouter = Router();

tagsRouter.get("/", async (req, res) => {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  res.json({ tags });
});
