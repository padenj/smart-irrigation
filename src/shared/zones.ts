import { Entity, Fields, Validators } from "remult";

export const ValidPorts = [4, 18, 17, 27, 22, 23, 24, 25, 5, 6, 13, 19, 26, 12, 16, 20, 21];

@Entity("zones", { allowApiCrud: true})
export class Zone {
    @Fields.uuid()
    id!: string;

    @Fields.string({
        validate: Validators.required
    })
    name = "";

    @Fields.boolean()
    enabled = false;

    @Fields.date()
    lastWatered: Date | null = null;

    @Fields.number()
    moistureLevel = 0; // 0-100%

    @Fields.number<Zone>({
        validate: (zone) => {
            if (!ValidPorts.includes(zone.gpioPort)) {
                console.error(`Invalid GPIO port. Must be one of: ${ValidPorts.join(", ")}`);
            }
        }
    })
    gpioPort = 0;
}

