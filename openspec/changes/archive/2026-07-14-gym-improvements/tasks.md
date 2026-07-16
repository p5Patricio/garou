Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Low

# Tasks: Gym Improvements

## Phase 1: Database & Utilities
- [x] **Update StrengthPoint Type**: Modify `StrengthPoint` in `src/types/metrics.ts` to include `displayVal: number` and `displayUnit: string`.
- [x] **Implement Suggestions Resolver**:
  - Add `getSuggestedRoutine(date: Date): string` in `src/utils/sessionRotation.ts` mapping days: Mon -> "Torso A", Tue -> "Pierna A", Wed -> "Ligero", Thu -> "Torso B", Fri -> "Pierna B", Sat/Sun -> "descanso".
  - Update `resolveTodaySession` to use `getSuggestedRoutine` on new row fallback.

## Phase 2: React Hooks & State
- [x] **Persist Selection Immediately**: Update `selectSession` in `src/hooks/useWorkout.ts` to call `clearTodayNonCompleted()`, write selection to DB via `createTodaySession`, and hydrate with state `'pendiente'`.
- [x] **In-Memory Metrics Normalization**:
  - Update `refresh()` in `src/hooks/useMetrics.ts` to query all raw logs with `carga_valor`, `carga_unidad`, and `peso_kg`.
  - Fetch latest `peso_kg` from `body_metrics` as bodyweight fallback.
  - Normalize weight to kg in-memory (`1 lb = 0.453592 kg`, `1 placa = 5 kg`, `bw = fallback`).
  - Calculate weekly maxes per exercise and construct `StrengthPoint` with original labels.

## Phase 3: UI Implementation
- [x] **Exercise Selector Modal**:
  - Replace horizontal carousel in `app/(tabs)/progress.tsx` with a trigger button showing active exercise.
  - Trigger opens scrollable overlay modal showing exercises in a vertical list.
  - Select updates selection and closes modal; modal allows raw dismiss.
- [x] **Chart Labels & Values**:
  - Force chart labels to white (`#ffffff`).
  - Format chart axis dates to `DD/MM/YYYY`.
  - Use `p.displayVal` and `p.displayUnit` for labels while charting using `maxPesoKg`.

## Phase 4: Services & Timer Logic
- [x] **Rest Timer Cleanup**:
  - Update `stopTimer` in `src/services/timerService.ts` to cancel Notifee trigger/displayed notifications.
  - Remove active timer rows from `active_timers` via `DELETE FROM active_timers WHERE kind = ?`.

## Phase 5: Verification & Cleanup
- [ ] **Unit Tests**:
  - Test suggestion mapping in `sessionRotation.test.ts`.
  - Test metrics normalization in a new unit test suite.
- [ ] **Manual Verification**:
  - Verify selection persistence across app restarts.
  - Validate picker modal responsiveness and chart scaling.
  - Check rest timer notification cancel and DB cleanup on skip.
