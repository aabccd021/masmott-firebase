import * as std from 'fp-ts-std';

export const sleepTest = (ms: number) => std.task.sleep(std.date.mkMilliseconds(ms));
