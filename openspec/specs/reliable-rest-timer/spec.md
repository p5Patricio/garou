# Spec: Reliable Rest Timer

## Purpose
Ensure rest timer notifications and active database entries are fully cleaned up when cancelled or skipped.

## Requirements
1. When a rest timer is cancelled or skipped, the system MUST cancel the scheduled Notifee trigger notification.
2. The system MUST remove/clean up active timer rows from the database.

## Scenarios
Given an active rest timer with a scheduled Notifee notification
When the user cancels or skips the timer
Then the Notifee trigger notification MUST be cancelled
And the active timer row MUST be deleted from the database
