# Apply Progress: Gym Improvements

## Completed Tasks

### Phase 1: Database & Utilities
- **Update StrengthPoint Type**: Added `displayVal: number` and `displayUnit: string` to `StrengthPoint` interface in `src/types/metrics.ts`.
- **Implement Suggestions Resolver**: Added `getSuggestedRoutine(date: Date): string` to `src/utils/sessionRotation.ts` with custom day of week mapping, and updated `resolveTodaySession` to fall back to it.

### Phase 2: React Hooks & State
- **Persist Selection Immediately**: Updated `selectSession` in `src/hooks/useWorkout.ts` to clear uncompleted workouts for today, write the session immediately to SQLite, and hydrate UI state.
- **In-Memory Metrics Normalization**: Modified `refresh` in `src/hooks/useMetrics.ts` to query raw logs and normalize mixed weights (`kg`, `lb`, `placas`, `bw`) in-memory to kilograms for plotting.

### Phase 3: UI Implementation
- **Exercise Selector Modal**: Replaced the horizontal exercise pill carousel in `app/(tabs)/progress.tsx` with a trigger button that opens an overlay picker modal with a vertical scroll list of exercises.
- **Chart Labels & Values**: Modified charts in `app/(tabs)/progress.tsx` to set text color to white (`#ffffff`), format dates to `DD/MM/YYYY`, and display original values and units via `displayVal`/`displayUnit` on the strength progress chart.

### Phase 4: Services & Timer Logic
- **Rest Timer Cleanup**: Updated `stopTimer` in `src/services/timerService.ts` to cancel scheduled Notifee notifications and completely delete active timer rows in SQLite.

## Files Changed

| File | Action | What Was Done |
| --- | --- | --- |
| `src/types/metrics.ts` | Modified | Updated `StrengthPoint` type signature. |
| `src/utils/sessionRotation.ts` | Modified | Added routine day-of-week suggestions and integrated into `resolveTodaySession`. |
| `src/hooks/useWorkout.ts` | Modified | Persisted manual selection immediately to DB and hydrated state. |
| `src/hooks/useMetrics.ts` | Modified | Re-implemented weight normalization in-memory before max point calculation. |
| `app/(tabs)/progress.tsx` | Modified | Replaced pills carousel with overlay picker modal; updated charts styling, dates formatting, and point labels. |
| `src/services/timerService.ts` | Modified | Extended rest timer cleanup to cancel trigger notifications and delete timer rows from database. |
