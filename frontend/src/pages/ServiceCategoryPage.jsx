import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";
import { CERTIFICATION_KINDS, SERVICE_CATEGORIES } from "../serviceCategories";

const API_BASE = "http://localhost:3001";
const getImageSrc = (value) => (value?.startsWith("http") ? value : `${API_BASE}${value}`);

export default function ServiceCategoryPage() {
  const { slug } = useParams();
  const categoryMeta = SERVICE_CATEGORIES.find((item) => item.slug === slug);
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [certificationKind, setCertificationKind] = useState("");

  useEffect(() => {
    if (!categoryMeta) return;
    const qs = new URLSearchParams({ category: categoryMeta.value });
    if (search.trim()) qs.set("search", search.trim());
    if (categoryMeta.value === "CERTIFICATION" && certificationKind) qs.set("certificationKind", certificationKind);

    apiFetch(`/services?${qs.toString()}`)
      .then((data) => setServices(data.services || []))
      .catch((e) => setError(e?.error || "Не удалось загрузить услуги категории"));
  }, [categoryMeta, search, certificationKind]);

  const title = useMemo(() => categoryMeta?.title || "Категория услуг", [categoryMeta]);

  if (!categoryMeta) return <p>Категория не найдена.</p>;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={{ padding: 20, borderRadius: 20, background: categoryMeta.accent }}>
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <p style={{ maxWidth: 820, marginBottom: 0 }}>{categoryMeta.description}</p>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Поиск внутри категории"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 240, padding: 8 }}
          />
          {categoryMeta.value === "CERTIFICATION" && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setCertificationKind("")} style={{ background: certificationKind ? "white" : "#ede9fe" }}>
                Все
              </button>
              {CERTIFICATION_KINDS.map((kind) => (
                <button
                  key={kind.value}
                  type="button"
                  onClick={() => setCertificationKind(kind.value)}
                  style={{ background: certificationKind === kind.value ? "#ede9fe" : "white" }}
                >
                  {kind.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p style={{ color: "crimson" }}>{String(error)}</p>}
        {services.length === 0 ? (
          <p>В этой категории пока нет активных услуг.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {services.map((service) => (
              <article key={service.id} style={{ border: "1px solid #ddd", borderRadius: 16, padding: 14, display: "grid", gap: 8 }}>
                <div style={{ aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden", border: "1px solid #ddd", background: "#fafafa" }}>
                  {service.imageUrl ? (
                    <img src={getImageSrc(service.imageUrl)} alt={service.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
                <div style={{ fontWeight: 700 }}>{service.title}</div>
                <div style={{ fontSize: 13 }}>{service.ratingCount ? `★ ${service.ratingAvg.toFixed(1)} (${service.ratingCount})` : "Пока без оценок"}</div>
                <div style={{ fontSize: 14 }}>{service.description}</div>
                <div style={{ fontSize: 13 }}>
                  <b>от {service.priceFrom ?? "—"} ₽</b> • срок от {service.etaDaysFrom ?? "—"} дн.
                </div>
                {service.providerSlug && (
                  <Link to={`/providers/${service.providerSlug}`} style={{ fontSize: 13 }}>
                    {service.providerName}
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
