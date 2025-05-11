import express from 'express';
import { api } from './databaseApi.js';
import fs from 'fs';
import cron from 'node-cron';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { LogController } from './controllers/LogController.js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Retrieve UPDATE_FREQUENCY_MIN from environment variables or use default value
const UPDATE_FREQUENCY_MINUTES = parseInt(process.env.UPDATE_FREQUENCY_MINUTES || '5', 10);

const port = parseInt(process.env.PORT || '3000', 10); // Ensure this matches the app.listen port

const app = express();
app.use(api);

console.log(process.cwd());
app.use(express.static(process.cwd()+"/build/dist"));

const versionFilePath = path.join(process.cwd()+'/build/dist', 'version.txt');
const appVersion = fs.existsSync(versionFilePath) ? fs.readFileSync(versionFilePath, 'utf8').trim() : 'Unknown';

app.get('/api/logs', (req, res) => {
  // Adjust the unit name to match your systemd service (e.g., smart-irrigation.service)
  const lines = parseInt(req.query.lines as string) || 100;
  exec(`journalctl -u smart-irrigation.service -n ${lines} --no-pager --output=short`, (error, stdout, stderr) => {
    if (error) {
      res.status(500).send(`Error reading logs: ${stderr || error.message}`);
      return;
    }
    res.type('text/plain').send(stdout);
  });
});

app.post('/api/system/reboot', (req, res) => {
  console.log('Attempting to reboot server...');
  exec('sudo reboot', (error, stdout, stderr) => {
    if (error) {
      res.status(500).send(`Error rebooting server: ${stderr || error.message}`);
      console.error(`Error rebooting server: ${stderr || error.message}`);
      return;
    }
    console.log('Server is rebooting...');
    res.send('Server is rebooting...');
    LogController.writeLog('Server is rebooting...', 'INFO');
  });
});

app.post('/api/system/restart-app', (req, res) => {
  console.log('Attempting to restart app...');
  exec('sudo systemctl restart smart-irrigation', (error, stdout, stderr) => {
    if (error) {
      res.status(500).send(`Error restarting app: ${stderr || error.message}`);
      console.error(`Error restarting app: ${stderr || error.message}`);
      return;
    }
    console.log('App is restarting...');
    res.send('App is restarting...');
    LogController.writeLog('App is restarting...', 'INFO');
  });
});
app.get('/api/system/top', (req, res) => {
  exec('top -b -n 1', (error, stdout, stderr) => {
    if (error) {
      res.status(500).send(`Error executing top command: ${stderr || error.message}`);
      return;
    }
    res.type('text/plain').send(stdout);
  });
});


app.get('/api/wifi-signal', (req, res) => {
  exec("iwconfig 2>/dev/null | grep -i --color=none 'signal level'", (error, stdout) => {
    if (error) {
      res.status(500).json({ error: 'Could not read WiFi signal strength' });
      return;
    }
    // Example output: "Link Quality=70/70  Signal level=-40 dBm"
    const match = stdout.match(/Signal level=([-\d]+) dBm/);
    const signal = match ? parseInt(match[1], 10) : null;
    res.json({ signal });
  });
});

app.get('/api/version', (req, res) => {
  res.json({ version: appVersion });
});

// Catch-all: serve index.html for unmatched routes (SPA fallback)
if (process.env.NODE_ENV === 'production') {
  console.log('Production mode: Serving index.html for unmatched routes');

  const indexPath = path.join(process.cwd(), 'build/dist', 'index.html');
  app.get('/{*any}', (req, res) => {
    // If the request starts with /api, skip
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'API route not found' });
      return;
    }
    res.sendFile(indexPath);
  });
}


app.listen(port, () => console.log(`Started ${appVersion} on port ${port}`));

// Run the system initialization
await axios.post(`http://localhost:${port}/api/system/init`, {"args":[]})
  .catch(error => {
    console.error('Error initializing scheduler:', error.message);
  });

// Set up the 15 second system scheduler cron job
cron.schedule('*/15 * * * * *', () => {
  //console.log('running a task every 15 seconds');
  axios.post(`${`http://localhost:${port}`}/api/system/run`, {"args":[]})
    .catch(error => {
      console.error('Error calling scheduler run endpoint:', error.message);
    });
});

// Set up the daily system refresh job
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily task to refresh the system');
  axios.post(`${`http://localhost:${port}`}/api/system/daily`, {"args":[]})
    .catch(error => {
      console.error('Error during daily task:', error.message);
    });
    
});

// Set up the weather and statistics update cron job
cron.schedule(`*/${UPDATE_FREQUENCY_MINUTES} * * * *`, async () => {
  //console.log(`Running ${UPDATE_FREQUENCY_MINUTES}-minute task to update weather and statistics`);
  axios.post(`${`http://localhost:${port}`}/api/system/update`, {"args":[]})
    .catch(error => {
      console.error('Error during 5-minute update task:', error.message);
    });
});