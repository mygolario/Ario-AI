"use client";

import { FormEvent, useState } from "react";
import styles from "./chat.module.css";
import type { ChatRequestBody, ChatResponseBody } from "@/types/chat";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

// Generates predictable ids across server/client so React can keep list items stable.
const createMessageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function ChatPage() {
  // Local-only state for MVP; will be replaced by persisted conversation later.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed } satisfies ChatRequestBody),
      });

      if (!response.ok) {
        throw new Error("Failed to contact assistant");
      }

      const data = (await response.json()) as ChatResponseBody;
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (err) {
      console.error(err);
      setError("خطایی رخ داد. لطفاً دوباره تلاش کنید.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className={styles.chatPage}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.badge}>نسخه آزمایشی</span>
            <h1 className={styles.title}>Iran AI Assistant</h1>
            <p className={styles.subtitle}>گفتگوی امن، سریع و فارسی‌زبان</p>
          </div>
        </header>

        <section className={styles.messages} aria-live="polite">
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <p>هنوز پیامی ثبت نشده است.</p>
              <p>یک سؤال درباره زندگی روزمره در ایران تایپ کنید و ارسال بزنید.</p>
            </div>
          ) : (
            messages.map((message) => (
              <article
                key={message.id}
                className={`${styles.message} ${
                  message.role === "user" ? styles.user : styles.assistant
                }`}
              >
                <span className={styles.sender}>
                  {message.role === "user" ? "شما" : "دستیار"}
                </span>
                <p dir="auto">{message.content}</p>
              </article>
            ))
          )}
        </section>

        <form className={styles.composer} onSubmit={handleSend}>
          <textarea
            className={styles.textarea}
            placeholder="سؤال خود را اینجا بنویسید..."
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            dir="auto"
            aria-label="پیام جدید"
          />
          <div className={styles.actions}>
            {error && <span className={styles.error}>{error}</span>}
            <button className={styles.button} type="submit" disabled={isSending || !prompt.trim()}>
              {isSending ? "در حال ارسال..." : "ارسال"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

