"use client";

import { useChat } from "@ai-sdk/react";
import {
  BookOpen,
  ExternalLink,
  FileText,
  MessageSquare,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { CircularProgress, Skeleton } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { UIMessage } from "ai";

type RuleSource = {
  id: string;
  label: string;
  title: string;
  location: string;
  sourceUrl: string;
  score: number;
  preview: string;
  fullQuote: string;
};

type StoredChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
};

const CHAT_STORAGE_KEY = "project-servo-skull:chat-sessions";

const examples = [
  "Can a unit charge after advancing?",
  "How do objective control rules work?",
  "Explain line of sight with an example.",
];

export default function Home() {
  const [input, setInput] = useState("");
  const [sessions, setSessions] = useState<StoredChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [hasLoadedSessions, setHasLoadedSessions] = useState(false);
  const { messages, sendMessage, status, setMessages } = useChat({ id: activeChatId || "default-chat" });
  const isWorking = status === "submitted" || status === "streaming";
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const showThinkingState =
    status === "submitted" || (isWorking && messages[messages.length - 1]?.role === "user");
  const activeSession = sessions.find((session) => session.id === activeChatId);
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [sessions],
  );

  useEffect(() => {
    const loadedSessions = loadChatSessions();
    const nextSessions = loadedSessions.length > 0 ? loadedSessions : [createEmptySession()];
    setSessions(nextSessions);
    setActiveChatId(nextSessions[0].id);
    setMessages(nextSessions[0].messages);
    setHasLoadedSessions(true);
  }, [setMessages]);

  useEffect(() => {
    if (!hasLoadedSessions || !activeChatId) {
      return;
    }

    setSessions((currentSessions) => {
      const nextSessions = currentSessions.map((session) =>
        session.id === activeChatId
          ? {
              ...session,
              title: deriveChatTitle(messages),
              updatedAt: new Date().toISOString(),
              messages,
            }
          : session,
      );

      saveChatSessions(nextSessions);
      return nextSessions;
    });
  }, [activeChatId, hasLoadedSessions, messages]);

  function startNewChat() {
    if (isWorking) {
      return;
    }

    const session = createEmptySession();
    const nextSessions = [session, ...sessions];
    setSessions(nextSessions);
    setActiveChatId(session.id);
    setMessages([]);
    saveChatSessions(nextSessions);
  }

  function selectChat(sessionId: string) {
    if (isWorking || sessionId === activeChatId) {
      return;
    }

    const session = sessions.find((item) => item.id === sessionId);
    if (!session) {
      return;
    }

    setActiveChatId(session.id);
    setMessages(session.messages);
  }

  function deleteChat(sessionId: string) {
    if (isWorking) {
      return;
    }

    const nextSessions = sessions.filter((session) => session.id !== sessionId);
    const safeSessions = nextSessions.length > 0 ? nextSessions : [createEmptySession()];
    const nextActiveSession =
      sessionId === activeChatId
        ? safeSessions[0]
        : safeSessions.find((session) => session.id === activeChatId) ?? safeSessions[0];

    setSessions(safeSessions);
    setActiveChatId(nextActiveSession.id);
    setMessages(nextActiveSession.messages);
    saveChatSessions(safeSessions);
  }

  return (
    <main className="shell">
      <section className="workspace">
        <aside className="sidebar" aria-label="Project status">
          <div className="brand">
            <Image alt="" className="brandLogo" height={60} priority src="/servo-skull-logo.svg" width={48} />
            <div>
              <p>Project Servo Skull</p>
              <span>Rules-grounded assistant</span>
            </div>
          </div>

          <section className="chatHistory" aria-label="Saved chats">
            <div className="chatHistoryHeader">
              <span>Chats</span>
              <button aria-label="Start new chat" disabled={isWorking} onClick={startNewChat} type="button">
                <Plus aria-hidden="true" />
              </button>
            </div>
            <div className="chatHistoryList">
              {sortedSessions.map((session) => (
                <button
                  className={`chatHistoryItem ${session.id === activeChatId ? "active" : ""}`}
                  disabled={isWorking && session.id !== activeChatId}
                  key={session.id}
                  onClick={() => selectChat(session.id)}
                  type="button"
                >
                  <MessageSquare aria-hidden="true" />
                  <span>
                    <strong>{session.title}</strong>
                    <small>{formatChatDate(session.updatedAt)}</small>
                  </span>
                  <span
                    className="deleteChatButton"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteChat(session.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteChat(session.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title="Delete chat"
                  >
                    <Trash2 aria-hidden="true" />
                  </span>
                </button>
              ))}
            </div>
          </section>

          <div className="sidebarSpacer" />

          <details className="techAccordion">
            <summary>
              <BookOpen aria-hidden="true" />
              <span>Tech notes</span>
            </summary>
            <div className="statusPanel">
              <div>
                <ShieldCheck aria-hidden="true" />
                <span>Reliability target</span>
              </div>
              <p>Answer from retrieved rules, show source notes, and say when the corpus is not ready.</p>
            </div>

            <div className="statusPanel">
              <div>
                <Search aria-hidden="true" />
                <span>Retrieval path</span>
              </div>
              <p>PDF ingest, paragraph-aware chunks, OpenAI embeddings, local Vectra search, then streamed Claude answers.</p>
            </div>
          </details>
        </aside>

        <section className="chatPanel" aria-label="Rules chat">
          <header className="chatHeader">
            <div>
              <p className="eyebrow">Warhammer 11th Edition</p>
              <h1>{activeSession?.title ?? "Rules Console"}</h1>
            </div>
            <div className="corpusBadge">
              <BookOpen aria-hidden="true" />
              <span>Corpus pending</span>
            </div>
          </header>

          <div className="messageList" aria-live="polite">
            {messages.length === 0 ? (
              <div className="emptyState">
                <p>Ask a rules question to test the streaming shell.</p>
                <div className="exampleGrid">
                  {examples.map((example) => (
                    <button
                      className="exampleButton"
                      key={example}
                      type="button"
                      onClick={() => sendMessage({ text: example })}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                const sources = getRuleSources(message.parts);
                const isLatestAssistant = message.id === latestAssistantMessage?.id;
                const isStreamingAssistant = message.role === "assistant" && isLatestAssistant && status === "streaming";
                const shouldShowSources =
                  message.role === "assistant" && sources.length > 0 && !isStreamingAssistant && status !== "submitted";

                return (
                  <article className={`message ${message.role} ${isStreamingAssistant ? "streaming" : ""}`} key={message.id}>
                    <p className="messageRole">{message.role === "user" ? "Commander" : "Servo Skull"}</p>
                    {message.parts.map((part, index) => {
                      if (part.type !== "text") {
                        return null;
                      }

                      return (
                        <div
                          className={`messageText ${message.role === "assistant" ? "assistantText" : ""}`}
                          key={`${message.id}-${index}`}
                        >
                          {message.role === "assistant" ? (
                            <ReactMarkdown>{part.text}</ReactMarkdown>
                          ) : (
                            part.text
                          )}
                        </div>
                      );
                    })}
                    {isStreamingAssistant ? <StreamingFooter /> : null}
                    {shouldShowSources ? (
                      <SourceCards sources={sources} />
                    ) : null}
                  </article>
                );
              })}
                {showThinkingState ? <ThinkingMessage /> : null}
              </>
            )}
          </div>

          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              const text = input.trim();
              if (!text) {
                return;
              }

              sendMessage({ text });
              setInput("");
            }}
          >
            <input
              aria-label="Rules question"
              disabled={isWorking}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Ask for a rule, interaction, or citation..."
              value={input}
            />
            <button aria-label="Send question" disabled={isWorking || !input.trim()} type="submit">
              {isWorking ? (
                <CircularProgress aria-hidden="true" className="muiSpinner" size={20} thickness={5} />
              ) : (
                <Send aria-hidden="true" />
              )}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

export function ThinkingMessage() {
  return (
    <article className="message assistant loadingMessage">
      <p className="messageRole">Servo Skull</p>
      <div className="loadingHeader">
        <CircularProgress aria-hidden="true" className="inlineSpinner" size={18} thickness={5} />
        <span>Consulting the indexed rules</span>
      </div>
      <div className="skeletonStack" aria-hidden="true">
        <Skeleton animation="wave" className="muiSkeleton" height={18} width="84%" />
        <Skeleton animation="wave" className="muiSkeleton" height={18} width="96%" />
        <Skeleton animation="wave" className="muiSkeleton" height={18} width="62%" />
      </div>
    </article>
  );
}

export function StreamingFooter() {
  return (
    <div className="streamingFooter" aria-live="polite">
      <CircularProgress aria-hidden="true" className="inlineSpinner" size={15} thickness={5} />
      <span>Composing answer</span>
    </div>
  );
}

export function createEmptySession(): StoredChatSession {
  const now = new Date().toISOString();

  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

export function loadChatSessions() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as { sessions?: StoredChatSession[] } | StoredChatSession[];
    const sessions = Array.isArray(parsed) ? parsed : parsed.sessions;
    return Array.isArray(sessions) ? sessions.filter((session) => session.id && session.title) : [];
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions: StoredChatSession[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    CHAT_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      sessions,
    }),
  );
}

export function deriveChatTitle(messages: UIMessage[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");
  const title = firstUserMessage?.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    return "New chat";
  }

  return title.length > 44 ? `${title.slice(0, 41)}...` : title;
}

export function formatChatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Saved";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getRuleSources(parts: Array<{ type: string }>) {
  const sourcePart = parts.find((part) => part.type === "data-ruleSources") as
    | { data?: RuleSource[] }
    | undefined;

  return Array.isArray(sourcePart?.data) ? sourcePart.data : [];
}

export function SourceCards({ sources }: { sources: RuleSource[] }) {
  return (
    <section className="sourceStack" aria-label="Sources used">
      <div className="sourceStackHeader">
        <FileText aria-hidden="true" />
        <span>Sources used</span>
      </div>
      {sources.map((source) => (
        <details className="sourceCard" key={source.id}>
          <summary>
            <span className="sourceLabel">{source.label}</span>
            <span className="sourceMain">
              <strong>{source.title}</strong>
              <span>{source.location}</span>
            </span>
            <span className="sourceScore">{source.score.toFixed(2)}</span>
          </summary>
          <p className="sourcePreview">{source.preview}</p>
          <blockquote>{source.fullQuote}</blockquote>
          <a href={source.sourceUrl} rel="noreferrer" target="_blank">
            <ExternalLink aria-hidden="true" />
            Open source PDF
          </a>
        </details>
      ))}
    </section>
  );
}
