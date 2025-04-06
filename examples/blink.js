var rpio = require('rpio'); //include onoff to interact with the GPIO
rpio.init({ mapping: 'gpio' })
const pin = 5
rpio.open(pin, rpio.OUTPUT, rpio.HIGH); //use GPIO pin 4, and specify that it is output
var blinkInterval = setInterval(blinkLED, 3000); //run the blinkLED function every 250ms

function blinkLED() { //function to start blinking
  if (rpio.read(pin) === 1) { //check the pin state, if the state is 0 (or off)
    rpio.write(pin, rpio.LOW); //set pin state to 1 (turn LED on)
  } else {
    rpio.write(pin, rpio.HIGH); //set pin state to 0 (turn LED off)
  }
}

function endBlink() { //function to stop blinking
  clearInterval(blinkInterval); // Stop blink intervals
  rpio.write(pin, rpio.HIGH); // Turn LED off
  //LED.unexport(); // Unexport GPIO to free resources
  rpio.exit();

}

setTimeout(endBlink, 10000); //stop blinking after 5 seconds