"use client";

import { Download, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useRef, useTransition } from "react";
import { useFormStatus } from "react-dom";

export type ActionState = { error?: string; success?: string } | null;

/**
 * Formulário ligado a uma server action que retorna { error } ou { success }.
 * - Mantém os campos quando há erro e limpa em caso de sucesso.
 * - Mostra carregamento no botão clicado e anuncia mensagens para leitores de tela.
 * - Botões com `data-confirm="..."` pedem confirmação antes de enviar.
 * - `successView` substitui o formulário após o envio (ex.: tela de "obrigado").
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = true,
  successView,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  successView?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const submitterRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (state?.success && resetOnSuccess) formRef.current?.reset();
    if (state?.error) errorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state, resetOnSuccess]);

  useEffect(() => {
    if (pending) return;
    submitterRef.current?.removeAttribute("data-submitting");
    submitterRef.current = null;
  }, [pending]);

  if (state?.success && successView) return <div role="status">{successView}</div>;

  return (
    <form
      ref={formRef}
      className={className}
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const submitter = (event.nativeEvent as SubmitEvent).submitter;
        const confirmMessage = submitter?.dataset.confirm;
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        // Inclui name/value do botão clicado (ex.: Aprovar / Rejeitar).
        const formData = new FormData(event.currentTarget, submitter);
        submitter?.setAttribute("data-submitting", "");
        submitterRef.current = submitter;
        startTransition(() => formAction(formData));
      }}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && (
        <p ref={errorRef} role="alert" className="text-sm text-red-400 sm:col-span-full">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="text-sm text-emerald-400 sm:col-span-full">
          {state.success}
        </p>
      )}
    </form>
  );
}

const ICONS = { trash: Trash2, x: X, download: Download };

/** Botão de submit para <form action={...}> simples, com confirmação e ícone opcionais. */
export function SubmitButton({
  children,
  className = "btn btn-primary",
  confirm,
  name,
  value,
  icon,
  label,
}: {
  children?: React.ReactNode;
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
  icon?: keyof typeof ICONS;
  /** Nome acessível (obrigatório quando o botão só tem ícone). */
  label?: string;
}) {
  const { pending } = useFormStatus();
  const Icon = icon ? ICONS[icon] : null;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      data-submitting={pending ? "" : undefined}
      aria-label={label}
      title={label}
      className={className}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {Icon && <Icon className="size-4" aria-hidden />}
      {children}
    </button>
  );
}

/** <select> que envia o formulário ao mudar (ex.: trocar status). */
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}
