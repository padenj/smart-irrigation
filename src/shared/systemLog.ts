import { Entity, Fields } from "remult";

@Entity("systemLogs", {
    allowApiCrud: true
})
export class SystemLog {
    @Fields.uuid()
    id!: string;

    @Fields.string()
    message!: string;

    @Fields.string({
        validate: (level) => {
            const validLevels = ["INFO", "WARNING", "ERROR"];
            if (!validLevels.includes(level as string)) {
                throw new Error(`Invalid log level: ${level}. Valid levels are: ${validLevels.join(", ")}`);
            }
        }
    })
    level!: 'INFO' | 'WARNING' | 'ERROR'; // e.g., "INFO", "WARNING", "ERROR"

    @Fields.date()
    timestamp = new Date();
}