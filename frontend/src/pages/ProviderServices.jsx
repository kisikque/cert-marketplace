import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, apiUpload } from "../api";
import { useAuthContext } from "../AuthContext";

const API_BASE = "http://localhost:3001";
const getImageSrc = (value) =>
  value?.startsWith("http") ? value : `${API_BASE}${value}`;

function getServiceTagIds(service) {
  return (service.tags || []).map((x) => x.tag?.id).filter(Boolean);
}

export default function ProviderServices() {
  const { user } = useAuthContext();
  const nav = useNavigate();

  const [services, setServices] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const [serviceImageFile, setServiceImageFile] = useState(null);
  const [uploadingServiceImage, setUploadingServiceImage] = useState(false);

  const [error, setError] = useState(null);

  const [verificationBlockedModalOpen, setVerificationBlockedModalOpen] =
    useState(false);
  const [verificationBlockedMessage, setVerificationBlockedMessage] =
    useState("");

  const [internalCode, setInternalCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [etaDaysFrom, setEtaDaysFrom] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [tagEditorId, setTagEditorId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "PROVIDER") {
      nav("/");
    }
  }, [user, nav]);

  async function load() {
    setError(null);

    try {
      const [servicesData, tagsData] = await Promise.all([
        apiFetch("/provider/services"),
        apiFetch("/provider/tags"),
      ]);

      setServices(servicesData.services || []);
      setAllTags(tagsData.tags || []);
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
          priceFrom: priceFrom ? Number(priceFrom) : null,
          etaDaysFrom: etaDaysFrom ? Number(etaDaysFrom) : null,
          imageUrl: nextImageUrl,
        }),
      });

      setInternalCode("");
      setTitle("");
      setDescription("");
      setPriceFrom("");
      setEtaDaysFrom("");
      setImageUrl("");
      setServiceImageFile(null);

      await load();
    } catch (e) {
      setError(e?.error || "Ошибка создания услуги");
    } finally {
      setUploadingServiceImage(false);
    }
  }

  async function toggleActive(service) {
    const nextIsActive = !service.isActive;

    if (
      nextIsActive &&
      user?.providerVerificationStatus !== "APPROVED"
    ) {
      setVerificationBlockedMessage(
        "Невозможно включить услугу, пока аккаунт провайдера не подтверждён. Загрузите документы и дождитесь одобрения."
      );
      setVerificationBlockedModalOpen(true);
      return;
    }

    try {
      await apiFetch(`/provider/services/${service.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      await load();
    } catch (e) {
      setError(e?.error || "Не удалось изменить статус услуги");
    }
  }

  async function softDelete(id) {
    try {
      await apiFetch(`/provider/services/${id}`, {
        method: "DELETE",
      });

      await load();
    } catch (e) {
      setError(e?.error || "Не удалось удалить услугу");
    }
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
      prev.includes(tagId)
        ? prev.filter((x) => x !== tagId)
        : [...prev, tagId]
    );
  }

  async function saveTags() {
    if (!tagEditorId) return;

    setSavingTags(true);
    setError(null);

    try {
      await apiFetch(`/provider/services/${tagEditorId}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tagIds: selectedTagIds }),
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

  if (!user || user.role !== "PROVIDER") return null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Мои услуги</h2>

      {error && (
        <div
          style={{
            border: "1px solid #f1b5b5",
            background: "#fff5f5",
            color: "#9b1c1c",
            padding: 12,
            borderRadius: 10,
          }}
        >
          {String(error)}
        </div>
      )}

      <form
        onSubmit={createService}
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          display: "grid",
          gap: 12,
        }}
      >
        <h3 style={{ margin: 0 }}>Создать услугу</h3>

        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "220px minmax(0, 1fr)",
            alignItems: "center",
          }}
        >
          <label>Код</label>
          <input
            value={internalCode}
            onChange={(e) => setInternalCode(e.target.value)}
          />

          <label>Название</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />

          <label>Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />

          <label>Цена от</label>
          <input
            value={priceFrom}
            onChange={(e) => setPriceFrom(e.target.value)}
            type="number"
            min="0"
          />

          <label>Срок от (дней)</label>
          <input
            value={etaDaysFrom}
            onChange={(e) => setEtaDaysFrom(e.target.value)}
            type="number"
            min="0"
          />

          <label>Ссылка на фото</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="/service-images/example.jpg или https://..."
          />

          <label>Загрузить фото</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setServiceImageFile(e.target.files?.[0] || null)}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="submit" disabled={uploadingServiceImage}>
            {uploadingServiceImage ? "Загрузка..." : "Создать услугу"}
          </button>

          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Если загружен файл, он будет использован вместо ссылки.
          </div>
        </div>
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {services.length === 0 ? (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 16,
            }}
          >
            Услуг пока нет.
          </div>
        ) : (
          services.map((service) => (
            <div
              key={service.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: service.imageUrl
                    ? "160px minmax(0, 1fr)"
                    : "1fr",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                {service.imageUrl && (
                  <img
                    src={getImageSrc(service.imageUrl)}
                    alt={service.title}
                    style={{
                      width: 160,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid #ddd",
                      display: "block",
                    }}
                  />
                )}

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <strong style={{ fontSize: 18 }}>{service.title}</strong>

                    <span
                      style={{
                        fontSize: 12,
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: service.isActive ? "#e8f7ee" : "#f3f4f6",
                        border: "1px solid #ddd",
                      }}
                    >
                      {service.isActive ? "Активна" : "Неактивна"}
                    </span>
                  </div>

                  {service.internalCode && (
                    <div style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
                      Код: {service.internalCode}
                    </div>
                  )}

                  {service.description && (
                    <div style={{ marginTop: 8, lineHeight: 1.5 }}>
                      {service.description}
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      marginTop: 10,
                      fontSize: 14,
                    }}
                  >
                    {service.priceFrom != null && (
                      <span>Цена от: {service.priceFrom}</span>
                    )}

                    {service.etaDaysFrom != null && (
                      <span>Срок от: {service.etaDaysFrom} дн.</span>
                    )}
                  </div>

                  {service.tags?.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        marginTop: 12,
                      }}
                    >
                      {service.tags.map((item) => (
                        <span
                          key={item.id}
                          style={{
                            border: "1px solid #ddd",
                            borderRadius: 999,
                            padding: "4px 10px",
                            fontSize: 12,
                            background: "#fafafa",
                          }}
                        >
                          {item.tag?.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "start",
                }}
              >
                <button type="button" onClick={() => openTagEditor(service)}>
                  Теги
                </button>

                <div style={{ display: "grid", gap: 6 }}>
                  <button type="button" onClick={() => toggleActive(service)}>
                    {service.isActive ? "Выключить" : "Включить"}
                  </button>

                  {!service.isActive &&
                    user?.providerVerificationStatus !== "APPROVED" && (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        Для включения услуги нужно подтверждение аккаунта.
                      </div>
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => softDelete(service.id)}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {tagEditorId && currentService && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
          onClick={() => {
            setTagEditorId(null);
            setSelectedTagIds([]);
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              display: "grid",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                Теги услуги
              </div>
              <div style={{ marginTop: 6, opacity: 0.75 }}>
                {currentService.title}
              </div>
            </div>

            {allTags.length === 0 ? (
              <div>Список тегов пуст.</div>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {allTags.map((tag) => {
                  const checked = selectedTagIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 999,
                        padding: "8px 12px",
                        background: checked ? "#eef6ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setTagEditorId(null);
                  setSelectedTagIds([]);
                }}
              >
                Отмена
              </button>

              <button type="button" onClick={saveTags} disabled={savingTags}>
                {savingTags ? "Сохраняем..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {verificationBlockedModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
          }}
          onClick={() => setVerificationBlockedModalOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
              display: "grid",
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 22, fontWeight: 700 }}>
              Нельзя включить услугу
            </div>

            <div style={{ lineHeight: 1.5 }}>
              {verificationBlockedMessage}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setVerificationBlockedModalOpen(false)}
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
