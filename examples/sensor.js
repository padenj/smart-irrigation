const rpio = require('rpio');

// ADS1115 I2C address (default is 0x48)
const ADS1115_ADDRESS = 0x48;

// Register addresses
const CONVERSION_REGISTER = 0x00;
const CONFIG_REGISTER = 0x01;

// Reference voltage (4.096V range for ADS1115)
const REF_VOLTAGE = 4.096;

// ADS1115 resolution (16-bit)
const ADC_RESOLUTION = 32768; // 2^15, accounting for signed integer

// Initialize I2C
rpio.i2cBegin();
rpio.i2cSetSlaveAddress(ADS1115_ADDRESS);
rpio.i2cSetBaudRate(100000); // 100 kHz

// Function to configure the ADS1115 and read a value from a specific channel
function readChannel(muxBits) {
    // Build the configuration based on the specified MUX bits (AIN0 or AIN1)
    const config = Buffer.from([
        0xC2 | muxBits, // MSB: Set MUX bits for the channel
        0x83 | 0x01           // LSB: 128 SPS, disable comparator
    ]);
    // Write configuration to the ADS1115
    rpio.i2cWrite(Buffer.from([CONFIG_REGISTER, ...config]));

    // Wait for conversion (if not in continuous mode)
    rpio.msleep(15); // Minimum conversion delay for 128 SPS

    // Read the conversion result
    const readBuffer = Buffer.alloc(2);
    rpio.i2cWrite(Buffer.from([CONVERSION_REGISTER])); // Point to the conversion register
    rpio.i2cRead(readBuffer, 2);

    // Convert the result to a 16-bit signed integer
    const rawValue = (readBuffer[0] << 8) | readBuffer[1];
    const value = rawValue > 0x7FFF ? rawValue - 0x10000 : rawValue;

    return value;
}

// Function to scale the raw ADC value to voltage
function scaleToVoltage(rawValue) {
    return (rawValue * REF_VOLTAGE) / ADC_RESOLUTION;
}

// Read values from AIN0 and AIN1 in a loop
function readLoop() {
    setInterval(() => {
        // Read from AIN0 (MUX = 0b100 = 0x00)
        const valueAIN0 = readChannel(0x00);
        const voltageAIN0 = scaleToVoltage(valueAIN0);
        console.log(`AIN0 - Raw: ${valueAIN0}, Voltage: ${voltageAIN0.toFixed(3)} V`);

        // Read from AIN1 (MUX = 0b101 = 0x10)
        ///const valueAIN1 = readChannel(0x10);
        //const voltageAIN1 = scaleToVoltage(valueAIN1);
        //console.log(`AIN1 - Raw: ${valueAIN1}, Voltage: ${voltageAIN1.toFixed(3)} V`);
    }, 5000); // Delay of 10 seconds
}

// Start the loop
readLoop();

// Clean up when the program is terminated
process.on('SIGINT', () => {
    console.log('Terminating the program...');
    rpio.i2cEnd();
    process.exit();
});