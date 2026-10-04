"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { giveAiConsent } from "@/app/app/ai/actions";
import { AiConsentDialog } from "@/components/app/ai-consent";
import { MAX_HISTORY, MAX_MESSAGE_CHARS, type CoachMessage } from "@/lib/ai/coach";

const STARTERS = [
  "What can I eat with what's left today?",
  "Give me a high-protein snack idea",
  "How did I do today?",
];

export function CoachChat({ consented, remaining, dailyLimit }: { consented: boolean; remaining: number; dailyLimit: number }) {
  const router = useRouter();
  const [asking, setAsking] = useState(!consented);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(remaining);
  const end = useRef<HTMLDivElement>(null);

  async function yes() {
    setAsking(false);
    const r = await giveAiConsent();
    if (!r.ok) setError("We couldn't save your choice. Please try again.");
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    const next = [...messages, { role: "user" as const, text: trimmed }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/app/coach/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-MAX_HISTORY) }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) {
        setError(data.error ?? "The coach didn't answer. Please try again.");
        setMessages(messages);
        setDraft(trimmed);
        return;
      }
      setMessages([...next, { role: "coach", text: data.reply }]);
      setLeft((n) => Math.max(0, n - 1));
    } catch {
      setError("Couldn't reach the coach. Check your connection and try again.");
      setMessages(messages);
      setDraft(trimmed);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => end.current?.scrollIntoView({ block: "end", behavior: "smooth" }));
    }
  }

  return (
    <section aria-label="Chat with the coach" className="card flex flex-col gap-4 p-4 sm:p-5">
      <div role="log" aria-live="polite" aria-busy={busy} className="flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={busy || left === 0 || asking} className="btn btn-sm">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "max-w-[85%] self-end rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-ground"
                : "max-w-[90%] self-start rounded-2xl rounded-bl-md border-2 border-ink bg-well px-4 py-2.5"
            }
          >
            <span className="sr-only">{m.role === "user" ? "You: " : "Coach: "}</span>
            <p className="whitespace-pre-wrap break-words text-[0.9375rem]">{m.text}</p>
          </div>
        ))}
        {busy && <p className="self-start text-sm text-muted">Coach is thinking…</p>}
        <div ref={end} />
      </div>

      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
        className="flex flex-col gap-2"
      >
        <label htmlFor="coach-message" className="sr-only">
          Message the coach
        </label>
        <div className="flex gap-2">
          <textarea
            id="coach-message"
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_MESSAGE_CHARS))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(draft);
              }
            }}
            rows={2}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={left === 0 ? "No messages left today" : "Ask the coach…"}
            disabled={left === 0 || asking}
            className="input min-w-0 flex-1 resize-none"
          />
          <button disabled={busy || !draft.trim() || left === 0 || asking} className="btn btn-primary self-end">
            Send
          </button>
        </div>
        <p className="text-xs text-muted">
          {left} of {dailyLimit} messages left today. The coach can make mistakes and isn&apos;t medical advice. Chats aren&apos;t saved.
        </p>
      </form>

      <AiConsentDialog open={asking} onYes={yes} onNo={() => router.push("/app")} />
    </section>
  );
}
