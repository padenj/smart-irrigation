import { Entity, Fields } from "remult";

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
    level!: 'INFO' | 'WARNING' | 'ERROR'; // e.g., "INFO", "WARNING", "ERROR"

    @Fields.date()
    timestamp = new Date();
}