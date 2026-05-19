

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


export interface Program {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    daysOfWeek: number[];
    zones: { zoneId: string; duration: number }[];
    isEnabled: boolean;
    nextScheduledRunTime: string | null;
    lastRunTime: string | null;
    skipUntil: string | null;
    conditions: ProgramCondition[];
}

