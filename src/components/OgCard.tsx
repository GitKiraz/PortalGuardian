import { GuardianLogo } from "./GuardianLogo";

/** Cartão das imagens de compartilhamento (Open Graph), renderizado pelo next/og: só estilos inline e flexbox. */
export function OgCard({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        color: "#ffffff",
        backgroundColor: "#191717",
        backgroundImage: "radial-gradient(circle at 100% 0%, rgba(180, 28, 184, 0.45), rgba(25, 23, 23, 0) 60%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 104, height: 104, borderRadius: 22, backgroundColor: "#ffffff" }}>
          <GuardianLogo width={72} height={75} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 50, fontWeight: 700 }}>Guardian Mauá</div>
          <div style={{ fontSize: 22, color: "#e08de3", letterSpacing: 4, textTransform: "uppercase" }}>{eyebrow}</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 66, fontWeight: 700, lineHeight: 1.1 }}>{title.length > 80 ? `${title.slice(0, 79)}…` : title}</div>
        <div style={{ fontSize: 30, color: "#c9c2c2" }}>{subtitle}</div>
      </div>
    </div>
  );
}
