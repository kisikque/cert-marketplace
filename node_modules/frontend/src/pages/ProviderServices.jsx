import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../api";
import { useAuthContext } from "../AuthContext";
import { useNavigate } from "react-router-dom";

function getServiceTagIds(service) {
  // service.tags = [{ tag: {...}}] (после include на бэке)
  return (service.tags || []).map((x) => x.tag?.id).filter(Boolean);
}

export default function ProviderServices() {
  const { user } = useAuthContext();
  const nav = useNavigate();

  const [services, setServices] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [error, setError] = useState(null);

  // форма создания
  const [internalCode, setInternalCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [etaDaysFrom, setEtaDaysFrom] = useState("");

  // UI тегов: какой сервис сейчас “редактируем”
  const [tagEditorId, setTagEditorId] = useState(null);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [savingTags, setSavingTags] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "PROVIDER") nav("/");
  }, [user, nav]);

  async function load() {
    setError(null);
    try {
      const [s, t] = await Promise.all([
        apiFetch("/provider/services"),
        apiFetch("/provider/tags")
      ]);
      setServices(s.services || []);
      setAllTags(t.tags || []);
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

  async function toggleActive(s) {
    await apiFetch(`/provider/services/${s.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: !s.isActive })
    });
    await load();
  }

  async function softDelete(id) {
    await apiFetch(`/provider/services/${id}`, { method: "DELETE" });
    await load();
  }

  // --- Теги ---
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

  if (!user || user.role !== "PROVIDER") return null;

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Мои услуги</h2>
      {error && <p style={{ color: "crimson" }}>{String(error)}</p>}

      <form
        onSubmit={createService}
        style={{ border: "1px solid #ddd", padding: 12, borderRadius: 10 }}
      >
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

      {/* Редактор тегов (минимальный блок) */}
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
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(t.id)}
                    onChange={() => toggleTag(t.id)}
                  />
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
          {services.map((s) => (
            <div key={s.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{s.internalCode}</div>
              <div style={{ fontWeight: 700 }}>
                {s.title} {s.isActive ? "" : "(выключена)"}
              </div>
              <div style={{ marginTop: 6, fontSize: 13 }}>{s.description}</div>

              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(s.tags || []).map((x) => (
                  <span
                    key={x.tag.id}
                    style={{
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 999,
                      border: "1px solid #ddd"
                    }}
                  >
                    {x.tag.name}
                  </span>
                ))}
              </div>

              <div style={{ marginTop: 8 }}>
                <button onClick={() => openTagEditor(s)}>Теги</button>
                <button onClick={() => toggleActive(s)} style={{ marginLeft: 8 }}>
                  {s.isActive ? "Выключить" : "Включить"}
                </button>
                <button onClick={() => softDelete(s.id)} style={{ marginLeft: 8 }}>
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
