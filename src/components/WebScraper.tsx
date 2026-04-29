import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Loader2,
  Globe,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Bug,
  Zap,
  CheckCircle2,
  ArrowRight,
  Brain,
  Sparkles,
  AlertCircle,
  Layers,
  MessageSquare,
  Send,
  Copy,
  Code2,
  Package,
  Terminal,
  Play,
  Check,
  Square,
  X,
} from "lucide-react";
import { useAppContext } from "../store/AppContext";
import { saveScrapedPagesToVault, loadScrapedPagesFromVault, WebScrapedPage, isVaultConnected } from "../api/vault";

/* ── Types ── */
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface ScrapedPage {
  title: string;
  url: string;
  snippet: string;
  content: string;
  scrapedAt: string;
}

interface Chunk {
  id: string;
  source: string;
  index: number;
  text: string;
}

interface RetrievalResult {
  chunk: Chunk;
  score: number;
}

/* ── Constants: Scripts ── */
const SCRAPER_SCRIPT = `"""
Web Scraper Tool
===============
Searches the web for a query, scrapes page content,
and saves everything as structured Markdown files.

Usage:
    python web_scraper.py

Requirements:
    pip install requests beautifulsoup4 duckduckgo-search
"""

import os
import re
import time
import hashlib
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# ─── Configuration ───────────────────────────────────────────────
OUTPUT_DIR      = "scraped_data"
MAX_RESULTS     = 10
SCRAPE_TIMEOUT  = 15
SEARCH_DELAY    = 1.5          # seconds between page scrapes
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


def ensure_output_dir() -> str:
    """Create output directory if it doesn't exist."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    return OUTPUT_DIR


# ─── Web Search ──────────────────────────────────────────────────

def search_duckduckgo(query: str, max_results: int = MAX_RESULTS) -> list[dict]:
    """Search DuckDuckGo HTML and return a list of {'title', 'url', 'snippet'} dicts."""
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        return [
            {
                "title":   r.get("title", ""),
                "url":     r.get("href", r.get("link", "")),
                "snippet": r.get("body", ""),
            }
            for r in results
        ]
    except ImportError:
        print("⚠ duckduckgo-search not installed, falling back to HTML scrape…")

    headers = {"User-Agent": USER_AGENT}
    url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
    resp = requests.get(url, headers=headers, timeout=SCRAPE_TIMEOUT)
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    for block in soup.select(".result"):
        a = block.select_one(".result__a")
        snip = block.select_one(".result__snippet")
        if not a:
            continue
        results.append({
            "title":   a.get_text(strip=True),
            "url":     a.get("href", ""),
            "snippet": snip.get_text(strip=True) if snip else "",
        })
        if len(results) >= max_results:
            break
    return results


# ─── Page Scraping ────────────────────��──────────────────────────

def scrape_page(url: str) -> dict | None:
    """Fetch a single URL and extract clean text content."""
    headers = {"User-Agent": USER_AGENT}
    try:
        resp = requests.get(url, headers=headers, timeout=SCRAPE_TIMEOUT)
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"  ✗ Failed to fetch {url}: {exc}")
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    for tag in soup(["script", "style", "nav", "footer", "header",
                      "aside", "iframe", "noscript"]):
        tag.decompose()

    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else "No Title"

    body = soup.find("main") or soup.find("article") or soup.find("body") or soup
    text = body.get_text(separator="\n", strip=True)

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    text = "\n".join(lines)

    return {
        "title":      title,
        "content":    text,
        "url":        url,
        "scraped_at": datetime.now().isoformat(timespec="seconds"),
    }


# ─── Markdown Export ─────────────────────────────────────────────

def save_as_markdown(pages: list[dict], query: str, out_dir: str) -> str:
    """Write all scraped pages into a single .md file."""
    ts   = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe = re.sub(r"[^A-Za-z0-9_-]+", "_", query).strip("_")
    fname = f"{safe}_{ts}.md"
    fpath = os.path.join(out_dir, fname)

    with open(fpath, "w", encoding="utf-8") as fh:
        fh.write(f"# Search: \"{query}\"\n\n")
        fh.write(f"- **Date:** {datetime.now():%Y-%m-%d %H:%M:%S}\n")
        fh.write(f"- **Pages scraped:** {len(pages)}\n\n---\n\n")

        for i, p in enumerate(pages, 1):
            fh.write(f"## {i}. {p['title']}\n\n")
            fh.write(f"**URL:** <{p['url']}>\n\n")
            fh.write(f"**Scraped at:** {p.get('scraped_at', 'N/A')}\n\n")
            fh.write(f"### Content\n\n{p['content']}\n\n---\n\n")

    return fpath


# ─── Main ────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  🕷  Web Scraper — search · scrape · save as Markdown")
    print("=" * 60)

    query = input("\n🔍 Enter search query: ").strip()
    if not query:
        print("No query provided – exiting.")
        return

    out_dir = ensure_output_dir()

    print(f"\n🔎 Searching for \"{query}\" …")
    hits = search_duckduckgo(query, MAX_RESULTS)

    if not hits:
        print("❌ No results found.")
        return

    print(f"   Found {len(hits)} results.\n")

    scraped: list[dict] = []
    for idx, hit in enumerate(hits, 1):
        print(f"  [{idx}/{len(hits)}] Scraping: {hit['title'][:70]}…")
        page = scrape_page(hit["url"])
        if page:
            page["snippet"] = hit.get("snippet", "")
            scraped.append(page)
        time.sleep(SEARCH_DELAY)

    if not scraped:
        print("\n❌ Could not scrape any pages.")
        return

    path = save_as_markdown(scraped, query, out_dir)
    print(f"\n{'='*60}")
    print(f"  ✅ Done! {len(scraped)} pages scraped.")
    print(f"  📄 Saved to: {path}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
`;

const RAG_SCRIPT = `"""
RAG System (Retrieval-Augmented Generation)
============================================
Reads .md files produced by web_scraper.py, chunks them,
builds a TF-IDF index, and answers questions via retrieval.

Usage:
    python rag_system.py
    USE_LLM=true python rag_system.py   # with GPT answers

Requirements:
    pip install numpy openai
"""

import os
import re
import glob
import hashlib
import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime

DATA_DIR        = "scraped_data"
CHUNK_SIZE      = 500
CHUNK_OVERLAP   = 50
TOP_K           = 5


def load_markdown_files(directory: str) -> List[Dict]:
    pattern = os.path.join(directory, "*.md")
    paths   = sorted(glob.glob(pattern))
    docs = []
    for p in paths:
        with open(p, "r", encoding="utf-8") as fh:
            docs.append({
                "filename": os.path.basename(p),
                "filepath": p,
                "content":  fh.read(),
            })
    print(f"📂 Loaded {len(docs)} file(s) from '{directory}'")
    return docs


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    chunks, start = [], 0
    while start < len(text):
        end   = start + size
        chunk = text[start:end]
        if end < len(text):
            bp = max(chunk.rfind("."), chunk.rfind("\n"))
            if bp > start + size // 2:
                chunk = text[start : bp + 1]
                end   = bp + 1
        if chunk.strip():
            chunks.append(chunk.strip())
        start = end - overlap
    return chunks


def build_chunks(docs: List[Dict]) -> List[Dict]:
    all_chunks: List[Dict] = []
    for doc in docs:
        for i, txt in enumerate(chunk_text(doc["content"])):
            all_chunks.append({
                "id":         hashlib.md5(f"{doc['filename']}_{i}".encode()).hexdigest()[:12],
                "source":     doc["filename"],
                "chunk_idx":  i,
                "text":       txt,
            })
    print(f"✂️  {len(all_chunks)} chunks from {len(docs)} documents")
    return all_chunks


class TfidfRetriever:
    def __init__(self):
        self.chunks: List[Dict] = []
        self.vocab: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self.matrix = None

    @staticmethod
    def _tok(text: str) -> List[str]:
        return re.findall(r"\b[a-zA-Z0-9]{3,}\b", text.lower())

    @staticmethod
    def _tf(tokens: List[str]) -> Dict[str, float]:
        n = len(tokens) or 1
        freq: Dict[str, float] = {}
        for t in tokens:
            freq[t] = freq.get(t, 0) + 1
        return {k: v / n for k, v in freq.items()}

    def fit(self, chunks: List[Dict]):
        self.chunks = chunks
        N = len(chunks)
        df: Dict[str, int] = {}
        for ch in chunks:
            for t in set(self._tok(ch["text"])):
                df[t] = df.get(t, 0) + 1
                if t not in self.vocab:
                    self.vocab[t] = len(self.vocab)
        self.idf = {t: np.log(N / (f + 1)) + 1 for t, f in df.items()}
        V = len(self.vocab)
        self.matrix = np.zeros((N, V))
        for i, ch in enumerate(chunks):
            tf = self._tf(self._tok(ch["text"]))
            for t, v in tf.items():
                if t in self.vocab:
                    self.matrix[i, self.vocab[t]] = v * self.idf[t]
        print(f"🔍 Index built — {V} vocabulary terms")

    def retrieve(self, query: str, top_k: int = TOP_K) -> List[Tuple[Dict, float]]:
        q_tokens = self._tok(query)
        q_tf     = self._tf(q_tokens)
        V        = len(self.vocab)
        q_vec    = np.zeros(V)
        for t, v in q_tf.items():
            if t in self.vocab:
                q_vec[self.vocab[t]] = v * self.idf.get(t, 1)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            return []
        q_vec /= q_norm
        d_norms = np.linalg.norm(self.matrix, axis=1)
        d_norms[d_norms == 0] = 1
        sims = (self.matrix @ q_vec) / d_norms
        top_idx = np.argsort(sims)[::-1][:top_k]
        return [(self.chunks[i], float(sims[i])) for i in top_idx if sims[i] > 0]


def generate_with_openai(query: str, context: str) -> str:
    try:
        import openai
        client = openai.OpenAI()
        resp   = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Answer using ONLY the provided context."},
                {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {query}"},
            ],
            max_tokens=600,
            temperature=0.3,
        )
        return resp.choices[0].message.content
    except Exception as exc:
        return f"[LLM error] {exc}"


def extractive_answer(results: List[Tuple[Dict, float]]) -> str:
    if not results:
        return "No relevant information found."
    parts = [f"Found {len(results)} relevant passage(s):\n"]
    for ch, score in results[:3]:
        parts.append(f"📄 **{ch['source']}** (score {score:.3f}):")
        parts.append(f"   {ch['text'][:300]}{'…' if len(ch['text'])>300 else ''}")
        parts.append("")
    return "\n".join(parts)


def main():
    print("=" * 60)
    print("  🤖 RAG System — Retrieval-Augmented Generation")
    print("=" * 60)

    if not os.path.isdir(DATA_DIR):
        print(f"\n❌ '{DATA_DIR}/' not found. Run web_scraper.py first.")
        return

    docs    = load_markdown_files(DATA_DIR)
    if not docs:
        print("No .md files found.")
        return

    chunks  = build_chunks(docs)
    retriever = TfidfRetriever()
    retriever.fit(chunks)

    use_llm = os.getenv("USE_LLM", "false").lower() == "true"

    print("\n" + "=" * 60)
    print("  💬 Ask a question  (type 'quit' to exit)")
    print("=" * 60 + "\n")

    while True:
        q = input("❓ Query: ").strip()
        if q.lower() in ("quit", "exit", "q"):
            print("👋 Bye!"); break
        if not q:
            continue
        results = retriever.retrieve(q)
        if not results:
            print("No relevant chunks found.\n"); continue

        print(f"\n📊 Top {len(results)} chunks:\n")
        for i, (ch, sc) in enumerate(results, 1):
            print(f"  [{i}] score={sc:.4f}  source={ch['source']}")
            print(f"      {ch['text'][:120]}…\n")

        if use_llm:
            ctx    = "\n---\n".join(c["text"] for c, _ in results)
            answer = generate_with_openai(q, ctx)
            print(f"🤖 Answer:\n{answer}\n")
        else:
            print(f"📝 {extractive_answer(results)}")

        print("-" * 60 + "\n")


if __name__ == "__main__":
    main()
`;

/* ── Mock helpers ── */
const SITES = [
  { name: "Wikipedia", domain: "en.wikipedia.org", prefix: "wiki" },
  { name: "Mozilla MDN", domain: "developer.mozilla.org", prefix: "en-US/docs" },
  { name: "Stack Overflow", domain: "stackoverflow.com", prefix: "questions/tagged" },
  { name: "GeeksforGeeks", domain: "www.geeksforgeeks.org", prefix: "article" },
  { name: "Medium", domain: "medium.com", prefix: "" },
  { name: "IBM Developer", domain: "developer.ibm.com", prefix: "articles" },
  { name: "MIT OCW", domain: "ocw.mit.edu", prefix: "courses" },
  { name: "Coursera", domain: "www.coursera.org", prefix: "learn" },
];

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateMockResults(query: string): SearchResult[] {
  const slug = query.toLowerCase().replace(/\s+/g, "_");
  const tc = titleCase(query);
  const templates: ((q: string, s: any) => SearchResult)[] = [
    (q, s) => ({
      title: `${tc} — ${s.name}`,
      url: `https://${s.domain}/${s.prefix}/${slug}`,
      snippet: `A comprehensive overview of ${q.toLowerCase()} covering history, key concepts, applications, and current research directions.`,
    }),
    (q) => ({
      title: `Understanding ${tc}: A Complete Guide`,
      url: `https://example.com/guides/${slug}`,
      snippet: `Learn everything about ${q.toLowerCase()} — from fundamentals to advanced topics. Includes real-world examples and best practices.`,
    }),
    (q) => ({
      title: `${tc} Tutorial — Step by Step`,
      url: `https://tutorial.example.com/${slug}`,
      snippet: `Hands-on tutorial for ${q.toLowerCase()}. Build real projects while learning core principles and techniques.`,
    }),
    (_q) => ({
      title: `What Is ${tc}? Definition & Meaning`,
      url: `https://dictionary.example.com/term/${slug}`,
      snippet: `${tc} refers to a broad area of study and practice. This article defines the term and explores its significance in modern contexts.`,
    }),
    (q) => ({
      title: `Latest Research in ${tc} (2024–2025)`,
      url: `https://research.example.com/papers/${slug}`,
      snippet: `Recent breakthroughs and publications related to ${q.toLowerCase()}. Peer-reviewed findings and expert analysis.`,
    }),
    (q) => ({
      title: `${tc} Best Practices & Common Pitfalls`,
      url: `https://blog.example.com/${slug}-best-practices`,
      snippet: `Avoid common mistakes when working with ${q.toLowerCase()}. Expert tips and proven strategies for success.`,
    }),
    (q) => ({
      title: `Getting Started with ${tc} — Beginner's Roadmap`,
      url: `https://learn.example.com/roadmap/${slug}`,
      snippet: `New to ${q.toLowerCase()}? This roadmap takes you from zero to proficient with curated resources and milestones.`,
    }),
    (q) => ({
      title: `${tc} vs. Alternatives — Comparison`,
      url: `https://compare.example.com/${slug}`,
      snippet: `Detailed comparison of ${q.toLowerCase()} against popular alternatives. Performance benchmarks and use-case analysis.`,
    }),
  ];

  return SITES.map((site, i) => {
    const gen = templates[i % templates.length];
    return gen(query, site);
  });
}

function generateMockContent(result: SearchResult, query: string): string {
  const paras = [
    `## Introduction\n\n${result.snippet}`,
    `The field of ${query.toLowerCase()} has grown rapidly over the past decade. `
    + `Researchers and practitioners alike have contributed to a rich body of knowledge `
    + `that spans theory, application, and tooling.`,
    `## Core Concepts\n\nAt its heart, ${query.toLowerCase()} involves several foundational ideas. `
    + `First, understanding the basic principles is essential for anyone looking to work in this area. `
    + `These principles provide a framework for tackling complex problems and building robust solutions.`,
    `Second, practical experience matters. Hands-on projects, open-source contributions, and real-world `
    + `case studies help solidify theoretical knowledge and develop intuition for edge cases.`,
    `## Applications\n\n${titleCase(query)} finds applications in many domains including technology, `
    + `healthcare, finance, education, and entertainment. Organizations worldwide leverage these `
    + `techniques to gain competitive advantages and drive innovation.`,
    `## Challenges & Future Directions\n\nDespite significant progress, several challenges remain. `
    + `Scalability, interpretability, and ethical considerations are active areas of research. `
    + `The next decade promises exciting developments as cross-disciplinary collaboration increases.`,
    `## Conclusion\n\nWhether you're a beginner or an experienced practitioner, staying current `
    + `with ${query.toLowerCase()} trends is invaluable. Continuous learning and community engagement `
    + `are key to long-term success in this dynamic field.`,
  ];
  return paras.join("\n\n");
}

/* ── TF-IDF Implementation ── */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/\b[a-z0-9]{3,}\b/g) || []);
}

function chunkText(text: string, size = 400, overlap = 60): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + size;
    let chunk = text.slice(start, end);
    if (end < text.length) {
      const bp = Math.max(chunk.lastIndexOf("."), chunk.lastIndexOf("\n"));
      if (bp > start + size * 0.4) {
        chunk = text.slice(start, bp + 1);
        end = bp + 1;
      }
    }
    if (chunk.trim()) chunks.push(chunk.trim());
    start = end - overlap;
  }
  return chunks;
}

function buildChunks(pages: ScrapedPage[]): Chunk[] {
  const allChunks: Chunk[] = [];
  for (const page of pages) {
    const textChunks = chunkText(page.content);
    textChunks.forEach((txt, i) => {
      allChunks.push({
        id: `${page.title.slice(0, 20)}_${i}`,
        source: page.title,
        index: i,
        text: txt,
      });
    });
  }
  return allChunks;
}

function computeTFIDF(chunks: Chunk[]): { retrieve: (query: string, topK?: number) => RetrievalResult[] } {
  const N = chunks.length;
  if (N === 0) return { retrieve: () => [] };

  const chunkTokens = chunks.map((c) => tokenize(c.text));

  const vocab = new Map<string, number>();
  const df = new Map<string, number>();
  let vocabIdx = 0;

  for (const tokens of chunkTokens) {
    const unique = new Set(tokens);
    for (const t of unique) {
      df.set(t, (df.get(t) || 0) + 1);
      if (!vocab.has(t)) {
        vocab.set(t, vocabIdx++);
      }
    }
  }

  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, Math.log(N / (freq + 1)) + 1);
  }

  const V = vocab.size;
  const vectors: Float64Array[] = [];
  for (const tokens of chunkTokens) {
    const vec = new Float64Array(V);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const total = tokens.length || 1;
    for (const [t, count] of tf) {
      const idx = vocab.get(t);
      if (idx !== undefined) {
        vec[idx] = (count / total) * (idf.get(t) || 1);
      }
    }
    vectors.push(vec);
  }

  const norms = vectors.map((v) => {
    let s = 0;
    for (let i = 0; i < v.length; i++) s += v[i] * v[i];
    return Math.sqrt(s) || 1;
  });

  function retrieve(query: string, topK = 5): RetrievalResult[] {
    const qTokens = tokenize(query);
    const qVec = new Float64Array(V);
    const qTf = new Map<string, number>();
    for (const t of qTokens) qTf.set(t, (qTf.get(t) || 0) + 1);
    const qTotal = qTokens.length || 1;
    for (const [t, count] of qTf) {
      const idx = vocab.get(t);
      if (idx !== undefined) {
        qVec[idx] = (count / qTotal) * (idf.get(t) || 1);
      }
    }
    let qNorm = 0;
    for (let i = 0; i < qVec.length; i++) qNorm += qVec[i] * qVec[i];
    qNorm = Math.sqrt(qNorm) || 1;

    const scores: { idx: number; score: number }[] = [];
    for (let i = 0; i < N; i++) {
      let dot = 0;
      for (let j = 0; j < V; j++) dot += qVec[j] * vectors[i][j];
      const sim = dot / (qNorm * norms[i]);
      if (sim > 0.01) scores.push({ idx: i, score: sim });
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK).map((s) => ({
      chunk: chunks[s.idx],
      score: s.score,
    }));
  }

  return { retrieve };
}

/* ── Initial sample data ── */
const SAMPLE_DOCS: ScrapedPage[] = [
  {
    title: "Introduction to Machine Learning",
    url: "https://example.com/ml-intro",
    snippet: "An overview of machine learning concepts",
    scrapedAt: new Date().toISOString(),
    content: [
      "# Introduction to Machine Learning\n",
      "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing algorithms that can access data and use it to learn for themselves.",
      "## Types of Machine Learning\n\nThere are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning.",
      "### Supervised Learning\n\nIn supervised learning, the algorithm learns from labeled training data. The model is trained on a dataset that includes both the input features and the correct output. Common algorithms include linear regression, decision trees, random forests, and neural networks.",
      "### Unsupervised Learning\n\nUnsupervised learning deals with unlabeled data. The algorithm tries to find hidden patterns or structures in the data. Clustering and dimensionality reduction are common unsupervised learning tasks. K-means clustering and PCA are popular algorithms.",
      "### Reinforcement Learning\n\nReinforcement learning is about an agent interacting with an environment. The agent learns to make decisions by performing actions and receiving rewards or penalties. It is widely used in robotics, game playing, and autonomous vehicles.",
      "## Applications\n\nMachine learning has numerous applications including natural language processing, computer vision, recommendation systems, fraud detection, healthcare diagnostics, autonomous driving, and financial forecasting.",
    ].join("\n\n"),
  },
  {
    title: "Python Programming Guide",
    url: "https://example.com/python-guide",
    snippet: "Comprehensive Python programming guide",
    scrapedAt: new Date().toISOString(),
    content: [
      "# Python Programming Guide\n",
      "Python is a high-level, interpreted programming language known for its readability and versatility. It supports multiple programming paradigms including procedural, object-oriented, and functional programming.",
      "## Getting Started\n\nTo start programming in Python, you need to install the Python interpreter. Python code can be written in any text editor and executed from the command line or through an IDE.",
      "## Data Structures\n\nPython provides several built-in data structures: lists, tuples, dictionaries, and sets. Lists are ordered and mutable. Tuples are ordered and immutable. Dictionaries store key-value pairs. Sets store unique elements.",
      "## Functions and Classes\n\nFunctions in Python are defined using the def keyword. They can accept positional arguments, keyword arguments, and default values. Classes are defined using the class keyword and support inheritance, encapsulation, and polymorphism.",
      "## Popular Libraries\n\nPython has a rich ecosystem of libraries. NumPy for numerical computing, Pandas for data manipulation, Matplotlib for visualization, Scikit-learn for machine learning, TensorFlow and PyTorch for deep learning, Flask and Django for web development.",
    ].join("\n\n"),
  },
  {
    title: "Web Development Fundamentals",
    url: "https://example.com/web-dev",
    snippet: "Learn web development from scratch",
    scrapedAt: new Date().toISOString(),
    content: [
      "# Web Development Fundamentals\n",
      "Web development refers to the building and maintenance of websites. It includes aspects such as web design, web programming, and database management. Web development ranges from creating simple static pages to complex web applications.",
      "## Frontend Development\n\nFrontend development involves creating the visual elements of a website that users interact with. HTML provides the structure, CSS handles the styling, and JavaScript adds interactivity. Modern frontend frameworks include React, Vue.js, and Angular.",
      "## Backend Development\n\nBackend development handles server-side logic, databases, and application integration. Popular backend languages include Python, Node.js, Ruby, PHP, and Java. Common backend frameworks are Django, Express.js, Ruby on Rails, and Spring Boot.",
      "## Databases\n\nDatabases store and manage data for web applications. SQL databases like PostgreSQL and MySQL use structured tables. NoSQL databases like MongoDB store data in flexible documents. Choosing the right database depends on the application requirements.",
      "## APIs\n\nApplication Programming Interfaces allow different software applications to communicate with each other. REST APIs are the most common type, using HTTP methods like GET, POST, PUT, and DELETE. GraphQL provides a more flexible query language for APIs.",
    ].join("\n\n"),
  },
];

/* ── Main Component ── */
type ScraperTab = "scraper" | "rag";

function WebScraper() {
  const { sendMessage } = useAppContext();
  const [activeTab, setActiveTab] = useState<ScraperTab>("scraper");
  
  // Scraper state
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [scrapedPages, setScrapedPages] = useState<ScrapedPage[]>([]);
  const [showScript, setShowScript] = useState(false);
  const [scrapeDone, setScrapeDone] = useState(false);
  
  // Selection state for links to scrape
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Vault-loaded scraped data for RAG
  const [savedScrapes, setSavedScrapes] = useState<{ query: string; pages: WebScrapedPage[]; savedAt: number; fileName: string }[]>([]);
  const [selectedScrapeIndex, setSelectedScrapeIndex] = useState<number>(-1);
  
  // RAG state
  const [ragQuery, setRagQuery] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [retrievalResults, setRetrievalResults] = useState<RetrievalResult[]>([]);
  const [hasQueried, setHasQueried] = useState(false);

  // Use vault-loaded scrapes, current session scrapes, or fall back to sample
  const usingSample = savedScrapes.length === 0 && scrapedPages.length === 0;
  
  // Get the currently selected scrape from vault or current session
  const vaultDocs = selectedScrapeIndex >= 0 && selectedScrapeIndex < savedScrapes.length 
    ? savedScrapes[selectedScrapeIndex].pages.map(p => ({
        title: p.title,
        url: p.url,
        snippet: p.snippet,
        content: p.content,
        scrapedAt: p.scrapedAt,
      }))
    : [];
  
  const docs = vaultDocs.length > 0 ? vaultDocs : (scrapedPages.length > 0 ? scrapedPages : SAMPLE_DOCS);

  // Build index once
  const { chunks, retrieve } = useMemo(() => {
    const c = buildChunks(docs);
    const engine = computeTFIDF(c);
    return { chunks: c, retrieve: engine.retrieve };
  }, [docs]);

  // Load saved scrapes from vault on mount
  useEffect(() => {
    const loadFromVault = async () => {
      const connected = await isVaultConnected();
      if (connected) {
        const loaded = await loadScrapedPagesFromVault();
        setSavedScrapes(loaded);
        if (loaded.length > 0 && selectedScrapeIndex === -1) {
          setSelectedScrapeIndex(0);
        }
      }
    };
    loadFromVault();
  }, []);

  // Pre-fill query from pending web search
  const { pendingWebSearch: pendingQuery, setPendingWebSearch } = useAppContext();
  const prevPendingRef = useRef<string | null>(null);
  useEffect(() => {
    if (pendingQuery && pendingQuery !== prevPendingRef.current) {
      prevPendingRef.current = pendingQuery;
      setQuery(pendingQuery);
      // Auto-trigger search when query is pre-filled, then clear pending
      const timer = setTimeout(async () => {
        await handleSearch();
        setPendingWebSearch(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingQuery, setPendingWebSearch]);

  /* ── Selection handlers ── */
  const toggleUrlSelection = useCallback((url: string) => {
    setSelectedUrls(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  }, []);

  const selectAllUrls = useCallback(() => {
    setSelectedUrls(new Set(results.map(r => r.url)));
  }, [results]);

  const clearSelection = useCallback(() => {
    setSelectedUrls(new Set());
  }, []);

  const handleStartSelection = useCallback(() => {
    setIsSelectionMode(true);
    setSelectedUrls(new Set(results.map(r => r.url)));
  }, [results]);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedUrls(new Set());
  }, []);

  /* ── Scraper handlers ── */
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setScrapedPages([]);
    setScrapeDone(false);
    setSelectedUrls(new Set());
    setIsSelectionMode(false);
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
    const mock = generateMockResults(query.trim());
    setResults(mock);
    setIsSearching(false);
  }, [query]);

  const handleScrape = useCallback(async () => {
    const urlsToScrape = selectedUrls.size > 0 ? selectedUrls : new Set(results.map(r => r.url));
    if (urlsToScrape.size === 0) return;
    setIsScraping(true);
    const pages: ScrapedPage[] = [];
    for (let i = 0; i < results.length; i++) {
      if (!urlsToScrape.has(results[i].url)) continue;
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));
      const r = results[i];
      pages.push({
        ...r,
        content: generateMockContent(r, query),
        scrapedAt: new Date().toISOString(),
      });
    }
    setScrapedPages(pages);
    setIsScraping(false);
    setScrapeDone(true);
    setIsSelectionMode(false);
  }, [results, query, selectedUrls]);

  const handleSaveToVault = useCallback(async () => {
    if (!scrapedPages.length) return;
    
    // Convert to WebScrapedPage format for vault storage
    const vaultPages: WebScrapedPage[] = scrapedPages.map(p => ({
      title: p.title,
      url: p.url,
      snippet: p.snippet,
      content: p.content,
      scrapedAt: p.scrapedAt,
      query: query,
    }));
    
    const saved = await saveScrapedPagesToVault(vaultPages, query);
    if (saved) {
      // Reload saved scrapes
      const loaded = await loadScrapedPagesFromVault();
      setSavedScrapes(loaded);
      if (loaded.length > 0) {
        setSelectedScrapeIndex(0);
      }
    }
    return saved;
  }, [scrapedPages, query]);

  const handleDownloadMD = useCallback(async () => {
    if (!scrapedPages.length) return;
    
    // Try to save to vault first
    const vaultConnected = await isVaultConnected();
    if (vaultConnected) {
      const saved = await handleSaveToVault();
      if (saved) return; // Saved to vault, done
    }
    
    // Fallback to browser download
    const now = new Date();
    const lines: string[] = [
      `# Search Results: "${query}"\n`,
      `**Date:** ${now.toISOString()}`,
      `**Pages scraped:** ${scrapedPages.length}\n`,
      "---\n",
    ];
    scrapedPages.forEach((p, i) => {
      lines.push(`## ${i + 1}. ${p.title}\n`);
      lines.push(`**URL:** <${p.url}>\n`);
      lines.push(`**Scraped at:** ${p.scrapedAt}\n`);
      lines.push(`### Content\n\n${p.content}\n`);
      lines.push("---\n");
    });
    const md = lines.join("\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safe = query.replace(/[^a-zA-Z0-9]+/g, "_");
    a.download = `${safe}_scraped.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [scrapedPages, query, handleSaveToVault]);

  /* ── RAG handlers ── */
  const handleRagQuery = useCallback(async () => {
    if (!ragQuery.trim()) return;
    setIsQuerying(true);
    setHasQueried(true);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    const res = retrieve(ragQuery, 5);
    setRetrievalResults(res);
    setIsQuerying(false);
  }, [ragQuery, retrieve]);

  /* ── Send to Chat handler ── */
  const handleSendToChat = useCallback(async (content: string) => {
    const contextMsg = `📎 **Web Scraper Context**\n\n${content}`;
    await sendMessage(contextMsg);
  }, [sendMessage]);

  const handleSendAllToChat = useCallback(async () => {
    const content = scrapedPages.map(p => `## ${p.title}\n${p.content.slice(0, 500)}`).join("\n\n---\n\n");
    await handleSendToChat(content);
  }, [scrapedPages, handleSendToChat]);

  /* ── Tabs nav ── */
  const tabs: { id: ScraperTab; label: string; icon: React.ReactNode }[] = [
    { id: "scraper", label: "Web Scraper", icon: <Bug size={14} /> },
    { id: "rag", label: "RAG Query", icon: <Brain size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6">
      {/* Top Nav */}
      <div className="sticky top-0 z-50 mb-6 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl rounded-xl">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
              <Bug size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-violet-400">Web</span>
              <span className="text-slate-400">Scraper</span>
            </span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/60 rounded-lg p-1 border border-slate-800/60">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-slate-700/80 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === "scraper" && (
          <div className="space-y-8">
            {/* Hero / Search */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

              <div className="relative space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-600/20">
                    <Bug size={24} className="text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Web Scraper</h2>
                    <p className="text-sm text-slate-400">
                      Search the web, scrape pages, export as Markdown
                    </p>
                  </div>
                </div>

                {/* Search bar */}
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      placeholder="Enter a search query (e.g. machine learning, climate change)…"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/70 border border-slate-700/60
                                 text-white placeholder-slate-500 focus:outline-none focus:ring-2
                                 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !query.trim()}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white
                               bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed
                               transition-colors cursor-pointer"
                  >
                    {isSearching ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Search size={18} />
                    )}
                    {isSearching ? "Searching…" : "Search"}
                  </button>
                </div>

                {/* Quick stats */}
                <div className="flex gap-6 text-sm text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Globe size={14} /> {results.length} results found
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} /> {scrapedPages.length} pages scraped
                  </span>
                </div>
              </div>
            </section>

            {/* Loading skeleton */}
            {isSearching && (
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-5 animate-pulse"
                  >
                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
                    <div className="h-3 bg-slate-700/60 rounded w-full mb-2" />
                    <div className="h-3 bg-slate-700/60 rounded w-5/6" />
                  </div>
                ))}
              </div>
            )}

            {/* Results grid */}
            {results.length > 0 && !isSearching && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    Search Results
                    <span className="ml-2 text-sm font-normal text-slate-400">
                      ({results.length})
                    </span>
                  </h3>
                  <div className="flex gap-2">
                    {!scrapeDone ? (
                      <>
                        {!isSelectionMode ? (
                          <button
                            onClick={handleStartSelection}
                            disabled={results.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                                       bg-amber-600/80 hover:bg-amber-500/80 text-white transition-colors
                                       disabled:opacity-50 cursor-pointer"
                          >
                            <Check size={15} />
                            Select Pages
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={selectAllUrls}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                                         bg-slate-700/80 hover:bg-slate-600/80 text-white transition-colors
                                         cursor-pointer"
                            >
                              <Check size={14} />
                              Select All
                            </button>
                            <button
                              onClick={clearSelection}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                                         bg-slate-700/80 hover:bg-slate-600/80 text-white transition-colors
                                         cursor-pointer"
                            >
                              <Square size={14} />
                              Clear
                            </button>
                            <button
                              onClick={handleCancelSelection}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                                         bg-slate-700/80 hover:bg-slate-600/80 text-slate-300 transition-colors
                                         cursor-pointer"
                            >
                              <X size={14} />
                              Cancel
                            </button>
                            <button
                              onClick={handleScrape}
                              disabled={isScraping || selectedUrls.size === 0}
                              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                                         bg-emerald-600/80 hover:bg-emerald-500/80 text-white transition-colors
                                         disabled:opacity-50 cursor-pointer"
                            >
                              {isScraping ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Zap size={15} />
                              )}
                              {isScraping
                                ? `Scraping (${scrapedPages.length}/${selectedUrls.size})…`
                                : `Scrape ${selectedUrls.size} Page${selectedUrls.size !== 1 ? "s" : ""}`}
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleDownloadMD}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                                     bg-violet-600/80 hover:bg-violet-500/80 text-white transition-colors
                                     cursor-pointer"
                        >
                          <Download size={15} />
                          Save to Vault
                        </button>
                        <button
                          onClick={handleSendAllToChat}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                                     bg-indigo-600/80 hover:bg-indigo-500/80 text-white transition-colors
                                     cursor-pointer"
                        >
                          <Send size={15} />
                          Send to Chat
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Selection info bar */}
                {isSelectionMode && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-950/20 border border-amber-700/40 mb-4">
                    <Check size={14} className="text-amber-400" />
                    <span className="text-sm text-amber-300">
                      {selectedUrls.size} of {results.length} pages selected
                    </span>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {results.map((r, i) => {
                    const scraped = scrapedPages.find((p) => p.url === r.url);
                    const isSelected = selectedUrls.has(r.url);
                    return (
                      <div
                        key={i}
                        onClick={() => isSelectionMode && toggleUrlSelection(r.url)}
                        className={`rounded-xl border p-4 transition-all cursor-pointer ${
                          scraped
                            ? "border-emerald-700/50 bg-emerald-950/20"
                            : isSelectionMode
                            ? isSelected
                              ? "border-amber-500 bg-amber-950/30"
                              : "border-slate-700/40 bg-slate-800/30 hover:border-amber-500/50"
                            : "border-slate-700/40 bg-slate-800/30 hover:border-slate-600/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Selection checkbox */}
                          {isSelectionMode && (
                            <div className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? "bg-amber-500 border-amber-500"
                                : "border-slate-500 hover:border-slate-400"
                            }`}>
                              {isSelected && <Check size={12} className="text-white" />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-sm font-semibold text-white leading-snug">
                                {r.title}
                              </h4>
                              {scraped && (
                                <CheckCircle2
                                  size={16}
                                  className="text-emerald-400 shrink-0 mt-0.5"
                                />
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                              {r.snippet}
                            </p>
                            <p className="text-xs text-violet-400/70 truncate">{r.url}</p>
                            {scraped && (
                              <p className="text-xs text-emerald-500/60 mt-1">
                                {scraped.content.length.toLocaleString()} chars scraped
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {scrapeDone && (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-700/40 bg-emerald-950/20">
                    <CheckCircle2 size={20} className="text-emerald-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-300">
                        {scrapedPages.length} page{scrapedPages.length !== 1 ? "s" : ""} scraped successfully!
                      </p>
                      <p className="text-xs text-emerald-500/70">
                        Saved to vault/webscrape/. Use the RAG tab to query these pages.
                      </p>
                    </div>
                    <ArrowRight size={16} className="text-emerald-500/60" />
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {activeTab === "rag" && (
          <div className="space-y-8">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-cyan-600/10 blur-3xl pointer-events-none" />

              <div className="relative space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600/20">
                    <Brain size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      RAG System
                    </h2>
                    <p className="text-sm text-slate-400">
                      Retrieval-Augmented Generation — ask questions over your scraped data
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <FileText size={15} />, label: "Documents", value: docs.length },
                    { icon: <Layers size={15} />, label: "Chunks", value: chunks.length },
                    { icon: <Search size={15} />, label: "Vocab terms", value: new Set(chunks.flatMap((c) => tokenize(c.text))).size },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-800/50 border border-slate-700/40"
                    >
                      <div className="text-slate-500">{s.icon}</div>
                      <div>
                        <p className="text-lg font-bold text-white">{s.value}</p>
                        <p className="text-[11px] text-slate-500">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {usingSample && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-700/40 bg-amber-950/20">
                    <AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300/80">
                      No scraped data yet — using sample documents about Machine Learning, Python, and Web Development. 
                      Use the <span className="font-semibold">Web Scraper</span> tab first for real data.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Saved Scrapes Selector */}
            {savedScrapes.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Saved Scrapes</h3>
                <div className="flex gap-2 flex-wrap">
                  {savedScrapes.map((scrape, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedScrapeIndex(i)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        selectedScrapeIndex === i
                          ? "bg-violet-600/80 text-white border border-violet-500"
                          : "bg-slate-800/50 text-slate-300 border border-slate-700/40 hover:bg-slate-700/50"
                      }`}
                    >
                      <FileText size={14} />
                      <span className="truncate max-w-[150px]">{scrape.query}</span>
                      <span className="text-xs text-slate-500">({scrape.pages.length})</span>
                    </button>
                  ))}
                </div>
                {selectedScrapeIndex >= 0 && savedScrapes[selectedScrapeIndex] && (
                  <p className="text-xs text-slate-500">
                    Using: "{savedScrapes[selectedScrapeIndex].query}" — {savedScrapes[selectedScrapeIndex].pages.length} pages
                  </p>
                )}
              </section>
            )}

            {/* Documents List */}
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Loaded Documents</h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {docs.map((d, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border border-slate-700/40 bg-slate-800/30"
                  >
                    <h4 className="text-sm font-medium text-white truncate">
                      {d.title}
                    </h4>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {d.url}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {d.content.length.toLocaleString()} chars
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Query */}
            <section className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                Ask a Question
              </h3>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <MessageSquare
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRagQuery()}
                    placeholder={
                      usingSample
                        ? "e.g. What is supervised learning?"
                        : "Ask about your scraped data…"
                    }
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/70 border border-slate-700/60
                               text-white placeholder-slate-500 focus:outline-none focus:ring-2
                               focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  />
                </div>
                <button
                  onClick={handleRagQuery}
                  disabled={isQuerying || !ragQuery.trim()}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white
                             bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
                             transition-colors cursor-pointer"
                >
                  {isQuerying ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Search size={18} />
                  )}
                  {isQuerying ? "Retrieving…" : "Retrieve"}
                </button>
              </div>

              {/* Loading */}
              {isQuerying && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-5 animate-pulse"
                    >
                      <div className="h-3 bg-slate-700 rounded w-1/4 mb-3" />
                      <div className="h-3 bg-slate-700/60 rounded w-full mb-2" />
                      <div className="h-3 bg-slate-700/60 rounded w-5/6" />
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {hasQueried && !isQuerying && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                      {retrievalResults.length > 0
                        ? `Found ${retrievalResults.length} relevant chunk${retrievalResults.length !== 1 ? "s" : ""}`
                        : "No relevant chunks found. Try a different query."}
                    </p>
                  </div>

                  {retrievalResults.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-700/40 bg-slate-800/30 p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-600/30 text-xs font-bold text-indigo-300">
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {r.chunk.source}
                          </span>
                          <span className="text-xs text-slate-500">
                            chunk #{r.chunk.index}
                          </span>
                        </div>
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-800/40">
                          {(r.score * 100).toFixed(1)}% match
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {r.chunk.text}
                      </p>
                      <button
                        onClick={() => handleSendToChat(r.chunk.text)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                                   bg-indigo-600/50 hover:bg-indigo-500/50 text-indigo-300 transition-colors cursor-pointer"
                      >
                        <Send size={12} />
                        Send to Chat
                      </button>
                    </div>
                  ))}

                  {/* Extractive answer */}
                  {retrievalResults.length > 0 && (
                    <div className="mt-6 p-5 rounded-xl border border-indigo-700/40 bg-indigo-950/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-400" />
                        <span className="text-sm font-semibold text-indigo-300">
                          Extractive Summary
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-800/40 text-indigo-400 border border-indigo-700/40">
                          Client-side TF-IDF
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        Based on the top {Math.min(retrievalResults.length, 3)} relevant passages, here is what was found about{" "}
                        <span className="text-indigo-300 font-medium">"{ragQuery}"</span>:
                      </p>
                      <ul className="space-y-2">
                        {retrievalResults.slice(0, 3).map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-indigo-500 mt-1">▸</span>
                            <span className="text-slate-300">
                              From{" "}
                              <span className="text-slate-200 font-medium">
                                {r.chunk.source}
                              </span>
                              : {r.chunk.text.slice(0, 200)}
                              {r.chunk.text.length > 200 ? "…" : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs text-slate-500 pt-2 border-t border-slate-700/40">
                        For full LLM-powered generation, run the Python RAG script locally with USE_LLM=true and an OpenAI API key.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── CodeBlock Component ── */
function CodeBlock({ code, filename }: { code: string; filename: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-700/60 overflow-hidden bg-[#0d1117]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/70 border-b border-slate-700/60">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="ml-3 text-sm text-slate-400 font-mono">{filename}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
                       bg-slate-700/60 hover:bg-slate-600/60 text-slate-300
                       transition-colors cursor-pointer"
          >
            {copied ? <CheckCircle2 size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
                       bg-violet-600/80 hover:bg-violet-500/80 text-white
                       transition-colors cursor-pointer"
          >
            <Download size={13} />
            Download .py
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="overflow-auto max-h-[600px] p-4">
        <pre className="text-[13px] leading-relaxed text-slate-300 font-mono whitespace-pre">
          {code.split("\n").map((line, i) => (
            <div key={i} className="flex">
              <span className="inline-block w-10 pr-3 text-right text-slate-600 select-none shrink-0">
                {i + 1}
              </span>
              <span className="whitespace-pre-wrap break-all">{highlightPython(line)}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

/* ── Python Syntax Highlighting ── */
function highlightPython(line: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    if (remaining.startsWith("#")) {
      parts.push(<span key={key++} className="text-slate-500 italic">{remaining}</span>);
      break;
    }

    const tqMatch = remaining.match(/^(("""|'''))/);
    if (tqMatch) {
      parts.push(<span key={key++} className="text-emerald-400">{remaining}</span>);
      break;
    }

    const strMatch = remaining.match(/^(f?"""[^]*?"""|f?'''[^]*?'''|f?"[^"]*"|f?'[^']*')/);
    if (strMatch) {
      const s = strMatch[1];
      parts.push(<span key={key++} className="text-emerald-400">{s}</span>);
      remaining = remaining.slice(s.length);
      continue;
    }

    const decMatch = remaining.match(/^(@\w+)/);
    if (decMatch) {
      parts.push(<span key={key++} className="text-yellow-400">{decMatch[1]}</span>);
      remaining = remaining.slice(decMatch[1].length);
      continue;
    }

    const kwMatch = remaining.match(/^(def|class|import|from|return|if|elif|else|for|while|try|except|finally|with|as|in|not|and|or|is|None|True|False|yield|lambda|pass|break|continue|raise|global|nonlocal|assert|del)\b/);
    if (kwMatch) {
      const w = kwMatch[1];
      parts.push(<span key={key++} className="text-violet-400 font-semibold">{w}</span>);
      remaining = remaining.slice(w.length);
      continue;
    }

    const biMatch = remaining.match(/^(print|len|range|str|int|float|list|dict|set|tuple|type|isinstance|enumerate|zip|map|filter|sorted|reversed|open|super|property|staticmethod|classmethod|input|abs|max|min|sum|any|all|hasattr|getattr|setattr)\b/);
    if (biMatch) {
      const w = biMatch[1];
      parts.push(<span key={key++} className="text-cyan-400">{w}</span>);
      remaining = remaining.slice(w.length);
      continue;
    }

    const numMatch = remaining.match(/^(\d+\.?\d*)/);
    if (numMatch) {
      const n = numMatch[1];
      parts.push(<span key={key++} className="text-amber-400">{n}</span>);
      remaining = remaining.slice(n.length);
      continue;
    }

    parts.push(<span key={key++}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return <>{parts}</>;
}

export default WebScraper;