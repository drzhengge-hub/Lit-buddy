"use client";

import { useEffect, useMemo, useState } from "react";

type Mode = "summary" | "takeaways" | "questions";

type SavedNote = {
  id: string;
  createdAt: number;
  title: string;
  mode: Mode;
  inputText: string;
  outputText: string;
};

function splitSentences(text: string) {
  // Simple sentence splitter (good enough for v1)
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickFirstNSentences(text: string, n: number) {
  const s = splitSentences(text);
  return s.slice(0, n).join(" ");
}

function extractKeywords(text: string, max = 10) {
  const stop = new Set([
    "the","a","an","and","or","but","if","then","than","that","this","those","these",
    "to","of","in","on","for","with","as","at","by","from","into","over","under",
    "is","are","was","were","be","been","being","it","its","they","them","their",
    "you","your","we","our","i","me","my","he","she","his","her","not","no","yes",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !stop.has(w));

  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

function generateOutput(mode: Mode, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";

  if (mode === "summary") {
    // v1 summary = first ~3 sentences (fast, predictable)
    const out = pickFirstNSentences(trimmed, 3);
    return out || "Couldn’t form a summary — try adding more text.";
  }

  if (mode === "takeaways") {
    const keywords = extractKeywords(trimmed, 8);
    const bullets =
      keywords.length > 0
        ? keywords.map((k) => `• ${k}`).join("\n")
        : "• No key takeaways detected — try adding more text.";
    return bullets;
  }

  // questions
  const keywords = extractKeywords(trimmed, 6);
  const qs =
    keywords.length > 0
      ? keywords
          .slice(0, 5)
          .map((k) => `• What is the author’s main point about “${k}”?`)
          .join("\n")
      : "• What is the main claim?\n• What evidence supports it?\n• What would change your mind?";
  return qs;
}

const STORAGE_KEY = "litbuddy_saved_notes_v1";

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<Mode>("summary");
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [saved, setSaved] = useState<SavedNote[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSaved(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      // ignore
    }
  }, [saved]);

  const selected = useMemo(
    () => saved.find((n) => n.id === selectedId) ?? null,
    [saved, selectedId]
  );

  function run() {
    const out = generateOutput(mode, text);
    setOutput(out);
  }

  function saveNote() {
    const inputText = text.trim();
    const outputText = output.trim();
    if (!inputText || !outputText) return;

    const now = Date.now();
    const note: SavedNote = {
      id: crypto.randomUUID(),
      createdAt: now,
      title: title.trim() || "Untitled",
      mode,
      inputText,
      outputText,
    };

    setSaved((prev) => [note, ...prev]);
    setSelectedId(note.id);
  }

  function loadNote(n: SavedNote) {
    setSelectedId(n.id);
    setTitle(n.title);
    setMode(n.mode);
    setText(n.inputText);
    setOutput(n.outputText);
  }

  function deleteNote(id: string) {
    setSaved((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function clearAll() {
    setSaved([]);
    setSelectedId(null);
    setTitle("");
    setMode("summary");
    setText("");
    setOutput("");
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logo} aria-hidden>
            📚
          </div>
          <div>
            <h1 style={styles.h1}>Lit Buddy</h1>
            <p style={styles.sub}>Your personal reading companion.</p>
          </div>
        </div>
      </header>

      <section style={styles.grid}>
        {/* Left: Input + Output */}
        <div style={styles.card}>
          <h2 style={styles.h2}>Home</h2>

          <label style={styles.label}>Title (optional)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chapter 3 — Motivation"
            style={styles.input}
          />

          <label style={styles.label}>What do you want?</label>
          <div style={styles.modeRow}>
            <ModeButton active={mode === "summary"} onClick={() => setMode("summary")}>
              Summary
            </ModeButton>
            <ModeButton active={mode === "takeaways"} onClick={() => setMode("takeaways")}>
              Key Takeaways
            </ModeButton>
            <ModeButton active={mode === "questions"} onClick={() => setMode("questions")}>
              Questions
            </ModeButton>
          </div>

          <label style={styles.label}>Paste text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a paragraph or a page here…"
            style={styles.textarea}
          />

          <div style={styles.actions}>
            <button onClick={run} style={styles.primaryBtn}>
              Generate
            </button>
            <button
              onClick={saveNote}
              style={{
                ...styles.secondaryBtn,
                opacity: output.trim() ? 1 : 0.5,
                pointerEvents: output.trim() ? "auto" : "none",
              }}
              title={output.trim() ? "Save to My Notes" : "Generate something first"}
            >
              Save
            </button>
          </div>

          <div style={styles.outputWrap}>
            <div style={styles.outputHeader}>
              <h3 style={styles.h3}>Result</h3>
              <span style={styles.badge}>{mode}</span>
            </div>
            <pre style={styles.output}>{output || "Nothing yet — paste text and tap Generate."}</pre>
          </div>
        </div>

        {/* Right: Saved notes */}
        <div style={styles.card}>
          <div style={styles.notesHeader}>
            <h2 style={styles.h2}>My Notes</h2>
            <button onClick={clearAll} style={styles.linkBtn} title="Clear everything">
              Clear all
            </button>
          </div>

          {saved.length === 0 ? (
            <p style={styles.muted}>No saved notes yet. Generate something, then tap Save.</p>
          ) : (
            <div style={styles.list}>
              {saved.map((n) => (
                <div
                  key={n.id}
                  style={{
                    ...styles.listItem,
                    borderColor: n.id === selectedId ? "#111" : "#ddd",
                  }}
                >
                  <button onClick={() => loadNote(n)} style={styles.listItemBtn}>
                    <div style={styles.listItemTop}>
                      <strong style={styles.listTitle}>{n.title}</strong>
                      <span style={styles.smallBadge}>{n.mode}</span>
                    </div>
                    <div style={styles.listMeta}>
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </button>
                  <button onClick={() => deleteNote(n.id)} style={styles.trashBtn} aria-label="Delete">
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div style={styles.preview}>
              <h3 style={styles.h3}>Preview</h3>
              <div style={styles.previewTitle}>{selected.title}</div>
              <pre style={styles.previewBody}>{selected.outputText}</pre>
            </div>
          )}
        </div>
      </section>

      <footer style={styles.footer}>
        <span style={styles.footerText}>
          v1 works offline (no API). Next step: swap “Generate” to use an AI endpoint.
        </span>
      </footer>
    </main>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.modeBtn,
        background: active ? "#111" : "#fff",
        color: active ? "#fff" : "#111",
        borderColor: active ? "#111" : "#ddd",
      }}
    >
      {children}
    </button>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px 18px 40px",
    background: "#fafafa",
    color: "#111",
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  },
  header: { maxWidth: 1100, margin: "0 auto 18px" },
  brand: { display: "flex", gap: 12, alignItems: "center" },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "#111",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    fontSize: 20,
  },
  h1: { margin: 0, fontSize: 30, letterSpacing: -0.4 },
  sub: { margin: "4px 0 0", color: "#555" },

  grid: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr",
    gap: 16,
  },

  card: {
    background: "#fff",
    border: "1px solid #eaeaea",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  },

  h2: { margin: "4px 0 12px", fontSize: 18 },
  h3: { margin: 0, fontSize: 14 },
  label: { display: "block", fontSize: 12, color: "#555", margin: "10px 0 6px" },
  input: {
    width: "100%",
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 160,
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
  },

  modeRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  modeBtn: {
    border: "1px solid #ddd",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 13,
  },

  actions: { display: "flex", gap: 10, marginTop: 12 },
  primaryBtn: {
    border: "1px solid #111",
    background: "#111",
    color: "#fff",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 600,
  },
  secondaryBtn: {
    border: "1px solid #ddd",
    background: "#fff",
    color: "#111",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    fontWeight: 600,
  },

  outputWrap: {
    marginTop: 14,
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 12,
    background: "#fcfcfc",
  },
  outputHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge: {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #ddd",
    color: "#333",
    background: "#fff",
  },
  output: {
    margin: 0,
    whiteSpace: "pre-wrap",
    fontSize: 13,
    lineHeight: 1.45,
    color: "#111",
  },

  notesHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  linkBtn: {
    border: "none",
    background: "transparent",
    color: "#111",
    textDecoration: "underline",
    fontSize: 12,
    cursor: "pointer",
  },
  muted: { color: "#666", fontSize: 13, marginTop: 10 },
  list: { display: "flex", flexDirection: "column", gap: 10, marginTop: 10 },
  listItem: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 8,
    alignItems: "center",
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: 10,
  },
  listItemBtn: {
    textAlign: "left",
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
  },
  listItemTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  listTitle: { fontSize: 13 },
  smallBadge: {
    fontSize: 11,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid #ddd",
    color: "#333",
    background: "#fff",
    whiteSpace: "nowrap",
  },
  listMeta: { marginTop: 4, fontSize: 11, color: "#666" },
  trashBtn: {
    border: "1px solid #eee",
    background: "#fff",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
  },

  preview: { marginTop: 14, borderTop: "1px solid #eee", paddingTop: 12 },
  previewTitle: { fontSize: 13, fontWeight: 700, margin: "6px 0" },
  previewBody: { margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "#111" },

  footer: { maxWidth: 1100, margin: "18px auto 0", paddingTop: 10 },
  footerText: { color: "#666", fontSize: 12 },
};

