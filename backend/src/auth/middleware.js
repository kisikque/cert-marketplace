import { prisma } from "../prisma.js";

export async function requireAuth(req, res, next) {
  const sessUser = req.session?.user;
  if (!sessUser?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

  const dbUser = await prisma.user.findUnique({ where: { id: sessUser.id } });
  if (!dbUser || dbUser.isDeleted) {
    // сессия протухла (например, после seed)
    req.session.destroy(() => {});
    return res.status(401).json({ error: "SESSION_EXPIRED" });
  }

  // можно обновить displayName/role в сессии на актуальные
  req.session.user = { id: dbUser.id, email: dbUser.email, role: dbUser.role, displayName: dbUser.displayName };
  next();
}

export function requireRole(roles) {
  return (req, res, next) => {
    const user = req.session?.user;
    if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });
    if (!roles.includes(user.role)) return res.status(403).json({ error: "FORBIDDEN" });
    next();
  };
}

