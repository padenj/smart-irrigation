import { Entity, Fields } from "remult";


export enum ConditionType {
    TEMPERATURE = "temperature",
    MOISTURE = "moisture",
}

export interface ProgramCondition {
    type: ConditionType; // Type of condition (e.g., "temperature", "time")
    value: number; // Value of the condition (e.g., "rain", "sunny")
    operator: ConditionOperator; // Operator for the condition (e.g., "==", "!=")
}

export type ConditionOperator = "=" | "!=" | ">" | "<" | ">=" | "<="

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

    @Fields.json()
    conditions: ProgramCondition[] = [];
}