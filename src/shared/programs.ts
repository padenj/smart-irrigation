

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

export type ProgramZoneDuration = {
    zoneId: string;
    duration: number;
}

export const ProgramRecurrenceType = {
    DAYS_OF_WEEK: "daysOfWeek",
    EVERY_N_DAYS: "everyNDays",
} as const;

export type ProgramRecurrenceType =
    typeof ProgramRecurrenceType[keyof typeof ProgramRecurrenceType];

export interface ProgramSchedule {
    id: string;
    startTime: string;
    isEnabled: boolean;
    recurrenceType: ProgramRecurrenceType;
    daysOfWeek: number[];
    intervalDays: number | null;
    lastScheduledRunTime: string | null;
    nextScheduledRunTime: string | null;
}

export interface Program {
    id: string;
    name: string;
    startTime?: string;
    endTime?: string;
    daysOfWeek?: number[];
    schedules: ProgramSchedule[];
    zones: ProgramZoneDuration[];
    isEnabled: boolean;
    nextScheduledRunTime: string | null;
    lastRunTime: string | null;
    skipUntil: string | null;
    conditions: ProgramCondition[];
}
