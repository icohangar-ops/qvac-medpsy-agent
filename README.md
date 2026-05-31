# MedPsy Edge Agent 🧬

**Multi-Agent Medical AI — 100% Local, Running on Edge**

A privacy-first medical intelligence platform running entirely on-device via the QVAC SDK. No data leaves your machine. MedGemma 4B powers clinical reasoning, with Llama 3.2 1B as fallback — all quantized for 8GB RAM.

---

## 🏆 QVAC Unleash Edge AI Hackathon

- **Track:** Psy Models / General Purpose
- **Model:** MedGemma 4B Q4_1 (~2.56 GB on disk)
- **Architecture:** Multi-Agent (Orchestrator → Diagnostic / Research / Wellness)
- **Runtime:** Electron + React 18 + TypeScript + Tailwind CSS 4

---

## ✨ Features

| Capability | Details |
|---|---|
| **Local Inference** | MedGemma 4B Q4_1 via QVAC llama.cpp — all inference on-device |
| **Multi-Agent System** | Orchestrator routes queries to Diagnostic 🩺, Research 🔬, or Wellness 🌿 agents |
| **Streaming Responses** | Token-by-token streaming via Electron IPC |
| **Model Fallback** | Llama 3.2 1B if MedGemma registry is unavailable |
| **Embeddings (opt.)** | EmbeddingGemma 300M for future RAG over medical literature |
| **Privacy First** | Zero external API calls — the entire pipeline is local |
| **Tailwind CSS 4 UI** | Dark mode, responsive, agent-switching UI |

### Agent Roles

- **🧠 Agent Orchestrator** — Routes queries to the correct specialist agent or answers general questions directly
- **🩺 Diagnostic Agent** — Analyzes symptoms, lists possible conditions (with medical disclaimers)
- **🔬 Medical Research Agent** — Answers factual medical questions using embedded knowledge
- **🌿 Wellness Agent** — Preventive health, nutrition, exercise, and lifestyle guidance

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22+
- **8 GB RAM** minimum (16 GB recommended)
- **macOS** (Intel or Apple Silicon)

### Run It

```bash
# Clone
git clone https://github.com/cubiczan/qvac-medpsy-agent.git
cd qvac-medpsy-agent

# Install
npm install

# Development
npm run dev

# Production build
npm run build
```

The app will download MedGemma 4B (~2.56 GB) on first launch. A progress bar shows download status.

---

## 🏗 Architecture

```
src/
├── main/
│   └── index.ts          # Electron main process, QVAC SDK integration
├── preload/
│   └── index.ts          # Context bridge (IPC → renderer)
├── renderer/
│   ├── index.html        # Entry HTML
│   └── src/
│       ├── App.tsx       # React UI with agent system
│       ├── qvac.d.ts     # Type declarations for preload API
│       ├── index.tsx     # React root mount
│       └── main.css      # Tailwind CSS 4 entry
electron.vite.config.ts   # Electron-Vite build config
```

### Data Flow

```
User Input → React UI → IPC → Main Process → QVAC SDK → MedGemma 4B
                                          ↓
                              Token Stream via IPC →
                                          ↓
                       React UI streams tokens in real-time
```

---

## 🧪 Why MedGemma 4B?

- **State-of-the-art medical LLM** — fine-tuned from Gemma 4B with clinical data
- **Q4_1 quantization** — 2.56 GB, fits 8 GB RAM budget with headroom
- **llama.cpp backend** — mature, fast CPU inference on Intel Mac mini
- **EmbeddingGEMMA 300M** available for vector RAG (loaded as optional second model)

---

## 🛠 Development

```bash
# TypeScript check
npm run lint

# Dev mode with hot reload
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## 📦 Dependencies

- **@qvac/sdk** (0.11.0) — Core SDK: model loading, inference, type-safe APIs
- **@electron-toolkit/utils** — Electron utilities
- **electron-vite** — Fast Vite-based Electron bundling
- **React 18** — UI framework
- **Tailwind CSS 4** — Utility-first CSS

---

## 🔒 Security

- **All data stays local** — no API calls, no telemetry, no cloud dependencies
- **Context isolation enabled** in Electron — renderer has no direct Node/System access
- **No sandbox** flag for QVAC SDK compatibility (`--no-sandbox`)

---

## 📄 License

MIT — Built for the QVAC Unleash Edge AI Hackathon.

---

*Built with QVAC SDK · MedGemma 4B · Electron · React · Tailwind CSS 4*
