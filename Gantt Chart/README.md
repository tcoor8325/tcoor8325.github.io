# Gantt Chart

Interactive Gantt chart page for the digital portfolio. The page mirrors the structure from `Example Gantt Chart.csv` and provides simple interaction (task selection + timeline width slider).

## Files
- `index.html`: page structure, return button, controls, chart container, task detail panel.
- `styles.css`: page styling and table-based Gantt layout.
- `app.js`: CSV loading/parsing and chart rendering logic.
- `Example Gantt Chart.csv`: source data used to build the chart.
- `Example Gantt Chart.ods`: original spreadsheet version of the same sample.

## Behavior
- Loads `Example Gantt Chart.csv` and renders:
  - Date header row
  - Project rows
  - Task cells at matching dates
- Calendar is automatically extended through July of the chart year.
- Includes an `Open Source Water Boiler` project row.
- Includes a day-width slider for timeline zoom.
- Clicking a task shows details in the detail panel.
- Clicking an empty day cell creates a new task in that cell.
- Hovering or focusing a task shows a small `x` in the top-right corner.
- Clicking that `x` removes the task.
- Double-clicking a task prompts to edit the task message.
- Hovering/focusing a task also shows a vertical-dots options button.
- Options menu includes:
  - `Set as deadline` for normal tasks (doubles border thickness)
  - `Set as task` for deadline tasks (returns to normal border thickness)
- A vertical `Today` line marks the current day column (or nearest calendar day in-range).

## Navigation
- Homepage now includes a new blank-image tab button linking to `Gantt Chart/index.html`.
- Gantt page includes a `Return to Homepage` button.
