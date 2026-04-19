# Windows Tray Toast Notification Plan (Lapse Paused Reminder)

## Objective
Build a Windows tray-app notification flow that alerts the user when a lapse is paused, with actionable toast buttons:
- **Start** (resume/start lapse)
- **Dismiss** (close and suppress immediate repeats)

Also send a reminder every 5 minutes while the lapse remains paused.

## Scope
- Detect lapse state changes (`active`, `paused`, etc.)
- Show native Windows toast notifications from tray app
- Handle toast actions (`Start`, `Dismiss`)
- Schedule and manage recurring reminders while paused
- Stop reminders when lapse is no longer paused
- Add docs and basic tests for scheduler logic

## Architecture Overview
1. **State Listener**
   - Watches lapse status changes (event bus/store/API polling).
   - Emits internal events:
     - `lapse.paused`
     - `lapse.resumed` (or non-paused)

2. **Notification Service**
   - Builds and shows Windows toast.
   - Includes action buttons:
     - `action=start`
     - `action=dismiss`
   - Routes action callbacks to app handlers.

3. **Reminder Scheduler**
   - One timer per lapse/session (idempotent).
   - Interval: 5 minutes.
   - On each tick:
     - verify lapse still paused
     - if paused -> show reminder toast
     - else -> cancel timer

4. **Action Handlers**
   - `Start`: call existing resume/start logic; cancel reminder timer.
   - `Dismiss`: close/silence current notification; set cooldown to avoid spam.

5. **Persistence (optional but recommended)**
   - Store `last_notified_at`, `dismissed_until`, and active timer keys
   - Helps avoid duplicate notifications after app restart

---

## Implementation Steps

### Step 1: Notification interface
- Create an abstraction, e.g. `NotificationProvider`:
  - `showPausedToast(lapseId, message, actions)`
  - `clear(notificationId)` (if supported)
- Add Windows implementation (toast library compatible with project stack).

### Step 2: Pause/resume event wiring
- Locate where lapse status transitions are handled.
- On transition to `paused`, emit `onLapsePaused(lapseId)`.
- On transition away from `paused`, emit `onLapseUnpaused(lapseId)`.

### Step 3: Toast action wiring
- Register handlers for toast action clicks:
  - `Start` -> resume/start lapse command
  - `Dismiss` -> set cooldown/snooze window (example: 10 minutes)
- Ensure handlers are safe if clicked multiple times (idempotent).

### Step 4: 5-minute reminder scheduler
- Add scheduler map keyed by `lapseId`.
- `startPausedReminder(lapseId)`:
  - if timer already exists -> do nothing
  - else create repeating timer every 5 min
- `tick(lapseId)`:
  - fetch current lapse status
  - if paused and not in dismissal cooldown -> show reminder toast
  - else stop timer
- `stopPausedReminder(lapseId)`:
  - clear and remove timer

### Step 5: Tray app UX details
- Keep toast text short and clear:
  - Title: `Lapse is paused`
  - Body: `Your lapse is still paused.`
- Action labels:
  - `Start`
  - `Dismiss`
- Optional: clicking toast body opens app window focused on current lapse.

### Step 6: Anti-spam / reliability
- Add cooldown after dismiss (configurable).
- Track `last_notified_at` to prevent duplicates from race conditions.
- Guard against creating multiple timers for same lapse.
- Ensure timers cleaned up on app exit and state change.

### Step 7: Configuration
- Add settings:
  - `pausedReminderEnabled` (default true)
  - `pausedReminderIntervalMinutes` (default 5)
  - `dismissCooldownMinutes` (default 10)

### Step 8: Tests
- Unit test scheduler:
  - starts timer on paused
  - does not create duplicate timers
  - stops on resume
  - respects dismiss cooldown
- Unit test action routing:
  - Start calls resume command
  - Dismiss sets cooldown and suppresses next tick

### Step 9: Documentation
- Update README/docs:
  - How paused reminders work
  - How to enable/disable
  - Action behavior for Start/Dismiss
  - Known Windows notification requirements

---

## Suggested File Layout (example)
- `src/notifications/windowsToast.*`
- `src/notifications/notificationService.*`
- `src/reminders/pausedReminderScheduler.*`
- `src/lapse/lapseStateListener.*`
- `src/lapse/actions/startLapse.*`
- `docs/notifications.md`
- `tests/pausedReminderScheduler.test.*`

(Adjust paths to actual repo structure.)

---

## Acceptance Criteria
- When lapse changes to paused, a toast appears with Start/Dismiss.
- Clicking **Start** resumes/starts lapse and stops reminders.
- Clicking **Dismiss** suppresses immediate repeat notifications.
- While paused, reminders reappear every 5 minutes.
- When lapse is resumed/stopped, reminders stop.
- No duplicate reminder timers for the same lapse.
- Docs and tests are added/updated.

## Risks / Notes
- Windows toast action callbacks can differ by framework; verify callback plumbing early.
- Tray-only apps may need explicit app identity/AUMID setup for reliable toast behavior.
- If app restarts, restore reminder state carefully to avoid spam burst on launch.
