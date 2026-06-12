import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get local network IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4 support (handles both Node v18+ family string/number differences)
      const isIPv4 = iface.family === 'IPv4' || iface.family === 4;
      if (isIPv4 && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Serve static frontend assets
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// API Endpoint to expose local network IP
app.get('/api/local-ip', (req, res) => {
  res.json({ ip: getLocalIp(), port: process.env.PORT || 5000 });
});

// Wildcard client router for Single Page Application
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Queue Cure static server listening on port ${PORT}`);
  console.log(`Local LAN access: http://${getLocalIp()}:${PORT}`);
});
