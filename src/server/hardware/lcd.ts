import LCD from 'raspberrypi-liquid-crystal';
import dotenv from 'dotenv';
import { ILCDManager } from '../types/hardware';
dotenv.config({ path: '.env.local' });

const LCD_ROWS = 4;
const LCD_COLS = 20;
const LCD_PAGE_CYCLE_TIME = 20000; // 20 seconds

class LCDWrapper {
    private lcd: LCD | null = null;

    constructor() {
        if (process.env.MOCK_HARDWARE === 'true') {
            this.lcd = {
                clearSync: () => {},
                setCursor: (_col: number, _row: number) => {},
                printSync: (_text: string) => {},
                printLineSync: (_line: number, _text: string) => {},
            } as unknown as LCD;
            console.log('Mock LCD initialized');
        } else {
            this.lcd = new LCD(1, 0x27, LCD_COLS, LCD_ROWS);
            this.lcd.beginSync();
            this.lcd.clearSync();
            this.lcd.printLineSync(0, 'LCD Initialized');
            console.log('LCD initialized');
        }
    }

    getInstance(): LCD {
        if (!this.lcd) {
            throw new Error('LCD instance is not initialized.');
        }
        return this.lcd;
    }
}

const lcdWrapper = new LCDWrapper();
const lcdInstance = lcdWrapper.getInstance();

class LCDManager implements ILCDManager {
    private static instance: LCDManager;
    lcd: LCD;
    private pages: string[][] = [];
    private currentPageIndex: number = -1;

    private constructor() {
        try {
            this.lcd = lcdInstance;
            this.lcd.clearSync();
            this.getPage(0); // Ensure the first page is initialized
            this.startCycling();
            this.setPage(0);
        } catch (error) {
            console.error('Error initializing LCD Hardware, using mock instance', error);
            this.lcd = {
                clearSync: () => {},
                setCursor: (_col: number, _row: number) => {},
                printSync: (_text: string) => {},
            } as unknown as LCD;
        }
    }

    static getInstance(): LCDManager {
        if (!LCDManager.instance) {
            LCDManager.instance = new LCDManager();
        }
        return LCDManager.instance;
    }


    removePage(pageIndex: number): void {
        if (pageIndex < 0 || pageIndex >= this.pages.length) {
            console.log(`Invalid page index ${pageIndex}.`);
            return;
        }
        this.pages.splice(pageIndex, 1);
    }

    getPage(pageIndex: number): string[] | null {
        if (pageIndex < 0) {
            console.log(`Invalid page index ${pageIndex}.`);
            return null;
        }

        if (pageIndex >= this.pages.length) {
            while (this.pages.length <= pageIndex) {
                this.pages.push(new Array(LCD_ROWS).fill(''.padEnd(LCD_COLS, ' ')));
            }
        }

        return this.pages[pageIndex];
    }

    writeLine(pageIndex: number, lineIndex: number, text: string): void {
        const paddedText = text.padEnd(LCD_COLS, ' ');
        this.insertText(pageIndex, lineIndex, 0, paddedText); // Insert at the beginning
    }

    insertText(pageIndex: number, lineIndex: number, position: number, text: string): void {
        if (position < 0 || position >= LCD_COLS) {
            console.log('Invalid position.');
            return;
        }

        const page = this.getPage(pageIndex); // Ensure the page exists

        if (!page) {
            console.log(`Page ${pageIndex} does not exist.`);
            return;
        }

        if (lineIndex < 0 || lineIndex >= LCD_ROWS) {
            console.log(`Invalid line index ${lineIndex}.`);
            return;
        }

        const currentLine = page[lineIndex];
        const updatedLine = 
            (currentLine.slice(0, position) + 
            text + 
            currentLine.slice(position + text.length)).slice(0, LCD_COLS);

        if (currentLine === updatedLine) {
            return;
        }

        page[lineIndex] = updatedLine; // Update the page array

        // If the current page is being displayed, update the LCD
        if (pageIndex === this.currentPageIndex) {
            this.lcd.printLineSync(lineIndex, updatedLine);
            console.log(`Inserting text into LCD p${pageIndex}:l${lineIndex} '${updatedLine}'`);
        }
    }

    clearLine(pageIndex: number, lineIndex: number): void {
        this.writeLine(pageIndex, lineIndex, '');
    }

    startCycling(): void {
        setInterval(() => {
            if (this.pages.length === 0) return;
            const nextPage = (this.currentPageIndex + 1) % this.pages.length;
            if (this.currentPageIndex === nextPage) return;
            this.setPage(nextPage);
        }, LCD_PAGE_CYCLE_TIME);
    }

    private setPage(pageNum: number): void {
        if (pageNum < 0 || pageNum >= this.pages.length) {
            console.log('Cannot set page, invalid page number.');
            return;
        }
        this.currentPageIndex = pageNum;
        const page = this.pages[pageNum];
        console.log('Cycling to page:', pageNum, page);
        this.lcd.clearSync();
        page.forEach((line, index) => {
            this.lcd.printLineSync(index, line);
        });
    }
}

export default LCDManager.getInstance();