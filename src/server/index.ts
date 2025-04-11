import express from 'express';
import { api } from './database.js';
import fs from 'fs';
import cron from 'node-cron';
import path from 'path';
import axios from 'axios';
import schedulerApi from './schedulerApi.js';
import { SystemStatus } from '../shared/systemStatus.js';
import { remult } from 'remult';
// import { runZone } from './scheduler';
// import {i2c} from './io';


const prepopulateData = async () => {
  const systemStatusRepo = remult.repo(SystemStatus);

  // Check if data already exists
  const systemStatusEntries = await systemStatusRepo.count();
  if (systemStatusEntries === 0) {
    // Insert initial data
    await systemStatusRepo.insert(new SystemStatus());
    console.log("Prepopulated system status in the database.");
  } else {
    console.log("System Status already exist in the database. Skipping prepopulation.");
  }
};

const port = 3000; // Ensure this matches the app.listen port

const app = express();
app.use(api);
//app.use('/api/scheduler', schedulerApi);

console.log(process.cwd());
app.use(express.static(process.cwd()+"/build/dist"));

const versionFilePath = path.join(process.cwd()+'/build/dist', 'version.txt');
const appVersion = fs.existsSync(versionFilePath) ? fs.readFileSync(versionFilePath, 'utf8').trim() : 'Unknown';
app.get('/api/version', (req, res) => {
  res.json({ version: appVersion });
});
app.listen(port, () => console.log(`Started ${appVersion} on port ${port}`));


// var i = i2c.init();
cron.schedule('*/15 * * * * *', () => {
  //console.log('running a task every 15 seconds');
  const baseUrl = `http://localhost:${port}`;
  axios.post(`${baseUrl}/api/scheduler/run`, {"args":[]})
    // .then(response => {
    //   console.log('Scheduler run response:', response.data);
    // })
    .catch(error => {
      console.error('Error calling scheduler run endpoint:', error.message);
    });
});

cron.schedule('0 0 * * *', async () => {
  console.log('Running daily task to recalculate all program schedules');
  try {
    const baseUrl = `http://localhost:${port}`;
    const response = await axios.post(`${baseUrl}/api/scheduler/recalculateAllSchedules`, {});
    console.log('Recalculation response:', response.data);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error during schedule recalculation:', error.message);
    } else {
      console.error('Error during schedule recalculation:', error);
    }
  }
});
// cron.schedule('*/5 * * * * *', () => {
//   //console.log('running a task every 5 seconds');
//   var adc = i.readADC(0);
//   i.writeLCD(0, "Hello World");
//   i.writeLCD(1, `ADC: ${adc.toFixed(4)} V`);
  
// });