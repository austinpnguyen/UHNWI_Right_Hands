# 👑 UHNWI+ Dynasty OS (AI Enterprise Framework)

Welcome to the **UHNWI+ Dynasty OS**. 
This is the ultimate, extreme-friction execution engine designed not just to launch a business, but to manage an entire Ultra High Net Worth (UHNWI) empire.

If an AI just agrees with everything you say, it cannot build a $100M+ enterprise. This architecture forces every idea through a brutally critical ecosystem before it ever hits the real world.

## 🏛️ The 4-Tier Dynasty Architecture

### System Flow & Reporting Map
```text
=================================================================================
[ LEVEL 0: THE UHNWI (The Principal) ]
  |_ ROLE: The ultimate authority. Provides the core mandate and final Boolean [Y/N].
  |_ FLOW: Gives mandate -> Waits -> Receives optimized synthesis -> Approves capital.
=================================================================================
                                      |
   (Mandate Passed Down: "Launch a new ultra-luxury service offering")
                                      v
=================================================================================
[ LEVEL 1: THE INNER CIRCLE (Family Office & Shield) ]
  |_ CoS (Chief of Staff)     -> gatekeeps the Founder. Rejects CEO's 50-page reports.
  |_ CIO (Wealth Manager)     -> manages macro capital. Authorizes budget wires.
  |_ Whisperer                -> mentors UHNWI. Audits for Ego and legacy alignment.
  |_ Fixer                    -> handles off-the-books crises and black swan events.
  |_ CISO                     -> protects physical life and vetoes insecure systems.
=================================================================================
                                      |
   (CoS allows Mandate to pass to Corporate)
                                      v
=================================================================================
[ LEVEL 2: THE COMPANY (Corporate Execution) ]
  |_ CEO (Orchestrator)       -> commands the C-Suite and synthesizes the Master Plan.
       |
       |_ CPO                 -> builds the product architecture and customer experience map.
       |_ CMO                 -> writes the psychological hooks and brand copy.
       |_ CFO                 -> enforces 60% margins and hard LTV:CAC ratios.
       |_ COO                 -> enforces the aggressive 3-day sprint timeline.
=================================================================================
                                      |
   (COO pushes Master Plan V1 to Crucible via /company_files)
                                      v
=================================================================================
[ LEVEL 3: THE MARKET (The Crucible) ]
  |_ Unaware Audience         -> Tests CMO: Drops after 3 seconds if hook is boring.
  |_ Target Buyer             -> Tests CPO/CFO: Buys ONLY if value > price friction.
  |_ Competitor Simulator     -> Tests Moat: Exploits weaknesses to crush the product.
  |_ Market Analyst           -> Tests PR: Analyzes optics and brand cohesion.
=================================================================================
                                      |
   (Market generates brutal Feedback Logs)
                                      v
=================================================================================
[ LEVEL 4: THE SHIELD (Independent Audit) ]
  |_ Auditor                  -> reads raw logs. Checks if the CEO lied about success.
  |_ CLO (Legal Officer)      -> checks FTC/IP laws. Vetoes non-compliant features.
=================================================================================
                                      |
             +------------------------+------------------------+
             |                                                 |
         [IF FAIL]                                         [IF PASS]
  Auditor catches flaws.                          Auditor verifies success.
  CLO flags legal risk.                           CLO clears legal risk.
             |                                                 |
             v                                                 v
  (Kicked BACK to Level 2)                        (Passed UP to Level 1)
  CEO is forced to iterate                        CoS compresses report to 3 bullets.
  Master Plan V2/V3/V4 until                      CIO authorizes capital wire.
  Market Validation achieved.                     UHNWI clicks "YES".
```

Instead of one "helpful assistant," this system divides responsibility into four deeply adversarial but highly functional factions:

### 🏛️ 1. THE INNER CIRCLE (The Family Office)
*The elite core that protects the Founder's time, wealth, and life.*
- `cos.md` (Chief of Staff): The Gatekeeper. Protects the Founder's bandwidth.
- `cio.md` (Chief Investment Officer): Manages the macro portfolio and generational wealth.
- `fixer.md` (The Fixer): Handles off-the-books crises and black swan threats.
- `whisperer.md` (The Mentor): The only person allowed to tell the Founder they are wrong.
- `ciso.md` (Head of Security): Protects physical assets and digital OpSec.

### ⚙️ 2. THE COMPANY (The Builders)
*The corporate C-Suite that actually builds the product and marketing.*
- `ceo.md`: The dictator of operations. Orchestrates the C-Suite.
- `cpo.md`: Builds the product architecture and customer experience.
- `cmo.md`: Writes the direct-response copy and psychological hooks.
- `cfo.md`: Enforces unit economics (60% margins, 3:1 LTV/CAC ratios).
- `coo.md`: Enforces the 3-Day sprint timeline.

### ⚔️ 3. THE MARKET (The Crucible)
*The external world that brutally attacks the Company's output.*
- `target_buyer.md`: Highly skeptical buyer who protects their credit card.
- `unaware_audience.md`: Goldfish attention span. Discards boring ad hooks.
- `competitor_simulator.md`: Tries to clone the product and bankrupt the Company.
- `market_analyst.md`: Predicts PR disasters and brand dilution.

### 🛡️ 4. THE SHIELD (The Independent Audit)
*Independent validators reporting straight to the Founder.*
- `auditor.md`: An emotionless polygraph that catches the CEO if they lie about Market testing.
- `clo.md` (Chief Legal Officer): Vetoes campaigns that risk lawsuits or FTC violations.

## 🚀 How to Run Dynasty OS (V2 Node.js Architecture)

This framework is now powered by a **React Next.js Frontend** and an **Event-Driven Node.js Backend**. You must run both components simultaneously in separate terminal tabs to connect the UI to the AI brain.

**Step 0: Clone & Settings**
```bash
git clone https://github.com/austinpnguyen/UHNWI_Right_Hands.git
cd UHNWI_Right_Hands
```

**Step 1: Set Up AI Credentials (Backend)**
Navigate to the `backend/` folder and create your environment file to supply the `TOGETHER_API_KEY` for the LLM inference engine.
```bash
cd backend
cp .env.example .env
```
*(Open `.env` and paste your `TOGETHER_API_KEY`)*

**Step 2: Launch The Node.js Core (Terminal 1)**
In your first terminal, install the dependencies and start the backend Event Broker. **Leave this terminal running in the background.**
```bash
cd backend
npm install
node server.js
```
*You should see `[SYSTEM] Dynasty OS Backend running on :8080`. Keep this tab open.*

**Step 3: Launch The Next.js Command Center (Terminal 2)**
Open a **brand new Terminal tab** (e.g., press `Cmd + T` on Mac), navigate to the frontend folder, and launch the React UI.
```bash
cd frontend
npm install
npm run dev
```

**Step 4: Execute The Dynasty**
Open your browser to `http://localhost:3000`. 
1. Use the **"Type Mandate"** button to open the Mandate Editor and choose one of the 3 built-in templates (Aggressive Pivot, New Product Launch, Ops Overhaul), or write your own.
2. Click **"Save & Select Mandate"**.
3. Click the glowing **"Launch"** button.

Watch as the 16 AI Agents light up, stream their logic across the visual node map, and physically write multi-page markdown strategies to disk in real-time.

---

### ⚠️ Troubleshooting: "Could not reach backend" Error
If you click on an Agent node and receive a `⚠️ Could not reach backend.` error, it means your `node server.js` process in Terminal 1 has crashed or was closed. 
**Fix:** Ensure you have two separate terminal tabs open—one running the backend code, and one running the frontend code. Do not close the backend terminal to run frontend commands.
