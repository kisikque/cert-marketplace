import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, apiUpload } from "../api";
import { useAuthContext } from "../AuthContext";
import { CERTIFICATION_KINDS, SERVICE_CATEGORIES, getCategoryMeta } from "../serviceCategories";

const PROVIDER_DOCUMENT_TYPES = [
  { value: "REGISTRATION_DOC", label: "Регистрационный документ" },
  { value: "TAX_DOC", label: "ИНН / налоговый документ" },
  { value: "OTHER", label: "Другой документ" }
];

const API_BASE = "http://localhost:3001";
const getImageSrc = (value) => (value?.startsWith("http") ? value : `${API_BASE}${value}`);

function getServiceTagIds(service) {
  return (service.tags || []).map((x) => x.tag?.id).filter(Boolean);
}

export default function ProviderServices() {
  const { user, refresh } = useAuthContext();
  const nav = useNavigate();

  const [services, setServices] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [verificationDocuments, setVerificationDocuments] = useState([]);
  const [verificationMeta, setVerificationMeta] = useState(null);
  const [profile, setProfile] = useState(null);

  const [verificationDocType, setVerificationDocType] = useState(PROVIDER_DOCUMENT_TYPES[0].value);
  const [verificationFile, setVerificationFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [serviceImageFile, setServiceImageFile] = useState(null);
  const [uploadingVerificationDoc, setUploadingVerificationDoc] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState(null);

  const [internalCode, setInternalCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [etaDaysFrom, setEtaDaysFrom] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState(SERVICE_CATEGORIES[0].value);
  const [certificationKind, setCertificationKind] = useState(CERTIFICATION_KINDS[0].value);

  const [profileForm, setProfileForm] = useState({
    orgName: "",
    inn: "",
    description: "",
    website: "",
    phone: "",
    address: ""
  });

  const [tagEditorId, setTagEditorId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "PROVIDER") nav("/");
  }, [user, nav]);

  async function load() {
    setError(null);
    try {
      const [servicesData, tagsData, verificationData, profileData] = await Promise.all([
        apiFetch("/provider/services"),
        apiFetch("/provider/tags"),
        apiFetch("/provider-verification-docs/me"),
        apiFetch("/provider/profile")
      ]);

      setServices(servicesData.services || []);
      setAllTags(tagsData.tags || []);
      setVerificationDocuments(verificationData.documents || []);
      setVerificationMeta(verificationData.providerProfile || null);
      setProfile(profileData.profile || null);
      setProfileForm({
        orgName: profileData.profile?.orgName || "",
        inn: profileData.profile?.inn || "",
        description: profileData.profile?.description || "",
        website: profileData.profile?.website || "",
        phone: profileData.profile?.phone || "",
        address: profileData.profile?.address || ""
      });
    } catch (e) {
      setError(e?.error || "Не удалось загрузить данные");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createService(e) {
    e.preventDefault();
    setError(null);
    try {
      let nextImageUrl = imageUrl || null;
      if (serviceImageFile) {
        setUploadingServiceImage(true);
        const fd = new FormData();
        fd.append("file", serviceImageFile);
        const uploadData = await apiUpload("/provider/services/upload-image", fd);
        nextImageUrl = uploadData.imageUrl;
      }

      await apiFetch("/provider/services", {
        method: "POST",
        body: JSON.stringify({
          internalCode,
          title,
          description,
          category,
          certificationKind: category === "CERTIFICATION" ? certificationKind : null,
          priceFrom: priceFrom ? Number(priceFrom) : null,
          etaDaysFrom: etaDaysFrom ? Number(etaDaysFrom) : null,
          imageUrl: nextImageUrl
        })
      });
      setInternalCode("");
      setTitle("");
      setDescription("");
      setPriceFrom("");
      setEtaDaysFrom("");
      setImageUrl("");
      setCategory(SERVICE_CATEGORIES[0].value);
      setCertificationKind(CERTIFICATION_KINDS[0].value);
      setServiceImageFile(null);
      await load();
    } catch (e2) {
      setError(e2?.error || "Ошибка создания услуги");
    } finally {
      setUploadingServiceImage(false);
    }
  }

  async function toggleActive(service) {
    try {
      await apiFetch(`/provider/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !service.isActive })
      });
      await load();
    } catch (e) {
      setError(e?.error || "Не удалось изменить статус услуги");
    }
  }

  async function softDelete(id) {
    await apiFetch(`/provider/services/${id}`, { method: "DELETE" });
    await load();
  }

  const currentService = useMemo(
    () => services.find((x) => x.id === tagEditorId) || null,
    [services, tagEditorId]
  );

  function openTagEditor(service) {
    setTagEditorId(service.id);
    setSelectedTagIds(getServiceTagIds(service));
  }

  function toggleTag(tagId) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((x) => x !== tagId) : [...prev, tagId]
    );
  }

  async function saveTags() {
    if (!tagEditorId) return;
    setSavingTags(true);
    setError(null);
    try {
      await apiFetch(`/provider/services/${tagEditorId}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tagIds: selectedTagIds })
      });
      setTagEditorId(null);
      setSelectedTagIds([]);
      await load();
    } catch (e) {
      setError(e?.error || "Не удалось сохранить теги");
    } finally {
      setSavingTags(false);
    }
  }

  async function uploadVerificationDocument(e) {
    e.preventDefault();
    if (!verificationFile) {
      setError("Выберите файл для верификации");
      return;
    }

    setUploadingVerificationDoc(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", verificationFile);
      fd.append("documentType", verificationDocType);
      await apiUpload("/provider-verification-docs", fd);
      setVerificationFile(null);
      await refresh?.();
      await load();
    } catch (e2) {
      setError(e2?.error || "Не удалось загрузить документ верификации");
    } finally {
      setUploadingVerificationDoc(false);
    }
  }

  async function removeVerificationDocument(id) {
    try {
      await apiFetch(`/provider-verification-docs/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e?.error || "Не удалось удалить документ");
    }
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setError(null);
    try {
      await apiFetch("/provider/profile", {
        method: "PATCH",
        body: JSON.stringify(profileForm)
      });
      await refresh?.();
      await load();
    } catch (e) {
      setError(e?.error || "Не удалось сохранить профиль провайдера");
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadLogo(e) {
    e.preventDefault();
    if (!logoFile) {
      setError("Выберите логотип");
      return;
    }

    setUploadingLogo(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", logoFile);
      await apiUpload("/provider/profile/logo", fd);
      setLogoFile(null);
      await load();
    } catch (e) {
      setError(e?.error || "Не удалось загрузить логотип");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function removeLogo() {
    try {
      await apiFetch("/provider/profile/logo", { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e?.error || "Не удалось удалить логотип");
    }
  }

  if (!user || user.role !== "PROVIDER") return null;

  return (
    <div style={{ maxWidth: 980 }}>
      <h2>Мои услуги</h2>
      {error && <p style={{ color: "crimson" }}>{String(error)}</p>}

      {profile && (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, marginBottom: 16, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>Публичный профиль провайдера</h3>
              <div style={{ fontSize: 13, opacity: 0.75 }}>
                Заполните данные компании, которые увидит покупатель на вашей публичной странице.
              </div>
            </div>
            {profile.publicSlug && verificationMeta?.verificationStatus === "APPROVED" && (
              <Link to={`/providers/${profile.publicSlug}`} target="_blank" rel="noreferrer">
                Открыть публичный профиль
              </Link>
            )}
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ width: 120, display: "grid", gap: 10 }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 24,
                  overflow: "hidden",
                  border: "1px solid #ddd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fafafa"
                }}
              >
                {profile.logoUrl ? (
                  <img src={getImageSrc(profile.logoUrl)} alt={profile.orgName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 32, opacity: 0.35 }}>{profile.orgName?.slice(0, 1) || "P"}</span>
                )}
              </div>
              <form onSubmit={uploadLogo} style={{ display: "grid", gap: 8 }}>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
                <button type="submit" disabled={uploadingLogo}>{uploadingLogo ? "Загрузка..." : "Загрузить логотип"}</button>
              </form>
              {profile.logoUrl && <button onClick={removeLogo}>Удалить логотип</button>}
              <div style={{ fontSize: 12, opacity: 0.7 }}>PNG/JPG/WEBP, до 2 MB. Рекомендуемый размер 400×400 px.</div>
            </div>

            <form onSubmit={saveProfile} style={{ flex: 1, display: "grid", gap: 8, minWidth: 280 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Название компании</span>
                <input value={profileForm.orgName} onChange={(e) => setProfileForm((prev) => ({ ...prev, orgName: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>ИНН</span>
                <input value={profileForm.inn} onChange={(e) => setProfileForm((prev) => ({ ...prev, inn: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Описание</span>
                <textarea rows={4} value={profileForm.description} onChange={(e) => setProfileForm((prev) => ({ ...prev, description: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Сайт</span>
                <input value={profileForm.website} onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))} placeholder="https://example.com" />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Телефон</span>
                <input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Адрес</span>
                <input value={profileForm.address} onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))} />
              </label>
              <button type="submit" disabled={savingProfile}>{savingProfile ? "Сохраняем..." : "Сохранить профиль"}</button>
            </form>
          </div>
        </div>
      )}

      {verificationMeta && (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, marginBottom: 16, display: "grid", gap: 10 }}>
          <div>
            <strong>Статус верификации:</strong> {verificationMeta.verificationStatus}
          </div>
          {user.providerVerificationComment && (
            <div>
              <strong>Комментарий администратора:</strong> {user.providerVerificationComment}
            </div>
          )}
          {verificationMeta.verificationStatus !== "APPROVED" && (
            <div style={{ fontSize: 14 }}>
              Пока верификация не подтверждена, новые услуги будут создаваться неактивными и публичный профиль будет скрыт от покупателей.
            </div>
          )}

          <form onSubmit={uploadVerificationDocument} style={{ display: "grid", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>Документы компании</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select value={verificationDocType} onChange={(e) => setVerificationDocType(e.target.value)}>
                {PROVIDER_DOCUMENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
              <input type="file" onChange={(e) => setVerificationFile(e.target.files?.[0] || null)} />
              <button type="submit" disabled={uploadingVerificationDoc}>
                {uploadingVerificationDoc ? "Загрузка..." : "Добавить документ"}
              </button>
            </div>
          </form>

          {verificationDocuments.length === 0 ? (
            <div>Документы для проверки пока не загружены.</div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {verificationDocuments.map((doc) => (
                <li key={doc.id} style={{ marginBottom: 8 }}>
                  <a href={`http://localhost:3001/api/provider-verification-docs/${doc.id}/download`} target="_blank" rel="noreferrer">
                    {doc.fileName}
                  </a>{" "}
                  <span style={{ fontSize: 13, opacity: 0.75 }}>
                    ({doc.documentType || "без типа"}, {Math.round(doc.size / 1024)} KB)
                  </span>
                  <button type="button" style={{ marginLeft: 8 }} onClick={() => removeVerificationDocument(doc.id)}>
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={createService} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
        <h3>Создать услугу</h3>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 2fr" }}>
          <label>Код</label>
          <input value={internalCode} onChange={(e) => setInternalCode(e.target.value)} />

          <label>Название</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />

          <label>Описание</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} />

          <label>Категория</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {SERVICE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>{item.title}</option>
            ))}
          </select>

          <label>Подтип сертификации</label>
          <select value={certificationKind} disabled={category !== "CERTIFICATION"} onChange={(e) => setCertificationKind(e.target.value)}>
            {CERTIFICATION_KINDS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <label>Цена от</label>
          <input value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />

          <label>Срок от (дней)</label>
          <input value={etaDaysFrom} onChange={(e) => setEtaDaysFrom(e.target.value)} />

          <label>Ссылка на фото</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/service-images/... или внешний URL" />

          <label>Загрузить фото</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setServiceImageFile(e.target.files?.[0] || null)} />
        </div>
        <button style={{ marginTop: 10 }} type="submit">
          {uploadingServiceImage ? "Загружаем фото..." : "Создать"}
        </button>
      </form>

      {currentService && (
        <div style={{ marginTop: 16, border: "1px solid #ddd", padding: 12, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{currentService.internalCode}</div>
              <div style={{ fontWeight: 700 }}>{currentService.title}</div>
              <div style={{ marginTop: 8 }}>Теги:</div>
            </div>
            <button type="button" onClick={() => setTagEditorId(null)}>Закрыть</button>
          </div>

          {allTags.length === 0 ? (
            <p>Тегов пока нет.</p>
          ) : (
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              {allTags.map((t) => (
                <label
                  key={t.id}
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: 999,
                    padding: "4px 10px",
                    display: "flex",
                    gap: 6,
                    alignItems: "center"
                  }}
                >
                  <input type="checkbox" checked={selectedTagIds.includes(t.id)} onChange={() => toggleTag(t.id)} />
                  {t.name}
                </label>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <button type="button" disabled={savingTags} onClick={saveTags}>
              {savingTags ? "Сохраняем..." : "Сохранить теги"}
            </button>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 16 }}>Список</h3>
      {services.length === 0 ? (
        <p>Услуг пока нет.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {services.map((service) => (
            <div key={service.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              {service.imageUrl && (
                <div style={{ marginBottom: 10, borderRadius: 12, overflow: "hidden", border: "1px solid #ddd", width: 220, maxWidth: "100%", aspectRatio: "16 / 9" }}>
                  <img src={getImageSrc(service.imageUrl)} alt={service.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div style={{ fontSize: 12, opacity: 0.7 }}>{service.internalCode}</div>
              <div style={{ fontWeight: 700 }}>
                {service.title} {service.isActive ? "" : "(выключена)"}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>
                {getCategoryMeta(service.category).title}
                {service.certificationKind
                  ? ` · ${CERTIFICATION_KINDS.find((item) => item.value === service.certificationKind)?.label || service.certificationKind}`
                  : ""}
              </div>
              <div style={{ marginTop: 4, fontSize: 13 }}>
                {service.ratingCount ? `★ ${service.ratingAvg.toFixed(1)} (${service.ratingCount})` : "Пока без оценок"}
              </div>
              <div style={{ marginTop: 6, fontSize: 13 }}>{service.description}</div>

              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(service.tags || []).map((x) => (
                  <span
                    key={x.tag.id}
                    style={{ fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid #ddd" }}
                  >
                    {x.tag.name}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: 8 }}>
                <button type="button" onClick={() => openTagEditor(service)}>Теги</button>
                <button type="button" onClick={() => toggleActive(service)} style={{ marginLeft: 8 }}>
                  {service.isActive ? "Выключить" : "Включить"}
                </button>
                <button type="button" onClick={() => softDelete(service.id)} style={{ marginLeft: 8 }}>
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
