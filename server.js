const http = require('http');
const fs = require('fs');
const path = require('path');

const port = 3000;
const DATA_FILE = path.join(__dirname, 'tasks.json');
let tasks = [];
let nextId = 1;

function loadTasks() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      tasks = JSON.parse(fs.readFileSync(DATA_FILE));
      nextId = tasks.reduce((m, t) => Math.max(m, t.id), 0) + 1;
    } catch {
      tasks = [];
      nextId = 1;
    }
  }
}

function saveTasks() {
  fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), () => {});
}

function sendJSON(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => body += chunk.toString());
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      callback(null, data);
    } catch (e) {
      callback(e);
    }
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'GET' && url.pathname === '/tasks') {
    return sendJSON(res, tasks);
  }
  if (req.method === 'POST' && url.pathname === '/tasks') {
    return parseBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        return res.end('Invalid JSON');
      }
      const task = { id: nextId++, title: data.title || '', start: data.start || null, end: data.end || null, flexible: !!data.flexible };
      tasks.push(task);
      saveTasks();
      return sendJSON(res, task);
    });
  }
  if (req.method === 'PUT' && url.pathname.startsWith('/tasks/')) {
    const id = parseInt(url.pathname.split('/')[2]);
    return parseBody(req, (err, data) => {
      if (err) {
        res.writeHead(400);
        return res.end('Invalid JSON');
      }
      const task = tasks.find(t => t.id === id);
      if (!task) {
        res.writeHead(404); return res.end('Not found');
      }
      task.title = data.title ?? task.title;
      task.start = data.start ?? task.start;
      task.end = data.end ?? task.end;
      task.flexible = data.flexible ?? task.flexible;
      saveTasks();
      return sendJSON(res, task);
    });
  }
  if (req.method === 'DELETE' && url.pathname.startsWith('/tasks/')) {
    const id = parseInt(url.pathname.split('/')[2]);
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    return sendJSON(res, { success: true });
  }
  if (req.method === 'GET') {
    let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
    let ext = path.extname(filePath);
    const contentType = ext === '.css' ? 'text/css' : ext === '.js' ? 'application/javascript' : 'text/html';
    return serveFile(res, filePath, contentType);
  }
  res.writeHead(404);
  res.end('Not found');
});

loadTasks();
server.listen(port, () => console.log(`Server running on http://localhost:${port}`));
