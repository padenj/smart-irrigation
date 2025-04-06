import express from 'express';
import { api } from './api';
import cron from 'node-cron';
import { runZone } from './scheduler';
import {i2c} from './io';

const app = express();
app.use(api);
app.get('/api/hi', (req, res) => {
    res.send('hello');
  });
app.use(express.static(process.cwd()+"/dist"));
app.listen(3000, () => console.log("Started"));


var i = i2c.init();
cron.schedule('*/15 * * * * *', () => {
  //console.log('running a task every 15 seconds');
  runZone(5, 10, i);
});

cron.schedule('*/5 * * * * *', () => {
  //console.log('running a task every 5 seconds');
  var adc = i.readADC(0);
  i.writeLCD(0, "Hello World");
  i.writeLCD(1, `ADC: ${adc.toFixed(4)} V`);
  
});