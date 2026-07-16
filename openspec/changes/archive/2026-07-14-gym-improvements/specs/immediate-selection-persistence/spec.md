# Spec: Immediate Selection Persistence

## Purpose
Instantly persist the manual selection of a routine session to SQLite.

## Requirements
1. When a user manually selects a workout routine session, the choice MUST be written immediately to the database.
2. The manual selection MUST override the daily suggested routine.
3. The persisted selection MUST survive application restarts.

## Scenarios
Given a manual routine selection of "Pierna B"
When the user selects it
Then the selection MUST be saved to the database immediately
And the selection MUST persist when the application is restarted
