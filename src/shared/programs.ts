import { Files } from "lucide-react";
import { Entity, Fields } from "remult";

@Entity("programs", {
    allowApiCrud: true,
})
export class Program {
    @Fields.uuid()
    id!: string;

    @Fields.string()
    name!: string;

    @Fields.string()
    startTime!: string; // Format: HH:mm

    @Fields.string()
    endTime!: string; // Format: HH:mm

    @Fields.json()
    daysOfWeek!: number[]; // Sunday = 0

    @Fields.object()
    zones!: { zoneId: string; duration: number }[]; // Example: [{ zoneId: "zone1", duration: 30 }]

    @Fields.boolean()
    isEnabled!: boolean;

    @Fields.string()
    nextScheduledRunTime: string | null = null; // Format: YYYY-MM-DDTHH:mm:ss.sssZ

    @Fields.string()
    lastRunTime: string | null = null; // Format: YYYY-MM-DDTHH:mm:ss.sssZ
}