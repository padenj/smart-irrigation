export interface IRelayController {
    turnOn(pin: number): void;
    turnOff(pin: number): void;
    dispose(): void;
}

export interface ILCDManager {
    writeLine(pageIndex: number, lineIndex: number, text: string): void;
    insertText(pageIndex: number, lineIndex: number, position: number, text: string): void;
    clearLine(pageIndex: number, lineIndex: number): void;
}

export interface ISensorController {

}