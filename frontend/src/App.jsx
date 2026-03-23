import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { AuthContext } from "./AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CartPage from "./pages/Cart";
import MyOrders from "./pages/MyOrders";
import OrderDetails from "./pages/OrderDetails";
import ProviderOrders from "./pages/ProviderOrders";
import ProviderOrderDetails from "./pages/ProviderOrderDetails";
import ProviderServices from "./pages/ProviderServices";
import ProviderProfile from "./pages/ProviderProfile";
import AdminPanel from "./pages/AdminPanel";
import ServiceCategoryPage from "./pages/ServiceCategoryPage";
import MyProducts from "./pages/MyProducts";

function RoleBadge({ role }) {
  const style = {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid #ca04fc",
    marginLeft: 8
  };
  return <span style={style}>{role}</span>;
}

export default function App() {
  const { user, loading, refresh, logout } = useAuth();

  if (loading) return <p style={{ padding: 12 }}>Загрузка...</p>;

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      <BrowserRouter>
        <header
          style={{
            padding: 12,
            borderBottom: "3px solid #00eeff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link to="/" style={{ fontWeight: 700 }}>
              Cert Marketplace
            </Link>
            <Link to="/">Витрина</Link>
            <Link to="/services/certification">Сертификация</Link>
            <Link to="/services/support">Сопровождение</Link>
            <Link to="/services/consulting">Консультации</Link>
            <Link to="/cart">Корзина</Link>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {user ? (
              <>
                <span>
                  {user.displayName || user.email}
                  <RoleBadge role={user.role} />
                </span>

                {user.role === "CUSTOMER" && (
                  <>
                    <Link to="/products">Мои продукты</Link>
                    <Link to="/orders">Мои заявки</Link>
                    <Link to="/cart">Корзина</Link>
                  </>
                )}

                {user.role === "PROVIDER" && (
                  <>
                    <Link to="/provider/orders">Кабинет заявок</Link>
                    <Link to="/provider/services">Мои услуги</Link>
                  </>
                )}

                {user.role === "ADMIN" && <Link to="/admin">Админка</Link>}

                <button onClick={logout}>Выйти</button>
              </>
            ) : (
              <>
                <Link to="/login">Войти</Link>
                <Link to="/register">Регистрация</Link>
              </>
            )}
          </div>
        </header>

        <main style={{ padding: 12 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services/:slug" element={<ServiceCategoryPage />} />
            <Route path="/providers/:slug" element={<ProviderProfile />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={refresh} />} />
            <Route path="/register" element={user ? <Navigate to="/" /> : <Register onLogin={refresh} />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/products" element={<MyProducts />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/provider/orders" element={<ProviderOrders />} />
            <Route path="/provider/orders/:id" element={<ProviderOrderDetails />} />
            <Route path="/provider/services" element={<ProviderServices />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
