import { ImageResponse } from "next/og";
import { OgCard } from "@/components/OgCard";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export const alt = "Processo seletivo da Guardian Mauá";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagem do link compartilhado (WhatsApp, Instagram, LinkedIn) com o nome do processo.
export default async function ProcessImage({ params }: { params: Promise<{ processId: string }> }) {
  const { processId } = await params;
  const process = await prisma.selectionProcess.findUnique({
    where: { id: processId },
    select: { title: true, status: true, registrationDeadline: true },
  });
  const visible = process && process.status !== "RASCUNHO";
  const subtitle =
    visible && process.registrationDeadline
      ? `Inscrições até ${formatDateTime(process.registrationDeadline)}`
      : "Inscreva-se na entidade de Segurança da Informação do Instituto Mauá";

  return new ImageResponse(
    <OgCard eyebrow="Processo seletivo" title={visible ? process.title : "Processo seletivo"} subtitle={subtitle} />,
    size,
  );
}
