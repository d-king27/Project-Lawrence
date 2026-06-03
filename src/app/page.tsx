"use client";

import { useChat } from "@ai-sdk/react";
import { BookOpen, ExternalLink, FileText, Search, Send, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { CircularProgress, Skeleton } from "@mui/material";
import { useState } from "react";
import ReactMarkdown from "react-markdown";

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

const examples = [
  "Can a unit charge after advancing?",
  "How do objective control rules work?",
  "Explain line of sight with an example.",
];

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const isWorking = status === "submitted" || status === "streaming";
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const showThinkingState =
    status === "submitted" || (isWorking && messages[messages.length - 1]?.role === "user");

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
              <h1>Rules Console</h1>
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

function ThinkingMessage() {
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

function StreamingFooter() {
  return (
    <div className="streamingFooter" aria-live="polite">
      <CircularProgress aria-hidden="true" className="inlineSpinner" size={15} thickness={5} />
      <span>Composing answer</span>
    </div>
  );
}

function getRuleSources(parts: Array<{ type: string }>) {
  const sourcePart = parts.find((part) => part.type === "data-ruleSources") as
    | { data?: RuleSource[] }
    | undefined;

  return Array.isArray(sourcePart?.data) ? sourcePart.data : [];
}

function SourceCards({ sources }: { sources: RuleSource[] }) {
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
