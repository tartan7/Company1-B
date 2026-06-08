import http from 'http';

const services = [
  { name: 'faq-bot', port: 3001 },
  { name: 'invoice-generator-jp', port: 3002 },
  { name: 'seasonal-labor-scheduler', port: 3003 },
  { name: 'uptime-monitor', port: 3004 },
];

function createMockService(name, port) {
  const server = http.createServer((req, res) => {
    // Add artificial latency to simulate real service behavior
    const latency = Math.random() * 50 + 10; // 10-60ms

    setTimeout(() => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: name }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    }, latency);
  });

  server.on('error', (err) => {
    console.error(`❌ Error on ${name}:`, err.message);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`✅ ${name} mock service started on port ${port}`);
  });

  return server;
}

// Start all mock services
const servers = services.map(s => createMockService(s.name, s.port));

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('        MOCK SERVICES READY FOR PEAK LOAD TESTING');
console.log('═══════════════════════════════════════════════════════════════\n');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down mock services...');
  servers.forEach(server => server.close());
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nShutting down mock services...');
  servers.forEach(server => server.close());
  process.exit(0);
});
