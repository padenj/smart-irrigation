import LCD from 'raspberrypi-liquid-crystal';
import dotenv from 'dotenv';
import { ILCDManager } from '../types/hardware';
import { LCDSettings } from '../../shared/systemSettings';
import { i2cMutex } from './i2cLock';
dotenv.config({ path: '.env.local' });

const MOCK_LCD = {
    begin: async () => {},
    clear: async () => {},
    printLine: async (_line: number, _text: string) => {},
} as unknown as LCD;

class LCDManager implements ILCDManager {
    private static instance: LCDManager;
    private lcd: LCD;
    private maxColumns = 20;
    private maxRows = 4;
    private settings?: LCDSettings;
    isMocked: boolean;

    private constructor() {
        this.isMocked = process.env.MOCK_HARDWARE === 'true';
        this.lcd = MOCK_LCD;
    }

    public async initialize(settings: LCDSettings): Promise<void> {
        this.settings = settings;
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

                await i2cMutex.runExclusive(async () => {
                    if (this.lcd) {
                        await (this.lcd as any).close();
                    }
                    this.lcd = new LCD(
                        1,
                        address,
                        this.maxColumns,
                        this.maxRows
                    );
                    
                    await this.lcd.begin();
                    await this.lcd.clear();
                    await this.lcd.printLine(0, 'LCD Initialized');
                });
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
            console.log('LCD is not initialized');
            return;
        }
        try {
            await i2cMutex.runExclusive(async () => {
                await this.lcd.printLine(lineIndex, text);
            });
        } catch (error) {
            console.error(`Error writing to LCD: ${error instanceof Error ? error.message : error}`);
        // Try to re-initialize the LCD
             try {
                if (this.settings) {
                    await this.initialize(this.settings);
                    await i2cMutex.runExclusive(async () => {
                        await this.lcd.printLine(lineIndex, text);
                    });
                } else {
                    console.error('Cannot re-initialize LCD: settings are undefined');
                    this.lcd = MOCK_LCD;
                }
            } catch (reinitError) {
                console.error('Failed to re-initialize LCD:', reinitError);
                this.lcd = MOCK_LCD;
            }
        }
    }

    


}

export default await LCDManager.getInstance();