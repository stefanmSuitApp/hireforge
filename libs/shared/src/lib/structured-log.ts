export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogFields = Record<
  string,
  string | number | boolean | null | undefined
>;

/**
 * One JSON line per event (stdout). Use from API, worker, and scripts for grep-friendly logs.
 */
export function writeLog(
  level: LogLevel,
  msg: string,
  fields: LogFields = {},
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}
