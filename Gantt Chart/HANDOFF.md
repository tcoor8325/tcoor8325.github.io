# Gantt Chart Handoff

## Current Status
- Added a new homepage project card linking to `Gantt Chart/index.html`:
  - `index.html` at repo root now has a `project-card--blank-image` tile labeled `Gantt Chart`.
- Created a working Gantt chart page:
  - `Gantt Chart/index.html`
  - `Gantt Chart/styles.css`
  - `Gantt Chart/app.js`
- Added `Gantt Chart/Example Gantt Chart.csv` based on the provided example sheet.
- Added an explicit `Open Source Water Boiler` project row in the CSV.

## Implemented Features
- Return button from Gantt page back to homepage.
- Table-style Gantt rendering from CSV data:
  - "Dates" header
  - "Projects" column
  - Task blocks in date-aligned cells
- Interaction:
  - Day-width slider controls timeline zoom.
  - Clicking a task updates the task detail panel.
  - Clicking an empty day cell prompts for and creates a new task in that cell.
  - Hovering/focusing a task reveals a small top-right `x`; clicking it removes the task.
  - Double-clicking a task prompts the user to edit task text.
  - Hovering/focusing also reveals a vertical-dots options control.
  - Options menu now includes `Set as deadline` for normal tasks and `Set as task` for deadline tasks.
  - Deadline status doubles task border thickness; `Set as task` restores normal thickness.
- Data loading:
  - Tries `Example Gantt Chart.csv` first.
  - Falls back to inline CSV in `app.js` if loading fails.
  - Extends the visible date range through July 31 of the chart year.
  - Shows a vertical `Today` marker line on the closest in-range date column.

## Notes
- `Example Gantt Chart.ods` exists and was used to reconstruct the CSV since only `.ods` was present.
- Task durations are currently one-day cells (matching the source layout where each task occupies one cell).
- Task boxes intentionally leave a fixed 20px right-side gap for readability.

## Next Steps
1. If needed, add explicit task durations (`start` + `end`) and render spanning bars.
2. Add dependency lines between tasks.
3. Optionally allow editing tasks directly in the page and exporting to CSV.
