import { task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
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

export const deployStorage: Stack['ci']['deployStorage'] = () => () =>
  pipe(
    () => fs.writeFile('storage.rules', getStorageRule(true), { encoding: 'utf8' }),
    task.chain(() =>
      std.task.sleep(
        std.date.mkMilliseconds(1000 * parseFloat(process.env['DEPLOY_STORAGE_DELAY'] ?? '1'))
      )
    ),
    taskEither.fromTask
  );
