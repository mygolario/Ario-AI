"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import styles from "./chat.module.css";
import type { ChatRequestBody, ChatResponseBody } from "@/types/chat";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
};

// Generates predictable ids across server/client so React can keep list items stable.
const createMessageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const ui = {
  missingClientId:
    "\u062f\u0631 \u062d\u0627\u0644 \u0622\u0645\u0627\u062f\u0647\u200c\u0633\u0627\u0632\u06cc \u0634\u0646\u0627\u0633\u0647 \u0634\u0645\u0627 \u0647\u0633\u062a\u06cc\u0645\u002e \u0644\u0637\u0641\u0627\u064b \u0644\u062d\u0638\u0647\u200c\u0627\u06cc \u0628\u0639\u062f \u062f\u0648\u0628\u0627\u0631\u0647 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f\u002e",
  genericError:
    "\u062e\u0637\u0627\u06cc\u06cc \u0631\u062e \u062f\u0627\u062f\u002e \u0644\u0637\u0641\u0627\u064b \u062f\u0648\u0628\u0627\u0631\u0647 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f\u002e",
  badge: "\u062f\u0633\u062a\u06cc\u0627\u0631 \u0641\u0627\u0631\u0633\u06cc \u0622\u0631\u06cc\u0648",
  subtitle:
    "\u067e\u0627\u0633\u062e\u200c\u0647\u0627\u06cc \u06a9\u0648\u062a\u0627\u0647\u060c \u062f\u0642\u06cc\u0642 \u0648 \u0645\u0631\u062d\u0644\u0647\u200c\u0628\u0647\u200c\u0645\u0631\u062d\u0644\u0647 \u0628\u0631\u0627\u06cc \u0634\u0645\u0627",
  emptyLine1: "\u0647\u0646\u0648\u0632 \u067e\u06cc\u0627\u0645\u06cc \u0627\u0631\u0633\u0627\u0644 \u0646\u06a9\u0631\u062f\u0647\u200c\u0627\u06cc\u062f\u002e",
  emptyLine2:
    "\u0647\u0631 \u0633\u0648\u0627\u0644\u06cc \u062f\u0631\u0628\u0627\u0631\u0647 \u0628\u06cc\u0632\u0646\u0633\u060c \u0628\u0631\u0646\u0627\u0645\u0647\u200c\u0631\u06cc\u0632\u06cc \u06cc\u0627 \u06a9\u062f\u0646\u0648\u06cc\u0633\u06cc \u062f\u0627\u0631\u06cc\u062f\u060c \u0647\u0645\u06cc\u0646 \u062d\u0627\u0644\u0627 \u0628\u067e\u0631\u0633\u06cc\u062f\u002e",
  placeholder: "\u067e\u06cc\u0627\u0645 \u062e\u0648\u062f \u0631\u0627 \u0628\u0646\u0648\u06cc\u0633\u06cc\u062f\u002e\u002e\u002e",
  sending: "\u062f\u0631 \u062d\u0627\u0644 \u0627\u0631\u0633\u0627\u0644\u002e\u002e\u002e",
  send: "\u0627\u0631\u0633\u0627\u0644",
  user: "\u0634\u0645\u0627",
  assistant: "\u062f\u0633\u062a\u06cc\u0627\u0631",
};

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storageKey = "ario_ai_client_id";
    let existing: string | null = null;

    if (typeof window !== "undefined") {
      existing = window.localStorage.getItem(storageKey);
    }

    if (!existing) {
      const newId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, newId);
      }

      existing = newId;
    }

    setClientId(existing);
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const fetchConversations = useCallback(async () => {
    if (!clientId) return;

    try {
      const res = await fetch("/api/conversations", {
        method: "GET",
        headers: {
          "x-client-id": clientId,
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch (error) {
      console.error("[conversations] failed to load", error);
    }
  }, [clientId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  };

  const handleSelectConversation = async (selectedConversationId: string) => {
    if (!clientId) return;

    setIsLoadingHistory(true);
    try {
      const res = await fetch(`/api/conversations/${selectedConversationId}`, {
        method: "GET",
        headers: {
          "x-client-id": clientId,
        },
      });

      if (!res.ok) {
        console.error("Failed to load conversation history");
        return;
      }

      const data = await res.json();
      const historyMessages: ChatMessage[] = (data.messages ?? []).map(
        (m: { id: string; role: string; content: string }) => ({
          id: m.id,
          role: m.role === "USER" ? "user" : "assistant",
          content: m.content,
        }),
      );

      setConversationId(selectedConversationId);
      setMessages(historyMessages);
      setError(null);
    } catch (error) {
      console.error("Failed to load conversation history", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed || isSending || isLoadingHistory) {
      return;
    }
    if (!clientId) {
      setError(ui.missingClientId);
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
        body: JSON.stringify(
          {
            message: trimmed,
            conversationId,
            clientId,
          } satisfies ChatRequestBody,
        ),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to contact assistant");
      }

      const data = (await response.json()) as ChatResponseBody;
      setConversationId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: "assistant",
          content: data.reply,
        },
      ]);
      await fetchConversations();
    } catch (err) {
      console.error(err);
      setError(ui.genericError);
      // Remove the user message on error so they can retry
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className={styles.chatPage} dir="rtl" lang="fa">
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>گفت‌وگوها</h2>
          <ul className={styles.conversationList}>
            {conversations.map((conv) => (
              <li
                key={conv.id}
                className={
                  conv.id === conversationId
                    ? styles.conversationItemActive
                    : styles.conversationItem
                }
                onClick={() => handleSelectConversation(conv.id)}
              >
                <div className={styles.conversationTitle}>{conv.title}</div>
                <div className={styles.conversationDate}>
                  {new Date(conv.createdAt).toLocaleDateString("fa-IR")}
                </div>
              </li>
            ))}
            {conversations.length === 0 && (
              <li className={styles.conversationEmpty}>هنوز گفت‌وگویی ثبت نشده است.</li>
            )}
          </ul>
        </aside>

        <section className={`${styles.panel} ${styles.chatArea}`}>
          <header className={styles.header}>
            <div className={styles.titleGroup}>
              <span className={styles.badge}>{ui.badge}</span>
              <h1 className={styles.title}>Iran AI Assistant</h1>
              <p className={styles.subtitle}>{ui.subtitle}</p>
            </div>
            <div className={styles.headerActions}>
              {isLoadingHistory && <span className={styles.subtitle}>در حال بارگذاری...</span>}
              <button
                type="button"
                className={styles.newChatButton}
                onClick={handleNewChat}
                disabled={isSending}
              >
                شروع گفت‌وگوی جدید
              </button>
            </div>
          </header>

          <section
            className={styles.messages}
            aria-live="polite"
            ref={messagesContainerRef}
          >
            {messages.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{ui.emptyLine1}</p>
                <p>{ui.emptyLine2}</p>
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
                    {message.role === "user" ? ui.user : ui.assistant}
                  </span>
                  <p dir="auto">{message.content}</p>
                </article>
              ))
            )}
            <div ref={scrollAnchorRef} />
          </section>

          <form className={styles.composer} onSubmit={handleSend}>
            <textarea
              className={styles.textarea}
              placeholder={ui.placeholder}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              dir="auto"
              aria-label="پیام کاربر"
              disabled={isSending}
            />
            <div className={styles.actions}>
              {error && <span className={styles.error}>{error}</span>}
              <button
                className={styles.button}
                type="submit"
                disabled={isSending || !prompt.trim()}
              >
                {isSending ? ui.sending : ui.send}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
