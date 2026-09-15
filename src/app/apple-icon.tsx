import { ImageResponse } from "next/og";
import { GuardianLogo } from "@/components/GuardianLogo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Ícone da tela inicial do iOS/Android (o icon.svg não é aceito como apple-touch-icon).
export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#ffffff" }}>
      <GuardianLogo width={128} height={134} />
    </div>,
    size,
  );
}
