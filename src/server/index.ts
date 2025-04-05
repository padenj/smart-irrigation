import express from 'express';
import { api } from './api';
import cron from 'node-cron';
import { runZone } from './scheduler';

const app = express();
app.use(api);
app.get('/api/hi', (req, res) => {
    res.send('hello');
  });
app.use(express.static(process.cwd()+"/dist"));
app.listen(3000, () => console.log("Started"));


cron.schedule('*/30 * * * * *', () => {
  //console.log('running a task every 30 seconds');
  runZone(5, 10);
});