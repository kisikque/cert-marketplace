import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { clearCart, getCart, removeItem, setQty } from "../cart";

export default function CartPage() {
  const { user } = useAuthContext();
  const nav = useNavigate();

  const [cart, setCart] = useState(getCart());
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) nav("/login");
  }, [user, nav]);

  useEffect(() => {
    Promise.all([apiFetch("/services"), apiFetch("/customer/profile")])
      .then(([servicesData, profileData]) => {
        setServices(servicesData.services || []);
        setProducts(profileData.profile?.products || []);
        const firstProductId = profileData.profile?.products?.[0]?.id || "";
        setSelectedProductId((prev) => prev || firstProductId);
      })
      .catch(() => setError("Не удалось загрузить каталог или продукты"));
  }, []);

  const rows = useMemo(() => {
    const byId = new Map(services.map((s) => [s.id, s]));
    return cart.items
      .map((it) => {
        const s = byId.get(it.serviceId);
        return s ? { ...it, service: s } : null;
      })
      .filter(Boolean);
  }, [cart.items, services]);

  const total = useMemo(() => {
    return rows.reduce((sum, r) => sum + (r.service.priceFrom || 0) * r.qty, 0);
  }, [rows]);

  function onRemove(serviceId) {
    setCart(removeItem(serviceId));
  }

  function onQty(serviceId, qty) {
    setCart(setQty(serviceId, qty));
  }

  function onClear() {
    clearCart();
    setCart(getCart());
  }

  async function checkout() {
    setError(null);
    if (!selectedProductId) {
      setError("Перед оформлением заявки выберите продукт из раздела «Мои продукты»");
      return;
    }

    try {
      const payload = {
        items: cart.items,
        customerComment: null,
        clientProductId: selectedProductId
      };
      const res = await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      clearCart();
      setCart(getCart());
      nav(`/orders/${res.orderId}`);
    } catch (e) {
      setError(e?.error || "Не удалось оформить заявку");
    }
  }

  if (!user) return null;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Корзина</h2>
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {rows.length === 0 ? (
        <p>Корзина пуста.</p>
      ) : (
        <>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, marginBottom: 16, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 700 }}>Продукт для сертификации</div>
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="">— выберите товар/услугу —</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.kind === "PRODUCT" ? "Товар" : "Услуга"}: {product.title}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 13, opacity: 0.72 }}>
              Нет подходящего продукта? <Link to="/products">Создайте его в разделе «Мои продукты»</Link>.
            </div>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r) => (
              <div
                key={r.serviceId}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12
                }}
              >
                <div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{r.service.providerName}</div>
                  <div style={{ fontWeight: 700 }}>{r.service.title}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>Цена: {r.service.priceFrom ?? "—"} ₽</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => onQty(r.serviceId, r.qty - 1)}>-</button>
                  <div style={{ minWidth: 24, textAlign: "center" }}>{r.qty}</div>
                  <button onClick={() => onQty(r.serviceId, r.qty + 1)}>+</button>

                  <button onClick={() => onRemove(r.serviceId)} style={{ marginLeft: 12 }}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
            <button onClick={onClear}>Очистить корзину</button>
            <div style={{ fontWeight: 700 }}>Итого: {total} ₽</div>
          </div>

          <div style={{ marginTop: 12 }}>
            <button onClick={checkout}>Оформить заявку</button>
          </div>
        </>
      )}
    </div>
  );
}
