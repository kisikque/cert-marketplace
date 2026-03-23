import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../api";

const API_BASE = "http://localhost:3001";
const getImageSrc = (value) => (value?.startsWith("http") ? value : `${API_BASE}${value}`);

export default function ProviderProfile() {
  const { slug } = useParams();
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch(`/providers/${slug}`)
      .then((d) => setProvider(d.provider))
      .catch((e) => setError(e?.error || "Не удалось загрузить профиль провайдера"));
  }, [slug]);

  if (error) return <p style={{ color: "crimson" }}>{String(error)}</p>;
  if (!provider) return <p>Загрузка профиля...</p>;

  return (
    <div style={{ maxWidth: 1080, display: "grid", gap: 18 }}>
      <section style={{ border: "1px solid #ddd", borderRadius: 16, padding: 18, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              border: "1px solid #ddd",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fafafa"
            }}
          >
            {provider.logoUrl ? (
              <img
                src={getImageSrc(provider.logoUrl)}
                alt={provider.orgName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span style={{ fontSize: 36, opacity: 0.35 }}>{provider.orgName.slice(0, 1)}</span>
            )}
          </div>

          <div style={{ display: "grid", gap: 8, flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0 }}>{provider.orgName}</h2>
              <span
                style={{
                  fontSize: 12,
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid #22c55e",
                  color: "#166534",
                  background: "#f0fdf4"
                }}
              >
                Проверенный провайдер
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {provider.ratingCount ? `★ ${provider.ratingAvg.toFixed(1)} · ${provider.ratingCount} отзывов` : "Пока нет отзывов"}
            </div>
            {provider.description && <div style={{ fontSize: 15 }}>{provider.description}</div>}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14 }}>
              {provider.website && (
                <a href={provider.website} target="_blank" rel="noreferrer">
                  Сайт
                </a>
              )}
              {provider.phone && <span>Телефон: {provider.phone}</span>}
              {provider.address && <span>Адрес: {provider.address}</span>}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Активные услуги провайдера</h3>
          <span style={{ fontSize: 13, opacity: 0.7 }}>Всего: {provider.services.length}</span>
        </div>

        {provider.services.length === 0 ? (
          <p>Пока нет активных услуг.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {provider.services.map((service) => (
              <div key={service.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
                {service.imageUrl && (                  
                  <div style={{ borderRadius: 12, overflow: "hidden", width: 420, maxHeight: 260, border: "1px solid #e5e7eb",
                   background: "#f9fafb",}}>
                    <img src={getImageSrc(service.imageUrl)} alt={service.title} style={{ width: "100%", height: "100%", maxHeight: 260, 
                      dislpay: "block", objectFit: "cover" }} />
                  </div>
                )}
                                <div style={{ fontWeight: 700 }}>{service.title}</div>
                <div style={{ marginTop: 6, fontSize: 13 }}>
                  {service.ratingCount ? `★ ${service.ratingAvg.toFixed(1)} (${service.ratingCount})` : "Пока без оценок"}
                </div>
                <div style={{ marginTop: 8, fontSize: 14 }}>{service.description}</div>
                <div style={{ marginTop: 10, fontSize: 14 }}>
                  <b>от {service.priceFrom ?? "—"} ₽</b> • срок от {service.etaDaysFrom ?? "—"} дн.
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(service.tags || []).map((tag) => (
                    <span
                      key={tag.id}
                      style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid #ddd" }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
                <Link style={{ display: "inline-block", marginTop: 12 }} to="/">
                  Вернуться на витрину
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0 }}>Отзывы покупателей</h3>
        {provider.reviews?.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {provider.reviews.map((review) => (
              <article key={review.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>{review.customerLabel}</strong>
                  <span>{`★ ${review.rating}`}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
                <div style={{ marginTop: 8 }}>{review.text || "Покупатель не оставил текстовый комментарий."}</div>
              </article>
            ))}
          </div>
        ) : (
          <p>Пока отзывов нет.</p>
        )}
      </section>
    </div>
  );
}
