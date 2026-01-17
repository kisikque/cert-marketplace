import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { useNavigate, useParams } from "react-router-dom";

const STATUSES = ["IN_REVIEW", "WAITING_DOCS", "APPROVED", "REJECTED", "DONE"];

export default function ProviderOrderDetails() {
  const { user } = useAuthContext();
  const nav = useNavigate();
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [toStatus, setToStatus] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "PROVIDER") nav("/");
  }, [user, nav]);

  useEffect(() => {
    apiFetch(`/provider/orders/${id}`)
      .then((d) => setOrder(d.order))
      .catch(() => setError("Не удалось загрузить заявку"));
  }, [id]);

  async function changeStatus() {
    try {
      await apiFetch(`/provider/orders/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ toStatus, comment })
      });
      const d = await apiFetch(`/provider/orders/${id}`);
      setOrder(d.order);
      setComment("");
    } catch (e) {
      setError(e?.error || "Ошибка смены статуса");
    }
  }

  if (!user || user.role !== "PROVIDER") return null;
  if (!order) return <p>Загрузка...</p>;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Заявка #{order.id}</h2>
      <p>Статус: <b>{order.status}</b></p>

      <h3>Клиент</h3>
      <p>{order.customer.displayName || order.customer.email}</p>

      <h3>Состав</h3>
      <ul>
        {order.items.map((it) => (
          <li key={it.serviceId}>{it.title} × {it.qty}</li>
        ))}
      </ul>

      <h3>Документы</h3>
      {order.documents.length === 0 ? (
        <p>Документов пока нет.</p>
      ) : (
        <ul>
          {order.documents.map((d) => (
            <li key={d.id}>
              <a
                href={`http://localhost:3001/api/documents/${d.id}/download`}
                target="_blank"
                rel="noreferrer"
              >
                {d.fileName}
              </a>{" "}
              ({Math.round(d.size / 1024)} KB)
            </li>
          ))}
        </ul>
      )}

      <h3>Сменить статус</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <select value={toStatus} onChange={(e) => setToStatus(e.target.value)}>
          <option value="">— выбрать —</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          placeholder="Комментарий"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button disabled={!toStatus} onClick={changeStatus}>
          Применить
        </button>
      </div>

      <h3>История статусов</h3>
      <ul>
        {order.statusHistory.map((h, idx) => (
          <li key={idx}>
            {new Date(h.createdAt).toLocaleString()} —{" "}
            {h.fromStatus ?? "—"} → <b>{h.toStatus}</b>
            {h.comment ? ` (${h.comment})` : ""}
          </li>
        ))}
      </ul>

      {error && <p style={{ color: "crimson" }}>{String(error)}</p>}
    </div>
  );
}
