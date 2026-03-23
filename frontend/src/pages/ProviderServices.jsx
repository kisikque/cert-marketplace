import { useEffect, useState } from "react";
import { apiFetch, apiUpload } from "../api";
import { useAuthContext } from "../AuthContext";
import { useNavigate } from "react-router-dom";

const CATEGORY_OPTIONS = [
  { value: "CERTIFICATION", label: "Сертификация" },
  { value: "SUPPORT", label: "Сопровождение" },
  { value: "CONSULTING", label: "Консультации" }
];

const CERTIFICATION_KIND_OPTIONS = [
  { value: "MANDATORY", label: "Обязательная" },
  { value: "VOLUNTARY", label: "Добровольная" }
];

const emptyService = {
  internalCode: "",
  title: "",
  description: "",
  category: "CERTIFICATION",
  certificationKind: "MANDATORY",
  priceFrom: "",
  etaDaysFrom: "",
  imageUrl: ""
};

export default function ProviderServices() {
  const { user } = useAuthContext();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [profileForm, setProfileForm] = useState({ orgName: "", inn: "", description: "", website: "", phone: "", address: "" });
  const [serviceForm, setServiceForm] = useState(emptyService);
  const [serviceImageFile, setServiceImageFile] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "PROVIDER") nav("/");
  }, [user, nav]);

  async function loadData() {
    const [profileData, servicesData] = await Promise.all([apiFetch("/provider/profile"), apiFetch("/provider/services")]);
    setProfile(profileData.profile || null);
    setServices(servicesData.services || []);
    setProfileForm({
      orgName: profileData.profile?.orgName || "",
      inn: profileData.profile?.inn || "",
      description: profileData.profile?.description || "",
      website: profileData.profile?.website || "",
      phone: profileData.profile?.phone || "",
      address: profileData.profile?.address || ""
    });
  }

  useEffect(() => {
    if (user?.role === "PROVIDER") {
      loadData().catch(() => setError("Не удалось загрузить кабинет провайдера"));
    }
  }, [user]);

  async function saveProfile(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch("/provider/profile", { method: "PATCH", body: JSON.stringify(profileForm) });
      await loadData();
      setSuccess("Профиль провайдера сохранён");
    } catch (err) {
      setError(err?.error || "Не удалось сохранить профиль провайдера");
    } finally {
      setLoading(false);
    }
  }

  async function createService(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let imageUrl = serviceForm.imageUrl;
      if (serviceImageFile) {
        const fd = new FormData();
        fd.append("file", serviceImageFile);
        const uploadData = await apiUpload("/provider/services/upload-image", fd);
        imageUrl = uploadData.imageUrl;
      }

      await apiFetch("/provider/services", {
        method: "POST",
        body: JSON.stringify({
          ...serviceForm,
          priceFrom: serviceForm.priceFrom ? Number(serviceForm.priceFrom) : null,
          etaDaysFrom: serviceForm.etaDaysFrom ? Number(serviceForm.etaDaysFrom) : null,
          imageUrl
        })
      });

      setServiceForm(emptyService);
      setServiceImageFile(null);
      await loadData();
      setSuccess("Услуга создана");
    } catch (err) {
      setError(err?.error || "Не удалось создать услугу");
    } finally {
      setLoading(false);
    }
  }

  if (!user || user.role !== "PROVIDER") return null;

  return (
    <div style={{ maxWidth: 1100, display: "grid", gap: 20 }}>
      <h2>Кабинет провайдера</h2>
      {error && <div style={{ color: "crimson" }}>{String(error)}</div>}
      {success && <div style={{ color: "green" }}>{success}</div>}

      <section style={{ border: "1px solid #ddd", borderRadius: 16, padding: 16, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Профиль провайдера</h3>
        {profile && (
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Статус верификации: <b>{profile.verificationStatus}</b>
          </div>
        )}
        <form onSubmit={saveProfile} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Организация</span>
              <input value={profileForm.orgName} onChange={(e) => setProfileForm((prev) => ({ ...prev, orgName: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>ИНН</span>
              <input value={profileForm.inn} onChange={(e) => setProfileForm((prev) => ({ ...prev, inn: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Телефон</span>
              <input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Адрес</span>
              <input value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Сайт</span>
              <input value={profileForm.website} onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))} />
            </label>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Описание</span>
            <textarea rows={4} value={profileForm.description} onChange={(e) => setProfileForm((prev) => ({ ...prev, description: e.target.value }))} />
          </label>
          <button type="submit" disabled={loading} style={{ width: "fit-content" }}>
            {loading ? "Сохраняем..." : "Сохранить профиль"}
          </button>
        </form>
      </section>

      <section style={{ border: "1px solid #ddd", borderRadius: 16, padding: 16, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Добавить услугу</h3>
        <form onSubmit={createService} style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Внутренний код</span>
              <input value={serviceForm.internalCode} onChange={(e) => setServiceForm((prev) => ({ ...prev, internalCode: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Название</span>
              <input value={serviceForm.title} onChange={(e) => setServiceForm((prev) => ({ ...prev, title: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Категория</span>
              <select value={serviceForm.category} onChange={(e) => setServiceForm((prev) => ({ ...prev, category: e.target.value }))}>
                {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {serviceForm.category === "CERTIFICATION" && (
              <label style={{ display: "grid", gap: 6 }}>
                <span>Тип сертификации</span>
                <select value={serviceForm.certificationKind} onChange={(e) => setServiceForm((prev) => ({ ...prev, certificationKind: e.target.value }))}>
                  {CERTIFICATION_KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            )}
            <label style={{ display: "grid", gap: 6 }}>
              <span>Цена от</span>
              <input type="number" value={serviceForm.priceFrom} onChange={(e) => setServiceForm((prev) => ({ ...prev, priceFrom: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Срок от, дней</span>
              <input type="number" value={serviceForm.etaDaysFrom} onChange={(e) => setServiceForm((prev) => ({ ...prev, etaDaysFrom: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Фото услуги</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setServiceImageFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Описание</span>
            <textarea rows={4} value={serviceForm.description} onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))} />
          </label>
          <button type="submit" disabled={loading} style={{ width: "fit-content" }}>
            {loading ? "Сохраняем..." : "Создать услугу"}
          </button>
        </form>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Мои услуги</h3>
        {services.length === 0 ? (
          <div style={{ border: "1px dashed #ccc", borderRadius: 16, padding: 16 }}>Услуг пока нет.</div>
        ) : (
          services.map((service) => (
            <article key={service.id} style={{ border: "1px solid #ddd", borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{service.internalCode}</div>
              <div style={{ fontWeight: 700, marginTop: 4 }}>{service.title}</div>
              <div style={{ marginTop: 6, fontSize: 13, opacity: 0.78 }}>
                {CATEGORY_OPTIONS.find((item) => item.value === service.category)?.label || service.category}
              </div>
              <div style={{ marginTop: 6 }}>{service.description}</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Цена от: {service.priceFrom ?? "—"} ₽ · Срок от: {service.etaDaysFrom ?? "—"} дн.
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
