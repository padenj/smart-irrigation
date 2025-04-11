import { Duration, add } from 'date-fns';
import express from 'express';
import { remult } from 'remult';
import { SystemStatus } from '../shared/systemStatus.js';
import { remultExpress } from 'remult/remult-express';

const router = express.Router();
const api = remultExpress({
    entities: [SystemStatus],
  })

function countdownTimer(duration: Duration, onComplete: () => void) {
  
    const endTime = add(new Date(Date.now()), duration);
  
    const interval = setInterval(() => {
      const currentTime = new Date(Date.now());
      const remainingSeconds = Math.ceil((endTime.getTime() - currentTime.getTime()) / 1000);
  
      if (remainingSeconds <= 0) {
        clearInterval(interval);
        console.log('Countdown complete!');
        onComplete();
      } else {
        console.log(`Time remaining: ${remainingSeconds} seconds`);
      }
    }, 1000);
  }

  
// // GET /scheduler/run
// router.get('/run', async (req, res) => {
//     // Logic for running the scheduler
    
//     await api.withRemultAsync(req, async () => {
//         const repo = remult.repo(SystemStatus);

//         repo.findFirst().then((systemStatus) => {
//             if (systemStatus) {
//                 repo.update(0, { ...systemStatus, lastSchedulerRun: new Date() }).catch((error) => {
//                     console.error('Failed to update systemStatus:', error);
//                 });
//             } else {
//                 console.error('SystemStatus not found');
//             }
//         }).catch((error) => {
//             console.error('Failed to fetch systemStatus:', error);
//         });
//     });

//     res.status(200).json({ message: 'Scheduler run initiated successfully' });
// });

export default router;