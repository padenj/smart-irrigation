import express from 'express';
import { api } from './api';

const app = express();
app.use(api);
app.get('/api/hi', (req, res) => {
    res.send('hello');
  });
app.use(express.static(process.cwd()+"/dist"));
app.listen(3000, () => console.log("Started"));
