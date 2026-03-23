import fs from "fs";
import path from "path";

function toPrismaSqliteUrl(filePath) {
  const absolutePath = path.resolve(filePath).replace(/\\/g, "/");
  const normalizedPath = /^[A-Za-z]:\//.test(absolutePath) ? `/${absolutePath}` : absolutePath;
  return `file:${normalizedPath}`;
}

function normalizeDatabaseUrl(value) {
  if (!value || !value.startsWith("file:")) return value;
  const target = value.slice(5);
  if (!target || target.startsWith("/") || /^[A-Za-z]:\//.test(target)) {
    return value;
  }
  return toPrismaSqliteUrl(target);
}

function loadDotEnvFile() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile();

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = normalizeDatabaseUrl(process.env.DATABASE_URL);
} else {
  process.env.DATABASE_URL = toPrismaSqliteUrl("prisma/dev.db");
}

const { PrismaClient } = await import("@prisma/client");

export const prisma = new PrismaClient();
