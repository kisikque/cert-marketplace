import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function ProviderOrders() {
  const { user } = useAuthContext();
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "PROVIDER") nav("/");
  }, [user, nav]);

  useEffect(() => {
    apiFetch("/provider/orders")
      .then((d) => setOrders(d.orders || []))
      .catch(() => setError("Не удалось загрузить заявки"));
  }, []);

  if (!user || user.role !== "PROVIDER") return null;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Заявки провайдера</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {orders.length === 0 ? (
        <p>Заявок пока нет.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {orders.map((o) => (
            <div key={o.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {new Date(o.createdAt).toLocaleString()}
              </div>
              <div style={{ fontWeight: 700 }}>Заявка #{o.id}</div>
              <div>Статус: <b>{o.status}</b></div>
              <div style={{ marginTop: 6 }}>
                Клиент: {o.customer.displayName || o.customer.email}
              </div>
              <ul>
                {o.items.map((it, idx) => (
                  <li key={idx}>{it.serviceTitle} × {it.qty}</li>
                ))}
              </ul>
              <Link to={`/provider/orders/${o.id}`}>Открыть</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
