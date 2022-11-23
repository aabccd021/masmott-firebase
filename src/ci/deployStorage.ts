import { task as T } from 'fp-ts';
import { flow } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import * as fs from 'fs/promises';
import { Stack } from 'masmott';

import { ClientEnv } from '../type';

const getStorageRule = (allow: boolean) => `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if ${allow};
    }
  }
}
`;

export const deployStorage: Stack<ClientEnv>['ci']['deployStorage'] = flow(
  (c) => () =>
    fs.writeFile('storage.rules', getStorageRule(c.securityRule?.type === 'allowAll'), {
      encoding: 'utf8',
    }),
  T.chainFirst(() => std.task.sleep(std.date.mkMilliseconds(250)))
);
