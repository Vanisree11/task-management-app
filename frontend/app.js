// ============================================================
// TaskFlow frontend logic
// Talks to the FastAPI backend over REST + a WebSocket for
// real-time task updates.
// ============================================================

const API_BASE = window.location.origin; // backend serves frontend, so same origin
const WS_BASE = API_BASE.replace(/^http/, "ws");

let state = {
  token: localStorage.getItem("tf_token") || null,
  user: JSON.parse(localStorage.getItem("tf_user") || "null"),
  tasks: [],
  ws: null,
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

function authHeaders() {
  return { Authorization: `Bearer ${state.token}` };
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(state.token ? authHeaders() : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error("Session expired, please log in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------------- Auth ----------------

function switchTab(tab) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.getElementById("loginForm").classList.toggle("active", tab === "login");
  document.getElementById("registerForm").classList.toggle("active", tab === "register");
}

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";

  try {
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail || "Login failed");
    }
    const data = await res.json();
    setSession(data.access_token, data.user);
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("registerUsername").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const errorEl = document.getElementById("registerError");
  errorEl.textContent = "";

  try {
    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    showToast("Account created! Logging you in...");

    // auto-login right after registering
    const form = new URLSearchParams();
    form.append("username", username);
    form.append("password", password);
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const data = await res.json();
    setSession(data.access_token, data.user);
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

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
  if (state.ws) state.ws.close();
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("authScreen").classList.remove("hidden");
}

document.getElementById("logoutBtn").addEventListener("click", logout);

// ---------------- Dashboard bootstrap ----------------

async function enterDashboard() {
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");
  document.getElementById("welcomeUser").textContent = `Hi, ${state.user.username}`;
  await loadTasks();
  connectWebSocket();
}

// ---------------- WebSocket (real-time) ----------------

function connectWebSocket() {
  if (state.ws) state.ws.close();

  const ws = new WebSocket(`${WS_BASE}/ws?token=${encodeURIComponent(state.token)}`);
  state.ws = ws;

  ws.onopen = () => setConnStatus(true);
  ws.onclose = () => {
    setConnStatus(false);
    // try to reconnect after a short delay if still logged in
    if (state.token) setTimeout(connectWebSocket, 3000);
  };
  ws.onerror = () => ws.close();

  ws.onmessage = (event) => {
    const { event: type, data } = JSON.parse(event.data);
    if (type === "task_created") {
      if (!state.tasks.find(t => t.id === data.id)) state.tasks.unshift(data);
      showToast(`Task created: ${data.title}`);
    } else if (type === "task_updated") {
      state.tasks = state.tasks.map(t => (t.id === data.id ? data : t));
      showToast(`Task updated: ${data.title}`);
    } else if (type === "task_deleted") {
      state.tasks = state.tasks.filter(t => t.id !== data.id);
      showToast("Task deleted");
    }
    renderBoard();
  };
}

function setConnStatus(online) {
  const el = document.getElementById("connStatus");
  el.textContent = online ? "● live" : "● offline";
  el.classList.toggle("online", online);
  el.classList.toggle("offline", !online);
}

// ---------------- Task CRUD ----------------

async function loadTasks() {
  const params = new URLSearchParams();
  const status = document.getElementById("statusFilter").value;
  const priority = document.getElementById("priorityFilter").value;
  const search = document.getElementById("searchInput").value.trim();
  if (status) params.append("status", status);
  if (priority) params.append("priority", priority);
  if (search) params.append("search", search);

  try {
    state.tasks = await apiFetch(`/tasks?${params.toString()}`);
    renderBoard();
  } catch (err) {
    showToast(err.message);
  }
}

let searchDebounce;
document.getElementById("searchInput").addEventListener("input", () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(loadTasks, 300);
});
document.getElementById("statusFilter").addEventListener("change", loadTasks);
document.getElementById("priorityFilter").addEventListener("change", loadTasks);

function renderBoard() {
  const columns = { todo: [], in_progress: [], done: [] };
  state.tasks.forEach(t => columns[t.status]?.push(t));

  Object.entries(columns).forEach(([status, tasks]) => {
    const list = document.getElementById(`list-${status}`);
    document.getElementById(`count-${status}`).textContent = tasks.length;
    list.innerHTML = "";

    if (tasks.length === 0) {
      list.innerHTML = `<p class="empty-hint">No tasks here</p>`;
      return;
    }

    tasks.forEach(task => {
      const card = document.createElement("div");
      card.className = "task-card";
      card.addEventListener("click", () => openTaskModal(task));

      let dueHtml = "";
      if (task.due_date) {
        const due = new Date(task.due_date);
        const overdue = due < new Date() && task.status !== "done";
        dueHtml = `<span class="due-date ${overdue ? "overdue" : ""}">${due.toLocaleDateString()} ${due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>`;
      }

      card.innerHTML = `
        <h3>${escapeHtml(task.title)}</h3>
        ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}
        <div class="task-meta">
          <span class="badge priority-${task.priority}">${task.priority}</span>
          ${dueHtml}
        </div>
      `;
      list.appendChild(card);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------------- Task Modal ----------------

const modal = document.getElementById("taskModal");

document.getElementById("newTaskBtn").addEventListener("click", () => openTaskModal(null));
document.getElementById("cancelModalBtn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

function openTaskModal(task) {
  state.editingTaskId = task ? task.id : null;
  document.getElementById("modalTitle").textContent = task ? "Edit Task" : "New Task";
  document.getElementById("taskId").value = task ? task.id : "";
  document.getElementById("taskTitle").value = task ? task.title : "";
  document.getElementById("taskDescription").value = task ? task.description : "";
  document.getElementById("taskStatus").value = task ? task.status : "todo";
  document.getElementById("taskPriority").value = task ? task.priority : "medium";
  document.getElementById("taskDueDate").value = task && task.due_date
    ? new Date(task.due_date).toISOString().slice(0, 16)
    : "";
  document.getElementById("deleteTaskBtn").classList.toggle("hidden", !task);
  modal.classList.remove("hidden");
}

function closeModal() {
  modal.classList.add("hidden");
  state.editingTaskId = null;
}

document.getElementById("taskForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById("taskTitle").value.trim(),
    description: document.getElementById("taskDescription").value.trim(),
    status: document.getElementById("taskStatus").value,
    priority: document.getElementById("taskPriority").value,
    due_date: document.getElementById("taskDueDate").value
      ? new Date(document.getElementById("taskDueDate").value).toISOString()
      : null,
  };

  try {
    if (state.editingTaskId) {
      await apiFetch(`/tasks/${state.editingTaskId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/tasks", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    closeModal();
    await loadTasks();
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById("deleteTaskBtn").addEventListener("click", async () => {
  if (!state.editingTaskId) return;
  if (!confirm("Delete this task?")) return;
  try {
    await apiFetch(`/tasks/${state.editingTaskId}`, { method: "DELETE" });
    closeModal();
    await loadTasks();
  } catch (err) {
    showToast(err.message);
  }
});

// ---------------- Boot ----------------

if (state.token && state.user) {
  enterDashboard();
}
