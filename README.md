# Life Vault — v3: Real AI, Custom Timer, Document Viewer

Built on top of the premium dark redesign. Three genuinely real upgrades
this round, nothing faked:

## 1. Life AI — real chat, not a mockup

`backend/routes/aiRoute.js` proxies to the actual Anthropic API. Your API
key lives in `backend/.env` only — it never reaches the browser. The
frontend (`pages/LifeAI.jsx`) sends conversation history to your backend,
your backend calls Claude, and the reply streams back.

**To turn it on:**
1. Get a key at https://console.anthropic.com (this is the Anthropic API —
   separate from a normal claude.ai login)
2. In `backend/.env`, set `ANTHROPIC_API_KEY=sk-ant-...`
3. Restart the backend

Without a key set, the Chat tab shows a clear message telling you to add
one — it does not pretend to work.

There's a checkbox in the chat: "Let Life AI see my active tasks and
goals." Off by default. When checked, your backend pulls your real active
tasks/goals and adds them to the system prompt for that message only —
this is the permission-aware context the product brief asked for, done
honestly rather than with a fake toggle.

The separate **Insights tab** on the same page is intentionally NOT AI —
it's the same rule-based logic from before (overdue tasks, stalled goals,
empty vault, monthly spend), clearly labeled as such so you always know
which is which.

## 2. Fully customizable timer

`components/CustomTimer.jsx` replaces the hardcoded 25-minute Pomodoro.
Presets (5/15/25/45/60m) plus a custom hours+minutes entry, a mode
selector (focus/study/workout/reading/meditation/custom), and a session
label. Every completed or stopped-early session logs to
`backend/models/timerSessions.js` via `/api/timer-sessions`, and the
Dashboard's "Deep Hours" stat now sums today's real logged sessions
instead of a localStorage counter.

## 3. In-app document viewer

Vault documents now have a **View** button, not just Download.
`components/DocumentViewerModal.jsx` fetches the file as an authenticated
blob and renders PDFs in an iframe, images directly, with Download and
Delete still available from the same modal. Unsupported file types show a
clear "no preview available" message rather than pretending to render
something they can't.

## What's still not built (same honesty as last time)

Video/voice memories, family permission scoping per-document, AI tool-use
with an action-confirmation UI (the brief's "create reminder from this
document" style flows), AI conversation history/pinning, user-controlled
AI memory, custom user-defined modules, notification center, onboarding
flow, dashboard drag-to-reorder. These are all real, multi-day features
individually — happy to build any specific one next if you tell me which
matters most to you.

## Setup — same as before

```bash
# backend
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, PORT, and ANTHROPIC_API_KEY if you want Life AI live
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

If your backend isn't on port 3000, update `API_URL` in
`frontend/src/api/axiosConfig.js`.

## New backend routes

```
POST                    /api/ai/chat
GET/POST                /api/timer-sessions
```

Both protected by the same JWT `protect` middleware as everything else.
