// ============================================================
// TaskFlow FRONTEND (DEMO MODE - NO BACKEND)
// ============================================================

// Fake API base (not used now)
const API_BASE = "";
const WS_BASE = "";

// ---------------- State ----------------

let state = {
  token: localStorage.getItem("tf_token") || null,
  user: JSON.parse(localStorage.getItem("tf_user") || "null"),
  tasks: [],
  editingTaskId: null,
};

// ---------------- Utility ----------------

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.remove("hidden");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.add("hidden"), 2500);
}

// ---------------- Auth ----------------

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("tf_token", token);
  localStorage.setItem("tf_user", JSON.stringify(user));
  enterDashboard();
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("tf_token");
  localStorage.removeItem("tf_user");

  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("authScreen").classList.remove("hidden");
}

document.getElementById("logoutBtn").addEventListener("click", logout);

// ---------------- Fake Login ----------------

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("loginUsername").value.trim();
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";

  if (!username) {
    errorEl.textContent = "Enter username";
    return;
  }

  // ✅ Fake login
  setSession("demo-token", { username });
  showToast("Logged in (Demo Mode)");
});

// ---------------- Fake Register ----------------

document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("registerUsername").value.trim();
  const errorEl = document.getElementById("registerError");
  errorEl.textContent = "";

  if (!username) {
    errorEl.textContent = "Enter username";
    return;
  }

  // ✅ Fake register
  showToast("Account created (Demo Mode)");
  setSession("demo-token", { username });
});

// ---------------- Dashboard ----------------

function enterDashboard() {
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("welcomeUser").textContent = `Hi, ${state.user.username}`;

  loadTasks();
}

// ---------------- Fake Tasks ----------------

function loadTasks() {
  state.tasks = [
    {
      id: 1,
      title: "Sample Task",
      description: "This is a demo task",
      status: "todo",
      priority: "medium",
    },
  ];

  renderBoard();
}

// ---------------- Render ----------------

function renderBoard() {
  const columns = { todo: [], in_progress: [], done: [] };
  state.tasks.forEach(t => columns[t.status]?.push(t));

  Object.entries(columns).forEach(([status, tasks]) => {
    const list = document.getElementById(`list-${status}`);
    document.getElementById(`count-${status}`).textContent = tasks.length;
    list.innerHTML = "";

    if (tasks.length === 0) {
      list.innerHTML = `<p>No tasks</p>`;
      return;
    }

    tasks.forEach(task => {
      const card = document.createElement("div");
      card.className = "task-card";

      card.innerHTML = `
        <h3>${task.title}</h3>
        <p>${task.description || ""}</p>
        <span>${task.priority}</span>
      `;

      list.appendChild(card);
    });
  });
}

// ---------------- Task Modal ----------------

const modal = document.getElementById("taskModal");

document.getElementById("newTaskBtn").addEventListener("click", () => {
  modal.classList.remove("hidden");
});

document.getElementById("cancelModalBtn").addEventListener("click", () => {
  modal.classList.add("hidden");
});

// ---------------- Add Task (Fake) ----------------

document.getElementById("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const title = document.getElementById("taskTitle").value.trim();

  if (!title) {
    alert("Enter task title");
    return;
  }

  const newTask = {
    id: Date.now(),
    title,
    description: document.getElementById("taskDescription").value,
    status: document.getElementById("taskStatus").value,
    priority: document.getElementById("taskPriority").value,
  };

  state.tasks.unshift(newTask);

  modal.classList.add("hidden");
  renderBoard();
  showToast("Task added (Demo Mode)");
});

// ---------------- Boot ----------------

if (state.token && state.user) {
  enterDashboard();
}

// ---------------- Tabs ----------------

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );

  document.getElementById("loginForm").classList.toggle("active", tab === "login");
  document.getElementById("registerForm").classList.toggle("active", tab === "register");
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});