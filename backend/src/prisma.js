import path from "path";

function buildDefaultSqliteUrl() {
  const absolutePath = path.resolve(process.cwd(), "prisma/dev.db").replace(/\\/g, "/");
  const normalizedPath = /^[A-Za-z]:\//.test(absolutePath) ? `/${absolutePath}` : absolutePath;
  return `file:${normalizedPath}`;
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = buildDefaultSqliteUrl();
}

const { PrismaClient } = await import("@prisma/client");

export const prisma = new PrismaClient();
