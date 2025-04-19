import express from 'express';
import { api } from './databaseApi.js';
import fs from 'fs';
import cron from 'node-cron';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';

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

app.get('/api/version', (req, res) => {
  res.json({ version: appVersion });
});

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