# 👾 Slime-AI: The Autonomous Local-First AI Agent Workspace

[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-round&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-round&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?style=flat-round&logo=vite&logoColor=white)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=flat-round&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Playwright](https://img.shields.io/badge/Playwright-1.59-2E8B57?style=flat-round&logo=playwright&logoColor=white)](https://playwright.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=flat-round&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

**Slime-AI** is a sophisticated, highly extensible local-first AI assistant and agent orchestration workspace. Fusing a sleek, state-of-the-art frontend UI with an active local-sandbox file vault, persistent layered memory structures, and advanced browser automation scrapers, Slime-AI empowers developers and power users to run autonomous task loops, forge distinct model personalities, and watch tool capabilities grow via gamified level systems—all while ensuring complete data privacy by keeping keys and histories stored directly on your physical machine.

---

## 🌟 Key Features

### 1. 🔌 Multi-Provider LLM Integration
Connect and orchestrate both cloud-based endpoints and local LLMs through a unified interface.
* **Local Engines**: Direct support for **Ollama** and **LM Studio**.
* **Cloud Platforms**: Integrations with **OpenAI**, **Anthropic**, **Google Gemini**, **OpenRouter**, and **xAI Grok**.
* **Enterprise Gateway**: Automated rate-limiting, error logging, auto-retry, and transparent fallback provider routing.

### 2. 🗃️ Local-First "Vault" Storage (Browser-Direct File System)
Interact with physical workspace files straight from the web browser without any server-side database requirements.
* **File System Access API**: Map the assistant directly to a physical directory on your machine (an Obsidian-style folder). 
* **Seamless Persistence**: Automatic generation and saving of chat history (as pristine Markdown), system configs, and environment keys.
* **IndexedDB Fallback**: Transparent and high-performance compatibility mode for browsers with limited file system access (e.g., Firefox, Safari, or Brave in custom-sandbox mode).

### 3. 🎯 Personality Forge
Design, customize, and deploy specific AI personas.
* **Import-Only Personas**: Define and share system instructions, dynamic parameters, and specialized focus fields.
* **Keyword Triggers**: Automatically invoke specific personalities based on user inputs or contextual cues.
* **Memory Bindings**: Inject persona-specific perpetual context constraints dynamically.

### 4. 📈 Gamified Tool Leveling System
Watch your tools evolve through usage. Slime-AI tracks the execution performance of activated capabilities (e.g., file writing, web searches, scraper requests).
* **Rank Progression**: **Basic → Advanced → Expert → Master → Legendary**.
* **XP Mechanics**: Mastery points calculated from total calls, duration tracking, success rates, and direct user feedback (👍/👎).
* **Autonomy Controls**: Higher tool ranks open up more advanced capabilities and greater model-directed execution parameters.

### 5. 🕷️ Playwright & Crawl4AI Web Scraper
Bypass standard layout scraping limitations using a modern Python FastAPI backend service.
* **JS-Enabled Scrapers**: Headless and headed crawling using Playwright to render complex dynamic pages.
* **AI Extraction (Crawl4AI)**: Extracts structured data, cleans layout noise, and yields optimized Markdown summaries.
* **Readability Integration**: Converts raw DOM elements into focused text using Mozilla Readability.

### 6. 🧠 Layered Cognitive Memory
Maintains continuous interaction context without bloating the active LLM context window.
* **User Memory**: Persistent preferences, styles, and custom developer instructions.
* **Model Memory**: Unique contextual profiles retained per model type.
* **Temporal Tiers**: Perpetual (long-term historical storage), Periodic (session/project-based storage), and Ephemeral (conversational turn storage).

### 7. ➰ Autonomous Loop Execution
Let the agent solve complex multi-step problems iteratively.
* **Flexible Loop Settings**: Set maximum iterations, cost budgets, and trigger actions.
* **Interactive Stop Conditions**: Stop loops on custom keyword triggers, structural confidence thresholds, or manual user intervention.
* **Exit Strategies**: Gracefully exit immediately, after tool evaluations, or on comprehensive summary responses.

---

## 📂 Project Architecture

```
Slime-AI/
├── src/                          # Frontend Application Source Code
│   ├── api/                      # 30+ modules (LLM providers, browser automation, search, memory)
│   │   ├── providers.ts          # Multi-LLM provider abstraction
│   │   ├── vault.ts              # File System Access API interface
│   │   ├── browser.ts            # Playwright control bridge
│   │   ├── memory.ts             # Layered memory orchestrator
│   │   └── toolLeveling.ts       # Tool XP and rank progression math
│   ├── components/               # 40+ modular React components
│   │   ├── ChatPanel.tsx         # Streaming chat container
│   │   ├── Sidebar.tsx           # Multi-panel navigation controller
│   │   ├── WebScraper.tsx        # Web scraping custom interface
│   │   └── CommandPalette.tsx    # Global hotkey navigator (Ctrl+K)
│   ├── store/
│   │   └── AppContext.tsx        # Centralized application state context
│   ├── slime/                    # Personality & Skill Forge system
│   └── utils/                    # Utility suites (sanitization, validation, rate limiters)
├── scraper/                      # Python Web Scraping Service
│   ├── api_server.py             # FastAPI server bridge (port: 11235)
│   ├── crawl4ai_scraper.py      # Standalone/integrated Crawl4AI scraper backend
│   └── requirements.txt          # Python scraping requirements
├── slime-ai/                     # Default Vault data directory (Git-ignored)
│   ├── chats/                    # Markdown chat logs (YYYY-MM-DD-id.md)
│   ├── webscrape/                # Cached scraping Markdown extracts
│   ├── skills/                   # Configured personality definitions (.skill JSON)
│   └── memory/                   # Per-model and user memory profiles
├── package.json                  # Node.js workspace dependencies
├── vite.config.ts                # Vite build and asset bundler settings
└── TSConfig.json                 # TypeScript build constraints
```

---

## 🛠️ Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **Python** (v3.10 or higher)
* **Local LLM Engine** (Ollama or LM Studio, optional but highly recommended)

### 💻 1. Frontend Setup
Clone the repository and install the dependencies:
```bash
# Install NPM dependencies
npm install

# Start the Vite development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 🐍 2. Backend Scraping Setup (Optional, for Web Search & Scrape)
To enable the advanced Playwright and Crawl4AI features, spin up the FastAPI service:
```bash
# Navigate to scraper directory
cd scraper

# (Optional) Create and activate virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install Python requirements
pip install -r requirements.txt

# Download Playwright browser binaries
playwright install chromium
crawl4ai-setup

# Start the FastAPI scraper server
python api_server.py
```
The scraper will run on `http://localhost:11235`. The frontend will automatically detect the server and display **Crawl4AI ✓** in the UI.

---

## 🎮 How to Use Slime-AI

### Fusing your Workspace (The Vault)
1. In the sidebar, navigate to the **Vault Settings**.
2. Click **Open Workspace Folder** and select the physical directory on your computer where you want Slime-AI to operate.
3. Grant permissions in your browser. Slime-AI will now write all markdown files, keys, and chat histories straight into your folder, allowing external editors (like VS Code or Obsidian) to interact with them in real-time.

### Leveling Up Your Tools
Tools gain experience (XP) as you use them. For example, if you run multiple web searches or file manipulations, you will notice the tool cards in the interface displaying updated levels and badges:
* **XP Gains**: Earned per successful tool execution, speed, and positive user feedback (clicking 👍 on assistant responses using that tool).
* **Mastery Levels**: Increases accuracy, enables advanced parameters, and decreases LLM hallucination risk.

---

## 🧪 Running Tests
Slime-AI includes an automated unit-testing suite powered by Vitest:
```bash
# Run unit tests
npm run test

# Run tests and verify coverage
npm run test:coverage
```

---

## 🔒 Security & Privacy
Because Slime-AI is **local-first**:
1. **Zero External Tracking**: Your chat history, code, scraped contents, and memory models never leave your computer.
2. **Local Key Storage**: API keys are saved either in your browser's secure `localStorage` or stored locally as variables in your sandboxed Vault workspace.
3. **Prompt Injection Guardrails**: Built-in sanitization blocks malicious inputs and prompt-manipulation strategies before passing payloads to LLM providers.

---

## 📄 License
This project is open-source and available under the MIT License.
