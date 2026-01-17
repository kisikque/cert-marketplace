import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";

export default function Login({ onLogin }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@demo.ru");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      await onLogin?.(); // refresh /me
      nav("/");
    } catch (err) {
      setError(err?.error || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Вход</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div style={{ color: "crimson" }}>{String(error)}</div>}

        <button disabled={loading} type="submit">
          {loading ? "Входим..." : "Войти"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
      </p>

      <details style={{ marginTop: 12 }}>
        <summary>Демо-аккаунты</summary>
        <ul>
          <li>ADMIN: admin@demo.ru / Admin123!</li>
          <li>PROVIDER: provider@demo.ru / Provider123!</li>
          <li>CUSTOMER: customer@demo.ru / Customer123!</li>
        </ul>
      </details>
    </div>
  );
}
