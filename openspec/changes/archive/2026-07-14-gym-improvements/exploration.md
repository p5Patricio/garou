# Exploration: Gym Improvements

This document outlines the exploration and technical analysis for the `gym-improvements` change.

---

## 1. Auto-suggesting Routines based on System Day

### Current State
Currently, `resolveTodaySession` in `src/utils/sessionRotation.ts` suggests the next routine session by looking at the last completed non-rest workout session and advancing to the next in rotation sequence:
`['Torso A', 'Pierna A', 'Ligero', 'Torso B', 'Pierna B']`.
Manual overrides work in the sense that if there is a `workout_sessions` row for today, it is used instead of the suggestion. However, if a user changes the session manually via the UI but has not logged any sets yet, no row is saved in the database, meaning reloading the app would revert to the default suggested session.

### Proposed Solution
1. **Day-of-Week Suggested Routine**:
   Implement a helper function in `src/utils/sessionRotation.ts` to map the day of the week to a routine session:
   - **Monday (1)**: `Torso A`
   - **Tuesday (2)**: `Pierna A`
   - **Wednesday (3)**: `Ligero`
   - **Thursday (4)**: `Torso B`
   - **Friday (5)**: `Pierna B`
   - **Saturday (6) / Sunday (0)**: Rest Day (`descanso`).

2. **Database Row for Suggestions**:
   If there is no row for today in `workout_sessions`:
   - If today is a training day (Monday–Friday), suggest the corresponding routine with `estado: 'sugerida'`.
   - If today is a weekend day (Saturday/Sunday), return `estado: 'descanso'` by default.

3. **Persistent Manual Overrides**:
   Currently, selecting a session via `selectSession` in `src/hooks/useWorkout.ts` only sets React state and doesn't write a DB row until a set is logged. To ensure manual overrides persist across app reloads, we will update `selectSession` to immediately insert a pending session row for today into `workout_sessions` (`completada = 0, es_descanso = 0`).

---

## 2. Progress Screen Enhancements

### Current State
The progress screen (`app/(tabs)/progress.tsx`) displays weight, waist, strength, and photo history. The screen uses a horizontal scrollable "carousel" of pills to select an exercise for the strength chart, which is hard to navigate if there are many exercises. The titles and chart texts are styled with semi-opaque colors (`theme.text2`, `theme.text3`, `theme.text4`), and dates are sliced (showing only month and day, e.g., `07-14`). Additionally, if the user logs strength data using mixed units (`kg`, `lb`, `placas`), the chart scales them incorrectly as raw numbers, and doesn't show the logged unit.

### Proposed Solutions
1. **Fully White Titles and Chart Text**:
   - Update the "Progreso" header title style in `app/(tabs)/progress.tsx` to use a solid white color (`#ffffff`).
   - Update the text labels for the charts (e.g. week starts, weight values, etc.) to use solid white (`#ffffff`).

2. **Full Dates**:
   - Instead of using `.slice(5)` on date strings (which yields `MM-DD`), render the full date.
   - Format the ISO `YYYY-MM-DD` string to a clean Mexican Spanish standard format `DD/MM/YYYY` (e.g., `14/07/2026`) using a date-formatting helper:
     ```typescript
     function formatFullDate(dateStr: string): string {
       const parts = dateStr.split('-');
       if (parts.length !== 3) return dateStr;
       const [y, m, d] = parts;
       return `${d}/${m}/${y}`;
     }
     ```

3. **Mixed Load Units in Strength Charts**:
   - Standardize weight to `kg` for the sake of chart plotting so the line coordinates scale and display relative load changes accurately.
   - Standard conversion factors:
     - `kg` -> 1.0
     - `lb` -> `value * 0.453592`
     - `placas` -> `value * 5.0` (assume 5 kg per plate)
     - `bw` -> `value`
   - Extend `StrengthPoint` in `src/types/metrics.ts` to store the display value and display unit:
     ```typescript
     export interface StrengthPoint {
       weekStart: string;
       maxPesoKg: number;   // Standardized weight in kg for chart path scale
       displayVal: number;  // Original raw value
       displayUnit: string; // Original unit ('kg', 'lb', 'placas', 'bw')
     }
     ```
   - Group and process the completed set logs in `useMetrics.ts` using JS to resolve the maximum lift of the week based on the standardized `kg` weight, retaining the original unit details.
   - Display `{p.displayVal} {p.displayUnit}` as the label below the strength chart points.

4. **Better Exercise Selector**:
   - Replace the horizontal scrollable carousel of exercise pills with a clean dropdown select button:
     ```typescript
     <TouchableOpacity
       onPress={() => setExercisePickerOpen(true)}
       style={[styles.selectorBtn, { backgroundColor: theme.bg2, borderColor: theme.border }]}
     >
       <Text style={[styles.selectorBtnText, { color: theme.text1 }]}>
         {selectedExerciseName || 'Seleccionar ejercicio'}
       </Text>
       <Icon name="chevron" size={16} color={theme.text3} strokeW={2} />
     </TouchableOpacity>
     ```
   - Present a clean, scrollable Modal dialog (overlay card) containing a vertical list of exercises, similar to the session selector.

---

## 3. Rest Timer Overlapping Notification Logic

### Current State
`src/services/timerService.ts` schedules timer notifications on Android using both ongoing notifications (for live countdowns) and timestamp trigger notifications (for end alerts) via the Notifee library, using the same notification ID (`garou-rest-timer` or `garou-cardio-timer`). 

When a timer is skipped or cancelled, `cancelNotification` only calls `notifee.default.cancelNotification(id)`, which clears currently displayed notifications. However, in Notifee, scheduled trigger notifications are separate from active displayed ones and must be cancelled using `notifee.default.cancelTriggerNotification(id)`. Because this call is missing, the scheduled trigger is not dismissed. When the scheduled timestamp is reached, Android's Alarm Manager triggers the "Descanso terminado" notification anyway. If a user has started a new timer in the meantime, this old trigger fires prematurely and overlaps or overwrites the active notification.

### Proposed Solution
1. **Cancel Triggers in Notifee**:
   Update `cancelNotification` in `src/services/timerService.ts` to cancel trigger notifications as well:
   ```typescript
   if (item.type === 'notifee' && notifee) {
     await notifee.default.cancelNotification(item.id).catch(() => {});
     await notifee.default.cancelTriggerNotification(item.id).catch(() => {});
   }
   ```

2. **Clean Up Database Orphans**:
   In `startTimer`, retrieve all existing active timers of that kind in the database and cancel their scheduled notification IDs before marking them inactive and starting a new timer. This prevents any orphaned timers/notifications from triggering.

---

## 4. Affected Files

- `src/utils/sessionRotation.ts` (Auto-suggestion logic based on system day)
- `src/hooks/useWorkout.ts` (Persist manual session selection instantly in the DB)
- `src/hooks/useMetrics.ts` (Convert and group strength logs to standardized weight, adding display unit metadata)
- `src/types/metrics.ts` (Update `StrengthPoint` type signature)
- `app/(tabs)/progress.tsx` (Fully white titles and chart text, full dates, custom exercise picker modal, and mixed unit label rendering)
- `src/services/timerService.ts` (Fix notification cancelling by calling `cancelTriggerNotification` and cleaning up active rows)
