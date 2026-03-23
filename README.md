# 👑 Dynasty OS — AI C-Suite Command Center

> **Run an entire company with AI agents.** Dynasty OS is a visual, multi-agent AI orchestration platform where you sit at the top as the Founder and delegate to a full AI-powered C-Suite that debates, builds, and validates your business strategy in real time.

---

## ✨ What It Does

Dynasty OS gives you a **living, interactive org map** of AI agents — each with a distinct role, personality, and adversarial mandate. Type one instruction to your CEO and watch the entire chain of command activate:

- 🏛️ **Org Tree Canvas** — drag-and-drop agent node map with real-time streaming output
- 📅 **Calendar View** — visualize agent schedules day-by-day, week-by-week, or across 2 months
- 👑 **Founder Node** — you sit at the top. Editable identity so anyone can white-label this as their own
- ⌘ **Command Center** — minimizable floating chat that sends instructions to the pipeline
- 🖱️ **Right-click Context Menu** — toggle modes, hire agents, zoom, fit to screen
- 🤖 **Cron Scheduling** — set each AI agent to run on a schedule with timezone awareness
- 📁 **Color-coded Folder Tabs** — sidebar separates Org Map (🔵) and Docs (🟡)
- 🌈 **Siri-style Glow** — fullscreen edge lighting activates when the AI pipeline runs

---

## 🏛️ The 4-Tier Dynasty Architecture

```
[ FOUNDER ] — that's you. Sends the mandate.
      ↓
[ CEO ] — orchestrates the C-Suite. Writes the Master Plan.
      ↓
[ C-SUITE ] — CPO · CFO · CMO · COO and their sub-teams
      ↓
[ MARKET ] — Target Buyer · Competitor Sim · Market Analyst · Cold Audience
      ↓
[ SHIELD ] — Auditor · CLO ← independent validators. Report back to Founder.
```

Instead of a "helpful assistant," every agent has a specific adversarial mandate:
- The **Auditor** catches the CEO if they fabricate market success
- The **Competitor Simulator** tries to bankrupt your product idea
- The **CLO** vetoes campaigns that risk lawsuits
- The **Fixer** handles black swan events off the books

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A [Together AI](https://together.ai) API key (free tier works)

### Step 1 — Clone & Install
```bash
git clone https://github.com/austinpnguyen/UHNWI_Right_Hands.git
cd UHNWI_Right_Hands
```

### Step 2 — Backend Setup
```bash
cd backend
cp .env.example .env
# Open .env and paste your TOGETHER_API_KEY
npm install
node server.js
```
You should see: `[SYSTEM] Dynasty OS Backend running on :1110`

### Step 3 — Frontend Setup *(new terminal tab)*
```bash
cd frontend
npm install
npm run dev
```

### Step 4 — Launch
Open **http://localhost:8080** in your browser.

1. Type your instruction in the **Command Center** at the bottom (e.g. *"Launch a luxury skincare brand targeting UHNW women in the Gulf"*)
2. Hit **⌘ + Enter** or the send button
3. Watch 16+ AI agents activate, debate, and stream their analysis live

---

## 🗂️ Project Structure

```
UHNWI_Right_Hands/
├── frontend/              # Next.js 15 · TailwindCSS · Socket.io client
│   └── src/app/page.tsx   # Main canvas, calendar, sidebar, command center
├── backend/               # Node.js · Express · Socket.io server
│   ├── server.js          # Event bus + REST API + agent orchestration
│   ├── agents/            # Per-agent JSON config & model selection
│   └── prompts/           # Markdown system prompts for each agent
├── agents/                # Agent prompt library
├── company_files/         # Agent outputs written to disk in real time
└── 00_FOUNDER_INSTRUCTION # Your mandate template
```

---

## ⚙️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, TailwindCSS v4, Socket.io-client |
| Backend | Node.js, Express.js, Socket.io, Together AI SDK |
| LLM Inference | [Together AI](https://together.ai) — Llama, DeepSeek, Qwen, Mistral, and more |
| Real-time | WebSockets (bidirectional streaming) |

---

## 🤖 The Agents

| Agent | Role | Adversarial Mandate |
|---|---|---|
| 👑 FOUNDER | You | Sends the mandate |
| ♟️ CEO | Master Plan | Orchestrates and synthesizes |
| 🛠️ CPO | Architecture | Builds the product logic |
| 📈 CFO | Financials | Enforces 60% margins |
| 📣 CMO | Brand Strategy | GTM and psychological hooks |
| ⚙️ COO | Operations | 3-day sprint enforcement |
| 💻 CIO | Tech Infrastructure | Stack + security decisions |
| 📊 Auditor | Financial Compliance | Catches CEO lies about market |
| ⚖️ CLO | Legal | Vetoes lawsuits and FTC risk |
| 🔍 Market Analyst | Competitive Intel | Pokes holes in GTM |
| ⚔️ Competitor Sim | Adversarial | Tries to clone and crush the product |
| 🎯 Target Buyer | Buyer Psychology | Only buys if value > price friction |
| 🌐 Unaware Audience | Cold Market | Drops after 3 seconds if hook is boring |
| 📋 Chief of Staff | Exec Coordination | Gatekeeps the Founder's bandwidth |
| 🛡️ CISO | Security & Privacy | Vetoes insecure operational decisions |
| 🔧 The Fixer | Crisis Resolution | Off-the-books black swan handler |
| 👁️ The Whisperer | Intelligence & Recon | The only one allowed to say you're wrong |

---

## 🔧 Customization

### White-label as your own
Click the **👑 Founder** node on the canvas → **Edit Profile** to set your name, role, and identity. Anyone who forks this repo can make it their own command center.

### Add or hire new agents
Right-click anywhere on the canvas → **Hire Employee** to add a new agent to the org.

### Schedule agents with cron
Open any agent → Edit Profile → switch to **Scheduled (Cron)** → set timezone and cron pattern (e.g. `0 9 * * 1-5` = Mon–Fri at 9am). View them in the **📅 Calendar**.

### Change AI models per agent
Open any agent → **⚙️ Switch Model** to choose from 20+ models (Llama, DeepSeek, Qwen, Mistral, GPT-4o compatible).

---

## ❓ Troubleshooting

**"Could not reach backend" error**
Make sure `node server.js` is still running in a separate terminal. Do not close it when launching the frontend.

**Agents not showing on canvas**
The backend must be online for the system state to load. Check `http://localhost:1110/system-state` returns JSON.

---

## 📄 License

MIT — fork it, clone it, build your empire.

---

*Built with [Together AI](https://together.ai) · Powered by adversarial multi-agent orchestration*
