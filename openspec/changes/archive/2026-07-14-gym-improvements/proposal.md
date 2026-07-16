# Proposal: Gym Improvements

## Intent
Improve the workout management and tracking experience by dynamically auto-suggesting routines, enhancing charts on the progress screen to properly support mixed weight units and full dates, and resolving rest timer notification bugs.

## Scope
### In Scope
- Map routine session auto-suggestions to the day of the week (Monday: Torso A, Tuesday: Pierna A, Wednesday: Ligero, Thursday: Torso B, Friday: Pierna B, Sat/Sun: descanso).
- Persist manual routine selection instantly in SQLite.
- Update progress screen chart titles/texts to `#ffffff`.
- Show full dates format `DD/MM/YYYY` in progress.
- Normalize mixed weight units (`kg`, `lb`, `placas`, `bw`) to `kg` for progress chart scaling, while displaying original values and units on data points.
- Replace the exercise carousel with an overlay picker modal.
- Clean up active DB timer rows and cancel Notifee trigger notifications on cancel/skip.

### Out of Scope
- Altering the actual exercise database structure or routine lists.
- Modifying the visual design of other screens (e.g. settings, workout logger).

## Capabilities
### New Capabilities
- None.

### Modified Capabilities
- **Routine Suggestions**: Replaces sequence-based rotation with system day-of-week suggestions.
- **Immediate Selection Persistence**: Manually selecting a workout now immediately saves to the database.
- **Mixed-Unit Progress Tracking**: Accurate normalization and display of weight metrics.
- **Exercise Selector**: User-friendly vertical list modal replacing the horizontal pill carousel.
- **Reliable Rest Timer**: Fully cancelled notifications and DB cleanups.

## Approach
- Update `sessionRotation.ts` to map system days.
- In `useWorkout.ts`, perform immediate DB inserts during `selectSession`.
- Update `useMetrics.ts` to convert `lb` and `placas` to `kg` for grouping, adding `displayVal` and `displayUnit` to `StrengthPoint` in `metrics.ts`.
- Edit `progress.tsx` to apply styling, format dates, render point labels, and implement a modal selector.
- Edit `timerService.ts` to cancel trigger notifications via Notifee and query active DB timers to cancel them.

## Affected Areas
| Component | Impact Description |
|---|---|
| `sessionRotation.ts` | Suggestion logic mapping |
| `useWorkout.ts` | Immediate manual selection database write |
| `useMetrics.ts` / `metrics.ts` | Metric processing logic & type signature |
| `progress.tsx` | UI styling, date format, picker modal, chart labels |
| `timerService.ts` | Rest timer cancellation & cleanup |

## Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Incorrect scaling of mixed units | Standardize converting to kg using unit factor mappings |
| Stray notifications on app close | Cancel both active and scheduled trigger notifications |

## Rollback Plan
Revert code changes in the affected files and clean up uncompleted workout session rows created by the new manual override logic.

## Dependencies
- Notifee (already installed)
- SQLite database (already configured)

## Success Criteria
- [ ] Routine suggestions match the day of the week.
- [ ] Manual selections persist across app reloads.
- [ ] Chart labels are solid white and dates use `DD/MM/YYYY`.
- [ ] Mixed units graph correctly and display original values.
- [ ] Exercise picker uses a scrollable vertical modal.
- [ ] Cancelled/skipped timers do not fire notifications.
