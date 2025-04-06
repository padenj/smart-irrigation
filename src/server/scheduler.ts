import { add, Duration } from "date-fns";
import { I2CInterface } from "./io";
import rpio from "rpio";
// import schedule from "node-schedule";
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


// Schedule a task or run immediately
// const scheduleTime = new Date(Date.now() + 10 * 1000); // 10 seconds from now
// schedule.scheduleJob(scheduleTime, () => runTask(scheduleTime.getTime()));

// Or run on demand


export const runZone = async (zoneId: number, seconds: number, i: I2CInterface) => {
    console.log(`Running zone ${zoneId}...`);
    i.writeGPIO(zoneId, rpio.LOW); // Turn on the GPIO pin
    
    countdownTimer({ seconds }, () => {
        console.log(`Running ${zoneId} cleanup script...`);
        i.writeGPIO(zoneId, rpio.HIGH); // Turn off the GPIO pin
      }); 
}

