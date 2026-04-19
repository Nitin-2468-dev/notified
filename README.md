# 🎬 Lapse Notifier

A lightweight background app that watches your [Hack Club Lapse](https://lapse.hackclub.com) account and shows a Windows toast notification whenever you have an active recording session – so you never forget a running timelapse.

If there's no active session, it stays completely silent.

---

## Features

- **Active-only notifications** — only notifies when you have a running draft timelapse; silent otherwise
- **Open Lapse on click** — tapping the notification opens `lapse.hackclub.com` in your browser
- **Dismiss with cooldown** — clicking Dismiss suppresses follow-up notifications for 10 minutes (configurable)
- **Auto-start on Windows boot** — optional, prompted on first run
- **Single `.exe`** — build a single self-contained executable via Node.js SEA

---

## First-time setup

1. **Register an OAuth app** at [lapse.hackclub.com/developer/apps](https://lapse.hackclub.com/developer/apps)
   - Redirect URI: `http://localhost:9737/callback`
   - Scopes: `timelapse:read user:read`

2. Run the notifier:

   ```bash
   npm install
   # Development run:
   LAPSE_CLIENT_SECRET=<your-secret> node dist/main.js

   # Or build and run the bundled version:
   npm run build
   LAPSE_CLIENT_SECRET=<your-secret> node dist/main.js
   ```

3. On first launch you'll be prompted for your **Client ID** and **Client Secret**, then your browser opens to complete the Lapse sign-in. Tokens are stored in `%APPDATA%\notified\config.json`.

---

## Building a standalone `.exe`

Requires Node.js 21+ (SEA feature).  
`postject` is used to inject the SEA blob (install it globally with `npm i -g postject`).

```bash
npm run build      # TypeScript → dist/
npm run bundle     # Bundle to bundle/index.js via ncc
npm run package    # Generate notified.exe via Node.js SEA
```

The `LAPSE_CLIENT_SECRET` environment variable must still be set at runtime (or you can extend `config.ts` to store the secret in the config file).

---

## Configuration

Config is stored at `%APPDATA%\notified\config.json` on Windows (or `~/.config/notified/config.json` on Linux/macOS).

| Key                       | Default | Description                                      |
| ------------------------- | ------- | ------------------------------------------------ |
| `pollIntervalMinutes`     | `5`     | How often (in minutes) to check for active lapse |
| `dismissCooldownMinutes`  | `10`    | Silence period after Dismiss is clicked          |
| `autoStart`               | `false` | Whether the app starts with Windows              |

---

## Development

```bash
npm install
npm run build   # compile TypeScript
npm test        # run unit tests (Vitest)
```

---

## How it works

1. Polls `GET /api/draftTimelapse/findByUser` every N minutes  
2. If any draft timelapses exist → you have an active Lapse session → show toast  
3. If none exist → do nothing  
4. Clicking **Open Lapse** → opens lapse.hackclub.com  
5. Clicking **Dismiss** → sets a cooldown so the next poll won't notify  
6. On Windows, an optional startup registry entry keeps the notifier running in the background
