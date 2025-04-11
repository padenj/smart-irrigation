import LCD from 'raspberrypi-liquid-crystal';
import dotenv from 'dotenv';
import { ILCDManager } from './hardwareControllers';
dotenv.config({ path: '.env.local' });

class LCDWrapper {
    private lcd: LCD | null = null;

    constructor() {
        if (process.env.MOCK_HARDWARE === 'true') {
            this.lcd = {
                beginSync: () => console.log('Mock LCD begin'),
                clearSync: () => {},
                setCursor: (col: number, row: number) => {},
                printSync: (text: string) => {},
            } as unknown as LCD;
        } else {
            this.lcd = new LCD(1, 0x27, 20, 4);
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
            this.lcd.beginSync();
            this.lcd.clearSync();
            this.getPage(0); // Ensure the first page is initialized
            this.startCycling();
            this.setPage(0);
        } catch (error) {
            console.error('Error initializing LCD Hardware, using mock instance', error);
            this.lcd = {
                beginSync: () => {},
                clearSync: () => {},
                setCursor: (col: number, row: number) => {},
                printSync: (text: string) => {},
            } as unknown as LCD;
        }
    }

    static getInstance(): LCDManager {
        if (!LCDManager.instance) {
            LCDManager.instance = new LCDManager();
        }
        return LCDManager.instance;
    }

    addPage(page: string[]): void {
        if (page.length !== 4 || page.some(line => line.length > 40)) {
            console.log('Each page must have exactly 4 lines, each with a maximum of 40 characters.');
            return;
        }
        this.pages.push(page);
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
                this.pages.push([''.padEnd(40, ' '), ''.padEnd(40, ' '), ''.padEnd(40, ' '), ''.padEnd(40, ' ')]);
            }
        }

        return this.pages[pageIndex];
    }

    writeLine(pageIndex: number, lineIndex: number, text: string): void {
        const paddedText = text.padEnd(40, ' ');
        this.insertText(pageIndex, lineIndex, 0, paddedText); // Insert at the beginning
    }

    insertText(pageIndex: number, lineIndex: number, position: number, text: string): void {
        if (position < 0 || position >= 40) {
            console.log('Invalid position.');
            return;
        }

        const page = this.getPage(pageIndex); // Ensure the page exists

        if (!page) {
            console.log(`Page ${pageIndex} does not exist.`);
            return;
        }

        if (lineIndex < 0 || lineIndex >= 4) {
            console.log(`Invalid line index ${lineIndex}.`);
            return;
        }

        const currentLine = page[lineIndex];
        const updatedLine = 
            (currentLine.slice(0, position) + 
            text + 
            currentLine.slice(position + text.length)).slice(0, 40);

        if (currentLine === updatedLine) {
            return;
        }

        page[lineIndex] = updatedLine; // Update the page array

        // If the current page is being displayed, update the LCD
        if (pageIndex === this.currentPageIndex) {
            this.lcd.setCursor(0, lineIndex);
            this.lcd.printSync(updatedLine);
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
        }, 20000);
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
            this.lcd.setCursor(0, index);
            this.lcd.printSync(line);
        });
    }
}

export default LCDManager.getInstance();