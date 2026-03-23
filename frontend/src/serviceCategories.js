export const SERVICE_CATEGORIES = [
  {
    value: "CERTIFICATION",
    slug: "certification",
    title: "Услуги по сертификации",
    description: "Обязательная и добровольная сертификация, декларации и профильные программы.",
    accent: "#f6f1ff"
  },
  {
    value: "SUPPORT",
    slug: "support",
    title: "Услуги по сопровождению",
    description: "Сопровождение проектов, сбор документов и работа с регуляторными процессами.",
    accent: "#eefbf3"
  },
  {
    value: "CONSULTING",
    slug: "consulting",
    title: "Консультационные услуги",
    description: "Консультации по требованиям, рынкам, стратегиям запуска и подготовке компании.",
    accent: "#fff6e9"
  }
];

export const CERTIFICATION_KINDS = [
  { value: "MANDATORY", label: "Обязательная сертификация" },
  { value: "VOLUNTARY", label: "Добровольная сертификация" }
];

export function getCategoryMeta(value) {
  return SERVICE_CATEGORIES.find((item) => item.value === value) || SERVICE_CATEGORIES[0];
}
