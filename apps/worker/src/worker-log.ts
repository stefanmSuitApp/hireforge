import { writeLog, type LogFields, type LogLevel } from 'shared';

import { getWorkerCorrelationId } from './correlation-context';

/** Structured worker logs with correlation id when inside {@link runWithCorrelationId}. */
export function workerLog(
  level: LogLevel,
  msg: string,
  fields: LogFields = {},
): void {
  writeLog(level, msg, {
    ...fields,
    correlationId: getWorkerCorrelationId() ?? '',
  });
}
