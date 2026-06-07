import { fireEvent, render, screen } from "@testing-library/react";
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it } from "vitest";

import {
  createEmptySession,
  deriveChatTitle,
  formatChatDate,
  loadChatSessions,
  saveChatSessions,
  SourceCards,
  StreamingFooter,
  ThinkingMessage,
} from "./page";

const source = {
  id: "core-rules:chunk:0004",
  label: "S1",
  title: "Warhammer 40,000 Core Rules",
  location: "page 2, paragraph 4",
  sourceUrl: "https://example.com/core-rules.pdf",
  score: 0.82,
  preview: "Line of sight is drawn as an imaginary straight line.",
  fullQuote:
    "Line of sight is drawn as an imaginary straight line from any part of one model to any part of another model.",
};

describe("chat UI components", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders source cards with readable source metadata", () => {
    render(<SourceCards sources={[source]} />);

    expect(screen.getByText("Sources used")).toBeInTheDocument();
    expect(screen.getByText("S1")).toBeInTheDocument();
    expect(screen.getByText("Warhammer 40,000 Core Rules")).toBeInTheDocument();
    expect(screen.getByText("page 2, paragraph 4")).toBeInTheDocument();
    expect(screen.getByText("0.82")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open source pdf/i })).toHaveAttribute(
      "href",
      "https://example.com/core-rules.pdf",
    );
  });

  it("lets users expand a source card to inspect the full quote", () => {
    render(<SourceCards sources={[source]} />);

    const sourceCard = screen.getByText("Warhammer 40,000 Core Rules").closest("details");
    expect(sourceCard).not.toHaveAttribute("open");

    fireEvent.click(screen.getByText("Warhammer 40,000 Core Rules"));

    expect(sourceCard).toHaveAttribute("open");
    expect(screen.getByText(source.fullQuote)).toBeInTheDocument();
  });

  it("renders a skeleton thinking state before streamed text arrives", () => {
    render(<ThinkingMessage />);

    expect(screen.getByText("Servo Skull")).toBeInTheDocument();
    expect(screen.getByText("Consulting the indexed rules")).toBeInTheDocument();
  });

  it("renders a composing indicator while streaming", () => {
    render(<StreamingFooter />);

    expect(screen.getByText("Composing answer")).toBeInTheDocument();
  });
});

describe("local chat session helpers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("creates an empty saved chat session", () => {
    const session = createEmptySession();

    expect(session.title).toBe("New chat");
    expect(session.messages).toEqual([]);
    expect(session.id).toMatch(/^chat-/);
  });

  it("stores and loads chat sessions from localStorage", () => {
    const session = createEmptySession();
    saveChatSessions([session]);

    expect(loadChatSessions()).toEqual([session]);
  });

  it("derives a chat title from the first user message", () => {
    const messages: UIMessage[] = [
      {
        id: "message-1",
        role: "user",
        parts: [
          {
            type: "text",
            text: "How do objective control rules work?",
          },
        ],
      },
    ];

    expect(deriveChatTitle(messages)).toBe("How do objective control rules work?");
  });

  it("falls back to New chat when there is no user message", () => {
    expect(deriveChatTitle([])).toBe("New chat");
  });

  it("formats saved chat dates for the sidebar", () => {
    expect(formatChatDate("2026-06-07T13:45:00.000Z")).toMatch(/07 Jun/);
  });
});
