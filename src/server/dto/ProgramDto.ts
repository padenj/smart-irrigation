import { Entity, Fields } from "remult";
import { Program, ProgramCondition } from "../../shared/programs";


@Entity("programs", {
    allowApiCrud: true,
})
export class ProgramDto implements Program {
    @Fields.uuid()
    id!: string;

    @Fields.string()
    name!: string;

    @Fields.string()
    startTime!: string; // Format: HH:mm

    // Format: HH:mm
    @Fields.string()
    endTime!: string; // Format: HH:mm

    // Format: HH:mm
    @Fields.json()
    daysOfWeek!: number[]; // Sunday = 0

    // Sunday = 0
    @Fields.object()
    zones!: { zoneId: string; duration: number; }[]; // Example: [{ zoneId: "zone1", duration: 30 }]

    // Example: [{ zoneId: "zone1", duration: 30 }]
    @Fields.boolean()
    isEnabled!: boolean;

    @Fields.string()
    nextScheduledRunTime: string | null = null; // Format: YYYY-MM-DDTHH:mm:ss.sssZ

    // Format: YYYY-MM-DDTHH:mm:ss.sssZ
    @Fields.string()
    lastRunTime: string | null = null; // Format: YYYY-MM-DDTHH:mm:ss.sssZ

    // Format: YYYY-MM-DDTHH:mm:ss.sssZ
    @Fields.string()
    skipUntil: string | null = null; // Format: YYYY-MM-DDTHH:mm:ss.sssZ

    // Format: YYYY-MM-DDTHH:mm:ss.sssZ
    @Fields.json()
    conditions: ProgramCondition[] = [];
}
