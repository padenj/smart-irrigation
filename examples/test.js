var Gpio = require('pigpio').Gpio; 
const PIN = 5
const led = new Gpio(PIN, {mode: Gpio.OUTPUT});
const i2c = require('i2c-bus')

const LCD = require('raspberrypi-liquid-crystal');
const ADS1115 = require('ads1115')

// Instantiate the LCD object on bus 1 address 3f with 16 chars width and 2 lines
const lcd = new LCD(1, 0x27, 20, 4);
// Init the lcd (must be done before calling any other methods)
lcd.beginSync();
// Clear any previously displayed content
lcd.clearSync();
// Display text multiline
lcd.printLineSync(0, 'hello');
lcd.printLineSync(1, 'world!');

i2c.openPromisified(1).then(async (bus) => {
  const ads1115 = await ADS1115(bus)
  // ads1115.gain = 1
 
  for (let i = 0; i < 100; i++) {
    let value = await ads1115.measure('0+GND')
    console.log(value)
    lcd.printLineSync(3, value.toString().padEnd(20, ' '));
    if (value < 10000) {
        lcd.printLineSync(2, "ON ");
        led.digitalWrite(0);
    }
    else {
        lcd.printLineSync(2, "OFF");
        led.digitalWrite(1);
    }
  }
    console.log('end')
    led.digitalWrite(1)
    // Close the bus when done
    await bus.close();

})

