"use client";

import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { useEffect, useState } from "react";

/** Chamada de voz / vídeo / compartilhamento de tela via LiveKit. */
export default function CallPanel({ roomId, onLeave }: { roomId: string; onLeave: () => void }) {
  const [connection, setConnection] = useState<{ token: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rooms/${roomId}/token`, { method: "POST" })
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json()).error ?? "Falha ao entrar na chamada");
        return response.json();
      })
      .then((data) => !cancelled && setConnection(data))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  if (error) return <p className="card text-sm text-red-400">{error}</p>;
  if (!connection) return <p className="card text-sm text-muted">Conectando à chamada…</p>;

  return (
    <div data-lk-theme="default" className="guardian-call h-[65vh] min-h-[420px] overflow-hidden rounded-xl border border-line">
      <LiveKitRoom
        serverUrl={connection.url}
        token={connection.token}
        connect
        audio
        video={false}
        onDisconnected={onLeave}
        onError={(e) => setError(`Erro na chamada: ${e.message}`)}
        style={{ height: "100%" }}
      >
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
}
