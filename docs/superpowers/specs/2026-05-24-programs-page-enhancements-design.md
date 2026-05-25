# Programs Page Enhancements Design

## Overview

This design updates the Programs page so one irrigation program can support multiple daily run times, interval-based recurrence, and a mobile-friendly editing experience without breaking existing saved programs.

The core design keeps the current irrigation concept intact:

- a **program** defines what runs: name, enabled state, zones, durations, conditions, skip state, and summary scheduling metadata
- a **schedule entry** defines when that program runs: time, recurrence, enabled state, and schedule-specific execution metadata

This separation removes the need to create multiple nearly identical programs just to run the same zones at several times in a day.

## Goals

- Allow one program to run multiple times per day without duplicating programs.
- Allow enabling or disabling the whole program or an individual schedule entry.
- Support recurrence by either days of the week or every N days.
- Keep zone durations stored in seconds while allowing the UI to edit in seconds or minutes.
- Fix the current duration editing behavior so clearing an input does not immediately force `0`.
- Make the Programs page usable on mobile without horizontal scrolling during editing.
- Preserve existing programs through backward-compatible reads or an automatic migration path.

## Non-Goals

- Adding seasonal exceptions, blackout dates, or calendar-style overrides in this change.
- Allowing each schedule entry to override zone selections or zone durations.
- Redesigning other pages beyond the program-related UI surfaces that consume schedule summaries.

## Current State

Today a program stores a single `startTime` and a single `daysOfWeek` array. That model forces users to duplicate a program when the same zones should run multiple times in a day. The Programs page also uses wide two-column editing layouts that become difficult to use on mobile, and zone duration inputs aggressively coerce empty values to zero while the user is still typing.

The current backend scheduling flow calculates a single `nextScheduledRunTime` per program and runs the first eligible enabled program. Existing tests cover the current single-schedule behavior in `ProgramController`.

## Proposed Data Model

### Program

The program remains the top-level unit and continues to own:

- `id`
- `name`
- `isEnabled`
- `zones`
- `conditions`
- `skipUntil`
- `lastRunTime`
- `nextScheduledRunTime`

The new model adds:

- `schedules: ProgramSchedule[]`

The existing top-level `nextScheduledRunTime` remains as a compatibility summary for the earliest enabled eligible schedule entry on that program.

### Program zones

Zone configuration remains shared across all schedule entries in the program:

- `zoneId`
- `duration` stored in seconds

The UI may expose minutes or seconds, but persistence remains normalized to seconds.

### ProgramSchedule

Each schedule entry represents one independently enabled watering time for the parent program.

Fields:

- `id: string`
- `startTime: string`
- `isEnabled: boolean`
- `recurrenceType: "daysOfWeek" | "everyNDays"`
- `daysOfWeek?: number[]`
- `intervalDays?: number`
- `lastScheduledRunTime?: string | null`
- `nextScheduledRunTime?: string | null`

### Schedule semantics

- A disabled program disables all of its schedule entries.
- A disabled schedule entry affects only that one schedule entry.
- Multiple schedule entries may exist for the same day or time.
- Weekly recurrence uses `daysOfWeek`.
- Interval recurrence uses `intervalDays` and advances only from that schedule entry's own successful scheduled run history.

## Backward Compatibility and Migration

The system will support legacy saved programs and convert them automatically without user action.

### Migration strategy

When a program is loaded, recalculated, or saved and does not yet contain `schedules`, the backend creates one enabled schedule entry using the legacy fields:

- `startTime` -> `schedules[0].startTime`
- `daysOfWeek` -> `schedules[0].daysOfWeek`
- `isEnabled` remains on the program

The migration then persists the new `schedules` array so the record becomes durable in the new structure.

### Legacy field handling

During rollout, legacy `startTime` and `daysOfWeek` fields remain readable so older persisted records do not break. Scheduler logic and UI editing logic will switch to `schedules[]` as the source of truth once the migration helper has normalized the record.

### Failure handling

If migration fails or produces an invalid schedule:

- the program record must not be deleted
- the scheduler must not silently guess replacement values
- the problem should be logged explicitly
- the program should surface as not schedulable until corrected

## Scheduling Architecture

The scheduling flow should be separated into small responsibilities that fit the existing backend structure while reducing complexity inside `ProgramController`.

### Schedule normalization helper

Responsible for:

- ensuring each program has a valid `schedules[]` array
- migrating legacy fields into the new shape
- returning a scheduler-ready program object

### Next-run calculator

Responsible for:

- computing `nextScheduledRunTime` for each enabled schedule entry
- computing the program-level `nextScheduledRunTime` as the earliest eligible enabled schedule entry
- skipping invalid or disabled schedule entries without preventing valid entries on the same program from being considered

### Trigger metadata flow

When the scheduler starts a program because of a schedule entry, it must carry the triggering `scheduleEntryId` through execution. That lets completion logic update only the triggering schedule entry's `lastScheduledRunTime` and recompute its next run correctly.

### Compatibility summary

The dashboard and current program cards can continue displaying the program-level `nextScheduledRunTime`, which becomes the minimum eligible run among enabled schedule entries.

## Scheduling Rules

### Weekly schedules

Weekly schedules work like the current scheduler but per schedule entry instead of per program:

- at least one weekday is required
- the schedule entry is eligible only on selected weekdays
- the next valid run is the next selected weekday/time that is after now and after any applicable skip boundary

### Every N days schedules

Every-N-days schedules use these rules:

- `intervalDays` must be an integer greater than 1
- the cadence advances only from that schedule entry's own `lastScheduledRunTime`
- manual runs do not advance the interval
- only successful runs triggered by that schedule entry update `lastScheduledRunTime`

The first migrated interval schedule should not exist because legacy programs only map to weekly schedules. Newly created interval schedules will use the schedule entry's recorded successful scheduled run as the recurrence anchor.

### Skip behavior

Program-level skip behavior remains at the program layer for this phase. Skipping the next run should skip the earliest upcoming eligible schedule entry for the program and then recompute the next eligible schedule entry afterward.

## Programs Page UX

The Programs page remains card-based, but editing becomes mobile-first and sectioned.

### Card structure

Each program card should expose collapsible sections:

- Overview
- Schedules
- Zones
- Conditions

On mobile:

- editing layouts stack into a single column
- metadata moves under the title
- action buttons wrap or stack
- no field requires horizontal scrolling

On larger screens:

- sections may use denser layouts
- read-only views may remain more compact
- editing can expand into a two-column presentation only when the viewport allows it comfortably

### Schedules section

The new Schedules section becomes the main place for schedule editing. Each schedule entry row contains:

- enabled toggle
- start time input
- recurrence type selector
- weekday picker for weekly recurrence
- interval input for every-N-days recurrence
- next-run preview
- remove action

The section also includes an add-schedule action so users can add more times to the same program.

### Zones section

The Zones section continues to manage one shared list of selected zones for the program.

Each selected zone row includes:

- zone selection checkbox
- duration numeric input
- unit selector for seconds or minutes
- normalized effective value used for saving and validation

The UI should preserve local text entry while the user types so clearing `45` does not immediately render as `0`.

### Duration editing behavior

The current forced-zero behavior should be replaced with staged editing:

- the input keeps raw text while focused
- empty values are allowed temporarily during typing
- conversion to normalized seconds happens on blur, validation, or save
- invalid or zero effective durations show validation feedback instead of coercing keystrokes

## Validation

Validation should happen in layers.

### Editing-time validation

While typing:

- blank values are allowed temporarily
- incomplete schedule forms are allowed temporarily
- errors should be surfaced visually without destroying the in-progress input

### Save-time validation

If the user saves an enabled program:

- the program must have at least one enabled schedule entry
- each enabled weekly schedule must have at least one weekday
- each enabled interval schedule must have an integer `intervalDays > 1`
- the program must have at least one selected zone with a non-zero normalized duration

If the program is disabled, incomplete schedules may remain saved, but the UI should make it clear they are not schedulable until corrected.

### Runtime validation

At runtime:

- invalid schedule entries are skipped
- the reason for skipping is logged
- other valid schedule entries on the program continue to be evaluated normally

## Execution Flow

1. Load programs from the repository.
2. Normalize each program to ensure `schedules[]` exists.
3. Compute each schedule entry's next eligible run time.
4. Compute each program's summary `nextScheduledRunTime` as the earliest enabled eligible schedule entry.
5. Select the next runnable program based on the program-level summary.
6. Start the program while recording the triggering `scheduleEntryId`.
7. On successful completion, update:
   - program `lastRunTime`
   - triggering schedule entry `lastScheduledRunTime`
   - triggering schedule entry `nextScheduledRunTime`
   - program summary `nextScheduledRunTime`

Manual program runs still execute the shared zones, but they do not mutate interval cadence for any schedule entry.

## Error Handling and Logging

The implementation should prefer explicit logging and safe skipping over silent fallback behavior.

Examples that should log clearly:

- legacy migration failed
- schedule entry missing required recurrence data
- enabled program has no non-zero zone durations
- triggering schedule entry cannot be found at completion time

The system should keep unaffected programs and schedule entries runnable even when one program contains invalid data.

## Testing Strategy

### Backend tests

Add or update tests for:

- automatic migration from legacy single-schedule programs
- multiple enabled schedule entries on the same program
- disabling one schedule entry while leaving others active
- weekly schedule next-run calculation
- every-N-days cadence advancing only from scheduled runs
- manual runs not advancing interval recurrence
- program-level next-run summary selecting the earliest eligible schedule entry

### UI tests

Add or update tests for:

- schedule entry add, edit, enable/disable, and delete behavior
- weekly versus every-N-days editing states
- blank duration input not forcing immediate zero insertion
- seconds/minutes editing with normalized seconds persistence
- validation messages for missing weekdays, invalid interval values, and zero effective durations

### Mobile verification

Use a browser-based mobile viewport verification pass for the Programs page so the updated cards can be checked for:

- no horizontal scrolling during editing
- vertically stacked controls on narrow screens
- reachable save, cancel, run, and skip actions
- readable schedule and zone sections

## Implementation Notes

This design intentionally stays close to the current application architecture:

- shared program types continue to drive both UI and backend behavior
- backend scheduling continues to live under `ProgramController` ownership, but helper logic should be extracted so scheduling and execution concerns are easier to reason about
- the dashboard and related views can continue using program-level summary scheduling data while the richer schedule-entry model is adopted underneath

## Recommended Rollout

1. Extend shared types and DTO persistence to support `schedules[]`.
2. Add normalization and migration support in the backend repository/controller path.
3. Refactor next-run calculation to operate on schedule entries and derive a program summary.
4. Update execution flow to record the triggering schedule entry.
5. Update the Programs page editor to support schedule-entry management and improved duration editing.
6. Verify mobile layout in a browser mobile viewport.
7. Remove dependence on legacy fields once all runtime paths use normalized schedules safely.
