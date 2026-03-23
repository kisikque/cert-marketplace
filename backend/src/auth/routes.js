import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma.js";
import { normalizeCustomerProfilePayload } from "../lib/customerData.js";

export const authRouter = Router();

async function buildSessionUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      providerProfile: {
        select: {
          id: true,
          orgName: true,
          verificationStatus: true,
          verificationComment: true
        }
      },
      customerProfile: {
        select: {
          id: true,
          accountKind: true,
          companyName: true,
          fullName: true,
          contactName: true
        }
      }
    }
  });

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    providerProfileId: user.providerProfile?.id ?? null,
    providerOrgName: user.providerProfile?.orgName ?? null,
    providerVerificationStatus: user.providerProfile?.verificationStatus ?? null,
    providerVerificationComment: user.providerProfile?.verificationComment ?? null,
    customerProfileId: user.customerProfile?.id ?? null,
    customerAccountKind: user.customerProfile?.accountKind ?? null,
    customerProfileName:
      user.customerProfile?.companyName || user.customerProfile?.fullName || user.customerProfile?.contactName || null
  };
}

function slugifyOrgName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniquePublicSlug(orgName) {
  const base = slugifyOrgName(orgName) || "provider";
  let candidate = base;
  let index = 1;

  while (true) {
    const existing = await prisma.providerProfile.findUnique({
      where: { publicSlug: candidate },
      select: { id: true }
    });
    if (!existing) return candidate;
    candidate = `${base}-${index++}`;
  }
}

authRouter.post("/register", async (req, res) => {
  const {
    email,
    password,
    displayName,
    accountType = "CUSTOMER",
    orgName,
    inn,
    phone,
    address,
    description,
    customerAccountKind = "INDIVIDUAL",
    customerProfile
  } = req.body ?? {};

  if (!email || !password) return res.status(400).json({ error: "email/password required" });
  if (String(password).length < 6) return res.status(400).json({ error: "password too short" });
  if (!["CUSTOMER", "PROVIDER"].includes(accountType)) {
    return res.status(400).json({ error: "invalid accountType" });
  }

  if (accountType === "PROVIDER") {
    if (!displayName || !orgName || !inn) {
      return res.status(400).json({ error: "provider fields required" });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "email already used" });

  let normalizedCustomerProfile = null;
  if (accountType === "CUSTOMER") {
    try {
      normalizedCustomerProfile = normalizeCustomerProfilePayload(customerProfile ?? {}, customerAccountKind);
      if (
        normalizedCustomerProfile.accountKind === "BUSINESS" &&
        !normalizedCustomerProfile.companyName
      ) {
        return res.status(400).json({ error: "COMPANY_NAME_REQUIRED" });
      }
      if (
        normalizedCustomerProfile.accountKind === "INDIVIDUAL" &&
        !normalizedCustomerProfile.fullName
      ) {
        return res.status(400).json({ error: "FULL_NAME_REQUIRED" });
      }
    } catch (error) {
      return res.status(400).json({ error: error.message || "INVALID_CUSTOMER_PROFILE" });
    }
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: displayName || null,
      role: accountType,
      ...(accountType === "PROVIDER"
        ? {
            providerProfile: {
              create: {
                orgName,
                inn,
                phone,
                address,
                description: description || null,
                publicSlug: await uniquePublicSlug(orgName),
                verificationStatus: "PENDING"
              }
            }
          }
        : {
            customerProfile: {
              create: normalizedCustomerProfile
            }
          })
    }
  });

  const sessionUser = await buildSessionUser(user.id);
  req.session.user = sessionUser;
  res.json({ user: sessionUser });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isDeleted) return res.status(401).json({ error: "invalid credentials" });

  const ok = await bcrypt.compare(String(password), user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  const sessionUser = await buildSessionUser(user.id);
  req.session.user = sessionUser;
  res.json({ user: sessionUser });
});

authRouter.get("/me", async (req, res) => {
  const sessUser = req.session?.user || null;
  if (!sessUser?.id) return res.json({ user: null });

  const fresh = await buildSessionUser(sessUser.id);
  req.session.user = fresh;
  res.json({ user: fresh });
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("sid");
    res.json({ ok: true });
  });
});
