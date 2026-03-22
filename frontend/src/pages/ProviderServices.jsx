import { useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload } from "../api";
import { useAuthContext } from "../AuthContext";
import { useNavigate } from "react-router-dom";

const PROVIDER_DOCUMENT_TYPES = [
  { value: "REGISTRATION_DOC", label: "Регистрационный документ" },
  { value: "TAX_DOC", label: "ИНН / налоговый документ" },
  { value: "OTHER", label: "Другой документ" }
];

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
  const [verificationDocType, setVerificationDocType] = useState(PROVIDER_DOCUMENT_TYPES[0].value);
  const [verificationFile, setVerificationFile] = useState(null);
  const [error, setError] = useState(null);
  const [uploadingVerificationDoc, setUploadingVerificationDoc] = useState(false);

  const [internalCode, setInternalCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [etaDaysFrom, setEtaDaysFrom] = useState("");

  const [tagEditorId, setTagEditorId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "PROVIDER") nav("/");
  }, [user, nav]);

  async function load() {
    setError(null);
    try {
      const [s, t, v] = await Promise.all([
        apiFetch("/provider/services"),
        apiFetch("/provider/tags"),
        apiFetch("/provider-verification-docs/me")
      ]);
      setServices(s.services || []);
      setAllTags(t.tags || []);
      setVerificationDocuments(v.documents || []);
      setVerificationMeta(v.providerProfile || null);
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
      await apiFetch("/provider/services", {
        method: "POST",
        body: JSON.stringify({
          internalCode,
          title,
          description,
          priceFrom: priceFrom ? Number(priceFrom) : null,
          etaDaysFrom: etaDaysFrom ? Number(etaDaysFrom) : null
        })
      });
      setInternalCode("");
      setTitle("");
      setDescription("");
      setPriceFrom("");
      setEtaDaysFrom("");
      await load();
    } catch (e2) {
      setError(e2?.error || "Ошибка создания услуги");
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

  if (!user || user.role !== "PROVIDER") return null;

  return (
    <div style={{ maxWidth: 980 }}>
      <h2>Мои услуги</h2>
      {error && <p style={{ color: "crimson" }}>{String(error)}</p>}

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
              Пока верификация не подтверждена, новые услуги будут создаваться неактивными.
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
                  <button style={{ marginLeft: 8 }} onClick={() => removeVerificationDocument(doc.id)}>
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

          <label>Цена от</label>
          <input value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} />

          <label>Срок от (дней)</label>
          <input value={etaDaysFrom} onChange={(e) => setEtaDaysFrom(e.target.value)} />
        </div>
        <button style={{ marginTop: 10 }} type="submit">
          Создать
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
            <button onClick={() => setTagEditorId(null)}>Закрыть</button>
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
            <button disabled={savingTags} onClick={saveTags}>
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
              <div style={{ fontSize: 12, opacity: 0.7 }}>{service.internalCode}</div>
              <div style={{ fontWeight: 700 }}>
                {service.title} {service.isActive ? "" : "(выключена)"}
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
                <button onClick={() => openTagEditor(service)}>Теги</button>
                <button onClick={() => toggleActive(service)} style={{ marginLeft: 8 }}>
                  {service.isActive ? "Выключить" : "Включить"}
                </button>
                <button onClick={() => softDelete(service.id)} style={{ marginLeft: 8 }}>
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
