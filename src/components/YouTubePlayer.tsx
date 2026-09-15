"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/youtube";

/**
 * Mostra a capa do vídeo e só carrega o player do YouTube (~1 MB de JavaScript) ao clicar.
 * Use com key={videoId} para voltar à capa ao trocar de aula.
 */
export function YouTubePlayer({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <iframe
        src={`${youtubeEmbedUrl(videoId)}&autoplay=1`}
        title={title}
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <button type="button" onClick={() => setPlaying(true)} className="group relative block size-full" aria-label={`Assistir: ${title}`}>
      <Image
        src={youtubeThumbnailUrl(videoId)}
        alt=""
        fill
        sizes="(min-width: 1280px) 900px, (min-width: 1024px) 60vw, 100vw"
        className="object-cover"
        loading="eager"
        fetchPriority="high"
      />
      <span className="absolute inset-0 grid place-items-center bg-black/30 transition-colors group-hover:bg-black/15">
        <span className="grid size-16 place-items-center rounded-full bg-accent text-white shadow-lg transition-transform group-hover:scale-105">
          <Play className="size-7 translate-x-0.5" fill="currentColor" aria-hidden />
        </span>
      </span>
    </button>
  );
}
