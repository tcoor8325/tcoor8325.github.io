const FALLBACK_CSV = `,,02/16/25,02/17/25,02/18/25,02/19/25,02/20/25,02/21/25,02/22/25,02/23/25,02/24/25,02/25/25,02/26/25,02/27/25,02/28/25,03/01/25,03/02/25
Projects,Chord Organ,Buy bearings
,Food Source Project,,create JS version of python plots
,Historical Tech Tree,,,Remove unnecessary nodes
,Divlab,,,,,find a good database for rare earth metals
,Board Game,,,,order flag posts?
,Open Source Water Boiler`;

const tableElement = document.getElementById("gantt-table");
const dayWidthSlider = document.getElementById("day-width");
const dayWidthOutput = document.getElementById("day-width-output");
const taskDetail = document.getElementById("task-detail");
const todayLine = document.getElementById("today-line");

const BAR_COLORS = ["#f7d4d9", "#d4e5f7", "#d8f1d9", "#f6e4c8", "#e8d8f3"];
let chartModel = null;
let openOptionsMenu = null;

function parseDateLabel(mmddyy) {
  const parts = mmddyy.split("/").map((value) => Number.parseInt(value, 10));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }
  const [month, day, year] = parts;
  return new Date(2000 + year, month - 1, day);
}

function formatDateLabel(mmddyy) {
  const date = parseDateLabel(mmddyy);
  if (!date) return mmddyy;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatCsvDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear() % 100).padStart(2, "0");
  return `${month}/${day}/${year}`;
}

function closeOptionsMenu() {
  if (!openOptionsMenu) return;
  openOptionsMenu.hidden = true;
  openOptionsMenu = null;
}

function parseSheetLikeCsv(csvText) {
  const rows = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim()));

  if (!rows.length || rows[0].length < 3) {
    throw new Error("CSV does not match expected layout.");
  }

  const dates = rows[0].slice(2).filter(Boolean);
  const projects = rows
    .slice(1)
    .map((row) => {
      const project = row[1];
      if (!project) return null;

      const tasks = {};
      for (let i = 2; i < row.length; i += 1) {
        if (row[i]) {
          tasks[i - 2] = {
            text: row[i],
            isDeadline: false
          };
        }
      }

      return {
        project,
        tasks
      };
    })
    .filter(Boolean);

  return { dates, projects };
}

function extendDatesThroughJuly(model) {
  if (!model.dates.length) return;
  const firstDate = parseDateLabel(model.dates[0]);
  const lastDate = parseDateLabel(model.dates[model.dates.length - 1]);
  if (!firstDate || !lastDate) return;

  const julyEnd = new Date(firstDate.getFullYear(), 6, 31);
  if (lastDate >= julyEnd) return;

  const cursor = new Date(lastDate);
  while (cursor < julyEnd) {
    cursor.setDate(cursor.getDate() + 1);
    model.dates.push(formatCsvDate(cursor));
  }
}

function ensureOpenSourceWaterBoilerRow(model) {
  const exists = model.projects.some(
    (entry) => entry.project.trim().toLowerCase() === "open source water boiler"
  );
  if (exists) return;

  model.projects.push({
    project: "Open Source Water Boiler",
    tasks: {}
  });
}

function getTodayColumnIndex(model) {
  if (!model.dates.length) {
    return -1;
  }

  const now = new Date();
  const exactTodayIndex = model.dates.indexOf(formatCsvDate(now));
  if (exactTodayIndex >= 0) {
    return exactTodayIndex;
  }

  const firstDate = parseDateLabel(model.dates[0]);
  if (!firstDate) {
    return -1;
  }

  const sameMonthDay = new Date(firstDate.getFullYear(), now.getMonth(), now.getDate());
  let nearestIndex = -1;
  let nearestDistance = Number.POSITIVE_INFINITY;

  model.dates.forEach((label, index) => {
    const date = parseDateLabel(label);
    if (!date) return;
    const distance = Math.abs(date.getTime() - sameMonthDay.getTime());
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function positionTodayLine() {
  if (!todayLine || !chartModel) {
    return;
  }

  const offset = getTodayColumnIndex(chartModel);
  if (offset < 0) {
    todayLine.hidden = true;
    return;
  }

  const headCell = tableElement.querySelector(`.date-head[data-offset="${offset}"]`);
  if (!headCell) {
    todayLine.hidden = true;
    return;
  }

  todayLine.hidden = false;
  todayLine.style.left = `${headCell.offsetLeft + (headCell.offsetWidth / 2)}px`;
  todayLine.title = `Today marker: ${formatDateLabel(chartModel.dates[offset])}`;
}

function setDayWidth(px) {
  document.documentElement.style.setProperty("--day-width", `${px}px`);
  dayWidthOutput.textContent = `${px}px`;
  if (chartModel) {
    window.requestAnimationFrame(positionTodayLine);
  }
}

function createHeaderRows(dates) {
  const row1 = document.createElement("tr");
  const corner = document.createElement("th");
  corner.className = "corner";
  corner.textContent = "";

  const datesHead = document.createElement("th");
  datesHead.className = "dates-head";
  datesHead.colSpan = dates.length;
  datesHead.textContent = "Dates";

  row1.append(corner, datesHead);

  const row2 = document.createElement("tr");
  const labelHead = document.createElement("th");
  labelHead.className = "label-head";
  labelHead.textContent = "Projects";
  row2.appendChild(labelHead);

  dates.forEach((dateLabel, offset) => {
    const dateHead = document.createElement("th");
    dateHead.className = "date-head";
    dateHead.dataset.offset = String(offset);
    dateHead.textContent = dateLabel;
    dateHead.title = formatDateLabel(dateLabel);
    row2.appendChild(dateHead);
  });

  return [row1, row2];
}

function describeTask(entry, dateLabel, taskText) {
  return `${entry.project} | ${formatDateLabel(dateLabel)} | ${taskText}`;
}

function createTaskChip(entry, dateLabel, task, rowIndex, offset) {
  const chip = document.createElement("div");
  chip.className = "task-chip";
  chip.style.background = BAR_COLORS[rowIndex % BAR_COLORS.length];
  chip.setAttribute("role", "button");
  chip.setAttribute("tabindex", "0");
  chip.setAttribute("aria-label", `${entry.project}: ${task.text} on ${formatDateLabel(dateLabel)}`);
  if (task.isDeadline) {
    chip.classList.add("task-chip--deadline");
  }

  const label = document.createElement("span");
  label.className = "task-chip-label";
  label.textContent = task.text;
  chip.appendChild(label);

  const tools = document.createElement("div");
  tools.className = "task-chip-tools";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "task-chip-close";
  closeButton.setAttribute("aria-label", "Remove task");
  closeButton.textContent = "x";
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    delete chartModel.projects[rowIndex].tasks[offset];
    closeOptionsMenu();
    taskDetail.textContent = `Removed task: ${task.text}`;
    renderChart();
  });
  tools.appendChild(closeButton);

  const optionsTrigger = document.createElement("button");
  optionsTrigger.type = "button";
  optionsTrigger.className = "task-chip-options-trigger";
  optionsTrigger.setAttribute("aria-label", "Task options");
  optionsTrigger.textContent = "⋮";
  tools.appendChild(optionsTrigger);

  chip.appendChild(tools);

  const menu = document.createElement("div");
  menu.className = "task-chip-menu";
  menu.hidden = true;
  menu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const toggleDeadline = document.createElement("button");
  toggleDeadline.type = "button";
  toggleDeadline.className = "task-chip-menu-item";
  toggleDeadline.textContent = task.isDeadline ? "Set as task" : "Set as deadline";
  toggleDeadline.addEventListener("click", (event) => {
    event.stopPropagation();
    const activeTask = chartModel.projects[rowIndex].tasks[offset];
    if (!activeTask) return;
    activeTask.isDeadline = !activeTask.isDeadline;
    closeOptionsMenu();
    const statusText = activeTask.isDeadline ? "Set deadline" : "Set as task";
    taskDetail.textContent = `${statusText}: ${describeTask(entry, dateLabel, activeTask.text)}`;
    renderChart();
  });
  menu.appendChild(toggleDeadline);
  chip.appendChild(menu);

  optionsTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    if (openOptionsMenu === menu) {
      closeOptionsMenu();
      return;
    }
    closeOptionsMenu();
    menu.hidden = false;
    openOptionsMenu = menu;
  });

  chip.addEventListener("click", (event) => {
    event.stopPropagation();
    closeOptionsMenu();
    const activeTask = chartModel.projects[rowIndex].tasks[offset];
    if (!activeTask) {
      return;
    }
    taskDetail.textContent = describeTask(entry, dateLabel, activeTask.text);
  });

  chip.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    closeOptionsMenu();
    const activeTask = chartModel.projects[rowIndex].tasks[offset];
    if (!activeTask) {
      return;
    }
    const updated = window.prompt("Edit task:", activeTask.text);
    if (updated === null) {
      return;
    }
    const taskText = updated.trim();
    if (!taskText) {
      return;
    }
    activeTask.text = taskText;
    taskDetail.textContent = `Updated task: ${describeTask(entry, dateLabel, taskText)}`;
    renderChart();
  });

  chip.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    closeOptionsMenu();
    const activeTask = chartModel.projects[rowIndex].tasks[offset];
    if (!activeTask) {
      return;
    }
    taskDetail.textContent = describeTask(entry, dateLabel, activeTask.text);
  });

  return chip;
}

function handleDayCellClick(rowIndex, offset) {
  closeOptionsMenu();
  const entry = chartModel.projects[rowIndex];
  if (entry.tasks[offset]) {
    return;
  }

  const dateLabel = chartModel.dates[offset];
  const value = window.prompt(`New task for ${entry.project} on ${formatDateLabel(dateLabel)}:`, "");
  if (!value) return;
  const taskText = value.trim();
  if (!taskText) return;

  entry.tasks[offset] = {
    text: taskText,
    isDeadline: false
  };
  taskDetail.textContent = `Added task: ${describeTask(entry, dateLabel, taskText)}`;
  renderChart();
}

function createProjectRow(entry, dates, rowIndex) {
  const row = document.createElement("tr");

  const projectCell = document.createElement("th");
  projectCell.className = "project-cell";
  projectCell.textContent = entry.project;
  row.appendChild(projectCell);

  dates.forEach((dateLabel, offset) => {
    const dayCell = document.createElement("td");
    dayCell.className = "day-cell";
    dayCell.addEventListener("click", () => {
      handleDayCellClick(rowIndex, offset);
    });

    const task = entry.tasks[offset];
    if (task) {
      dayCell.appendChild(createTaskChip(entry, dateLabel, task, rowIndex, offset));
    }

    row.appendChild(dayCell);
  });

  return row;
}

function renderChart() {
  closeOptionsMenu();
  tableElement.innerHTML = "";
  const [headerRow1, headerRow2] = createHeaderRows(chartModel.dates);
  tableElement.append(headerRow1, headerRow2);

  chartModel.projects.forEach((entry, index) => {
    tableElement.appendChild(createProjectRow(entry, chartModel.dates, index));
  });
  positionTodayLine();
}

async function loadCsvText() {
  try {
    const response = await fetch("Example Gantt Chart.csv", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    return FALLBACK_CSV;
  }
}

async function init() {
  setDayWidth(Number.parseInt(dayWidthSlider.value, 10));
  dayWidthSlider.addEventListener("input", () => {
    const width = Number.parseInt(dayWidthSlider.value, 10);
    setDayWidth(width);
  });

  const csvText = await loadCsvText();
  chartModel = parseSheetLikeCsv(csvText);
  extendDatesThroughJuly(chartModel);
  ensureOpenSourceWaterBoilerRow(chartModel);
  renderChart();
  window.addEventListener("resize", positionTodayLine);

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      closeOptionsMenu();
      return;
    }
    if (!event.target.closest(".task-chip")) {
      closeOptionsMenu();
    }
  });
}

init().catch(() => {
  taskDetail.textContent = "Could not load chart data.";
});
