async function fetchTasks() {
  const res = await fetch('/tasks');
  return res.json();
}

async function createTask(task) {
  await fetch('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
}

async function updateTask(id, task) {
  await fetch(`/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task)
  });
}

function renderCalendar(tasks) {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  for (let i = 0; i < 7 * 24; i++) {
    const div = document.createElement('div');
    div.className = 'time-slot';
    div.dataset.day = Math.floor(i / 24);
    div.dataset.hour = i % 24;
    cal.appendChild(div);
  }
  tasks.filter(t => t.start && t.end).forEach(t => {
    const start = new Date(t.start);
    const end = new Date(t.end);
    const day = start.getDay();
    const hour = start.getHours();
    const durationHours = (end - start) / (1000 * 60 * 60);
    const slot = cal.querySelector(`.time-slot[data-day="${day}"][data-hour="${hour}"]`);
    if (slot) {
      const taskDiv = document.createElement('div');
      taskDiv.className = 'task';
      taskDiv.style.height = (durationHours * 60 - 2) + 'px';
      taskDiv.style.top = '0';
      taskDiv.textContent = t.title;
      slot.appendChild(taskDiv);
    }
  });
  const flexList = document.getElementById('flexible-list');
  flexList.innerHTML = '';
  tasks.filter(t => t.flexible || !t.start).forEach(t => {
    const li = document.createElement('li');
    li.textContent = t.title;
    li.onclick = async () => {
      const start = prompt('Start time (YYYY-MM-DDTHH:MM)');
      const end = prompt('End time (YYYY-MM-DDTHH:MM)');
      if (start && end) {
        await updateTask(t.id, { start, end, flexible: false });
        load();
      }
    };
    flexList.appendChild(li);
  });
}

async function load() {
  const tasks = await fetchTasks();
  renderCalendar(tasks);
}

document.getElementById('add-task').onclick = async () => {
  const title = document.getElementById('title').value;
  const flexible = document.getElementById('flexible').checked;
  const start = document.getElementById('start').value;
  const end = document.getElementById('end').value;
  await createTask({ title, flexible, start: start || null, end: end || null });
  document.getElementById('title').value = '';
  document.getElementById('start').value = '';
  document.getElementById('end').value = '';
  document.getElementById('flexible').checked = false;
  load();
};

load();
