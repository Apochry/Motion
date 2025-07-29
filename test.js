const http = require('http');
const assert = require('assert');
const { createServer } = require('./server');

const port = 4000;
const server = createServer();
server.listen(port, run);

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const opts = { port, path, method, headers: { 'Content-Type': 'application/json' }};
    const req = http.request(opts, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(body));
        resolve(body ? JSON.parse(body) : undefined);
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  try {
    const created = await request('POST', '/tasks', { title: 'Test Task', flexible: true });
    assert(created.id, 'created id');
    const list = await request('GET', '/tasks');
    assert(Array.isArray(list), 'list array');
    assert(list.find(t => t.id === created.id), 'created present');
    await request('DELETE', '/tasks/' + created.id);
    console.log('All tests passed');
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}


