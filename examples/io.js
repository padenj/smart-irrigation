var rpio = require('rpio'); //include onoff to interact with the GPIO

const pin = 5

const I2CDevices = {
    ADS1115: 0x48,
    LCD: 0x27,
}

class IO {
    constructor() {
        if (!IO.instance) {
            IO.instance = this;
            this.init();
        }
        return IO.instance;
    }
    init() {
        if (process.env.MOCK_GPIO) {
            console.log("MOCK_GPIO is enabled. Using mock GPIO.");
            rpio.init({ mapping: 'gpio', mock: 'raspi-3', gpiomem: false });
        } else {
            rpio.init({ mapping: 'gpio', gpiomem: false });
        }
        // Initialize I2C
        rpio.i2cBegin();
        rpio.i2cSetBaudRate(100000); // 100 kHz
        rpio.open(pin, rpio.OUTPUT, rpio.HIGH); //use GPIO pin 4, and specify that it is output

    }

    writeDevice(address, data) {
        rpio.i2cSetSlaveAddress(address);
        rpio.i2cWrite(data);
    }

    writeGPIO(pin, value) {
        if (value !== rpio.HIGH && value !== rpio.LOW) {
            throw new Error("Invalid GPIO value. Must be rpio.HIGH or rpio.LOW.");
        }
        rpio.write(pin, value);
        console.log(`GPIO Pin ${pin} set to ${value === rpio.HIGH ? 'HIGH' : 'LOW'}`);
    }

    writeLCD(row, text) {
        if (text.length > 16) {
            throw new Error("Text length exceeds 16 characters, which is the maximum for a single row.");
        }

        let rowOffset;
        switch (row) {
            case 0:
                rowOffset = 0x80; // LCD_LINE1
                break;
            case 1:
                rowOffset = 0xc0; // LCD_LINE2
                break;
            case 2:
                rowOffset = 0x94; // LCD_LINE3
                break;
            case 3:
                rowOffset = 0xd4; // LCD_LINE4
                break;
            default:
                throw new Error("Invalid LCD row. Must be between 0 and 3.");
        }

        // Initialize the LCD
        const initSequence = Buffer.from([0x03, 0x03, 0x03, 0x02, 0x28, 0x0c, 0x01, 0x06]);
        this.writeDevice(I2CDevice.LCD, initSequence);

        // Set the cursor to the specified row
        const rowCommand = Buffer.from([rowOffset]);
        this.writeDevice(I2CDevice.LCD, rowCommand);

        // Write the text to the LCD
        const paddedText = text.padEnd(16, ' '); // Pad the text to 16 characters
        const textBuffer = Buffer.from(paddedText, 'ascii');
        this.writeDevice(I2CDevice.LCD, textBuffer);
    }
}
    
const io = new IO();

// io.writeGPIO(pin, rpio.LOW);
// rpio.sleep(2)
// io.writeGPIO(pin, rpio.HIGH); 
io.writeLCD(0, "Hello World");
io.writeLCD(1, "This is a test");