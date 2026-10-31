# LAST SHIFT: THE LAST OPERATOR

> **Tagline:** *The digital world is collapsing. You are its last chance.*

**LAST SHIFT: THE LAST OPERATOR** is a first-person, realistic 3D, story-driven facility management and digital recovery simulation set in **Facility 07** in the year 2096 following **THE BLACKOUT**.

Instead of a conventional productivity dashboard, players physically explore a connected 3D industrial facility, restore substation breakers and generators, converse with Chief Systems Engineer **Maya Chen** and the facility AI **NOVA**, upgrade 3D server and power infrastructure, and execute real-world digital data operations following the strict human-in-the-loop safety sequence:

**ANALYSE → EXPLAIN → PROPOSE → PREVIEW → APPROVE → EXECUTE → VERIFY**

---

## Core Features

### 1. First-Person 3D Facility 07 (Three.js / WebGL)
- **Seven Connected Architectural Zones**:
  1. **Maintenance Bay 01** (Cryo-recovery wake-up room & reboot monitor)
  2. **Substation Generator Room** (3 Auxiliary Breaker Switches, Main Turbine Lever & rotating cooling turbine)
  3. **01. Central Command** (Command Holotable with rotating 3D holographic facility wireframe, NOVA AI Core display, Engineer Maya Chen station, Technology Upgrade Terminal, and hidden audio recording `PERSONAL_REC_042`)
  4. **02. Communication Centre** (Sector Power Relay, optical sorting racks, and Email Intelligence Workstation)
  5. **03. Archive Vault** (Cryo-storage racks, quarantine bays, and SHA-256 File Organiser Workstation)
  6. **04. Financial Control** (CSV Expense Audit Station & duplicate transaction detector)
  7. **05. Systems Repair** (Static Code Lint Diagnostic Workstation & diff previewer)
- **Controls**:
  - `W / A / S / D` or Arrow Keys: First-person movement with room & bulkhead door collision detection
  - `Shift`: Sprint
  - `Mouse Drag` / `Pointer Lock` / `Left & Right Arrows`: Camera look
  - `E` or Left-Click on focused prompt: Interact with doors, breakers, levers, NPCs, audio logs, and terminals
  - `TAB`: Toggle Sector Workstation Terminal
  - `N`: Toggle NOVA AI & Maya Intercom Drawer
  - `ESC`: Pause menu / close modal

### 2. Chapter 01: The Awakening (Complete 8-Scene Story Campaign)
- **Scene 1 — Wake Up**: Wake in Maintenance Bay 01 under emergency lighting and open the bulkhead door.
- **Scene 2 — Restore Power**: Engage Auxiliary Breakers A, B, and C, then pull the Main Turbine Lever to bring Central Command online.
- **Scene 3 — Central Command**: Inspect the Command Holotable and optionally recover Operator 06 Julian Vance's hidden recording (`PERSONAL_REC_042`).
- **Scene 4 — Meet Maya**: Speak with Chief Systems Engineer Maya Chen to unlock the West Bulkhead.
- **Scene 5 — Restore Communication**: Energize the Communication Centre Power Relay and boot the Email Workstation.
- **Scene 6 — NOVA’s First Analysis**: Inspect classified `.eml` messages, verify Commercial vs. Promotional separation, and approve a batch operation.
- **Scene 7 — Archive Introduction**: Unlock the East Archive Vault and inspect duplicate file records.
- **Scene 8 — The Mystery (`LAST_OPERATOR_LOG_184`)**: Decrypt the anomalous packet left by Operator 06 and complete the Chapter 1 debrief.

### 3. Real Email Intelligence (`02. Communication Centre`)
- Imports single or multiple `.eml` files or `.zip` archives containing `.eml` files, alongside clearly labelled synthetic sample emails.
- Classifies messages across 9 categories:
  1. `Important`
  2. `Personal`
  3. `Commercial / Business` (B2B proposals, SOWs, supplier coordination)
  4. `Promotional / Marketing` (retail discount blasts, % off sales, promo codes)
  5. `Newsletters`
  6. `Invoices and Receipts`
  7. `Notifications`
  8. `Suspicious / Possible phishing`
  9. `Unclassified` (unfamiliar senders without spam signals are safely retained, never auto-spammed)
- Extracts explicit dates/deadlines and monetary amounts strictly from message text without inventing facts.
- Supports manual category correction, bulk actions, undo stack, and JSON report export.

### 4. Archive Vault (`03. Archive Vault`), Financial Control (`04.`) & Systems Repair (`05.`)
- **Archive Vault**: Computes deterministic SHA-256 content hashes to separate exact byte-identical duplicates (`Quarantine Duplicate`) from same-name different-hash revisions (`Hold for Manual Review`). Large videos and `.tmp` dumps are never blindly assumed to be junk.
- **Financial Control**: Parses CSV ledgers, flags duplicate `Date + Vendor + Amount` billing retries, and highlights high-value outliers.
- **Systems Repair**: Runs static lint checks (`@typescript-eslint/no-explicit-any`, `no-var`, `eqeqeq`, `@typescript-eslint/no-floating-promises`), explains issues in plain language, and previews before-and-after code diffs.

### 5. NOVA AI Assistant & Progressive Upgrades
- Server-side **Gemini 3.8 Flash** (`@google/genai`) integration via `/api/nova/chat` with an automatic, transparently labelled **Deterministic Rule Engine** fallback when `GEMINI_API_KEY` is not configured.
- 9 NOVA AI Upgrades + 6 Facility Hardware Upgrades that visibly advance Facility 07 from **Tier 1 (Emergency)** → **Tier 2 (Restored)** → **Tier 3 (Quantum Overclock)**.

---

## Installation & Development

```bash
npm install
npm run dev
```

The application starts an Express + Vite full-stack server on `http://0.0.0.0:3000`.

## Environment Variables & Google Cloud OAuth 2.0 Setup

Copy `.env.example` to `.env`:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
TOKEN_ENCRYPTION_KEY=your_32_byte_encryption_key
SESSION_SECRET=your_session_secret
```

### Setting up Google Cloud OAuth 2.0 & Gmail API (`gmail.readonly`)
1. Open the [Google Cloud Console](https://console.cloud.google.com/) and create or select a Google Cloud project.
2. Navigate to **APIs & Services → Library** and enable the **Gmail API**.
3. Navigate to **APIs & Services → OAuth consent screen**, configure your application brand name, and add the read-only scope `https://www.googleapis.com/auth/gmail.readonly`.
4. Add your Google account under **Test users** while the consent screen is in testing mode.
5. Navigate to **APIs & Services → Credentials → Create Credentials → OAuth client ID** (Web application).
6. Add `http://localhost:3000` to **Authorized JavaScript origins** and `http://localhost:3000/auth/google/callback` to **Authorized redirect URIs**.
7. In AI Studio Build, OAuth 2.0 is provisioned automatically via `/firebase-applet-config.json` using popup-based Google Sign-In (`signInWithPopup` with `https://www.googleapis.com/auth/gmail.readonly`), and the backend encrypts session tokens at rest using **AES-256-GCM** (`src/facility/security.ts`) with `HttpOnly; SameSite=Lax` cookies, HMAC CSRF `state` verification (`/api/auth/verify-state`), and PKCE (`S256`) helpers.

### Security Architecture
- **Minimal Read-Only Scope**: Requests only `https://www.googleapis.com/auth/gmail.readonly` in Phase 1. No email is ever deleted or modified without explicit Operator confirmation.
- **No Plaintext Token Persistence**: OAuth access tokens are held in-memory on the client only for the active tab and stored encrypted on the server with **AES-256-GCM** (`encryptTokenAes256Gcm` / `decryptTokenAes256Gcm`). Tokens are never written to `localStorage`.
- **Disconnect & Revoke**: Clicking **Disconnect Google Account** in the Communication Centre or Settings modal immediately revokes the in-memory token and clears the encrypted server session vault (`POST /api/auth/disconnect`).

## Running Tests

```bash
npx tsx --test src/facility/engine.test.ts src/game/rules.test.ts
npm run lint
npm run build
```

## Google Cloud Run Deployment

1. Build the frontend bundle: `npm run build`
2. Start the production server: `NODE_ENV=production PORT=8080 npx tsx server.ts`
3. Health check endpoint is available at `GET /api/health`.
