# Gemini 2.0 Flash – Fancy Chat (Render-ready)

A minimal Node + vanilla JS chat app with a **fancy animated UI** and **typing animation**, powered by **Google Gemini 2.0 Flash** via a small Node/Express proxy.

## Deploy to Render

**Environment Variables**
- `GOOGLE_API_KEY`: your Gemini API key
- `MODEL_ID` (optional): defaults to `gemini-2.0-flash`

**Build & Start**
```
Build command: npm install
Start command: node index.js
```

**Port**
Uses `process.env.PORT` (Render sets this automatically) and falls back to `3000` locally.

## Run locally

```bash
npm install
GOOGLE_API_KEY=your_key_here MODEL_ID=gemini-2.0-flash node index.js
# open http://localhost:3000
```

## Files

- `index.js` – Express server + streaming endpoint (`/api/chat/stream`)
- `public/index.html` – app shell
- `public/style.css` – fancy animated UI
- `public/app.js` – chat logic with streaming + typing animation
- `package.json` – dependencies and scripts
- `.env` (optional locally) – put `GOOGLE_API_KEY=...`

## Notes

- The client keeps history in `localStorage` under `gemini.flash.history`.
- The streaming endpoint sends chunks as `data: { delta }` SSE-style over fetch body stream.
- You can change the model using the dropdown (client sends header hint and you can redeploy with a new `MODEL_ID` if desired).
