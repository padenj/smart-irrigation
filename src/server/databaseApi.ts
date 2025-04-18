import { remultExpress } from "remult/remult-express";
import { Zone } from "../shared/zones.js";
import { SystemStatus } from "../shared/systemStatus.js";
import { Program } from "../shared/programs.js";
import { SystemSettings } from "../shared/systemSettings.js";
import { SystemController } from "./controllers/SystemController.js";
import { ZoneController } from './controllers/ZoneController.js';
import { ProgramController } from './controllers/ProgramController.js';
import { DisplayController } from './controllers/DisplayController.js';
import RelayController from './hardware/relays.js'
import LCDManager from './hardware/lcd.js'
import { SystemLog } from "../shared/systemLog.js";
import { LogController } from "./controllers/LogController.js";

export const api = remultExpress({
    entities: [Zone, SystemStatus, Program, SystemSettings, SystemLog],
    initApi: async (remult) => {
        const systemStatusRepo = remult.repo(SystemStatus);
        const systemSettingsRepo = remult.repo(SystemSettings);
        const systemSettings = await systemSettingsRepo.findFirst();
        if (!systemSettings) {
            await systemSettingsRepo.insert(new SystemSettings());
        }
        const systemStatus = await systemStatusRepo.findFirst();
        if (!systemStatus) {
            await systemStatusRepo.insert(new SystemStatus());
        }
    },
    controllers: [ SystemController, ZoneController, ProgramController, LogController ],
});

ZoneController.relays = RelayController;
DisplayController.lcdManager = LCDManager;
console.log('Server Initialized');