const STORAGE_KEY = "offline-todo-list";
const THEME_STORAGE_KEY = "todo-theme-preference";
const FILTER_STORAGE_KEY = "todo-filter";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const todoList = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const remainingCount = document.querySelector("#remaining-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const formMessage = document.querySelector("#form-message");
const themeToggle = document.querySelector("#theme-toggle");
const themeIcon = document.querySelector(".theme-icon");
const themeLabel = document.querySelector(".theme-label");
const filterButtons = document.querySelectorAll(".filter-button");

let todos = loadTodos();
let currentFilter = loadFilter();

// 讀取待辦資料，若資料不存在就回傳空陣列。
function loadTodos() {
  try {
    const savedTodos = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedTodos) ? savedTodos : [];
  } catch {
    return [];
  }
}

// 儲存待辦資料，讓重新整理後資料仍存在。
function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

// 取得目前的系統深淺色設定，作為預設主題。
function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// 讀取使用者手動選擇的主題；若沒有手動儲存，就跟隨系統設定。
function loadTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return getSystemTheme();
}

// 依照主題設定更新 HTML 的 data-theme 以及按鈕文字。
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const isDarkMode = theme === "dark";

  if (themeIcon) {
    themeIcon.textContent = isDarkMode ? "☀️" : "🌙";
  }

  if (themeLabel) {
    themeLabel.textContent = isDarkMode ? "淺色模式" : "深色模式";
  }

  if (themeToggle) {
    themeToggle.setAttribute("aria-pressed", String(isDarkMode));
    themeToggle.setAttribute("aria-label", isDarkMode ? "切換為淺色模式" : "切換為深色模式");
  }
}

// 偵聽系統深淺色設定變更，只有在使用者未手動做出選擇時才同步。
function syncSystemThemeIfNeeded() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme !== null) {
    return;
  }

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const updateTheme = (event) => applyTheme(event.matches ? "dark" : "light");

  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", updateTheme);
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(updateTheme);
  }
}

// 儲存主題選擇，讓重新整理後維持使用者偏好。
function saveTheme(theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

// 讀取目前篩選狀態，預設為全部。
function loadFilter() {
  const savedFilter = localStorage.getItem(FILTER_STORAGE_KEY);
  return savedFilter === "active" || savedFilter === "completed" ? savedFilter : "all";
}

// 儲存篩選狀態，讓頁面重新整理後仍保留當前選擇。
function saveFilter(filter) {
  localStorage.setItem(FILTER_STORAGE_KEY, filter);
}

// 依照目前篩選條件回傳可顯示清單。
function getVisibleTodos() {
  if (currentFilter === "active") {
    return todos.filter((todo) => !todo.completed);
  }

  if (currentFilter === "completed") {
    return todos.filter((todo) => todo.completed);
  }

  return todos;
}

// 渲染清單與提示文字。未完成數字不受篩選影響。
function renderTodos() {
  todoList.replaceChildren();

  const visibleTodos = getVisibleTodos();

  visibleTodos.forEach((todo) => {
    const listItem = document.createElement("li");
    listItem.className = `todo-item${todo.completed ? " completed" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.className = "todo-check";
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `標記「${todo.text}」為${todo.completed ? "未完成" : "已完成"}`);
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    const text = document.createElement("span");
    text.className = "todo-text";
    text.textContent = todo.text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "刪除";
    deleteButton.setAttribute("aria-label", `刪除「${todo.text}」`);
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));

    listItem.append(checkbox, text, deleteButton);
    todoList.append(listItem);
  });

  const remainingTodos = todos.filter((todo) => !todo.completed).length;
  remainingCount.textContent = `未完成：${remainingTodos} 項`;

  const emptyMessages = {
    all: "還沒有任何待辦事項,新增一個吧!",
    active: "還沒有未完成的待辦事項",
    completed: "還沒有已完成的待辦事項",
  };

  emptyState.textContent = emptyMessages[currentFilter] || emptyMessages.all;
  emptyState.hidden = visibleTodos.length > 0;
  clearCompletedButton.hidden = !todos.some((todo) => todo.completed);

  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === currentFilter;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function addTodo(text) {
  todos.push({
    id: Date.now(),
    text,
    completed: false,
  });
  saveTodos();
  renderTodos();
}

function toggleTodo(id) {
  todos = todos.map((todo) => (
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  ));
  saveTodos();
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  saveTodos();
  renderTodos();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (!text) {
    formMessage.textContent = "請先輸入待辦內容。";
    input.focus();
    return;
  }

  formMessage.textContent = "";
  addTodo(text);
  form.reset();
  input.focus();
});

clearCompletedButton.addEventListener("click", () => {
  todos = todos.filter((todo) => !todo.completed);
  saveTodos();
  renderTodos();
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    saveFilter(currentFilter);
    renderTodos();
  });
});

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  saveTheme(nextTheme);
});

const initialTheme = loadTheme();
applyTheme(initialTheme);
syncSystemThemeIfNeeded();
renderTodos();
