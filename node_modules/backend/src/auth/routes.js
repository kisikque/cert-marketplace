import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";

export const authRouter = Router();

function sanitizeUser(u) {
  return { id: u.id, email: u.email, role: u.role, displayName: u.displayName };
}

authRouter.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });
  if (String(password).length < 6) return res.status(400).json({ error: "password too short" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "email already used" });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName || null,
      role: "CUSTOMER"
    }
  });

  req.session.user = sanitizeUser(user);
  res.json({ user: sanitizeUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isDeleted) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  req.session.user = sanitizeUser(user);
  res.json({ user: sanitizeUser(user) });
});

authRouter.get("/me", async (req, res) => {
  const u = req.session?.user || null;
  res.json({ user: u });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});
