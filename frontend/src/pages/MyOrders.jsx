import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function MyOrders() {
  const { user } = useAuthContext();
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) nav("/login");
  }, [user, nav]);

  useEffect(() => {
    apiFetch("/orders")
      .then((d) => setOrders(d.orders || []))
      .catch(() => setError("Не удалось загрузить заявки"));
  }, []);

  if (!user) return null;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Мои заявки</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {orders.length === 0 ? (
        <p>Заявок пока нет.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {orders.map((o) => (
            <div key={o.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {new Date(o.createdAt).toLocaleString()} • {o.providerName}
              </div>
              <div style={{ fontWeight: 700 }}>Заявка #{o.id}</div>
              {o.clientProduct && (
                <div style={{ marginTop: 4 }}>
                  Продукт: <b>{o.clientProduct.title}</b> ({o.clientProduct.kind === "PRODUCT" ? "товар" : "услуга"})
                </div>
              )}
              <div style={{ marginTop: 6 }}>Статус: <b>{o.status}</b></div>
              {o.providerNeedsAttention && (
                <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#fff8dd", color: "#6b5700" }}>
                  Провайдер ещё не обработал последнее изменение ваших данных.
                </div>
              )}
              <ul style={{ marginTop: 8 }}>
                {o.items.map((it, idx) => (
                  <li key={idx}>
                    {it.serviceTitle} × {it.qty}
                  </li>
                ))}
              </ul>
              <Link to={`/orders/${o.id}`}>Открыть</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
