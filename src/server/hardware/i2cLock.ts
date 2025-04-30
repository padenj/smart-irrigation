import { Mutex } from 'async-mutex';

export const i2cMutex = new Mutex();