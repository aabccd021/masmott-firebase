import { task, taskEither } from 'fp-ts';
import { flow } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import * as fs from 'fs/promises';

import type { Stack } from '../type';

const getStorageRule = (allow: boolean) => `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if ${allow.toString()};
    }
  }
}
`;

export const deployStorage: Stack['ci']['deployStorage'] = flow(
  (c) => () =>
    fs.writeFile('storage.rules', getStorageRule(c.securityRule?.type === 'allowAll'), {
      encoding: 'utf8',
    }),
  task.chainFirst(() => std.task.sleep(std.date.mkMilliseconds(250))),
  taskEither.fromTask
);
