import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { useNavigate } from "react-router-dom";

const ORDER_STATUSES = ["NEW", "IN_REVIEW", "WAITING_DOCS", "APPROVED", "REJECTED", "DONE"];
const VERIFICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export default function AdminPanel() {
  const { user } = useAuthContext();
  const nav = useNavigate();

  const [tab, setTab] = useState("users");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("");
  const [verificationComment, setVerificationComment] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState(null);

  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [providers, setProviders] = useState([]);
  const [providerDetails, setProviderDetails] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") nav("/");
  }, [user, nav]);

  async function loadUsers() {
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      const d = await apiFetch(`/admin/users?${qs.toString()}`);
      setUsers(d.users || []);
    } catch (e) {
      setError(e?.error || "Не удалось загрузить пользователей");
    }
  }

  async function loadOrders() {
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (status) qs.set("status", status);
      const d = await apiFetch(`/admin/orders?${qs.toString()}`);
      setOrders(d.orders || []);
    } catch (e) {
      setError(e?.error || "Не удалось загрузить заявки");
    }
  }

  async function loadProviderVerifications(providerIdToOpen = selectedProviderId) {
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (verificationStatus) qs.set("status", verificationStatus);
      const d = await apiFetch(`/admin/provider-verifications?${qs.toString()}`);
      const providerItems = d.providers || [];
      setProviders(providerItems);

      const nextId = providerIdToOpen || providerItems[0]?.id || null;
      setSelectedProviderId(nextId);
      if (nextId) {
        const details = await apiFetch(`/admin/provider-verifications/${nextId}`);
        setProviderDetails(details.provider || null);
        setVerificationComment(details.provider?.verificationComment || "");
      } else {
        setProviderDetails(null);
        setVerificationComment("");
      }
    } catch (e) {
      setError(e?.error || "Не удалось загрузить верификации провайдеров");
    }
  }

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    if (tab === "users") loadUsers();
    else if (tab === "orders") loadOrders();
    else loadProviderVerifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function changeRole(userId, role) {
    await apiFetch(`/admin/users/${userId}`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    });
    await loadUsers();
  }

  async function softDelete(userId) {
    const ok = confirm("Пометить аккаунт как удалённый?");
    if (!ok) return;
    await apiFetch(`/admin/users/${userId}/delete`, { method: "POST" });
    await loadUsers();
  }

  async function openProvider(providerId) {
    setSelectedProviderId(providerId);
    try {
      const details = await apiFetch(`/admin/provider-verifications/${providerId}`);
      setProviderDetails(details.provider || null);
      setVerificationComment(details.provider?.verificationComment || "");
    } catch (e) {
      setError(e?.error || "Не удалось открыть карточку провайдера");
    }
  }

  async function submitVerificationAction(action) {
    if (!providerDetails?.id) return;
    setActionLoading(true);
    setError(null);
    try {
      await apiFetch(`/admin/provider-verifications/${providerDetails.id}/${action}`, {
        method: "POST",
        body: JSON.stringify({ comment: verificationComment })
      });
      await loadProviderVerifications(providerDetails.id);
    } catch (e) {
      setError(e?.error || "Не удалось обновить статус верификации");
    } finally {
      setActionLoading(false);
    }
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div style={{ maxWidth: 1220 }}>
      <h2>Админ-панель</h2>
      {error && <p style={{ color: "crimson" }}>{String(error)}</p>}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => setTab("users")} disabled={tab === "users"}>Пользователи</button>
        <button onClick={() => setTab("orders")} disabled={tab === "orders"}>Заявки</button>
        <button onClick={() => setTab("providers")} disabled={tab === "providers"}>Верификация провайдеров</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tab === "users" && (
            <>
              <input placeholder="Поиск по email/имени" value={q} onChange={(e) => setQ(e.target.value)} />
              <button onClick={loadUsers}>Искать</button>
              <a href="http://localhost:3001/api/admin/export/users.csv" target="_blank" rel="noreferrer">
                Экспорт users.csv
              </a>
            </>
          )}

          {tab === "orders" && (
            <>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Все статусы</option>
                {ORDER_STATUSES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <button onClick={loadOrders}>Применить</button>
              <a href="http://localhost:3001/api/admin/export/orders.csv" target="_blank" rel="noreferrer">
                Экспорт orders.csv
              </a>
            </>
          )}

          {tab === "providers" && (
            <>
              <select value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value)}>
                <option value="">Все статусы</option>
                {VERIFICATION_STATUSES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <button onClick={() => loadProviderVerifications()}>Применить</button>
            </>
          )}
        </div>
      </div>

      {tab === "users" ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Email</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Имя</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Роль</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Удалён</th>
                <th style={{ borderBottom: "1px solid #ddd", padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{u.email}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{u.displayName || "—"}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)}>
                      <option value="ADMIN">ADMIN</option>
                      <option value="PROVIDER">PROVIDER</option>
                      <option value="CUSTOMER">CUSTOMER</option>
                    </select>
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{u.isDeleted ? "да" : "нет"}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8, textAlign: "right" }}>
                    <button onClick={() => softDelete(u.id)} disabled={u.isDeleted}>Удалить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : tab === "orders" ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>ID</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Статус</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Клиент</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Провайдер</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Позиции</th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Создано</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8, fontFamily: "monospace" }}>{o.id}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{o.status}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{o.customerName || o.customerEmail}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{o.providerName}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{o.items}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 420px) 1fr", gap: 16, alignItems: "start" }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, borderBottom: "1px solid #ddd", fontWeight: 700 }}>Заявки на верификацию</div>
            {providers.length === 0 ? (
              <div style={{ padding: 12 }}>Пока нет провайдеров для модерации.</div>
            ) : (
              <div style={{ display: "grid" }}>
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => openProvider(provider.id)}
                    style={{
                      textAlign: "left",
                      border: "none",
                      borderBottom: "1px solid #eee",
                      padding: 12,
                      background: selectedProviderId === provider.id ? "#f5f3ff" : "white"
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{provider.orgName}</div>
                    <div style={{ fontSize: 13, opacity: 0.75 }}>{provider.user.displayName || provider.user.email}</div>
                    <div style={{ fontSize: 13 }}>Статус: {provider.verificationStatus}</div>
                    <div style={{ fontSize: 13 }}>Документов: {provider.documents.length}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
            {!providerDetails ? (
              <div>Выберите провайдера слева, чтобы посмотреть документы и принять решение.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <h3 style={{ marginBottom: 6 }}>{providerDetails.orgName}</h3>
                  <div>Контактное лицо: {providerDetails.user.displayName || "—"}</div>
                  <div>Email: {providerDetails.user.email}</div>
                  <div>ИНН: {providerDetails.inn || "—"}</div>
                  <div>Телефон: {providerDetails.phone || "—"}</div>
                  <div>Адрес: {providerDetails.address || "—"}</div>
                  <div>Статус: <b>{providerDetails.verificationStatus}</b></div>
                  <div>Подано: {providerDetails.submittedAt ? new Date(providerDetails.submittedAt).toLocaleString() : "—"}</div>
                </div>

                {providerDetails.description && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Описание</div>
                    <div>{providerDetails.description}</div>
                  </div>
                )}

                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Документы</div>
                  {providerDetails.documents.length === 0 ? (
                    <div>Документы не загружены.</div>
                  ) : (
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      {providerDetails.documents.map((doc) => (
                        <li key={doc.id} style={{ marginBottom: 8 }}>
                          <a
                            href={`http://localhost:3001/api/provider-verification-docs/${doc.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {doc.fileName}
                          </a>{" "}
                          <span style={{ fontSize: 13, opacity: 0.75 }}>
                            ({doc.documentType || "без типа"}, {Math.round(doc.size / 1024)} KB)
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>Комментарий администратора</span>
                  <textarea
                    rows={4}
                    value={verificationComment}
                    onChange={(e) => setVerificationComment(e.target.value)}
                  />
                </label>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button disabled={actionLoading} onClick={() => submitVerificationAction("approve")}>
                    {actionLoading ? "Сохраняем..." : "Одобрить"}
                  </button>
                  <button disabled={actionLoading} onClick={() => submitVerificationAction("reject")}>
                    Отклонить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
