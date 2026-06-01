"use client";

import { useChat } from "@ai-sdk/react";
import { BookOpen, Loader2, Search, Send, ShieldCheck, Swords } from "lucide-react";
import { useState } from "react";

const examples = [
  "Can a unit charge after advancing?",
  "How do objective control rules work?",
  "Explain line of sight with an example.",
];

export default function Home() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat();
  const isWorking = status === "submitted" || status === "streaming";

  return (
    <main className="shell">
      <section className="workspace">
        <aside className="sidebar" aria-label="Project status">
          <div className="brand">
            <Swords aria-hidden="true" />
            <div>
              <p>Project Lawrence</p>
              <span>Rules-grounded assistant</span>
            </div>
          </div>

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
            <p>LlamaParse to Markdown, Pinecone hybrid search, Cohere rerank, then streamed answer.</p>
          </div>
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
              messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <p className="messageRole">{message.role === "user" ? "Commander" : "Lawrence"}</p>
                  {message.parts.map((part, index) => {
                    if (part.type !== "text") {
                      return null;
                    }

                    return (
                      <div className="messageText" key={`${message.id}-${index}`}>
                        {part.text}
                      </div>
                    );
                  })}
                </article>
              ))
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
              {isWorking ? <Loader2 className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
