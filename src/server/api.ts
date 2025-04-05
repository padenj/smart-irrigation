import { remultExpress } from "remult/remult-express";
import { Zone } from "../shared/zones";
import { SystemStatus } from "../shared/systemStatus";

export const api = remultExpress({
    entities: [Zone, SystemStatus],
});