import { remultExpress } from "remult/remult-express";
import { Zone } from "../shared/zones.js";
import { SystemStatus } from "../shared/systemStatus.js";
import { Program } from "../shared/programs.js";
import { SystemSettings } from "../shared/systemSettings.js";
import { DisplayController, SystemController } from "./systemController.js";
import RelayController from './relays'
import LCDManager from './lcd'

export const api = remultExpress({
    entities: [Zone, SystemStatus, Program, SystemSettings],
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
    controllers: [ SystemController ],
});

SystemController.relays = RelayController;
DisplayController.lcdManager = LCDManager;
console.log('Server Initialized');