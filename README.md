# Notified

Windows tray reminder flow for paused lapses.

## Behavior

- When a lapse transitions to `paused`, the app starts a reminder loop.
- A toast is shown with actions:
  - **Start**: resumes/starts the lapse and stops reminders.
  - **Dismiss**: suppresses immediate reminder repeats using cooldown.
- While paused, reminders repeat every 5 minutes by default.
- When lapse leaves `paused`, reminders stop.
- Scheduler is idempotent per lapse (no duplicate timers).

## Configuration

Defaults are defined in `src/types.ts`:

- `pausedReminderEnabled`: `true`
- `pausedReminderIntervalMinutes`: `5`
- `dismissCooldownMinutes`: `10`

## Run

```bash
npm install
npm run build
npm test
```

## Notes

`WindowsToastProvider` currently provides an integration-ready abstraction and action callback wiring. Connect its `showPausedToast` implementation to your production Windows toast stack (AUMID/toast framework) used by your tray runtime.
