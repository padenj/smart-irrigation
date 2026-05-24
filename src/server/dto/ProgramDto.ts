import { Entity, Fields } from "remult";
import {
    Program,
    ProgramCondition,
    ProgramSchedule,
    ProgramZoneDuration,
} from "../../shared/programs";


@Entity("programs", {
    allowApiCrud: true,
})
export class ProgramDto implements Program {
    @Fields.uuid()
    id!: string;

    @Fields.string()
    name!: string;

    @Fields.string()
    startTime = ""; // Format: HH:mm

    // Format: HH:mm
    @Fields.string()
    endTime = ""; // Format: HH:mm

    // Format: HH:mm
    @Fields.json()
    daysOfWeek: number[] = []; // Sunday = 0

    @Fields.json()
    schedules: ProgramSchedule[] = [];

    // Sunday = 0
    @Fields.object()
    zones!: ProgramZoneDuration[]; // Example: [{ zoneId: "zone1", duration: 30 }]

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
