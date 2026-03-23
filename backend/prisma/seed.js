import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.serviceReview.deleteMany();
  await prisma.serviceTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.productCertificate.deleteMany();
  await prisma.clientProductDocument.deleteMany();
  await prisma.orderDocument.deleteMany();
  await prisma.orderEventLog.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.clientProduct.deleteMany();
  await prisma.service.deleteMany();
  await prisma.providerVerificationDocument.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.customerProfile.deleteMany();
  await prisma.user.deleteMany();

  const adminPass = await bcrypt.hash("Admin123!", 10);
  const providerPass = await bcrypt.hash("Provider123!", 10);
  const customerPass = await bcrypt.hash("Customer123!", 10);

  await prisma.user.create({
    data: { email: "admin@demo.ru", passwordHash: adminPass, role: "ADMIN", displayName: "Admin" }
  });

  const providerUser = await prisma.user.create({
    data: { email: "provider@demo.ru", passwordHash: providerPass, role: "PROVIDER", displayName: "Provider" }
  });

  const customerUser = await prisma.user.create({
    data: {
      email: "customer@demo.ru",
      passwordHash: customerPass,
      role: "CUSTOMER",
      displayName: "Customer",
      customerProfile: {
        create: {
          accountKind: "BUSINESS",
          legalEntityType: "Юрлицо / ИП",
          companyName: 'ООО "Покупатель Плюс"',
          contactName: "Ирина Смирнова",
          phone: "+7 (999) 123-45-67",
          address: "Москва, ул. Примерная, 12",
          inn: "7701234567",
          kpp: "770101001",
          ogrn: "1027700132195",
          position: "Менеджер по сертификации",
          esiaIntegrationNote: "В дальнейшем планируется сделать регистрацию через ЕСИА с подтягиванием данных"
        }
      }
    },
    include: { customerProfile: true }
  });

  const provider = await prisma.providerProfile.create({
    data: {
      userId: providerUser.id,
      orgName: 'ООО "СертЛаб"',
      inn: "7700000000",
      phone: "+7 (900) 000-00-00",
      address: "Москва",
      website: "https://sertlab.example.com",
      description: "Центр сертификации с фокусом на ЕАЭС и добровольные программы подтверждения соответствия.",
      publicSlug: "sertlab",
      verificationStatus: "APPROVED",
      submittedAt: new Date(),
      verifiedAt: new Date()
    }
  });

  const providerUser2 = await prisma.user.create({
    data: { email: "provider2@demo.ru", passwordHash: providerPass, role: "PROVIDER", displayName: "Provider 2" }
  });

  const provider2 = await prisma.providerProfile.create({
    data: {
      userId: providerUser2.id,
      orgName: 'АО "СертЭксперт"',
      inn: "7800000000",
      phone: "+7 (901) 111-11-11",
      address: "Санкт-Петербург",
      website: "https://sertexpert.example.com",
      description: "Провайдер услуг добровольной сертификации, сопровождения и консультаций для бизнеса.",
      publicSlug: "sertexpert",
      verificationStatus: "APPROVED",
      submittedAt: new Date(),
      verifiedAt: new Date()
    }
  });

  const customerProfileId = customerUser.customerProfile.id;
  const clientProduct = await prisma.clientProduct.create({
    data: {
      customerProfileId,
      kind: "PRODUCT",
      title: "Кухонный блендер SmartMix X1",
      description: "Небольшой кухонный блендер для домашнего использования.",
      specs: "220В, 800Вт, пластиковый корпус, 2 режима скорости",
      categoryLabel: "Бытовая техника"
    }
  });

  await prisma.tag.createMany({
    data: [
      { name: "Срочно", slug: "urgent" },
      { name: "ЕАЭС", slug: "eaeu" },
      { name: "ISO", slug: "iso" },
      { name: "Пищевая продукция", slug: "food" },
      { name: "Детские товары", slug: "kids" }
    ]
  });

  const allTags = await prisma.tag.findMany();

  await prisma.service.createMany({
    data: [
      {
        providerId: provider.id,
        internalCode: "DECL-TRTS",
        title: "Декларация соответствия ТР ТС",
        description: "Подготовка и регистрация декларации соответствия требованиям техрегламентов ЕАЭС.",
        category: "CERTIFICATION",
        certificationKind: "MANDATORY",
        priceFrom: 15000,
        etaDaysFrom: 5
      },
      {
        providerId: provider.id,
        internalCode: "CERT-TRTS",
        title: "Сертификат соответствия ТР ТС",
        description: "Оформление сертификата соответствия. Консультации, подготовка комплекта документов.",
        category: "CERTIFICATION",
        certificationKind: "MANDATORY",
        priceFrom: 25000,
        etaDaysFrom: 10
      },
      {
        providerId: provider.id,
        internalCode: "ISO-9001",
        title: "Сертификация ISO 9001",
        description: "Сертификация системы менеджмента качества ISO 9001 для организаций.",
        category: "CONSULTING",
        priceFrom: 60000,
        etaDaysFrom: 20
      },
      {
        providerId: provider2.id,
        internalCode: "GOST-R",
        title: "Добровольная сертификация ГОСТ Р",
        description: "Оформление добровольного сертификата ГОСТ Р для продукции и услуг.",
        category: "CERTIFICATION",
        certificationKind: "VOLUNTARY",
        priceFrom: 18000,
        etaDaysFrom: 7
      },
      {
        providerId: provider2.id,
        internalCode: "OUTSOURCE-CERT",
        title: "Сопровождение сертификационного проекта",
        description: "Берём на себя коммуникацию, сбор документов и сопровождение до выпуска итогового комплекта.",
        category: "SUPPORT",
        priceFrom: 18000,
        etaDaysFrom: 7
      },
      {
        providerId: provider2.id,
        internalCode: "CONSULT-START",
        title: "Консультация по выходу на маркетплейсы",
        description: "Разбор обязательных требований, документов и дорожной карты перед запуском продаж.",
        category: "CONSULTING",
        priceFrom: 9000,
        etaDaysFrom: 3
      }
    ]
  });

  const createdServices = await prisma.service.findMany({ orderBy: { createdAt: "asc" } });
  const bySlug = (slug) => allTags.find((t) => t.slug === slug)?.id;

  await prisma.serviceTag.createMany({
    data: [
      { serviceId: createdServices[0].id, tagId: bySlug("eaeu") },
      { serviceId: createdServices[0].id, tagId: bySlug("urgent") },
      { serviceId: createdServices[1].id, tagId: bySlug("eaeu") },
      { serviceId: createdServices[2].id, tagId: bySlug("iso") }
    ].filter(Boolean)
  });

  const demoOrder = await prisma.order.create({
    data: {
      customerId: customerUser.id,
      providerId: provider.id,
      customerProfileId,
      clientProductId: clientProduct.id,
      status: "NEW",
      customerComment: "Нужна базовая оценка и дорожная карта по сертификации.",
      items: {
        create: [
          { serviceId: createdServices[0].id, qty: 1, priceAtPurchase: createdServices[0].priceFrom },
          { serviceId: createdServices[1].id, qty: 1, priceAtPurchase: createdServices[1].priceFrom }
        ]
      },
      statusHistory: {
        create: {
          changedByUserId: customerUser.id,
          fromStatus: null,
          toStatus: "NEW",
          comment: "Создана демонстрационная заявка"
        }
      }
    }
  });

  await prisma.orderEventLog.create({
    data: {
      orderId: demoOrder.id,
      changedByUserId: customerUser.id,
      type: "PRODUCT_UPDATED",
      message: "Пользователь изменил данные товара/услуги",
      field: "Спецификации",
      oldValue: "220В, 700Вт",
      newValue: "220В, 800Вт, пластиковый корпус, 2 режима скорости"
    }
  });

  await prisma.order.update({
    where: { id: demoOrder.id },
    data: {
      providerNeedsAttention: true,
      lastCustomerDataChangeAt: new Date(),
      lastCustomerDataChangeType: "PRODUCT_UPDATED"
    }
  });

  console.log("Seed done ✅");
  console.log("Demo accounts:");
  console.log("ADMIN    admin@demo.ru / Admin123!");
  console.log("PROVIDER provider@demo.ru / Provider123!");
  console.log("CUSTOMER customer@demo.ru / Customer123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
