import * as std from 'fp-ts-std';

export const sleepTest= std.task.sleep(std.date.mkMilliseconds(3000));
