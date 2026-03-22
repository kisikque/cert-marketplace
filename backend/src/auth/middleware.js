import { prisma } from "../prisma.js";

async function buildSessionUser(id) {
  const dbUser = await prisma.user.findUnique({
    where: { id },
    include: {
      providerProfile: {
        select: {
          id: true,
          orgName: true,
          verificationStatus: true,
          verificationComment: true
        }
      }
    }
  });

  if (!dbUser || dbUser.isDeleted) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    displayName: dbUser.displayName,
    providerProfileId: dbUser.providerProfile?.id ?? null,
    providerOrgName: dbUser.providerProfile?.orgName ?? null,
    providerVerificationStatus: dbUser.providerProfile?.verificationStatus ?? null,
    providerVerificationComment: dbUser.providerProfile?.verificationComment ?? null
  };
}

export async function requireAuth(req, res, next) {
  const sessUser = req.session?.user;
  if (!sessUser?.id) return res.status(401).json({ error: "UNAUTHORIZED" });

  const freshUser = await buildSessionUser(sessUser.id);
  if (!freshUser) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "SESSION_EXPIRED" });
  }

  req.session.user = freshUser;
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
