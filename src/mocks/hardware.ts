// Mock hardware interface
export const mockHardware = {
  // GPIO control
  setPin: (pin: number, state: boolean) => {
    console.log(`Setting GPIO pin ${pin} to ${state ? 'HIGH' : 'LOW'}`);
    return Promise.resolve(true);
  },

  // I2C moisture sensor reading (0-100%)
  readMoisture: (sensor: number) => {
    return Promise.resolve(Math.floor(Math.random() * 100));
  },

  // LCD display
  updateLCD: (message: string[]) => {
    console.log('LCD Display Update:', message);
    return Promise.resolve(true);
  },
};