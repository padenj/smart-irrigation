import LCD from 'raspberrypi-liquid-crystal';

class LCDManager {
    lcd: LCD;
    constructor() {
        this.lcd = new LCD(1, 0x27, 20, 4);
        this.lcd.begin();
        this.lcd.clearSync();
    }



}

export default new LCDManager();