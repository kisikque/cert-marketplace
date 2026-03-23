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
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [reviewSavingId, setReviewSavingId] = useState(null);

  useEffect(() => {
    if (!user) nav("/login");
  }, [user, nav]);

  useEffect(() => {
    apiFetch(`/orders/${id}`)
      .then((d) => {
        setOrder(d.order);
        setReviewDrafts(
          Object.fromEntries(
            (d.order.items || []).map((item) => [
              item.orderItemId,
              {
                rating: item.review?.rating || 5,
                text: item.review?.text || "",
                isAnonymous: item.review?.isAnonymous ?? true,
                displayUserId: item.review?.displayUserId ?? false
              }
            ])
          )
        );
      })
      .catch(() => setError("Не удалось загрузить заявку"));
  }, [id]);

  async function uploadFile(file) {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      await apiUpload(`/documents/orders/${order.id}`, fd);

      const d = await apiFetch(`/orders/${order.id}`);
      setOrder(d.order);
    } catch (e) {
      setUploadError(e?.error || "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  async function saveReview(orderItemId, hasExistingReview) {
    setReviewSavingId(orderItemId);
    setError(null);
    try {
      await apiFetch(`/orders/${order.id}/items/${orderItemId}/review`, {
        method: hasExistingReview ? "PATCH" : "POST",
        body: JSON.stringify(reviewDrafts[orderItemId])
      });
      const d = await apiFetch(`/orders/${order.id}`);
      setOrder(d.order);
    } catch (e) {
      setError(e?.error || "Не удалось сохранить отзыв");
    } finally {
      setReviewSavingId(null);
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
          <li key={it.orderItemId} style={{ marginBottom: 16 }}>
            <div>
              {it.title} × {it.qty} (цена на момент: {it.priceAtPurchase ?? "—"} ₽)
            </div>
            <div style={{ marginTop: 10, border: "1px solid #ddd", borderRadius: 10, padding: 12, maxWidth: 520 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{it.review ? "Редактировать отзыв" : "Оставить отзыв"}</div>
              <label style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                <span>Оценка</span>
                <select
                  value={reviewDrafts[it.orderItemId]?.rating || 5}
                  onChange={(e) =>
                    setReviewDrafts((prev) => ({
                      ...prev,
                      [it.orderItemId]: { ...prev[it.orderItemId], rating: Number(e.target.value) }
                    }))
                  }
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6, marginBottom: 8 }}>
                <span>Комментарий</span>
                <textarea
                  rows={3}
                  value={reviewDrafts[it.orderItemId]?.text || ""}
                  onChange={(e) =>
                    setReviewDrafts((prev) => ({
                      ...prev,
                      [it.orderItemId]: { ...prev[it.orderItemId], text: e.target.value }
                    }))
                  }
                />
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={reviewDrafts[it.orderItemId]?.isAnonymous ?? true}
                  onChange={(e) =>
                    setReviewDrafts((prev) => ({
                      ...prev,
                      [it.orderItemId]: {
                        ...prev[it.orderItemId],
                        isAnonymous: e.target.checked,
                        displayUserId: e.target.checked ? false : prev[it.orderItemId]?.displayUserId ?? false
                      }
                    }))
                  }
                />
                Оставить как анонимный покупатель
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  type="checkbox"
                  disabled={reviewDrafts[it.orderItemId]?.isAnonymous ?? true}
                  checked={reviewDrafts[it.orderItemId]?.displayUserId ?? false}
                  onChange={(e) =>
                    setReviewDrafts((prev) => ({
                      ...prev,
                      [it.orderItemId]: { ...prev[it.orderItemId], displayUserId: e.target.checked }
                    }))
                  }
                />
                Показать мой внутренний ID
              </label>
              <button type="button" disabled={reviewSavingId === it.orderItemId} onClick={() => saveReview(it.orderItemId, Boolean(it.review))}>
                {reviewSavingId === it.orderItemId ? "Сохраняем..." : it.review ? "Сохранить изменения" : "Опубликовать отзыв"}
              </button>
            </div>
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
              <a href={`http://localhost:3001/api/documents/${d.id}/download`} target="_blank" rel="noreferrer">
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
