import { ImageResponse } from "next/og";
import { OgCard } from "@/components/OgCard";

export const alt = "Guardian Mauá, entidade de Segurança da Informação do Instituto Mauá de Tecnologia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <OgCard eyebrow="Portal" title="Segurança da Informação no Instituto Mauá" subtitle="Capacitação, projetos, eventos e processos seletivos" />,
    size,
  );
}
