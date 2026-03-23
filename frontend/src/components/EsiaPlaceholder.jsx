export default function EsiaPlaceholder({ label = "Войти при помощи Госуслуг" }) {
  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid #d6e5ff",
          borderRadius: 12,
          padding: "10px 14px",
          background: "linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%)",
          color: "#1f4aa8",
          cursor: "not-allowed",
          fontWeight: 600
        }}
        disabled
        title="В дальнейшем планируется сделать регистрацию через ЕСИА с подтягиванием данных"
      >
        <span
          aria-hidden="true"
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: "linear-gradient(135deg, #0059d6 0%, #29b6f6 100%)",
            color: "white",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            textTransform: "uppercase",
            lineHeight: 1,
            textAlign: "center"
          }}
        >
          гос
          <br />
          услуги
        </span>
        <span>{label}</span>
      </button>
    </div>
  );
}
