"use client";

import { Check, Copy, Eye, EyeOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

/** Campo de senha com botão "olhinho" para mostrar/ocultar e aviso de Caps Lock. */
export function PasswordInput({ className = "", onKeyUp, onBlur, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  return (
    <span className="block">
      <span className="relative block">
        <input
          {...props}
          type={visible ? "text" : "password"}
          className={`input pr-10 ${className}`}
          autoCapitalize="none"
          spellCheck={false}
          onKeyUp={(event) => {
            setCapsLock(event.getModifierState("CapsLock"));
            onKeyUp?.(event);
          }}
          onBlur={(event) => {
            setCapsLock(false);
            onBlur?.(event);
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          title={visible ? "Ocultar senha" : "Mostrar senha"}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-muted hover:text-white"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </span>
      {capsLock && (
        <span role="status" className="mt-1 block text-xs text-amber-300">
          Caps Lock está ativado
        </span>
      )}
    </span>
  );
}

/**
 * Nova senha + confirmação, com requisitos e conferência em tempo real.
 * A confirmação usa validação nativa, então o formulário não é enviado se as senhas diferirem.
 */
export function NewPasswordFields({
  name = "password",
  confirmName = "confirm",
  label = "Senha",
  minLength = 8,
}: {
  name?: string;
  confirmName?: string;
  label?: string;
  minLength?: number;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const confirmRef = useRef<HTMLInputElement>(null);

  const longEnough = password.length >= minLength;
  const mixed = /[a-zA-Z]/.test(password) && /[^a-zA-Z]/.test(password);
  const matches = confirm.length > 0 && confirm === password;

  useEffect(() => {
    confirmRef.current?.setCustomValidity(confirm && !matches ? "As senhas não conferem" : "");
  }, [confirm, matches]);

  // Limpa o estado quando o formulário é resetado após sucesso.
  useEffect(() => {
    const form = confirmRef.current?.form;
    const clear = () => {
      setPassword("");
      setConfirm("");
    };
    form?.addEventListener("reset", clear);
    return () => form?.removeEventListener("reset", clear);
  }, []);

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="label">{label}</span>
        <PasswordInput
          name={name}
          required
          minLength={minLength}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={`${name}-rules`}
        />
        <ul id={`${name}-rules`} className="space-y-0.5 text-xs">
          <Rule ok={longEnough}>Pelo menos {minLength} caracteres</Rule>
          <Rule ok={mixed}>Recomendado: misture letras com números ou símbolos</Rule>
        </ul>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label">Confirmar {label.toLowerCase()}</span>
        <PasswordInput
          ref={confirmRef}
          name={confirmName}
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={confirm.length > 0 && !matches}
        />
        {confirm.length > 0 && (
          <span role="status" className={`flex items-center gap-1.5 text-xs ${matches ? "text-emerald-300" : "text-red-300"}`}>
            {matches ? <Check className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
            {matches ? "As senhas conferem" : "As senhas não conferem"}
          </span>
        )}
      </label>
    </>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-emerald-300" : "text-muted"}`}>
      {ok ? <Check className="size-3.5" aria-hidden /> : <span className="w-3.5 text-center" aria-hidden>•</span>}
      {children}
    </li>
  );
}

const PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Senha temporária definida pelo admin: visível, com gerador e botão de copiar. */
export function TemporaryPasswordInput({ name = "password" }: { name?: string }) {
  const [value, setValue] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const random = crypto.getRandomValues(new Uint32Array(12));
    setValue(Array.from(random, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join(""));
    setCopied(false);
  };

  return (
    <span className="flex gap-2">
      <input
        className="input font-mono"
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setCopied(false);
        }}
        minLength={8}
        required
        autoComplete="off"
        spellCheck={false}
        placeholder="Mín. 8 caracteres"
        aria-label="Nova senha temporária"
      />
      <button type="button" className="btn btn-ghost btn-sm" onClick={generate}>
        Gerar
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={!value}
        aria-label={copied ? "Senha copiada" : "Copiar senha"}
        title={copied ? "Copiada" : "Copiar"}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        }}
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
    </span>
  );
}
