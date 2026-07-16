# Spec: Routine Suggestions

## Purpose
Suggest the appropriate routine session based on the current day of the week.

## Requirements
1. The system MUST map the suggestion to the day of the week:
   - Monday: "Torso A"
   - Tuesday: "Pierna A"
   - Wednesday: "Ligero"
   - Thursday: "Torso B"
   - Friday: "Pierna B"
   - Saturday/Sunday: "descanso"
2. The suggestion SHALL update automatically when the system day changes.

## Scenarios
Given the current day is Monday
When the user opens the app
Then the routine suggestion MUST show "Torso A"

Given the current day is Saturday
When the user opens the app
Then the routine suggestion MUST show "descanso"
