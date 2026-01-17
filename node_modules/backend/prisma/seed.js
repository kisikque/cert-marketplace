import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // очистка (SQLite позволяет, но аккуратно)
  await prisma.serviceTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.orderDocument.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.service.deleteMany();
  await prisma.providerProfile.deleteMany();
  await prisma.user.deleteMany();

  const adminPass = await bcrypt.hash("Admin123!", 10);
  const providerPass = await bcrypt.hash("Provider123!", 10);
  const customerPass = await bcrypt.hash("Customer123!", 10);

  const admin = await prisma.user.create({
    data: { email: "admin@demo.ru", passwordHash: adminPass, role: "ADMIN", displayName: "Admin" }
  });

  const providerUser = await prisma.user.create({
    data: { email: "provider@demo.ru", passwordHash: providerPass, role: "PROVIDER", displayName: "Provider" }
  });

  const customer = await prisma.user.create({
    data: { email: "customer@demo.ru", passwordHash: customerPass, role: "CUSTOMER", displayName: "Customer" }
  });

  const provider = await prisma.providerProfile.create({
    data: {
      userId: providerUser.id,
      orgName: 'ООО "СертЛаб"',
      inn: "7700000000",
      phone: "+7 (900) 000-00-00",
      address: "Москва"
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
    address: "Санкт-Петербург"
  }
});

  const tags = await prisma.tag.createMany({
    data: [
      { name: "Срочно", slug: "urgent" },
      { name: "ЕАЭС", slug: "eaeu" },
      { name: "ISO", slug: "iso" },
      { name: "Пищевая продукция", slug: "food" },
      { name: "Детские товары", slug: "kids" }
    ]
  });

  const allTags = await prisma.tag.findMany();

  const services = await prisma.service.createMany({
    data: [
      {
        providerId: provider.id,
        internalCode: "DECL-TRTS",
        title: "Декларация соответствия ТР ТС",
        description: "Подготовка и регистрация декларации соответствия требованиям техрегламентов ЕАЭС.",
        priceFrom: 15000,
        etaDaysFrom: 5
      },
      {
        providerId: provider.id,
        internalCode: "CERT-TRTS",
        title: "Сертификат соответствия ТР ТС",
        description: "Оформление сертификата соответствия. Консультации, подготовка комплекта документов.",
        priceFrom: 25000,
        etaDaysFrom: 10
      },
      {
        providerId: provider.id,
        internalCode: "ISO-9001",
        title: "Сертификация ISO 9001",
        description: "Сертификация системы менеджмента качества ISO 9001 для организаций.",
        priceFrom: 60000,
        etaDaysFrom: 20
      },
      {
      providerId: provider2.id,
      internalCode: "GOST-R",
      title: "Добровольная сертификация ГОСТ Р",
      description: "Оформление добровольного сертификата ГОСТ Р для продукции и услуг.",
      priceFrom: 18000,
      etaDaysFrom: 7
      }
    ]
  });

  const createdServices = await prisma.service.findMany();

  // привязка тегов к услугам
  const bySlug = (slug) => allTags.find((t) => t.slug === slug)?.id;

  await prisma.serviceTag.createMany({
    data: [
      { serviceId: createdServices[0].id, tagId: bySlug("eaeu") },
      { serviceId: createdServices[0].id, tagId: bySlug("urgent") },
      { serviceId: createdServices[1].id, tagId: bySlug("eaeu") },
      { serviceId: createdServices[2].id, tagId: bySlug("iso") }
    ].filter(Boolean)
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
