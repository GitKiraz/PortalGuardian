"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function FileUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const body = new FormData();
    Array.from(files).forEach((file) => body.append("files", file));
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/projects/${projectId}/files`, { method: "POST", body }).catch(() => null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!response?.ok) {
      setError((await response?.json().catch(() => null))?.error ?? "Falha no envio");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className={`w-full rounded-lg border border-dashed p-4 text-center text-sm transition-colors ${
          dragging ? "border-accent bg-accent/10" : "border-line text-muted hover:border-accent/60"
        }`}
      >
        {busy ? "Enviando…" : "Arraste arquivos ou clique para enviar (até 100 MB)"}
      </button>
      <input ref={inputRef} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
