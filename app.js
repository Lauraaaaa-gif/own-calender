const STORAGE_KEY = "personal-calendar-events-v1";

const monthLabel = document.querySelector("#monthLabel");
const monthSummary = document.querySelector("#monthSummary");
const calendarGrid = document.querySelector("#calendarGrid");
const selectedDateLabel = document.querySelector("#selectedDateLabel");
const selectedCount = document.querySelector("#selectedCount");
const eventList = document.querySelector("#eventList");
const eventForm = document.querySelector("#eventForm");
const editingId = document.querySelector("#editingId");
const eventTitle = document.querySelector("#eventTitle");
const eventTime = document.querySelector("#eventTime");
const eventCategory = document.querySelector("#eventCategory");
const eventNotes = document.querySelector("#eventNotes");
const formTitle = document.querySelector("#formTitle");
const saveButton = document.querySelector("#saveButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const eventTemplate = document.querySelector("#eventTemplate");

const today = new Date();
let visibleDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = toDateKey(today);
let events = loadEvents();

document.querySelector("#prevMonth").addEventListener("click", () => changeMonth(-1));
document.querySelector("#nextMonth").addEventListener("click", () => changeMonth(1));
document.querySelector("#todayButton").addEventListener("click", goToday);
document.querySelector("#exportButton").addEventListener("click", exportBackup);
cancelEditButton.addEventListener("click", resetForm);
eventForm.addEventListener("submit", saveEvent);

render();

function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function persistEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function changeMonth(offset) {
  visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + offset, 1);
  render();
}

function goToday() {
  visibleDate = new Date(today.getFullYear(), today.getMonth(), 1);
  selectedDate = toDateKey(today);
  resetForm();
  render();
}

function render() {
  renderMonthHeader();
  renderCalendar();
  renderDetails();
}

function renderMonthHeader() {
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth() + 1;
  const monthEvents = events.filter((event) => event.date.startsWith(`${year}-${pad(month)}-`));
  monthLabel.textContent = `${year} 年 ${month} 月`;
  monthSummary.textContent = `${monthEvents.length} 筆活動`;
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const gridStart = new Date(year, month, 1 - startDay);

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const dateKey = toDateKey(cellDate);
    const dayEvents = getEventsForDate(dateKey);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.setAttribute("aria-label", `${formatFullDate(dateKey)}，${dayEvents.length} 筆活動`);
    if (cellDate.getMonth() !== month) button.classList.add("is-muted");
    if (dateKey === toDateKey(today)) button.classList.add("is-today");
    if (dateKey === selectedDate) button.classList.add("is-selected");

    button.innerHTML = `
      <span class="day-number">
        <span>${cellDate.getDate()}</span>
        ${dayEvents.length ? `<span class="event-badge">${dayEvents.length}</span>` : ""}
      </span>
      <span class="day-preview"></span>
    `;

    const preview = button.querySelector(".day-preview");
    dayEvents.slice(0, 3).forEach((event) => {
      const line = document.createElement("span");
      line.className = "preview-line";
      line.textContent = `${event.time || "全天"} ${event.title}`;
      preview.append(line);
    });

    button.addEventListener("click", () => {
      selectedDate = dateKey;
      if (cellDate.getMonth() !== visibleDate.getMonth()) {
        visibleDate = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
      }
      resetForm();
      render();
    });

    calendarGrid.append(button);
  }
}

function renderDetails() {
  const dayEvents = getEventsForDate(selectedDate);
  selectedDateLabel.textContent = formatFullDate(selectedDate);
  selectedCount.textContent = `${dayEvents.length} 筆`;
  eventList.innerHTML = "";

  if (!dayEvents.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "這一天還沒有活動。";
    eventList.append(empty);
    return;
  }

  dayEvents.forEach((event) => {
    const node = eventTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.category = event.category;
    node.querySelector(".event-meta").textContent = `${event.time || "全天"} · ${event.category}`;
    node.querySelector("h4").textContent = event.title;
    node.querySelector("p").textContent = event.notes || "沒有填寫詳細內容。";
    node.querySelector(".edit-event").addEventListener("click", () => editEvent(event.id));
    node.querySelector(".delete-event").addEventListener("click", () => deleteEvent(event.id));
    eventList.append(node);
  });
}

function saveEvent(event) {
  event.preventDefault();
  const title = eventTitle.value.trim();
  if (!title) return;

  const payload = {
    id: editingId.value || createId(),
    date: selectedDate,
    title,
    time: eventTime.value,
    category: eventCategory.value,
    notes: eventNotes.value.trim(),
    updatedAt: new Date().toISOString(),
  };

  if (editingId.value) {
    events = events.map((item) => (item.id === editingId.value ? payload : item));
  } else {
    events.push(payload);
  }

  persistEvents();
  resetForm();
  render();
}

function editEvent(id) {
  const event = events.find((item) => item.id === id);
  if (!event) return;
  editingId.value = event.id;
  eventTitle.value = event.title;
  eventTime.value = event.time;
  eventCategory.value = event.category;
  eventNotes.value = event.notes;
  formTitle.textContent = "編輯活動";
  saveButton.textContent = "更新活動";
  cancelEditButton.hidden = false;
  eventTitle.focus();
}

function deleteEvent(id) {
  const event = events.find((item) => item.id === id);
  if (!event) return;
  const ok = window.confirm(`確定要刪除「${event.title}」嗎？`);
  if (!ok) return;
  events = events.filter((item) => item.id !== id);
  persistEvents();
  resetForm();
  render();
}

function resetForm() {
  editingId.value = "";
  eventForm.reset();
  eventCategory.value = "生活";
  formTitle.textContent = "新增活動";
  saveButton.textContent = "儲存活動";
  cancelEditButton.hidden = true;
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `自用日曆備份-${toDateKey(new Date())}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `event-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getEventsForDate(dateKey) {
  return events
    .filter((event) => event.date === dateKey)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatFullDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
  return `${year} 年 ${month} 月 ${day} 日 ${weekday}`;
}
