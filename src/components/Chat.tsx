"use client";

import { ArrowDown, SendHorizontal } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/realtime";

const timeFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function Chat({
  roomId,
  currentUserId,
  initialMessages,
}: {
  roomId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Só rola automaticamente se o usuário já estiver no fim da conversa.
  const stickToBottom = useRef(true);

  const append = (message: ChatMessage) => {
    setMessages((all) => (all.some((m) => m.id === message.id) ? all : [...all, message]));
    if (message.author.id === currentUserId) stickToBottom.current = true;
    else if (!stickToBottom.current) setUnread((n) => n + 1);
  };

  useEffect(() => {
    const source = new EventSource(`/api/rooms/${roomId}/stream`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => append(JSON.parse(event.data));
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const scrollToBottom = () => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight; // rola só a lista, não a página
    stickToBottom.current = true;
    setUnread(0);
  };

  useLayoutEffect(() => {
    if (stickToBottom.current) scrollToBottom();
  }, [messages.length]);

  // Caixa de texto cresce com o conteúdo (até ~6 linhas).
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  }, [draft]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setDraft("");
    setError(null);
    const response = await fetch(`/api/rooms/${roomId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    }).catch(() => null);
    setSending(false);
    if (response?.ok) append(await response.json());
    else {
      setDraft(content);
      setError("Não foi possível enviar a mensagem. Tente novamente.");
    }
    inputRef.current?.focus();
  }

  return (
    <div className="relative flex h-full min-h-[360px] flex-col rounded-xl border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-sm font-semibold">Chat</h2>
        <span className="flex items-center gap-1.5 text-xs text-muted" role="status">
          <span className={`size-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden />
          {connected ? "ao vivo" : "reconectando…"}
        </span>
      </div>
      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-label="Mensagens"
        className="flex-1 space-y-3 overflow-y-auto p-4"
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          if (stickToBottom.current) setUnread(0);
        }}
      >
        {messages.length === 0 && <p className="text-center text-sm text-muted">Nenhuma mensagem ainda. Diga olá!</p>}
        {messages.map((message) => {
          const mine = message.author.id === currentUserId;
          return (
            <div key={message.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              <span className="mb-0.5 text-[11px] text-muted">
                {mine ? "Você" : message.author.name} · {timeFormat.format(new Date(message.createdAt))}
              </span>
              <p
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                  mine ? "bg-accent/30 text-white" : "bg-white/5"
                }`}
              >
                {message.content}
              </p>
            </div>
          );
        })}
      </div>
      {unread > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="btn btn-primary btn-sm absolute bottom-20 left-1/2 -translate-x-1/2 shadow-lg"
        >
          <ArrowDown className="size-4" aria-hidden />
          {unread === 1 ? "1 nova mensagem" : `${unread} novas mensagens`}
        </button>
      )}
      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <textarea
          ref={inputRef}
          className="input min-h-10 flex-1 resize-none"
          rows={1}
          maxLength={4000}
          aria-label="Mensagem"
          placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter quebra linha)"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="btn btn-primary" type="submit" disabled={!draft.trim() || sending} aria-label="Enviar mensagem">
          <SendHorizontal className="size-4" aria-hidden />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
      {error && (
        <p role="alert" className="px-3 pb-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
