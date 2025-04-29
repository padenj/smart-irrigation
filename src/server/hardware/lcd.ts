import LCD from 'raspberrypi-liquid-crystal';
import dotenv from 'dotenv';
import { ILCDManager } from '../types/hardware';
import { LCDSettings } from '../../shared/systemSettings';
dotenv.config({ path: '.env.local' });

const MOCK_LCD = {
    clearSync: () => {},
    setCursor: (_col: number, _row: number) => {},
    printSync: (_text: string) => {},
    printLineSync: (_line: number, _text: string) => {},
} as unknown as LCD;

class LCDManager implements ILCDManager {
    private static instance: LCDManager;
    private lcd: LCD;
    private maxColumns = 20;
    private maxRows = 4;

    isMocked: boolean;

    private constructor() {
        this.isMocked = process.env.MOCK_HARDWARE === 'true';
        this.lcd = MOCK_LCD;
    }

    public async initialize(settings: LCDSettings): Promise<void> {
        
        if (this.isMocked) {
            this.lcd = MOCK_LCD;
            console.log('Mock LCD initialized');
        } else {
            try {
                const address = settings.i2cAddress;
                
                if (address < 0x20 || address > 0x27) {
                    console.error(`Invalid I2C address: ${address}. Must be between 0x20 and 0x27.`);
                    return;
                }

                this.maxColumns = settings.cols ?? 20;
                this.maxRows = settings.rows ?? 4;

                this.lcd = new LCD(
                    1,
                    address,
                    this.maxColumns,
                    this.maxRows
                );
                
                this.lcd.beginSync();
                this.lcd.clearSync();
                this.lcd.printLineSync(0, 'LCD Initialized');
                console.log('LCD initialized');
            } catch (error) {
                if (error instanceof Error) {
                   console.log('Error initializing LCD: ' + error.message);
                } else {
                    console.log('Error initializing LCD: Unknown error');
                }
                this.lcd = MOCK_LCD;
                console.log('Falling back to Mock LCD');
            }
        }

        // this.getPage(0); // Ensure the first page is initialized
        // this.startCycling();
        // this.setPage(0);
        
    }

    public static async getInstance(): Promise<LCDManager> {
        if (!LCDManager.instance) {
            LCDManager.instance = new LCDManager();
        }
        return LCDManager.instance;
    }

    async writeLine(lineIndex: number, text: string): Promise<void> {
        if (!this.lcd) {
            throw new Error('LCD is not initialized');
        }
        try {
            await this.lcd.printLine(lineIndex, text);
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Error writing to LCD: ${error.message}`);
            } else {
                console.error('Unknown error writing to LCD');
            }
        }
    }

    


}

export default await LCDManager.getInstance();