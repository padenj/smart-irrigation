import { Entity, Fields } from "remult";

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR';

export type LogSource =
    | 'system'
    | 'scheduler'
    | 'program'
    | 'zone'
    | 'relay'
    | 'health'
    | 'sensor'
    | 'weather'
    | 'display';

export type LogEventType =
    | 'program-start'
    | 'program-stop-requested'
    | 'program-stopped'
    | 'program-completed'
    | 'zone-start'
    | 'zone-stop-requested'
    | 'zone-stopped'
    | 'zone-divergence'
    | 'relay-on'
    | 'relay-off'
    | 'relay-reconciled'
    | 'health-anomaly'
    | 'health-summary'
    | 'system-init'
    | 'state-change';

export type LogDetails = Record<string, unknown>;

@Entity("systemLogs", {
    allowApiCrud: true
})
export class SystemLog {
    @Fields.uuid()
    id!: string;

    @Fields.string()
    message!: string;

    @Fields.string<SystemLog>({
        validate: (log) => {
            const validLevels = ["INFO", "WARNING", "ERROR"];
            if (!validLevels.includes(log.level)) {
                console.error(`Invalid log level: ${log.level}. Valid levels are: ${validLevels.join(", ")}`);
            }
        }
    })
    level!: LogLevel; // e.g., "INFO", "WARNING", "ERROR"

    @Fields.string<SystemLog>({
        allowNull: true,
    })
    source: LogSource | null = null;

    @Fields.string<SystemLog>({
        allowNull: true,
    })
    eventType: LogEventType | null = null;

    @Fields.json<SystemLog>()
    details: LogDetails | null = null;

    @Fields.boolean()
    highlight = false; // For highlighting in the UI
    
    @Fields.date()
    timestamp = new Date();
}