import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { apiUpload } from "../api";

export default function OrderDetails() {
  const { user } = useAuthContext();
  const nav = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) nav("/login");
  }, [user, nav]);

  useEffect(() => {
    apiFetch(`/orders/${id}`)
      .then((d) => setOrder(d.order))
      .catch(() => setError("Не удалось загрузить заявку"));
  }, [id]);

async function uploadFile(file) {
  setUploadError(null);
  setUploading(true);
  try {
    const fd = new FormData();
    fd.append("file", file);

    await apiUpload(`/documents/orders/${order.id}`, fd);

    // обновить заявку (чтобы подтянуть documents)
    const d = await apiFetch(`/orders/${order.id}`);
    setOrder(d.order);
  } catch (e) {
    setUploadError(e?.error || "Ошибка загрузки");
  } finally {
    setUploading(false);
  }
}

  if (!user) return null;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!order) return <p>Загрузка...</p>;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Заявка #{order.id}</h2>
      <p>
        Статус: <b>{order.status}</b>
      </p>

      <h3>Состав</h3>
      <ul>
        {order.items.map((it) => (
          <li key={it.serviceId}>
            {it.title} × {it.qty} (цена на момент: {it.priceAtPurchase ?? "—"} ₽)
          </li>
        ))}
      </ul>

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

      <h3>Документы</h3>

<div style={{ marginBottom: 10 }}>
  <input
    type="file"
    onChange={(e) => {
      const f = e.target.files?.[0];
      if (f) uploadFile(f);
      e.target.value = "";
    }}
    disabled={uploading}
  />
  {uploading && <span style={{ marginLeft: 10 }}>Загрузка...</span>}
  {uploadError && <div style={{ color: "crimson" }}>{String(uploadError)}</div>}
</div>

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
    </div>
  );
}
