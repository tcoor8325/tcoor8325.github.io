const projects = window.oseProjects || [];
const stageNames = window.oseStageNames || [];
const projectGrid = document.querySelector("#projectGrid");
const authButton = document.querySelector("#authButton");
const authAvatar = document.querySelector("#authAvatar");
const authName = document.querySelector("#authName");
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
const authMenu = document.createElement("div");
let isAuthMenuOpen = false;
let authMenuOpenedAt = 0;

function getStoredMockUser() {
  const storedName = window.localStorage.getItem(mockUserStorageKey);
  return mockUsers.find((user) => user.name === storedName) || null;
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
    return;
  }

  authAvatar.className = "auth-avatar auth-avatar-placeholder";
  authAvatar.innerHTML = "";
  authName.textContent = "Log In";
  authButton.setAttribute("aria-label", "Choose a mock user");
}

function renderAuthMenu() {
  const currentUser = getStoredMockUser();
  authMenu.className = "auth-menu";
  authMenu.hidden = !isAuthMenuOpen;

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

function syncAuthState() {
  isAuthMenuOpen = false;
  authMenuOpenedAt = 0;
  renderAuthButton();
  renderAuthMenu();
}

function renderStatus(project) {
  const progress = ((project.progressIndex + 1) / stageNames.length) * 100;
  return `<div class="status-fill" style="width: ${progress}%"></div>`;
}

projectGrid.innerHTML = projects
  .map(
    (project) => `
      <a class="project-card-link" href="project.html?project=${encodeURIComponent(project.slug)}">
        <article class="project-card">
          <div class="project-thumb">
            <img src="${project.image}" alt="${project.alt}">
          </div>
          <h3 class="project-name">${project.name}</h3>
          <div class="project-card-foot">
            <div class="status-bar">
              ${renderStatus(project)}
            </div>
            <p class="project-stage">${project.stage}</p>
          </div>
        </article>
      </a>
    `
  )
  .join("");

syncAuthState();
authMenu.setAttribute("id", "authMenu");
authButton.insertAdjacentElement("afterend", authMenu);

authAvatar.addEventListener("click", () => {
  isAuthMenuOpen = !isAuthMenuOpen;
  authMenuOpenedAt = isAuthMenuOpen ? Date.now() : 0;
  renderAuthMenu();
});

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
    return;
  }

  if (logoutButton) {
    window.localStorage.removeItem(mockUserStorageKey);
    isAuthMenuOpen = false;
    authMenuOpenedAt = 0;
    renderAuthButton();
    renderAuthMenu();
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
window.addEventListener("storage", syncAuthState);
