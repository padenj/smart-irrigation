import { Entity, Fields, Validators } from "remult";

@Entity("zones", { allowApiCrud: true})
export class Zone {
    @Fields.autoIncrement()
    id=0;

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

    @Fields.number()
    gpioPort = 0;

    @Fields.boolean()
    isActive = false;
}

