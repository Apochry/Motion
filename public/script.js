// Simple weekly planner with drag and drop scheduling
let tasks = [];

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

async function deleteTask(id) {
  await fetch(`/tasks/${id}`, { method: 'DELETE' });
}

function buildCalendar() {
  const cal = document.getElementById('calendar');
  cal.innerHTML = '';
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  // headers
  for (let i=0;i<7;i++) {
    const d = document.createElement('div');
    d.className = 'day-header';
    d.textContent = days[i];
    d.style.gridColumn = i + 2;
    d.style.gridRow = 1;
    cal.appendChild(d);
  }
  // time labels and cells
  for (let h=0; h<24; h++) {
    const label = document.createElement('div');
    label.className = 'time-label';
    label.textContent = `${String(h).padStart(2,'0')}:00`;
    label.style.gridColumn = 1;
    label.style.gridRow = h + 2;
    cal.appendChild(label);
    for (let d=0; d<7; d++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.day = d;
      cell.dataset.hour = h;
      cell.style.gridColumn = d + 2;
      cell.style.gridRow = h + 2;
      cell.ondragover = e => e.preventDefault();
      cell.ondrop = handleDrop;
      cal.appendChild(cell);
    }
  }
}

function renderTasks() {
  const cal = document.getElementById('calendar');
  // remove old task elements
  cal.querySelectorAll('.task').forEach(t => t.remove());
  const flexList = document.getElementById('flexible-list');
  flexList.innerHTML = '';

  tasks.forEach(t => {
    if (t.start && t.end && !t.flexible) {
      const start = new Date(t.start);
      const end = new Date(t.end);
      const day = start.getDay();
      const duration = (end - start) / (1000*60*60);
      const div = document.createElement('div');
      div.className = 'task';
      div.textContent = t.title;
      div.draggable = true;
      div.dataset.id = t.id;
      div.style.gridColumn = day + 2;
      div.style.gridRow = `${start.getHours()+2} / span ${duration}`;
      div.ondragstart = e => e.dataTransfer.setData('text/plain', t.id);
      div.onclick = async () => {
        if (confirm('Delete task?')) {
          await deleteTask(t.id);
          load();
        }
      };
      cal.appendChild(div);
    } else {
      const li = document.createElement('li');
      li.textContent = t.title;
      li.draggable = true;
      li.dataset.id = t.id;
      li.ondragstart = e => e.dataTransfer.setData('text/plain', t.id);
      li.onclick = async () => {
        if (confirm('Delete task?')) {
          await deleteTask(t.id);
          load();
        }
      };
      flexList.appendChild(li);
    }
  });
}

function handleDrop(e) {
  e.preventDefault();
  const id = parseInt(e.dataTransfer.getData('text/plain'));
  const day = parseInt(this.dataset.day);
  const hour = parseInt(this.dataset.hour);
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const start = new Date();
  start.setDate(start.getDate() - start.getDay() + day);
  start.setHours(hour,0,0,0);
  const duration = task.start && task.end ?
        (new Date(task.end) - new Date(task.start))/(1000*60*60) :
        parseInt(document.getElementById('duration').value) || 1;
  const end = new Date(start);
  end.setHours(start.getHours() + duration);
  updateTask(id, { start: start.toISOString(), end: end.toISOString(), flexible: false }).then(load);
}

async function load() {
  tasks = await fetchTasks();
  renderTasks();
}

document.getElementById('add-task').onclick = async () => {
  const title = document.getElementById('title').value.trim();
  const duration = parseInt(document.getElementById('duration').value) || 1;
  const flexible = document.getElementById('flexible').checked;
  const startVal = document.getElementById('start').value;
  let start = startVal || null;
  let end = null;
  if (startVal) {
    const s = new Date(startVal);
    const e = new Date(s);
    e.setHours(s.getHours() + duration);
    end = e.toISOString();
    start = s.toISOString();
  }
  await createTask({ title, start, end, flexible });
  document.getElementById('title').value = '';
  document.getElementById('duration').value = '1';
  document.getElementById('start').value = '';
  document.getElementById('flexible').checked = false;
  load();
};

buildCalendar();
load();
