import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { addItem, clearCart } from "../cart";

const API_BASE = "http://localhost:3001";

export default function Home() {
  const nav = useNavigate();
  const { user } = useAuthContext();

  const [services, setServices] = useState([]);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("");

  useEffect(() => {
    apiFetch("/tags")
      .then((d) => setTags(d.tags || []))
      .catch(() => setTags([]));
  }, []);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (search.trim()) qs.set("search", search.trim());

    apiFetch(`/services?${qs.toString()}`)
      .then((d) => setServices(d.services || []))
      .catch((e) => setError(e?.error || "Ошибка загрузки услуг"));
  }, [search]);

  const filtered = useMemo(() => {
    if (!activeTag) return services;
    return services.filter((s) => (s.tags || []).some((t) => t.slug === activeTag));
  }, [services, activeTag]);

  function addToCart(service) {
    if (!user) {
      nav("/login");
      return;
    }

    const res = addItem(service);
    if (!res.ok && res.reason === "DIFFERENT_PROVIDER") {
      const ok = confirm("В корзине услуги другого провайдера. Очистить корзину и добавить эту услугу?");
      if (!ok) return;

      clearCart();
      const res2 = addItem(service);
      if (res2.ok) nav("/cart");
      return;
    }

    nav("/cart");
  }

  return (
    <div>
      <h2>Витрина услуг</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <input
          placeholder="Поиск по услугам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        {activeTag && <button onClick={() => setActiveTag("")}>Сбросить тег</button>}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {tags.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTag((prev) => (prev === t.slug ? "" : t.slug))}
            style={{
              borderRadius: 999,
              padding: "4px 10px",
              border: "1px solid #ddd",
              background: activeTag === t.slug ? "#eee" : "white"
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {error && <p style={{ color: "crimson" }}>{String(error)}</p>}

      {filtered.length === 0 ? (
        <p>Ничего не найдено.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {filtered.map((service) => (
            <div key={service.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid #ddd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#fafafa",
                    flexShrink: 0
                  }}
                >
                  {service.providerLogoUrl ? (
                    <img
                      src={`${API_BASE}${service.providerLogoUrl}`}
                      alt={service.providerName}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ fontSize: 14, opacity: 0.35 }}>{service.providerName.slice(0, 1)}</span>
                  )}
                </div>
                <div>
                  {service.providerSlug ? (
                    <Link to={`/providers/${service.providerSlug}`} style={{ fontSize: 12, opacity: 0.8 }}>
                      {service.providerName}
                    </Link>
                  ) : (
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{service.providerName}</div>
                  )}
                  {service.providerVerificationStatus === "APPROVED" && (
                    <div style={{ fontSize: 11, color: "#166534" }}>Проверенный провайдер</div>
                  )}
                </div>
              </div>
              <div style={{ fontWeight: 700, marginTop: 10 }}>{service.title}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>{service.description}</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                <b>от {service.priceFrom ?? "—"} ₽</b> • срок от {service.etaDaysFrom ?? "—"} дн.
              </div>

              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(service.tags || []).map((tag) => (
                  <span
                    key={tag.id}
                    style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid #ddd" }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>

              <button style={{ marginTop: 10 }} onClick={() => addToCart(service)}>
                В корзину
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
