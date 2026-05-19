import {repo} from 'remult';
import { ProgramDto } from '../dto/ProgramDto';
import { SystemSettingsDto } from '../dto/SystemSettingsDto';
import { SystemStatusDto } from '../dto/SystemStatusDto';

export const programRepository = repo(ProgramDto);
export const settingsRepository = repo(SystemSettingsDto);
export const systemStatusRepository = repo(SystemStatusDto);