import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, apiUpload } from "../api";
import { useAuthContext } from "../AuthContext";

const profileDefaults = {
  accountKind: "INDIVIDUAL",
  fullName: "",
  companyName: "",
  contactName: "",
  phone: "",
  address: "",
  inn: "",
  kpp: "",
  ogrn: "",
  position: ""
};

const productDefaults = {
  kind: "PRODUCT",
  title: "",
  description: "",
  specs: "",
  categoryLabel: ""
};

export default function MyProducts() {
  const { user } = useAuthContext();
  const nav = useNavigate();
  const [profile, setProfile] = useState(profileDefaults);
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [profileSaving, setProfileSaving] = useState(false);
  const [productDraft, setProductDraft] = useState(productDefaults);
  const [editingProductId, setEditingProductId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!user) nav("/login");
  }, [user, nav]);

  async function loadProfile() {
    const data = await apiFetch("/customer/profile");
    setProfile({ ...profileDefaults, ...(data.profile || {}) });
    setProducts(data.profile?.products || []);
  }

  useEffect(() => {
    if (user?.role === "CUSTOMER") {
      loadProfile().catch(() => setError("Не удалось загрузить профиль покупателя"));
    }
  }, [user]);

  const filteredProducts = useMemo(() => {
    if (filter === "ALL") return products;
    return products.filter((item) => item.kind === filter);
  }, [filter, products]);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch("/customer/profile", {
        method: "PATCH",
        body: JSON.stringify(profile)
      });
      setProfile({ ...profileDefaults, ...(data.profile || {}) });
      setProducts(data.profile?.products || []);
      setSuccess("Профиль покупателя сохранён");
    } catch (err) {
      setError(err?.error || "Не удалось сохранить профиль");
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveProduct(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (editingProductId) {
        await apiFetch(`/customer/products/${editingProductId}`, {
          method: "PATCH",
          body: JSON.stringify(productDraft)
        });
        setSuccess("Продукт обновлён");
      } else {
        await apiFetch("/customer/products", {
          method: "POST",
          body: JSON.stringify(productDraft)
        });
        setSuccess("Продукт создан");
      }
      setProductDraft(productDefaults);
      setEditingProductId(null);
      await loadProfile();
    } catch (err) {
      setError(err?.error || "Не удалось сохранить продукт");
    }
  }

  async function uploadProductDoc(productId, file) {
    setError(null);
    setSuccess(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiUpload(`/customer/products/${productId}/documents`, fd);
      await loadProfile();
      setSuccess("Документ продукта загружен");
    } catch (err) {
      setError(err?.error || "Не удалось загрузить документ продукта");
    }
  }

  if (!user || user.role !== "CUSTOMER") return null;

  return (
    <div style={{ maxWidth: 1120, display: "grid", gap: 20 }}>
      <h2>Мои продукты</h2>
      {error && <div style={{ color: "crimson" }}>{String(error)}</div>}
      {success && <div style={{ color: "green" }}>{success}</div>}

      <section style={{ border: "1px solid #ddd", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
        <div>
          <h3 style={{ marginBottom: 4 }}>Профиль покупателя</h3>
          <div style={{ fontSize: 13, opacity: 0.72 }}>
            Эти данные будут автоматически подтягиваться в заявки на сертификацию и синхронизироваться при изменениях.
          </div>
        </div>
        <form onSubmit={saveProfile} style={{ display: "grid", gap: 12 }}>
          {profile.accountKind === "BUSINESS" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Компания</span>
                <input value={profile.companyName || ""} onChange={(e) => setProfile((prev) => ({ ...prev, companyName: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Контактное лицо</span>
                <input value={profile.contactName || ""} onChange={(e) => setProfile((prev) => ({ ...prev, contactName: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Должность</span>
                <input value={profile.position || ""} onChange={(e) => setProfile((prev) => ({ ...prev, position: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>ИНН</span>
                <input value={profile.inn || ""} onChange={(e) => setProfile((prev) => ({ ...prev, inn: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>КПП</span>
                <input value={profile.kpp || ""} onChange={(e) => setProfile((prev) => ({ ...prev, kpp: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>ОГРН / ОГРНИП</span>
                <input value={profile.ogrn || ""} onChange={(e) => setProfile((prev) => ({ ...prev, ogrn: e.target.value }))} />
              </label>
            </div>
          ) : (
            <label style={{ display: "grid", gap: 6, maxWidth: 420 }}>
              <span>ФИО</span>
              <input value={profile.fullName || ""} onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))} />
            </label>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Телефон</span>
              <input value={profile.phone || ""} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Адрес</span>
              <input value={profile.address || ""} onChange={(e) => setProfile((prev) => ({ ...prev, address: e.target.value }))} />
            </label>
          </div>
          <button type="submit" disabled={profileSaving} style={{ width: "fit-content" }}>
            {profileSaving ? "Сохраняем..." : "Сохранить профиль"}
          </button>
        </form>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "minmax(320px, 400px) 1fr", gap: 20, alignItems: "start" }}>
        <form onSubmit={saveProduct} style={{ border: "1px solid #ddd", borderRadius: 16, padding: 16, display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0 }}>{editingProductId ? "Редактировать продукт" : "Добавить продукт"}</h3>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Тип</span>
            <select value={productDraft.kind} onChange={(e) => setProductDraft((prev) => ({ ...prev, kind: e.target.value }))}>
              <option value="PRODUCT">Товар</option>
              <option value="SERVICE">Услуга</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Название</span>
            <input value={productDraft.title} onChange={(e) => setProductDraft((prev) => ({ ...prev, title: e.target.value }))} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Категория</span>
            <input value={productDraft.categoryLabel} onChange={(e) => setProductDraft((prev) => ({ ...prev, categoryLabel: e.target.value }))} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Описание</span>
            <textarea rows={4} value={productDraft.description} onChange={(e) => setProductDraft((prev) => ({ ...prev, description: e.target.value }))} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Спеки / характеристики</span>
            <textarea rows={4} value={productDraft.specs} onChange={(e) => setProductDraft((prev) => ({ ...prev, specs: e.target.value }))} />
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="submit">{editingProductId ? "Сохранить изменения" : "Создать продукт"}</button>
            {editingProductId && (
              <button type="button" onClick={() => { setEditingProductId(null); setProductDraft(productDefaults); }}>
                Отмена
              </button>
            )}
          </div>
        </form>

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Список продуктов</h3>
            {[
              ["ALL", "Все"],
              ["PRODUCT", "Товары"],
              ["SERVICE", "Услуги"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                style={{ background: filter === value ? "#ecebff" : "white" }}
              >
                {label}
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div style={{ border: "1px dashed #ccc", borderRadius: 16, padding: 16 }}>
              Пока нет продуктов. Создайте товар или услугу, чтобы затем выбирать их при покупке сертификации.
            </div>
          ) : (
            filteredProducts.map((product) => (
              <article key={product.id} style={{ border: "1px solid #ddd", borderRadius: 16, padding: 16, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.72 }}>{product.kind === "PRODUCT" ? "Товар" : "Услуга"}</div>
                    <h4 style={{ margin: "4px 0" }}>{product.title}</h4>
                    {product.categoryLabel && <div style={{ fontSize: 13 }}>Категория: {product.categoryLabel}</div>}
                  </div>
                  <button type="button" onClick={() => { setEditingProductId(product.id); setProductDraft({ kind: product.kind, title: product.title, description: product.description || "", specs: product.specs || "", categoryLabel: product.categoryLabel || "" }); }}>
                    Редактировать
                  </button>
                </div>

                {product.description && <div>{product.description}</div>}
                {product.specs && <div style={{ fontSize: 14, whiteSpace: "pre-wrap" }}><b>Спеки:</b> {product.specs}</div>}

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>{product.documentsLabel || "Документы Товара/Услуги"}</div>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadProductDoc(product.id, file);
                      e.target.value = "";
                    }}
                  />
                  {product.documents?.length ? (
                    <ul>
                      {product.documents.map((doc) => (
                        <li key={doc.id}>
                          <a href={`http://localhost:3001/api/customer/products/${product.id}/documents/${doc.id}/download`} target="_blank" rel="noreferrer">
                            {doc.fileName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 13, opacity: 0.68 }}>Документы пока не загружены.</div>
                  )}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontWeight: 700 }}>Полученные сертификаты</div>
                  {product.certificates?.length ? (
                    <ul style={{ display: "grid", gap: 6 }}>
                      {product.certificates.map((certificate) => (
                        <li key={certificate.id}>
                          <b>{certificate.title}</b> — {certificate.certNumber} · {new Date(certificate.issuedAt).toLocaleDateString()} ·{" "}
                          <Link to={`/orders/${certificate.order.id}`}>заявка #{certificate.order.id}</Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 13, opacity: 0.68 }}>
                      После успешного закрытия заявки здесь появятся сертификаты, полученные на этот продукт.
                    </div>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
