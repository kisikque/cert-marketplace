import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { useNavigate } from "react-router-dom";

const STATUSES = ["NEW", "IN_REVIEW", "WAITING_DOCS", "APPROVED", "REJECTED", "DONE"];

export default function AdminPanel() {
  const { user } = useAuthContext();
  const nav = useNavigate();

  const [tab, setTab] = useState("users"); // users | orders
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (user?.role !== "ADMIN") return;
    if (tab === "users") loadUsers();
    else loadOrders();
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

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div style={{ maxWidth: 1100 }}>
      <h2>Админ-панель</h2>
      {error && <p style={{ color: "crimson" }}>{String(error)}</p>}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setTab("users")} disabled={tab === "users"}>Пользователи</button>
        <button onClick={() => setTab("orders")} disabled={tab === "orders"}>Заявки</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {tab === "users" && (
            <>
              <input
                placeholder="Поиск по email/имени"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
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
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button onClick={loadOrders}>Применить</button>
              <a href="http://localhost:3001/api/admin/export/orders.csv" target="_blank" rel="noreferrer">
                Экспорт orders.csv
              </a>
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
      ) : (
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
                  <td style={{ borderBottom: "1px solid #eee", padding: 8 }}>
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
