import { remultExpress } from "remult/remult-express";
import { Zone } from "../shared/zones.js";
import { SystemStatus } from "../shared/systemStatus.js";

export const api = remultExpress({
    entities: [Zone, SystemStatus],
});