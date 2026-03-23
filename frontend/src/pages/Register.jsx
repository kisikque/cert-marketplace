import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, apiUpload } from "../api";
import EsiaPlaceholder from "../components/EsiaPlaceholder";

const PROVIDER_DOCUMENT_TYPES = [
  { value: "REGISTRATION_DOC", label: "Регистрационный документ" },
  { value: "TAX_DOC", label: "ИНН / налоговый документ" },
  { value: "OTHER", label: "Другой документ" }
];

function emptyProviderDoc() {
  return { documentType: PROVIDER_DOCUMENT_TYPES[0].value, file: null };
}

const customerInitial = {
  fullName: "",
  companyName: "",
  contactName: "",
  phone: "",
  address: "",
  inn: "",
  kpp: "",
  ogrn: "",
  position: "",
  legalEntityType: "Юрлицо / ИП"
};

export default function Register({ onLogin }) {
  const nav = useNavigate();
  const [accountType, setAccountType] = useState("CUSTOMER");
  const [customerAccountKind, setCustomerAccountKind] = useState("INDIVIDUAL");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [inn, setInn] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [providerDocs, setProviderDocs] = useState([emptyProviderDoc()]);
  const [customerProfile, setCustomerProfile] = useState(customerInitial);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const customerTitle = useMemo(
    () => (customerAccountKind === "BUSINESS" ? "Юрлицо / ИП" : "Физическое лицо"),
    [customerAccountKind]
  );

  function updateProviderDoc(index, patch) {
    setProviderDocs((prev) => prev.map((doc, i) => (i === index ? { ...doc, ...patch } : doc)));
  }

  function addProviderDocField() {
    setProviderDocs((prev) => [...prev, emptyProviderDoc()]);
  }

  function removeProviderDocField(index) {
    setProviderDocs((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCustomerField(field, value) {
    setCustomerProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadProviderDocuments() {
    const docsToUpload = providerDocs.filter((doc) => doc.file);
    for (const doc of docsToUpload) {
      const formData = new FormData();
      formData.append("file", doc.file);
      formData.append("documentType", doc.documentType);
      await apiUpload("/provider-verification-docs", formData);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);

    const hasProviderDocs = providerDocs.some((doc) => doc.file);
    if (accountType === "PROVIDER" && !hasProviderDocs) {
      setError("Для провайдера нужно загрузить хотя бы один документ");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          accountType,
          customerAccountKind,
          email,
          password,
          displayName,
          orgName: accountType === "PROVIDER" ? orgName : undefined,
          inn: accountType === "PROVIDER" ? inn : undefined,
          phone: accountType === "PROVIDER" ? phone : undefined,
          address: accountType === "PROVIDER" ? address : undefined,
          description: accountType === "PROVIDER" ? description : undefined,
          customerProfile: accountType === "CUSTOMER" ? customerProfile : undefined
        })
      });

      if (accountType === "PROVIDER") {
        await uploadProviderDocuments();
      }

      await onLogin?.();
      nav(accountType === "PROVIDER" ? "/provider/services" : "/products");
    } catch (err) {
      setError(err?.error || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h2>Регистрация</h2>
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setAccountType("CUSTOMER")}
            style={{ background: accountType === "CUSTOMER" ? "#ecebff" : "white" }}
          >
            Покупатель
          </button>
          <button
            type="button"
            onClick={() => setAccountType("PROVIDER")}
            style={{ background: accountType === "PROVIDER" ? "#ecebff" : "white" }}
          >
            Провайдер услуг
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontSize: 14, opacity: 0.72 }}>
            {accountType === "CUSTOMER" ? `Регистрация покупателя: ${customerTitle}` : "Регистрация провайдера услуг"}
          </div>
          <EsiaPlaceholder label={accountType === "CUSTOMER" ? "Войти при помощи Госуслуг" : "Регистрация через Госуслуги"} />
        </div>

        {accountType === "CUSTOMER" && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setCustomerAccountKind("INDIVIDUAL")}
              style={{ background: customerAccountKind === "INDIVIDUAL" ? "#e8fff5" : "white" }}
            >
              Физическое лицо
            </button>
            <button
              type="button"
              onClick={() => setCustomerAccountKind("BUSINESS")}
              style={{ background: customerAccountKind === "BUSINESS" ? "#e8fff5" : "white" }}
            >
              Юрлицо / ИП
            </button>
          </div>
        )}

        <label style={{ display: "grid", gap: 6 }}>
          <span>{accountType === "PROVIDER" ? "Контактное лицо" : "Имя для входа / отображения"}</span>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Пароль (минимум 6 символов)</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        {accountType === "CUSTOMER" && (
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Основные данные для дальнейшей сертификации</h3>
            {customerAccountKind === "INDIVIDUAL" ? (
              <label style={{ display: "grid", gap: 6 }}>
                <span>ФИО</span>
                <input value={customerProfile.fullName} onChange={(e) => updateCustomerField("fullName", e.target.value)} />
              </label>
            ) : (
              <>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Название компании / ИП</span>
                  <input value={customerProfile.companyName} onChange={(e) => updateCustomerField("companyName", e.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Контактное лицо</span>
                  <input value={customerProfile.contactName} onChange={(e) => updateCustomerField("contactName", e.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Должность</span>
                  <input value={customerProfile.position} onChange={(e) => updateCustomerField("position", e.target.value)} />
                </label>
              </>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Телефон</span>
                <input value={customerProfile.phone} onChange={(e) => updateCustomerField("phone", e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Адрес</span>
                <input value={customerProfile.address} onChange={(e) => updateCustomerField("address", e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>ИНН</span>
                <input value={customerProfile.inn} onChange={(e) => updateCustomerField("inn", e.target.value)} />
              </label>
              {customerAccountKind === "BUSINESS" && (
                <>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>КПП</span>
                    <input value={customerProfile.kpp} onChange={(e) => updateCustomerField("kpp", e.target.value)} />
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>ОГРН / ОГРНИП</span>
                    <input value={customerProfile.ogrn} onChange={(e) => updateCustomerField("ogrn", e.target.value)} />
                  </label>
                </>
              )}
            </div>
            <div style={{ fontSize: 13, opacity: 0.74 }}>
              Можно заполнять не все поля сразу: обязательной остается только базовая информация для выбранного типа аккаунта.
            </div>
          </div>
        )}

        {accountType === "PROVIDER" && (
          <>
            <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Данные компании</h3>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Название компании / юрлица</span>
                <input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>ИНН</span>
                <input value={inn} onChange={(e) => setInn(e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Телефон</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Адрес</span>
                <input value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Краткое описание компании</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </label>
            </div>

            <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Документы для верификации</h3>
                <button type="button" onClick={addProviderDocField}>
                  Добавить документ
                </button>
              </div>

              {providerDocs.map((doc, index) => (
                <div
                  key={index}
                  style={{ border: "1px dashed #ccc", borderRadius: 10, padding: 12, display: "grid", gap: 8 }}
                >
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Тип документа</span>
                    <select
                      value={doc.documentType}
                      onChange={(e) => updateProviderDoc(index, { documentType: e.target.value })}
                    >
                      {PROVIDER_DOCUMENT_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>Файл</span>
                    <input
                      type="file"
                      onChange={(e) => updateProviderDoc(index, { file: e.target.files?.[0] || null })}
                    />
                  </label>
                  {providerDocs.length > 1 && (
                    <button type="button" onClick={() => removeProviderDocField(index)}>
                      Удалить блок документа
                    </button>
                  )}
                </div>
              ))}

              <div style={{ fontSize: 13, opacity: 0.75 }}>
                После регистрации документы отправятся в админку на ручную проверку.
              </div>
            </div>
          </>
        )}

        {error && <div style={{ color: "crimson" }}>{String(error)}</div>}

        <button disabled={loading} type="submit">
          {loading ? "Создаём..." : "Создать аккаунт"}
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Уже есть аккаунт? <Link to="/login">Войти</Link>
      </p>
    </div>
  );
}
