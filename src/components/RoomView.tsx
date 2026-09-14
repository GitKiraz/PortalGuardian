"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { ChatMessage } from "@/lib/realtime";
import { Chat } from "./Chat";

const CallPanel = dynamic(() => import("./CallPanel"), { ssr: false });

/** Chat de texto + chamada de voz com compartilhamento de tela. */
export function RoomView({
  roomId,
  currentUserId,
  initialMessages,
}: {
  roomId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
}) {
  const [inCall, setInCall] = useState(false);

  return (
    <div className="@container flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">Chamada de voz</p>
          <p className="text-xs text-muted">Voz, câmera e compartilhamento de tela com os integrantes.</p>
        </div>
        {inCall ? (
          <button className="btn btn-danger" onClick={() => setInCall(false)}>
            Sair da chamada
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setInCall(true)}>
            🎧 Entrar na chamada
          </button>
        )}
      </div>
      {/* Lado a lado só quando o container é largo; senão a barra de controles do LiveKit é cortada. */}
      <div className={inCall ? "grid gap-4 @5xl:grid-cols-[1fr_360px]" : ""}>
        {inCall && <CallPanel roomId={roomId} onLeave={() => setInCall(false)} />}
        <div className={inCall ? "h-[45vh] min-h-[360px] @5xl:h-[65vh]" : "h-[60vh]"}>
          <Chat roomId={roomId} currentUserId={currentUserId} initialMessages={initialMessages} />
        </div>
      </div>
    </div>
  );
}
