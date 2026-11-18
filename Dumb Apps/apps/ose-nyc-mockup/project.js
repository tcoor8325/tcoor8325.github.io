const projects = window.oseProjects || [];
const params = new URLSearchParams(window.location.search);
const selectedSlug = params.get("project");
const project = selectedSlug
  ? projects.find((item) => item.slug === selectedSlug)
  : projects[0];

if (!project) {
  window.location.replace("index.html");
  throw new Error("Project not found.");
}

const heroTitle = document.querySelector("#heroTitle");
const heroSummary = document.querySelector("#heroSummary");
const projectTitle = document.querySelector("#project-title");
const projectSummary = document.querySelector("#projectSummary");
const infoPanel = document.querySelector("#infoPanel");
const infoPanelCopy = document.querySelector("#infoPanelCopy");
const stageLabel = document.querySelector("#stageLabel");
const linkStack = document.querySelector("#linkStack");
const taskDrawer = document.querySelector("#taskDrawer");
const taskList = document.querySelector("#taskList");
const taskSectionTitle = document.querySelector("#taskSectionTitle");
const taskPanelTitle = document.querySelector("#taskPanelTitle");
const taskPanelNote = document.querySelector("#taskPanelNote");
const timelineGrid = document.querySelector("#timelineGrid");
const timelinePanelTitle = document.querySelector("#timelinePanelTitle");
const timelinePanelNote = document.querySelector("#timelinePanelNote");
const timelinePanelBody = document.querySelector("#timelinePanelBody");
const timelineContent = document.querySelector(".timeline-content");
const storyPanelSection = document.querySelector("#storyPanel");
const storyPanelTitle = document.querySelector("#storyPanelTitle");
const storyPanelNote = document.querySelector("#storyPanelNote");
const storyViewport = document.querySelector("#storyViewport");
const storySlides = document.querySelector("#storySlides");
const storySlideshow = document.querySelector(".story-slideshow");
const projectBriefWrap = document.querySelector("#projectBriefWrap");
const projectBriefDrawer = document.querySelector("#projectBriefDrawer");
const projectBriefToggle = document.querySelector("#projectBriefToggle");
const projectBriefToggleLabel = document.querySelector("#projectBriefToggleLabel");
const projectBriefTitle = document.querySelector("#projectBriefTitle");
const projectBriefGoal = document.querySelector("#projectBriefGoal");
const projectBriefSections = document.querySelector("#projectBriefSections");
const authButton = document.querySelector("#authButton");
const authAvatar = document.querySelector("#authAvatar");
const authName = document.querySelector("#authName");
const body = document.body;
const usesSharedProjectLandingLayout = true;
const mockUsers = [
  {
    name: "User1",
    role: "user",
    avatar: "images/Pikachu.png"
  },
  {
    name: "User2",
    role: "user",
    avatar: "images/HeMan.png"
  },
  {
    name: "User3",
    role: "user",
    avatar: "images/Lemongrab.png"
  },
  {
    name: "User4",
    role: "user",
    avatar: "images/Sonic.png"
  },
  {
    name: "Admin",
    role: "admin",
    avatar: "images/Snufkin.png"
  }
];
const mockUserStorageKey = "ose-mock-user";
const projectStateStorageKey = `ose-project-state:${project.slug}`;
const timelineAssignableUsers = mockUsers.filter((user) => user.role !== "admin");
const taskAssignments = {};
const pendingTimelineEntries = {};
const userCreatedTaskEntries = {};
const briefGoalCompletionState = {};
const taskDisclosureState = {};
const taskCardDisclosureState = {};
const authMenu = document.createElement("div");
let activeVolunteerTaskKey = "";
let activeTaskComposerSectionIndex = null;
let activeTimelineComposerSectionIndex = null;
let isAuthMenuOpen = false;
let authMenuOpenedAt = 0;
let activeStoryIndex = 0;
let storyEntries = [];
let isTaskDrawerCollapsed = usesSharedProjectLandingLayout;
let isInfoPanelCollapsed = usesSharedProjectLandingLayout;
let isTimelinePanelCollapsed = usesSharedProjectLandingLayout;
let isStoryPanelCollapsed = false;

body.classList.add(`project-${project.slug}`);
body.classList.toggle("project-air-layout", usesSharedProjectLandingLayout);

heroTitle.textContent = project.name;
heroSummary.textContent = project.summary;
projectTitle.textContent = project.name;
projectSummary.textContent = project.summary;
stageLabel.textContent = usesSharedProjectLandingLayout ? "Collaborate" : "Collaborate:";
taskSectionTitle.hidden = !usesSharedProjectLandingLayout;
taskPanelTitle.hidden = usesSharedProjectLandingLayout;

if (usesSharedProjectLandingLayout) {
  taskSectionTitle.setAttribute("role", "button");
  taskSectionTitle.setAttribute("tabindex", "0");
  taskSectionTitle.setAttribute("aria-label", "Toggle tasks drawer");
  stageLabel.setAttribute("role", "button");
  stageLabel.setAttribute("tabindex", "0");
  stageLabel.setAttribute("aria-label", "Toggle collaboration panel");
  storyPanelTitle.setAttribute("role", "button");
  storyPanelTitle.setAttribute("tabindex", "0");
  storyPanelTitle.setAttribute("aria-label", "Toggle build journal");
  timelinePanelTitle.setAttribute("role", "button");
  timelinePanelTitle.setAttribute("tabindex", "0");
  timelinePanelTitle.setAttribute("aria-label", "Toggle progress timeline");
}

renderAuthButton();

function syncBuildJournalState() {
  body.classList.remove("build-journal-dimmed");
}

function syncTaskDrawerState() {
  body.classList.toggle("task-drawer-collapsed", usesSharedProjectLandingLayout && isTaskDrawerCollapsed);
  taskDrawer.classList.toggle("is-collapsed", usesSharedProjectLandingLayout && isTaskDrawerCollapsed);
  taskSectionTitle.setAttribute("aria-expanded", String(!(usesSharedProjectLandingLayout && isTaskDrawerCollapsed)));
  syncBuildJournalState();
}

function syncInfoPanelState() {
  body.classList.toggle("info-panel-collapsed", usesSharedProjectLandingLayout && isInfoPanelCollapsed);
  infoPanel.classList.toggle("is-collapsed", usesSharedProjectLandingLayout && isInfoPanelCollapsed);
  infoPanelCopy.setAttribute("aria-hidden", String(usesSharedProjectLandingLayout && isInfoPanelCollapsed));
  stageLabel.setAttribute("aria-expanded", String(!(usesSharedProjectLandingLayout && isInfoPanelCollapsed)));
  syncBuildJournalState();
}

function syncTimelinePanelState() {
  body.classList.toggle("timeline-panel-collapsed", usesSharedProjectLandingLayout && isTimelinePanelCollapsed);
  timelineContent.classList.toggle("is-collapsed", usesSharedProjectLandingLayout && isTimelinePanelCollapsed);
  timelinePanelBody.setAttribute("aria-hidden", String(usesSharedProjectLandingLayout && isTimelinePanelCollapsed));
  timelinePanelTitle.setAttribute("aria-expanded", String(!(usesSharedProjectLandingLayout && isTimelinePanelCollapsed)));
  syncBuildJournalState();
}

function syncStoryPanelState() {
  storyPanelSection.classList.toggle("is-collapsed", usesSharedProjectLandingLayout && isStoryPanelCollapsed);
  storyViewport.setAttribute("aria-hidden", String(usesSharedProjectLandingLayout && isStoryPanelCollapsed));
  storyPanelNote.hidden = !storyData.note;
  storyPanelTitle.setAttribute("aria-expanded", String(!(usesSharedProjectLandingLayout && isStoryPanelCollapsed)));
}

function createFallbackBrief(sourceProject) {
  return {
    title: "Project Goals + Features",
    goal: "",
    sections: [
      {
        entries: [
          {
            items: [
              `Make the ${sourceProject.name.toLowerCase()} easy to open, service, and explain without hidden fasteners or mystery steps.`,
              `Keep mechanical, electrical, and software work visible so contributors can improve the ${sourceProject.discipline.toLowerCase()} system in parallel.`,
              `Turn the current ${sourceProject.stage} work into a public roadmap with concrete next tasks, milestones, and journal updates.`,
              "Document the key subassemblies, wiring or controls, and service order clearly enough that a first-time contributor can follow along.",
              "Use this page as a quick status board for what changed, what still hurts, and where help is needed next."
            ]
          }
        ]
      }
    ]
  };
}

function normalizeBrief(sourceProject) {
  const brief = sourceProject.brief;

  if (!brief) {
    return createFallbackBrief(sourceProject);
  }

  if (brief.sections) {
    return brief;
  }

  return {
    title: brief.title || "Project Goals + Features",
    goal: brief.goal || "",
    sections: [
      {
        entries: (brief.features || []).map((feature) => ({ body: feature }))
      }
    ]
  };
}

function getBriefDisplayTitle(title) {
  if (title === "Project Goals + Features") {
    return "Project Goals";
  }

  return title;
}

function normalizeLinks(sourceProject) {
  return (sourceProject.links || []).map((entry) => {
    if (typeof entry !== "string") {
      return entry;
    }

    if (entry === "Join the Conversation") {
      return { label: entry, icon: "discord" };
    }

    if (entry === "Documentation stored on Google Drive") {
      return { label: entry, icon: "drive" };
    }

    if (entry === "Collaborate on Mechanical") {
      return { label: entry, icon: "onshape", helpVideo: "https://www.youtube.com/embed/aqz-KE-bpKQ" };
    }

    if (entry === "Collaborate on Electronics" || entry === "Collaborate on Software") {
      return { label: entry, icon: "github", helpVideo: "https://www.youtube.com/embed/aqz-KE-bpKQ" };
    }

    return { label: entry };
  });
}

function normalizeTaskPanel(sourceProject) {
  if (sourceProject.taskPanel) {
    return sourceProject.taskPanel;
  }

  const normalizedTasks = (sourceProject.tasks || []).map((task) => {
    if (typeof task === "string") {
      return { title: task, completed: false };
    }

    return {
      title: task.label,
      body: task.detail || "",
      completed: Boolean(task.completed)
    };
  });
  const openTasks = normalizedTasks.filter((task) => !task.completed);
  const completedTasks = normalizedTasks.filter((task) => task.completed);
  const sections = [];

  if (openTasks.length) {
    sections.push({ title: "General", entries: openTasks });
  }

  if (completedTasks.length) {
    sections.push({ title: "Closed Tasks", entries: completedTasks });
  }

  return {
    title: "Open Tasks",
    sections
  };
}

function normalizeTimelinePanel(sourceProject) {
  if (sourceProject.timelinePanel) {
    return sourceProject.timelinePanel;
  }

  return {
    title: "Progress Timeline",
    note: "A loose tracker for software, mechanical, and electrical additions.",
    sections: Object.entries(sourceProject.timeline || {}).map(([title, items]) => ({
      title,
      entries: items.map(([date, body]) => ({ meta: date, body }))
    }))
  };
}

function normalizeStoryPanel(sourceProject) {
  if (sourceProject.storyPanel) {
    return sourceProject.storyPanel;
  }

  const updatesPanel = sourceProject.updatesPanel || null;
  const normalizedEntries = updatesPanel
    ? (updatesPanel.entries || [])
    : (sourceProject.updates || []).map(([meta, body]) => ({ meta, body }));

  return {
    title: updatesPanel?.title || "Build Journal",
    note: updatesPanel?.note || "",
    entries: normalizedEntries.length
      ? normalizedEntries.map((entry, entryIndex) => ({
          ...entry,
          title: entry.title || `Journal Entry ${entryIndex + 1}`,
          image: entry.image || sourceProject.image,
          alt: entry.alt || sourceProject.alt || sourceProject.name
        }))
      : [
          {
            meta: sourceProject.stage || "",
            title: sourceProject.name,
            body: sourceProject.summary,
            image: sourceProject.image,
            alt: sourceProject.alt || sourceProject.name
          }
        ]
  };
}

function renderSectionList(sections, itemMarkup, emptyMessage = "") {
  if (!sections.length) {
    return emptyMessage ? `<p class="empty-state">${emptyMessage}</p>` : "";
  }

  return sections
    .map(
      (section, sectionIndex) => `
        <section class="content-section">
          ${section.title ? `<div class="content-section-head"><h3>${section.title}</h3>${section.actionMarkup || ""}</div>` : ""}
          ${(section.entries || []).length
            ? `
              <div class="content-card-list">
                ${(section.entries || []).map((entry, entryIndex) => itemMarkup(entry, sectionIndex, entryIndex)).join("")}
              </div>
            `
            : section.emptyMessage
              ? `<p class="empty-state">${section.emptyMessage}</p>`
              : ""}
        </section>
      `
    )
    .join("");
}

function getTaskKey(sectionIndex, entryIndex) {
  return `${sectionIndex}-${entryIndex}`;
}

function getBriefGoalKey(sectionIndex, entryIndex, itemIndex) {
  return `${sectionIndex}-${entryIndex}-${itemIndex}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function formatTimeOfDay(date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date).replace(/\s/g, "").toLowerCase();
}

function formatDateTime(date) {
  return `${formatDate(date)}, ${formatTimeOfDay(date)}`;
}

function calculateEstimateDate(baseDate, amount, unit) {
  const estimatedDate = new Date(baseDate);
  const estimateAmount = Number(amount);

  if (unit === "hours") {
    estimatedDate.setHours(estimatedDate.getHours() + estimateAmount);
    return estimatedDate;
  }

  if (unit === "weeks") {
    estimatedDate.setDate(estimatedDate.getDate() + estimateAmount * 7);
    return estimatedDate;
  }

  estimatedDate.setDate(estimatedDate.getDate() + estimateAmount);
  return estimatedDate;
}

function getStoredMockUser() {
  const storedName = window.localStorage.getItem(mockUserStorageKey);
  return mockUsers.find((user) => user.name === storedName) || null;
}

function replaceStateContents(target, source) {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });

  Object.assign(target, source || {});
}

function loadPersistedProjectState() {
  const rawState = window.localStorage.getItem(projectStateStorageKey);

  if (!rawState) {
    return;
  }

  try {
    const state = JSON.parse(rawState);
    replaceStateContents(taskAssignments, state.taskAssignments);
    replaceStateContents(pendingTimelineEntries, state.pendingTimelineEntries);
    replaceStateContents(userCreatedTaskEntries, state.userCreatedTaskEntries);
    replaceStateContents(briefGoalCompletionState, state.briefGoalCompletionState);
  } catch {
    window.localStorage.removeItem(projectStateStorageKey);
  }
}

function persistProjectState() {
  window.localStorage.setItem(projectStateStorageKey, JSON.stringify({
    taskAssignments,
    pendingTimelineEntries,
    userCreatedTaskEntries,
    briefGoalCompletionState
  }));
}

function getMockUserByName(name) {
  return mockUsers.find((user) => user.name === name) || mockUsers[0];
}

function getDeterministicUserName(seed) {
  const userPool = timelineAssignableUsers.length ? timelineAssignableUsers : mockUsers;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(index);
    hash |= 0;
  }

  return userPool[Math.abs(hash) % userPool.length].name;
}

function getTimelineEntryUserName(entry, sectionIndex, entryIndex) {
  if (entry.userName) {
    return entry.userName;
  }

  return getDeterministicUserName(
    [
      project.slug,
      sectionIndex,
      entryIndex,
      entry.meta || "",
      entry.title || "",
      entry.body || "",
      entry.isProjectStart ? "project-start" : "timeline-entry"
    ].join("|")
  );
}

function getIsLoggedIn() {
  return Boolean(getStoredMockUser());
}

function getIsAdmin() {
  return getStoredMockUser()?.role === "admin";
}

function getAssignmentIsOverdue(assignment) {
  if (!assignment || assignment.completed || !assignment.estimatedCompletionAt) {
    return false;
  }

  return Date.now() > new Date(assignment.estimatedCompletionAt).getTime();
}

function buildAssignmentTooltip(assignment) {
  if (!assignment) {
    return "";
  }

  const tooltipLines = [
    assignment.userName,
    `Volunteered: ${assignment.assignedDateTimeLabel || assignment.assignedDateLabel}`,
    `Estimated completion: ${assignment.estimatedCompletionDateTimeLabel || assignment.estimatedCompletionLabel}`
  ];

  if (getAssignmentIsOverdue(assignment)) {
    tooltipLines.push("Overdue");
  }

  if (assignment.completed) {
    tooltipLines.push("Completed");
  }

  return tooltipLines.join("\n");
}

function renderAuthButton() {
  const currentUser = getStoredMockUser();
  const isLoggedIn = Boolean(currentUser);
  authButton.setAttribute("aria-pressed", String(isLoggedIn));

  if (isLoggedIn) {
    authAvatar.className = "auth-avatar";
    authAvatar.innerHTML = `<img src="${currentUser.avatar}" alt="">`;
    authName.textContent = currentUser.name;
    authButton.setAttribute("aria-label", `Logged in as ${currentUser.name}`);
  } else {
    authAvatar.className = "auth-avatar auth-avatar-placeholder";
    authAvatar.innerHTML = "";
    authName.textContent = "Log In";
    authButton.setAttribute("aria-label", "Choose a mock user");
  }
}

function renderAuthMenu() {
  const currentUser = getStoredMockUser();
  authMenu.className = "auth-menu";
  authMenu.hidden = !isAuthMenuOpen || authButton.hidden;

  if (currentUser) {
    authMenu.innerHTML = `<button class="auth-menu-option auth-menu-logout" type="button" data-action="logout-mock-user">Log Out</button>`;
    return;
  }

  authMenu.innerHTML = mockUsers
    .map((user) => `
      <button class="auth-menu-option" type="button" data-action="select-mock-user" data-user-name="${user.name}">
        <span class="auth-avatar" aria-hidden="true">
          <img src="${user.avatar}" alt="">
        </span>
        <span class="auth-menu-copy">
          <span class="auth-menu-name">${user.name}</span>
          <span class="auth-menu-role">${user.role === "admin" ? "Admin" : "Contributor"}</span>
        </span>
      </button>
    `)
    .join("");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getCurrentUserMarkup(label) {
  const currentUser = getStoredMockUser();

  if (!currentUser) {
    return "";
  }

  return `
    <div class="inline-composer-user">
      <span class="task-assignee" aria-hidden="true">
        <img src="${currentUser.avatar}" alt="">
      </span>
      <div class="inline-composer-user-copy">
        <strong>${escapeHTML(label)}</strong>
        <span>${escapeHTML(currentUser.name)}</span>
      </div>
    </div>
  `;
}

function getTaskSectionDisclosureKey(groupKey, sectionIndex) {
  return `${groupKey}-${sectionIndex}`;
}

function getTaskSectionActionMarkup(section, sectionIndex, groupKey) {
  if (!usesSharedProjectLandingLayout || !section?.title) {
    return "";
  }

  return `<button class="task-section-add-button" type="button" data-action="add-task-entry" data-section-index="${sectionIndex}" data-disclosure-key="${getTaskSectionDisclosureKey(groupKey, sectionIndex)}" aria-label="Add a task to ${escapeHTML(section.title)}">+</button>`;
}

function getTaskDisclosureIsOpen(key) {
  return taskDisclosureState[key] !== false;
}

function renderTaskDisclosure(title, key, content, disclosureClass = "", summaryMarkup = "") {
  return `
    <details class="task-disclosure${disclosureClass ? ` ${disclosureClass}` : ""}" data-disclosure-key="${key}"${getTaskDisclosureIsOpen(key) ? " open" : ""}>
      <summary class="task-disclosure-summary">
        <span class="task-disclosure-title">${title}</span>
        ${summaryMarkup}
        <span class="task-disclosure-icon" aria-hidden="true">+</span>
      </summary>
      <div class="task-disclosure-body">
        ${content}
      </div>
    </details>
  `;
}

function getTaskCardDisclosureIsOpen(taskKey, forceOpen = false) {
  if (forceOpen) {
    return true;
  }

  return taskCardDisclosureState[taskKey] !== false;
}

function syncAuthState() {
  loadPersistedProjectState();
  isAuthMenuOpen = false;
  authMenuOpenedAt = 0;
  renderAuthButton();
  renderAuthMenu();
  renderProjectBrief();
  renderTaskPanel();
  renderTimelinePanel();
}

function getSharedTaskGroups() {
  const openSections = (taskPanel.sections || []).map((section, sectionIndex) => ({
    ...section,
    sectionIndex,
    actionMarkup: getTaskSectionActionMarkup(section, sectionIndex, "open"),
    entries: []
  }));
  const closedSections = (taskPanel.sections || []).map((section, sectionIndex) => ({
    ...section,
    sectionIndex,
    entries: []
  }));

  function appendRenderableTask(entry, sectionIndex, entryIndex) {
    const taskKey = entry.taskKey || getTaskKey(sectionIndex, entryIndex);
    const assignment = taskAssignments[taskKey] || null;
    const taskEntry = {
      ...entry,
      taskKey,
      assignment,
      completed: Boolean(entry.completed || assignment?.completed)
    };

    const targetSections = taskEntry.completed ? closedSections : openSections;
    targetSections[sectionIndex].entries.push(taskEntry);
  }

  openSections.forEach((section, sectionIndex) => {
    (userCreatedTaskEntries[sectionIndex] || []).forEach((entry, entryIndex) => {
      appendRenderableTask(entry, sectionIndex, `user-${entryIndex}`);
    });
  });

  (taskPanel.sections || []).forEach((section, sectionIndex) => {
    (section.entries || []).forEach((entry, entryIndex) => {
      appendRenderableTask(entry, sectionIndex, entryIndex);
    });
  });

  return {
    openSections: openSections.map((section) => ({
      ...section,
      emptyMessage: `No ${section.title?.toLowerCase() || "open"} tasks right now.`
    })),
    closedSections: closedSections
      .filter((section) => (section.entries || []).length)
      .map((section) => ({
        ...section,
        emptyMessage: `No closed ${section.title?.toLowerCase() || "tasks"} yet.`
      }))
  };
}

function renderTaskComposer(section) {
  if (activeTaskComposerSectionIndex !== section.sectionIndex) {
    return "";
  }

  return `
    <form class="inline-composer task-create-form" data-section-index="${section.sectionIndex}">
      <div class="inline-composer-head">
        ${getCurrentUserMarkup(`New ${section.title || "task"}`)}
        <button class="inline-composer-cancel" type="button" data-action="cancel-task-entry" aria-label="Close new task form">Close</button>
      </div>
      <label class="inline-composer-field">
        <span>Task title</span>
        <input name="title" type="text" maxlength="120" placeholder="Name the next fix or decision." required>
      </label>
      <label class="inline-composer-field">
        <span>Task details</span>
        <textarea name="body" rows="3" maxlength="420" placeholder="Describe the problem or the concrete next move." required></textarea>
      </label>
      <div class="inline-composer-actions">
        <button class="inline-composer-submit" type="submit">Add Task</button>
      </div>
    </form>
  `;
}

function renderAirConditionerTaskSection(section, groupKey) {
  const composerMarkup = renderTaskComposer(section);
  const content = (section.entries || []).length
    ? `
      <div class="content-card-list">
        ${(section.entries || []).map((entry, entryIndex) => renderTaskCard(entry, section.sectionIndex, entryIndex)).join("")}
      </div>
    `
    : `<p class="empty-state">${section.emptyMessage || "No tasks yet."}</p>`;
  const summaryMarkup = section.actionMarkup
    ? `<span class="task-disclosure-actions">${section.actionMarkup}</span>`
    : "";

  return renderTaskDisclosure(
    section.title || "Tasks",
    `${groupKey}-${section.sectionIndex}`,
    `${composerMarkup}${content}`,
    "task-disclosure-section",
    summaryMarkup
  );
}

function renderAirConditionerTaskPanel() {
  const { openSections, closedSections } = getSharedTaskGroups();
  const openContent = openSections.map((section) => renderAirConditionerTaskSection(section, "open")).join("");
  const closedContent = closedSections.length
    ? closedSections.map((section) => renderAirConditionerTaskSection(section, "closed")).join("")
    : `<p class="empty-state">No closed tasks yet.</p>`;

  taskList.innerHTML = [
    renderTaskDisclosure("Open Tasks", "open-group", openContent, "task-disclosure-group"),
    renderTaskDisclosure("Closed Tasks", "closed-group", closedContent, "task-disclosure-group")
  ].join("");
  const openTaskCount = openSections.reduce((count, section) => count + (section.entries || []).length, 0);
  taskSectionTitle.dataset.openCount = String(openTaskCount);
  taskSectionTitle.textContent = "Tasks";
  taskSectionTitle.setAttribute("aria-label", `Toggle tasks drawer. ${openTaskCount} open tasks.`);
}

function renderTaskCard(task, sectionIndex, entryIndex) {
  const taskKey = task.taskKey || getTaskKey(sectionIndex, entryIndex);
  const assignment = task.assignment || taskAssignments[taskKey] || null;
  const isInteractiveTask = !task.completed;
  const isVolunteerFormOpen = activeVolunteerTaskKey === taskKey;
  const isLoggedIn = getIsLoggedIn();
  const assigneeUser = assignment ? getMockUserByName(assignment.userName) : mockUsers[0];
  const assignmentTooltip = buildAssignmentTooltip(assignment);
  const isAssignmentOverdue = getAssignmentIsOverdue(assignment);
  const isAssignmentMenuRepressed = Boolean(assignment && !assignment.completed && isVolunteerFormOpen);
  const metaParts = [task.completed ? "Completed" : (task.status || "Open")];
  const checkMarkup = task.completed && !(assignment && assignment.completed)
    ? `
      <span class="task-card-check" aria-hidden="true">
        <img src="images/check.png" alt="">
      </span>
    `
    : "";

  if (task.owner) {
    metaParts.push(task.owner);
  }

  const metaMarkup = usesSharedProjectLandingLayout ? "" : `<p class="panel-card-meta">${metaParts.join(" / ")}</p>`;

  const volunteerMarkup = isInteractiveTask
    ? `
      <div class="task-volunteer-area">
        ${assignment ? "" : `<button class="volunteer-trigger" type="button" data-action="toggle-volunteer" data-task-key="${taskKey}">${isLoggedIn ? "Volunteer for Task" : "Log In to Volunteer"}</button>`}
        ${isVolunteerFormOpen ? `
          <form class="volunteer-form"${isVolunteerFormOpen ? "" : " hidden"} data-task-key="${taskKey}">
            <label class="volunteer-field">
              <span>Estimated completion time</span>
              <div class="volunteer-input-row">
                <input name="estimateValue" type="number" min="1" step="1" inputmode="numeric" placeholder="#" value="${assignment ? assignment.estimateValue : ""}" required>
                <select name="estimateUnit" aria-label="Estimated completion time unit">
                  <option value="hours"${assignment && assignment.estimateUnit === "hours" ? " selected" : ""}>Hours</option>
                  <option value="days"${!assignment || assignment.estimateUnit === "days" ? " selected" : ""}>Days</option>
                  <option value="weeks"${assignment && assignment.estimateUnit === "weeks" ? " selected" : ""}>Weeks</option>
                </select>
              </div>
            </label>
            <button class="volunteer-confirm" type="submit">Confirm</button>
          </form>
        ` : ""}
      </div>
    `
    : "";

  const assigneeMarkup = assignment && !assignment.completed
    ? `
      <div class="task-assignment-controls${isAssignmentMenuRepressed ? " is-menu-repressed" : ""}">
        <div class="task-assignee-badge">
          ${isAssignmentMenuRepressed
            ? `
              <span
                class="task-assignee${isAssignmentOverdue ? " is-overdue" : ""}"
                role="img"
                aria-label="${assignmentTooltip}"
                title="${assignmentTooltip}"
              >
                <img src="${assigneeUser.avatar}" alt="${assignment.userName}">
              </span>
            `
            : `
              <button
                class="task-assignee task-assignee-button${isAssignmentOverdue ? " is-overdue" : ""}"
                type="button"
                data-action="toggle-assignment-menu"
                data-task-key="${taskKey}"
                aria-label="${assignmentTooltip}"
                title="${assignmentTooltip}"
              >
                <img src="${assigneeUser.avatar}" alt="${assignment.userName}">
              </button>
            `}
          ${isAssignmentOverdue ? `<span class="task-assignee-alert" aria-hidden="true">!</span>` : ""}
        </div>
        ${isAssignmentMenuRepressed ? "" : `
          <div class="task-assignment-menu">
            <button type="button" data-action="revise-estimate" data-task-key="${taskKey}">Revise Estimated Completion</button>
            <button type="button" data-action="unvolunteer-task" data-task-key="${taskKey}">Unvolunteer from Task</button>
            <button type="button" data-action="mark-complete" data-task-key="${taskKey}">Mark Complete</button>
          </div>
        `}
      </div>
    `
    : assignment
      ? `
      <div class="task-completion-badge" aria-label="${assignmentTooltip}" title="${assignmentTooltip}">
        <span class="task-card-check task-card-check-inline" aria-hidden="true">
          <img src="images/check.png" alt="">
        </span>
        <span class="task-assignee" role="img" aria-label="${assignmentTooltip}">
          <img src="${assigneeUser.avatar}" alt="${assignment.userName}">
        </span>
      </div>
    `
    : "";

  if (usesSharedProjectLandingLayout) {
    return `
      <article class="panel-card task-card${task.completed ? " is-completed" : ""}${isInteractiveTask ? " is-open-task" : ""}${isVolunteerFormOpen ? " is-form-open" : ""}${assignment ? " is-assigned" : ""}" data-task-key="${taskKey}">
        <details class="task-card-disclosure" data-task-card-key="${taskKey}"${getTaskCardDisclosureIsOpen(taskKey, isVolunteerFormOpen) ? " open" : ""}>
          <summary class="task-card-summary">
            <span class="task-card-summary-copy">
              ${checkMarkup}
              <h3>${escapeHTML(task.title)}</h3>
            </span>
            <span class="task-card-toggle-icon" aria-hidden="true"></span>
          </summary>
          <div class="task-card-body">
            ${task.body ? `<p>${escapeHTML(task.body)}</p>` : ""}
            ${volunteerMarkup}
            ${assigneeMarkup}
          </div>
        </details>
      </article>
    `;
  }

  return `
    <article class="panel-card task-card${task.completed ? " is-completed" : ""}${isInteractiveTask ? " is-open-task" : ""}${isVolunteerFormOpen ? " is-form-open" : ""}${assignment ? " is-assigned" : ""}" data-task-key="${taskKey}">
      ${checkMarkup}
      ${metaMarkup}
      <h3>${escapeHTML(task.title)}</h3>
      ${task.body ? `<p>${escapeHTML(task.body)}</p>` : ""}
      ${volunteerMarkup}
      ${assigneeMarkup}
    </article>
  `;
}

function renderTaskPanel() {
  renderAirConditionerTaskPanel();
}

function getRenderableTimelineSections() {
  const projectStartEntry = usesSharedProjectLandingLayout
    ? {
        meta: timelineStartMeta,
        title: "Project Start",
        isProjectStart: true
      }
    : null;

  return (timelinePanel.sections || []).map((section, sectionIndex) => ({
    ...section,
    entries: [
      ...(pendingTimelineEntries[sectionIndex] || []).map((entry, pendingIndex) => ({
        ...entry,
        pendingIndex
      })),
      ...(section.entries || []),
      ...(projectStartEntry ? [projectStartEntry] : [])
    ]
  }));
}

function renderTimelineComposer(section, sectionIndex) {
  if (activeTimelineComposerSectionIndex !== sectionIndex) {
    return "";
  }

  return `
    <form class="inline-composer timeline-create-form" data-section-index="${sectionIndex}">
      <div class="inline-composer-head">
        ${getCurrentUserMarkup(`New ${section.title || "progress"} update`)}
        <button class="inline-composer-cancel" type="button" data-action="cancel-timeline-entry" aria-label="Close new progress update form">Close</button>
      </div>
      <label class="inline-composer-field">
        <span>Progress update</span>
        <textarea name="body" rows="3" maxlength="420" placeholder="Write the short progress note that belongs in this lane." required></textarea>
      </label>
      <div class="inline-composer-actions">
        <button class="inline-composer-submit" type="submit">Add Update</button>
      </div>
    </form>
  `;
}

function renderTimelineSections(sections) {
  if (!sections.length) {
    return "";
  }

  return sections
    .map(
      (section, sectionIndex) => `
        <section class="timeline-track">
          ${section.title ? `<div class="timeline-track-head"><h3>${escapeHTML(section.title)}</h3></div>` : ""}
          ${usesSharedProjectLandingLayout ? `<button class="timeline-add-button" type="button" data-action="add-timeline-entry" data-section-index="${sectionIndex}" aria-label="Add a progress update to ${escapeHTML(section.title)}">+</button>` : ""}
          <div class="timeline-node-list">
            ${renderTimelineComposer(section, sectionIndex)}
            ${(section.entries || [])
              .map(
                (entry, entryIndex) => {
                  const userName = getTimelineEntryUserName(entry, sectionIndex, entryIndex);
                  const author = userName ? getMockUserByName(userName) : null;

                  return `
                  <article class="timeline-item${entry.pendingApproval ? " is-pending" : ""}${entry.isProjectStart ? " is-project-start" : ""}">
                    <div class="timeline-item-copy">
                      ${entry.meta ? `<time>${escapeHTML(entry.meta)}</time>` : ""}
                      ${entry.title ? `<h4>${escapeHTML(entry.title)}</h4>` : ""}
                      ${author ? `
                        <div class="timeline-item-author">
                          <span class="task-assignee" aria-hidden="true">
                            <img src="${author.avatar}" alt="">
                          </span>
                          <span>${escapeHTML(userName)}</span>
                        </div>
                      ` : ""}
                      ${entry.body ? `<p>${escapeHTML(entry.body)}</p>` : ""}
                      ${entry.pendingApproval && getIsAdmin() ? `<button class="timeline-approve-button" type="button" data-action="approve-timeline-entry" data-section-index="${sectionIndex}" data-pending-index="${entry.pendingIndex}">Approve</button>` : ""}
                    </div>
                  </article>
                `;
                }
              )
              .join("")}
          </div>
        </section>
      `
    )
    .join("");
}

function renderStorySlide(entry) {
  return `
    <article class="story-slide">
      <div class="story-slide-media">
        <img src="${entry.image}" alt="${entry.alt || entry.title || project.name}">
      </div>
      <div class="story-slide-copy">
        ${entry.meta ? `<time class="story-slide-meta">${entry.meta}</time>` : ""}
        ${entry.title ? `<h3>${entry.title}</h3>` : ""}
        ${entry.body ? `<p>${entry.body}</p>` : ""}
      </div>
    </article>
  `;
}

function renderTimelinePanel() {
  timelineGrid.innerHTML = renderTimelineSections(getRenderableTimelineSections());
}

function scrollToStory(index, behavior = "smooth") {
  if (!storyEntries.length || !storyViewport.clientHeight) {
    activeStoryIndex = 0;
    return;
  }

  activeStoryIndex = Math.max(0, Math.min(index, storyEntries.length - 1));
  storyViewport.scrollTo({
    top: activeStoryIndex * storyViewport.clientHeight,
    behavior
  });
}

function renderStoryPanel() {
  storyEntries = storyData.entries || [];

  storyPanelSection.hidden = !storyEntries.length;
  storyPanelTitle.textContent = storyData.title || "Build Journal";
  storyPanelNote.hidden = !storyData.note;
  storyPanelNote.textContent = storyData.note || "";
  storySlides.innerHTML = storyEntries.map((entry) => renderStorySlide(entry)).join("");
  window.requestAnimationFrame(() => scrollToStory(activeStoryIndex, "auto"));
}

function getTimelineMetaTimestamp(meta) {
  if (!meta) {
    return Number.NaN;
  }

  const directTimestamp = Date.parse(meta);

  if (!Number.isNaN(directTimestamp)) {
    return directTimestamp;
  }

  return Date.parse(`${meta}, ${new Date().getFullYear()}`);
}

function formatTimelineMeta(date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(date);
}

function getTimelineStartMeta(sections) {
  const earliestTimestamp = (sections || [])
    .flatMap((section) => (section.entries || []).map((entry) => getTimelineMetaTimestamp(entry.meta)))
    .filter((timestamp) => !Number.isNaN(timestamp))
    .sort((firstTimestamp, secondTimestamp) => firstTimestamp - secondTimestamp)[0];

  if (!Number.isNaN(earliestTimestamp) && earliestTimestamp !== undefined) {
    return formatTimelineMeta(new Date(earliestTimestamp));
  }

  return formatTimelineMeta(new Date());
}

const brief = normalizeBrief(project);
const links = normalizeLinks(project);
const taskPanel = normalizeTaskPanel(project);
const timelinePanel = normalizeTimelinePanel(project);
const timelineStartMeta = getTimelineStartMeta(timelinePanel.sections || []);
const storyData = normalizeStoryPanel(project);
const briefTitle = getBriefDisplayTitle(brief?.title || "Project Goals + Features");

loadPersistedProjectState();

function renderBriefGoalItem(item, sectionIndex, entryIndex, itemIndex) {
  const goalKey = getBriefGoalKey(sectionIndex, entryIndex, itemIndex);
  const isCompleted = Boolean(briefGoalCompletionState[goalKey]);
  const adminButtonMarkup = getIsAdmin()
    ? `
      <button
        class="brief-goal-complete-button${isCompleted ? " is-completed" : ""}"
        type="button"
        data-action="toggle-brief-goal-complete"
        data-goal-key="${goalKey}"
        aria-pressed="${isCompleted ? "true" : "false"}"
      >
        ${isCompleted ? "Completed" : "Mark Complete"}
      </button>
    `
    : "";

  return `
    <li class="brief-goal-item${isCompleted ? " is-completed" : ""}">
      <span class="brief-goal-status" aria-hidden="true">${isCompleted ? "✓" : ""}</span>
      <span class="brief-goal-text">${escapeHTML(item)}</span>
      ${adminButtonMarkup}
    </li>
  `;
}

function renderProjectBrief() {
  if (!brief) {
    projectBriefWrap.hidden = true;
    projectBriefSections.innerHTML = "";
    return;
  }

  projectBriefWrap.hidden = false;
  projectBriefTitle.textContent = briefTitle;
  projectBriefToggleLabel.textContent = briefTitle;
  projectBriefGoal.textContent = brief.goal || "";
  projectBriefGoal.hidden = !brief.goal;
  projectBriefSections.innerHTML = renderSectionList(
    brief.sections || [],
    (entry, sectionIndex, entryIndex) => `
      <article class="brief-entry">
        ${entry.title ? `<h3>${entry.title}</h3>` : ""}
        ${entry.items?.length
          ? `
            <ul class="brief-bullet-list">
              ${entry.items.map((item, itemIndex) => renderBriefGoalItem(item, sectionIndex, entryIndex, itemIndex)).join("")}
            </ul>
          `
          : ""}
        ${entry.body ? `<p>${escapeHTML(entry.body)}</p>` : ""}
      </article>
    `,
    "No brief notes yet."
  );
}

renderProjectBrief();

function iconMarkup(icon) {
  if (icon === "discord") {
    return `
      <span class="link-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M18.9 5.4A16.5 16.5 0 0 0 14.8 4l-.2.4a11.3 11.3 0 0 1 3.4 1.7 10.8 10.8 0 0 0-3.2-1.6 15.4 15.4 0 0 0-5.6 0A10.8 10.8 0 0 0 6 6.1a11.3 11.3 0 0 1 3.4-1.7L9.2 4A16.5 16.5 0 0 0 5.1 5.4C2.5 9.3 1.8 13 2.1 16.6a16.7 16.7 0 0 0 5 2.6l1.1-1.8a10.7 10.7 0 0 1-1.8-.9l.4-.3c3.4 1.6 7 1.6 10.3 0l.4.3c-.6.4-1.2.7-1.8.9l1.1 1.8a16.7 16.7 0 0 0 5-2.6c.4-4.2-.7-7.9-3.3-11.2ZM9.4 14.3c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm5.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/>
        </svg>
      </span>
    `;
  }

  if (icon === "drive") {
    return `
      <span class="link-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M9.2 3 2 15.5h4.8L14 3H9.2Z"/>
          <path d="M14 3h4.8L26 15.5h-4.8L14 3Z" transform="translate(-2)"/>
          <path d="M6.8 16.5 9.2 21h14.4l-2.4-4.5H6.8Z"/>
        </svg>
      </span>
    `;
  }

  if (icon === "github") {
    return `
      <span class="link-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 .7a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.3 1.8 1.3 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6A4.7 4.7 0 0 1 6.1 8c-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1a4.7 4.7 0 0 1 1.2 3.2c0 4.7-2.8 5.7-5.5 6 .4.4.9 1 .9 2.1v3.1c0 .3.2.7.8.6A12 12 0 0 0 12 .7Z"/>
        </svg>
      </span>
    `;
  }

  if (icon === "onshape") {
    return `
      <span class="link-icon" aria-hidden="true">
        <img src="images/Onshape.png" alt="">
      </span>
    `;
  }

  return "";
}

linkStack.innerHTML = links
  .map((entry) => {
    const label = entry.label;
    const icon = iconMarkup(entry.icon);
    const href = entry.href || "#";
    const helpVideo = entry.helpVideo;
    const helpLink = helpVideo
      ? `<a class="collaboration-help" href="${helpVideo}" target="_blank" rel="noreferrer">How to Collaborate</a>`
      : "";
    return `
      <div class="link-item">
        <a href="${href}">${icon}<span>${label}</span></a>
        ${helpLink}
      </div>
    `;
  })
  .join("");

taskPanelTitle.textContent = taskPanel.title || "Open Tasks";

if (taskPanel.note) {
  taskPanelNote.hidden = false;
  taskPanelNote.textContent = taskPanel.note;
} else {
  taskPanelNote.hidden = true;
  taskPanelNote.textContent = "";
}

timelinePanelTitle.textContent = timelinePanel.title || "Progress Timeline";
timelinePanelNote.hidden = !timelinePanel.note;
timelinePanelNote.textContent = timelinePanel.note || "";

syncAuthState();
syncTaskDrawerState();
syncInfoPanelState();
syncTimelinePanelState();
renderStoryPanel();
syncStoryPanelState();

if (brief) {
  projectBriefToggle.addEventListener("click", () => {
    projectBriefToggle.setAttribute("aria-expanded", String(projectBriefDrawer.classList.toggle("is-open")));
    projectBriefToggleLabel.textContent = briefTitle;
    syncBuildJournalState();
  });
}

projectBriefSections.addEventListener("click", (event) => {
  const goalButton = event.target.closest('[data-action="toggle-brief-goal-complete"]');

  if (!goalButton || !getIsAdmin()) {
    return;
  }

  const goalKey = goalButton.dataset.goalKey;
  briefGoalCompletionState[goalKey] = !briefGoalCompletionState[goalKey];
  persistProjectState();
  renderProjectBrief();
});

authMenu.setAttribute("id", "authMenu");
authButton.insertAdjacentElement("afterend", authMenu);
renderAuthMenu();

authAvatar.addEventListener("click", () => {
  isAuthMenuOpen = !isAuthMenuOpen;
  authMenuOpenedAt = isAuthMenuOpen ? Date.now() : 0;
  renderAuthMenu();
});

taskSectionTitle.addEventListener("click", () => {
  if (!usesSharedProjectLandingLayout) {
    return;
  }

  isTaskDrawerCollapsed = !isTaskDrawerCollapsed;
  syncTaskDrawerState();
});

taskSectionTitle.addEventListener("keydown", (event) => {
  if (!usesSharedProjectLandingLayout || (event.key !== "Enter" && event.key !== " ")) {
    return;
  }

  event.preventDefault();
  isTaskDrawerCollapsed = !isTaskDrawerCollapsed;
  syncTaskDrawerState();
});

stageLabel.addEventListener("click", () => {
  if (!usesSharedProjectLandingLayout) {
    return;
  }

  isInfoPanelCollapsed = !isInfoPanelCollapsed;
  syncInfoPanelState();
});

stageLabel.addEventListener("keydown", (event) => {
  if (!usesSharedProjectLandingLayout || (event.key !== "Enter" && event.key !== " ")) {
    return;
  }

  event.preventDefault();
  isInfoPanelCollapsed = !isInfoPanelCollapsed;
  syncInfoPanelState();
});

timelinePanelTitle.addEventListener("click", () => {
  if (!usesSharedProjectLandingLayout) {
    return;
  }

  isTimelinePanelCollapsed = !isTimelinePanelCollapsed;
  syncTimelinePanelState();
});

timelinePanelTitle.addEventListener("keydown", (event) => {
  if (!usesSharedProjectLandingLayout || (event.key !== "Enter" && event.key !== " ")) {
    return;
  }

  event.preventDefault();
  isTimelinePanelCollapsed = !isTimelinePanelCollapsed;
  syncTimelinePanelState();
});

storyPanelTitle.addEventListener("click", () => {
  if (!usesSharedProjectLandingLayout) {
    return;
  }

  isStoryPanelCollapsed = !isStoryPanelCollapsed;
  syncStoryPanelState();
});

storyPanelTitle.addEventListener("keydown", (event) => {
  if (!usesSharedProjectLandingLayout || (event.key !== "Enter" && event.key !== " ")) {
    return;
  }

  event.preventDefault();
  isStoryPanelCollapsed = !isStoryPanelCollapsed;
  syncStoryPanelState();
});

storyViewport.addEventListener("scroll", () => {
  if (!storyEntries.length || !storyViewport.clientHeight) {
    return;
  }

  activeStoryIndex = Math.round(storyViewport.scrollTop / storyViewport.clientHeight);
});

timelineGrid.addEventListener("click", (event) => {
  const addButton = event.target.closest('[data-action="add-timeline-entry"]');
  const cancelButton = event.target.closest('[data-action="cancel-timeline-entry"]');
  const approveButton = event.target.closest('[data-action="approve-timeline-entry"]');

  if (addButton) {
    if (!getIsLoggedIn()) {
      authButton.focus();
      isAuthMenuOpen = true;
      renderAuthMenu();
      return;
    }

    const sectionIndex = Number(addButton.dataset.sectionIndex);
    activeTimelineComposerSectionIndex = activeTimelineComposerSectionIndex === sectionIndex ? null : sectionIndex;
    renderTimelinePanel();
    return;
  }

  if (cancelButton) {
    activeTimelineComposerSectionIndex = null;
    renderTimelinePanel();
    return;
  }

  if (!approveButton || !getIsAdmin()) {
    return;
  }

  const sectionIndex = Number(approveButton.dataset.sectionIndex);
  const pendingIndex = Number(approveButton.dataset.pendingIndex);
  const entry = pendingTimelineEntries[sectionIndex]?.[pendingIndex];

  if (!entry) {
    return;
  }

  entry.pendingApproval = false;
  entry.meta = formatDateTime(new Date());
  persistProjectState();
  renderTimelinePanel();
});

timelineGrid.addEventListener("submit", (event) => {
  const form = event.target.closest(".timeline-create-form");

  if (!form) {
    return;
  }

  event.preventDefault();

  if (!getIsLoggedIn()) {
    authButton.focus();
    isAuthMenuOpen = true;
    renderAuthMenu();
    return;
  }

  const formData = new FormData(form);
  const bodyValue = String(formData.get("body") || "").trim();

  if (!bodyValue) {
    return;
  }

  const sectionIndex = Number(form.dataset.sectionIndex);
  const addedAt = new Date();
  const currentUser = getStoredMockUser() || mockUsers[0];

  pendingTimelineEntries[sectionIndex] = pendingTimelineEntries[sectionIndex] || [];
  pendingTimelineEntries[sectionIndex].unshift({
    meta: `${formatDateTime(addedAt)} / Pending Approval`,
    body: bodyValue,
    pendingApproval: true,
    userName: currentUser.name
  });
  persistProjectState();
  activeTimelineComposerSectionIndex = null;
  renderTimelinePanel();
});

taskList.addEventListener("click", (event) => {
  const addTaskButton = event.target.closest('[data-action="add-task-entry"]');
  const cancelTaskButton = event.target.closest('[data-action="cancel-task-entry"]');
  const volunteerButton = event.target.closest('[data-action="toggle-volunteer"]');
  const reviseButton = event.target.closest('[data-action="revise-estimate"]');
  const unvolunteerButton = event.target.closest('[data-action="unvolunteer-task"]');
  const markCompleteButton = event.target.closest('[data-action="mark-complete"]');

  if (addTaskButton) {
    event.preventDefault();
    event.stopPropagation();

    if (!getIsLoggedIn()) {
      authButton.focus();
      isAuthMenuOpen = true;
      renderAuthMenu();
      return;
    }

    const sectionIndex = Number(addTaskButton.dataset.sectionIndex);
    taskDisclosureState["open-group"] = true;
    taskDisclosureState[addTaskButton.dataset.disclosureKey] = true;
    activeTaskComposerSectionIndex = activeTaskComposerSectionIndex === sectionIndex ? null : sectionIndex;
    renderTaskPanel();
    return;
  }

  if (cancelTaskButton) {
    activeTaskComposerSectionIndex = null;
    renderTaskPanel();
    return;
  }

  if (reviseButton) {
    activeVolunteerTaskKey = reviseButton.dataset.taskKey;
    renderTaskPanel();
    return;
  }

  if (unvolunteerButton) {
    delete taskAssignments[unvolunteerButton.dataset.taskKey];
    persistProjectState();
    activeVolunteerTaskKey = "";
    renderTaskPanel();
    return;
  }

  if (markCompleteButton) {
    const taskKey = markCompleteButton.dataset.taskKey;

    if (taskAssignments[taskKey]) {
      taskAssignments[taskKey].completed = true;
    }

    persistProjectState();
    activeVolunteerTaskKey = "";
    renderTaskPanel();
    return;
  }

  if (!volunteerButton) {
    return;
  }

  const taskKey = volunteerButton.dataset.taskKey;
  const isLoggedIn = getIsLoggedIn();

  if (!isLoggedIn) {
    authButton.focus();
    return;
  }

  activeVolunteerTaskKey = activeVolunteerTaskKey === taskKey ? "" : taskKey;
  renderTaskPanel();
});

taskList.addEventListener("submit", (event) => {
  const taskCreateForm = event.target.closest(".task-create-form");

  if (taskCreateForm) {
    event.preventDefault();

    if (!getIsLoggedIn()) {
      authButton.focus();
      isAuthMenuOpen = true;
      renderAuthMenu();
      return;
    }

    const formData = new FormData(taskCreateForm);
    const title = String(formData.get("title") || "").trim();
    const bodyValue = String(formData.get("body") || "").trim();

    if (!title || !bodyValue) {
      return;
    }

    const sectionIndex = Number(taskCreateForm.dataset.sectionIndex);
    userCreatedTaskEntries[sectionIndex] = userCreatedTaskEntries[sectionIndex] || [];
    userCreatedTaskEntries[sectionIndex].unshift({
      taskKey: `user-task-${sectionIndex}-${Date.now()}`,
      title,
      body: bodyValue,
      status: "New"
    });
    persistProjectState();
    activeTaskComposerSectionIndex = null;
    renderTaskPanel();
    return;
  }

  const form = event.target.closest(".volunteer-form");

  if (!form) {
    return;
  }

  event.preventDefault();

  const formData = new FormData(form);
  const estimateValue = Number(formData.get("estimateValue"));
  const estimateUnit = formData.get("estimateUnit");

  if (!estimateValue || !estimateUnit) {
    return;
  }

  const taskKey = form.dataset.taskKey;
  const existingAssignment = taskAssignments[taskKey] || null;
  const assignedAt = existingAssignment?.assignedAt ? new Date(existingAssignment.assignedAt) : new Date();
  const estimateBaseDate = existingAssignment ? new Date() : assignedAt;
  const estimatedCompletionDate = calculateEstimateDate(estimateBaseDate, estimateValue, estimateUnit);

  taskAssignments[taskKey] = {
    userName: (getStoredMockUser() || mockUsers[0]).name,
    estimateValue: String(estimateValue),
    estimateUnit,
    assignedAt: assignedAt.toISOString(),
    estimatedCompletionAt: estimatedCompletionDate.toISOString(),
    assignedDateLabel: formatDate(assignedAt),
    assignedDateTimeLabel: formatDateTime(assignedAt),
    estimatedCompletionLabel: formatDate(estimatedCompletionDate),
    estimatedCompletionDateTimeLabel: formatDateTime(estimatedCompletionDate),
    completed: false
  };

  persistProjectState();
  activeVolunteerTaskKey = "";
  renderTaskPanel();
});

taskList.addEventListener("toggle", (event) => {
  const taskCardDisclosure = event.target.closest("[data-task-card-key]");

  if (taskCardDisclosure && taskList.contains(taskCardDisclosure)) {
    taskCardDisclosureState[taskCardDisclosure.dataset.taskCardKey] = taskCardDisclosure.open;
    return;
  }

  const disclosure = event.target.closest("[data-disclosure-key]");

  if (!disclosure || !taskList.contains(disclosure)) {
    return;
  }

  taskDisclosureState[disclosure.dataset.disclosureKey] = disclosure.open;
}, true);

document.addEventListener("click", (event) => {
  const authOption = event.target.closest('[data-action="select-mock-user"]');
  const logoutButton = event.target.closest('[data-action="logout-mock-user"]');

  if ((authOption || logoutButton) && Date.now() - authMenuOpenedAt < 150) {
    return;
  }

  if (authOption) {
    window.localStorage.setItem(mockUserStorageKey, authOption.dataset.userName);
    isAuthMenuOpen = false;
    authMenuOpenedAt = 0;
    renderAuthButton();
    renderAuthMenu();
    renderProjectBrief();
    renderTaskPanel();
    renderTimelinePanel();
    return;
  }

  if (logoutButton) {
    window.localStorage.removeItem(mockUserStorageKey);
    isAuthMenuOpen = false;
    authMenuOpenedAt = 0;
    renderAuthButton();
    renderAuthMenu();
    renderProjectBrief();
    renderTaskPanel();
    renderTimelinePanel();
    return;
  }

  if (!event.target.closest("#authButton") && !event.target.closest("#authMenu")) {
    isAuthMenuOpen = false;
    authMenuOpenedAt = 0;
    renderAuthMenu();
  }

  const link = event.target.closest('a[href="#"]');
  if (link) {
    event.preventDefault();
  }
});

window.addEventListener("focus", syncAuthState);
window.addEventListener("pageshow", syncAuthState);
window.addEventListener("storage", () => {
  loadPersistedProjectState();
  syncAuthState();
});
window.addEventListener("resize", () => {
  scrollToStory(activeStoryIndex, "auto");
});
