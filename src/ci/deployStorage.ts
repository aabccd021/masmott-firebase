import { task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as fs from 'fs/promises';

import type { Stack } from '../type';
import { sleepTest } from '../util';

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

export const deployStorage: Stack['ci']['deployStorage'] = () => () =>
  pipe(
    () => fs.writeFile('storage.rules', getStorageRule(true), { encoding: 'utf8' }),
    task.chainFirst(() => sleepTest(1500)),
    taskEither.fromTask
  );
