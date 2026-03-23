import { prisma } from "../prisma.js";

export function normalizeOptionalString(value) {
  const normalized = String(value || "").trim();
  return normalized ? normalized : null;
}

export function digitsOnly(value) {
  return String(value || "").replace(/\D+/g, "");
}

function validateDigitsField(label, value, allowedLengths) {
  if (value == null || value === "") return null;
  const digits = digitsOnly(value);
  if (!allowedLengths.includes(digits.length)) {
    return `${label}_INVALID`;
  }
  return digits;
}

export function normalizeCustomerProfilePayload(payload = {}, accountKind = "INDIVIDUAL") {
  const normalizedKind = accountKind === "BUSINESS" ? "BUSINESS" : "INDIVIDUAL";
  const data = {
    accountKind: normalizedKind,
    legalEntityType: normalizedKind === "BUSINESS" ? normalizeOptionalString(payload.legalEntityType) : null,
    fullName: normalizedKind === "INDIVIDUAL" ? normalizeOptionalString(payload.fullName) : null,
    companyName: normalizedKind === "BUSINESS" ? normalizeOptionalString(payload.companyName) : null,
    contactName: normalizeOptionalString(payload.contactName),
    phone: normalizeOptionalString(payload.phone),
    address: normalizeOptionalString(payload.address),
    inn: validateDigitsField("INN", payload.inn, [10, 12]),
    kpp: normalizedKind === "BUSINESS" ? validateDigitsField("KPP", payload.kpp, [9]) : null,
    ogrn: normalizedKind === "BUSINESS" ? validateDigitsField("OGRN", payload.ogrn, [13, 15]) : null,
    position: normalizedKind === "BUSINESS" ? normalizeOptionalString(payload.position) : null,
    esiaIntegrationNote: normalizeOptionalString(payload.esiaIntegrationNote) || "В дальнейшем планируется сделать регистрацию через ЕСИА с подтягиванием данных"
  };

  if (data.inn && typeof data.inn === "string" && data.inn.endsWith("_INVALID")) throw new Error(data.inn);
  if (data.kpp && typeof data.kpp === "string" && data.kpp.endsWith("_INVALID")) throw new Error(data.kpp);
  if (data.ogrn && typeof data.ogrn === "string" && data.ogrn.endsWith("_INVALID")) throw new Error(data.ogrn);
  return data;
}

export function normalizeClientProductPayload(payload = {}) {
  const kind = payload.kind === "SERVICE" ? "SERVICE" : "PRODUCT";
  const title = String(payload.title || "").trim();
  if (!title) throw new Error("PRODUCT_TITLE_REQUIRED");

  return {
    kind,
    title,
    description: normalizeOptionalString(payload.description),
    specs: normalizeOptionalString(payload.specs),
    categoryLabel: normalizeOptionalString(payload.categoryLabel),
    documentsLabel: normalizeOptionalString(payload.documentsLabel) || "Документы Товара/Услуги"
  };
}

export async function getCustomerProfileByUserId(userId) {
  return prisma.customerProfile.findUnique({ where: { userId } });
}

export async function buildCustomerProfileResponse(userId) {
  const profile = await prisma.customerProfile.findUnique({
    where: { userId },
    include: {
      products: {
        include: {
          documents: { orderBy: { createdAt: "desc" } },
          certificates: {
            include: {
              order: { select: { id: true, status: true, createdAt: true } }
            },
            orderBy: { issuedAt: "desc" }
          }
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  if (!profile) return null;
  return {
    ...profile,
    products: profile.products.map((product) => ({
      ...product,
      documents: product.documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        size: doc.size,
        createdAt: doc.createdAt
      })),
      certificates: product.certificates.map((certificate) => ({
        id: certificate.id,
        title: certificate.title,
        certNumber: certificate.certNumber,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        order: certificate.order
      }))
    }))
  };
}

export async function markLinkedOrdersForAttention({ customerProfileId, clientProductId, changedByUserId, type, message, changes }) {
  const where = {
    ...(customerProfileId ? { customerProfileId } : {}),
    ...(clientProductId ? { clientProductId } : {}),
    providerId: { not: undefined }
  };

  const orders = await prisma.order.findMany({
    where,
    select: { id: true }
  });

  if (!orders.length) return;

  await prisma.$transaction(
    orders.flatMap((order) => [
      prisma.order.update({
        where: { id: order.id },
        data: {
          providerNeedsAttention: true,
          lastCustomerDataChangeAt: new Date(),
          lastCustomerDataChangeType: type
        }
      }),
      ...changes.map((change) =>
        prisma.orderEventLog.create({
          data: {
            orderId: order.id,
            changedByUserId,
            type,
            message,
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue
          }
        })
      )
    ])
  );
}

export function diffChangedFields(prev, next, fieldLabels) {
  return Object.entries(fieldLabels).flatMap(([key, label]) => {
    const oldValue = prev?.[key] == null ? "" : String(prev[key]);
    const newValue = next?.[key] == null ? "" : String(next[key]);
    if (oldValue === newValue) return [];
    return [{ field: label, oldValue, newValue }];
  });
}

export async function issueCertificatesForOrder(orderId, changedByUserId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      clientProduct: true,
      items: { include: { service: true } },
      certificates: true
    }
  });

  if (!order?.clientProduct) return;
  if (order.certificates.length > 0) return;

  const certificationItems = order.items.filter((item) => item.service.category === "CERTIFICATION");
  if (!certificationItems.length) return;

  const created = [];
  for (const item of certificationItems) {
    const certificate = await prisma.productCertificate.create({
      data: {
        clientProductId: order.clientProductId,
        orderId: order.id,
        title: item.service.title,
        certNumber: `CERT-${order.id.slice(-6).toUpperCase()}-${item.service.internalCode}`,
        status: "ISSUED"
      }
    });
    created.push(certificate);
  }

  await prisma.$transaction(
    created.map((certificate) =>
      prisma.orderEventLog.create({
        data: {
          orderId: order.id,
          changedByUserId,
          type: "CERTIFICATE_ISSUED",
          message: `По продукту выпущен сертификат: ${certificate.title}`,
          field: "Сертификат",
          oldValue: null,
          newValue: certificate.certNumber
        }
      })
    )
  );
}
