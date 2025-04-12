declare module 'ads1115' {
    export default function ADS1115(bus: any, address: number): Promise<any>;
}