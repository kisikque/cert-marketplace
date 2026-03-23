import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import { SERVICE_CATEGORIES } from "../serviceCategories";

const API_BASE = "http://localhost:3001";
const getImageSrc = (value) => (value?.startsWith("http") ? value : `${API_BASE}${value}`);

export default function Home() {
  const [topProviders, setTopProviders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/providers/top/list")
      .then((d) => setTopProviders(d.providers || []))
      .catch((e) => setError(e?.error || "Ошибка загрузки главной страницы"));
  }, []);

  const howItWorks = useMemo(
    () => [
      "Выберите нужную категорию и перейдите в тематический раздел каталога.",
      "Изучите карточки услуг, рейтинг и профиль проверенного продавца.",
      "Оформите заявку, загрузите документы и общайтесь с провайдером в процессе исполнения."
    ],
    []
  );

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <section style={{ padding: 24, borderRadius: 24, background: "linear-gradient(135deg, #f5f3ff, #f8fafc)" }}>
        <h1 style={{ marginTop: 0, marginBottom: 8 }}>Выберите направление и найдите подходящего провайдера</h1>
        <p style={{ maxWidth: 760, marginBottom: 0 }}>
          Разделили каталог на отдельные сценарии: сертификация, сопровождение и консультации. На главной собрали удобные точки входа и лучших продавцов.
        </p>
      </section>

      {error && <p style={{ color: "crimson" }}>{String(error)}</p>}

      <section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {SERVICE_CATEGORIES.map((category) => (
            <Link
              key={category.value}
              to={`/services/${category.slug}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                borderRadius: 24,
                padding: 24,
                minHeight: 220,
                background: category.accent,
                border: "1px solid #e5e7eb",
                display: "grid",
                alignContent: "space-between"
              }}
            >
              <div>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{category.value === "CERTIFICATION" ? "🧾" : category.value === "SUPPORT" ? "🤝" : "💬"}</div>
                <h2 style={{ margin: 0 }}>{category.title}</h2>
                <p style={{ marginBottom: 0 }}>{category.description}</p>
              </div>
              <strong>Перейти в раздел →</strong>
            </Link>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Лучшие продавцы</h2>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Сортировка по рейтингу, отзывам и активности</span>
        </div>
        {topProviders.length === 0 ? (
          <p>Пока не хватает данных для блока лучших продавцов.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
            {topProviders.map((provider) => (
              <article key={provider.id} style={{ border: "1px solid #ddd", borderRadius: 18, padding: 16, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, overflow: "hidden", background: "#fafafa", border: "1px solid #ddd" }}>
                    {provider.logoUrl ? <img src={getImageSrc(provider.logoUrl)} alt={provider.orgName} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                  </div>
                  <div>
                    <Link to={`/providers/${provider.publicSlug}`} style={{ fontWeight: 700 }}>
                      {provider.orgName}
                    </Link>
                    <div style={{ fontSize: 13, color: "#166534" }}>Проверенный продавец</div>
                  </div>
                </div>
                <div style={{ fontSize: 14 }}>{provider.ratingCount ? `★ ${provider.ratingAvg.toFixed(1)} · ${provider.ratingCount} отзывов` : "Пока без отзывов"}</div>
                <div style={{ display: "grid", gap: 6 }}>
                  {provider.services.map((service) => (
                    <div key={service.id} style={{ fontSize: 14, padding: "8px 10px", borderRadius: 12, background: "#f8fafc" }}>
                      <div style={{ fontWeight: 600 }}>{service.title}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>от {service.priceFrom ?? "—"} ₽</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        <h2 style={{ margin: 0 }}>Как это работает</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
          {howItWorks.map((item, index) => (
            <div key={item} style={{ border: "1px solid #ddd", borderRadius: 18, padding: 18, background: "#fff" }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{index + 1}</div>
              <div>{item}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 20, padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>FAQ</h2>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <strong>Как выбрать категорию?</strong>
            <div>Если нужен выпуск разрешительного документа — выбирайте сертификацию. Если нужен полный project management — сопровождение. Если нужен разбор требований и стратегии — консультации.</div>
          </div>
          <div>
            <strong>Как формируется блок лучших продавцов?</strong>
            <div>Приоритет получают проверенные провайдеры с отзывами, высоким рейтингом и активными услугами.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
