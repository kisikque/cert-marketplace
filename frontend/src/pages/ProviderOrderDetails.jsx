import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { Link, useNavigate, useParams } from "react-router-dom";

const STATUSES = ["IN_REVIEW", "WAITING_DOCS", "APPROVED", "REJECTED", "DONE"];

export default function ProviderOrderDetails() {
  const { user } = useAuthContext();
  const nav = useNavigate();
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [toStatus, setToStatus] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);

  const loadOrder = useCallback(async () => {
    const d = await apiFetch(`/provider/orders/${id}`);
    setOrder(d.order);
  }, [id]);

  useEffect(() => {
    if (!user || user.role !== "PROVIDER") nav("/");
  }, [user, nav]);

  useEffect(() => {
    async function run() {
      try {
        await loadOrder();
      } catch {
        setError("Не удалось загрузить заявку");
      }
    }
    run();
  }, [loadOrder]);

  async function changeStatus() {
    try {
      await apiFetch(`/provider/orders/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ toStatus, comment })
      });
      await loadOrder();
      setComment("");
      setToStatus("");
    } catch (e) {
      setError(e?.error || "Ошибка смены статуса");
    }
  }

  if (!user || user.role !== "PROVIDER") return null;
  if (!order) return <p>Загрузка...</p>;

  const isBusiness = order.customerProfile?.accountKind === "BUSINESS";

  return (
    <div style={{ maxWidth: 960, display: "grid", gap: 16 }}>
      <div>
        <h2>Заявка #{order.id}</h2>
        <p>Статус: <b>{order.status}</b></p>
      </div>

      {order.providerNeedsAttention && (
        <div style={{ padding: 14, borderRadius: 14, background: "#fff0cf", border: "1px solid #f0c36d", color: "#6d4a00" }}>
          <b>Внимание:</b> пользователь изменил данные о себе или о товаре. Проверьте блок «Лог изменений» перед продолжением работы.
          {order.lastCustomerDataChangeAt && (
            <div style={{ marginTop: 6, fontSize: 13 }}>
              Последнее обновление: {new Date(order.lastCustomerDataChangeAt).toLocaleString()} ({order.lastCustomerDataChangeType})
            </div>
          )}
        </div>
      )}

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Клиент</h3>
        <div>{order.customer.displayName || order.customer.email}</div>
        {order.customerProfile && (
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            {isBusiness ? (
              <>
                <div>Компания: <b>{order.customerProfile.companyName || "—"}</b></div>
                <div>Контактное лицо: <b>{order.customerProfile.contactName || "—"}</b></div>
                <div>ИНН: <b>{order.customerProfile.inn || "—"}</b></div>
                <div>КПП: <b>{order.customerProfile.kpp || "—"}</b></div>
                <div>ОГРН / ОГРНИП: <b>{order.customerProfile.ogrn || "—"}</b></div>
              </>
            ) : (
              <div>ФИО: <b>{order.customerProfile.fullName || "—"}</b></div>
            )}
            <div>Телефон: <b>{order.customerProfile.phone || "—"}</b></div>
            <div>Адрес: <b>{order.customerProfile.address || "—"}</b></div>
          </div>
        )}
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Продукт заявки</h3>
        {order.clientProduct ? (
          <>
            <div>
              <b>{order.clientProduct.title}</b> ({order.clientProduct.kind === "PRODUCT" ? "товар" : "услуга"})
            </div>
            {order.clientProduct.categoryLabel && <div>Категория: {order.clientProduct.categoryLabel}</div>}
            {order.clientProduct.description && <div>{order.clientProduct.description}</div>}
            {order.clientProduct.specs && <div><b>Спеки:</b> {order.clientProduct.specs}</div>}
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Документы Товара/Услуги</div>
              {order.clientProduct.documents?.length ? (
                <ul>
                  {order.clientProduct.documents.map((doc) => (
                    <li key={doc.id}>
                      <a href={`http://localhost:3001/api/customer/products/${order.clientProduct.id}/documents/${doc.id}/download`} target="_blank" rel="noreferrer">
                        {doc.fileName}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.68 }}>Документы по продукту не приложены.</div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Полученные сертификаты</div>
              {order.clientProduct.certificates?.length ? (
                <ul>
                  {order.clientProduct.certificates.map((certificate) => (
                    <li key={certificate.id}>
                      {certificate.title} — {certificate.certNumber} · {new Date(certificate.issuedAt).toLocaleDateString()} · <Link to={`/provider/orders/${certificate.orderId}`}>заявка #{certificate.orderId}</Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.68 }}>Сертификаты появятся после статуса DONE.</div>
              )}
            </div>
          </>
        ) : (
          <div>Продукт не выбран.</div>
        )}
      </section>

      <h3>Состав</h3>
      <ul>
        {order.items.map((it) => (
          <li key={it.serviceId}>{it.title} × {it.qty}</li>
        ))}
      </ul>

      <h3>Документы заявки</h3>
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

      <h3>Сменить статус</h3>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={toStatus} onChange={(e) => setToStatus(e.target.value)}>
          <option value="">— выбрать —</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input placeholder="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button disabled={!toStatus} onClick={changeStatus}>
          Применить
        </button>
      </div>

      <h3>История статусов</h3>
      <ul>
        {order.statusHistory.map((h, idx) => (
          <li key={idx}>
            {new Date(h.createdAt).toLocaleString()} — {h.fromStatus ?? "—"} → <b>{h.toStatus}</b>
            {h.comment ? ` (${h.comment})` : ""}
          </li>
        ))}
      </ul>

      <h3>Лог изменений</h3>
      {order.eventLogs.length === 0 ? (
        <p>Изменений пока нет.</p>
      ) : (
        <ul>
          {order.eventLogs.map((log) => (
            <li key={log.id}>
              {new Date(log.createdAt).toLocaleString()} — <b>{log.message}</b>
              {log.field ? ` · ${log.field}` : ""}
              {log.oldValue || log.newValue ? ` (${log.oldValue || "—"} → ${log.newValue || "—"})` : ""}
            </li>
          ))}
        </ul>
      )}

      {error && <p style={{ color: "crimson" }}>{String(error)}</p>}
    </div>
  );
}
