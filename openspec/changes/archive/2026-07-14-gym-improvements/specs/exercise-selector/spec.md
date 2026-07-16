# Spec: Exercise Selector

## Purpose
Replace the horizontal pill exercise carousel with an overlay picker modal.

## Requirements
1. The exercise selector MUST open as a scrollable vertical list in an overlay picker modal.
2. Selecting an exercise MUST update the active selection and close the modal.
3. The modal MUST support dismissing without changing the selection.

## Scenarios
Given the workout screen is open
When the user taps the exercise selector
Then a vertical overlay picker modal MUST be displayed

Given the exercise picker modal is open
When the user selects a new exercise
Then the active exercise MUST update
And the modal MUST close
