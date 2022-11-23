import { task as T } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import * as fs from 'fs/promises';
import { Stack } from 'masmott';

import { ClientEnv } from '../type';

const getFirestoreRule = (allow: boolean) => `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if ${allow};
    }
  }
}
`;

export const deployDb: Stack<ClientEnv>['ci']['deployDb'] = (c) =>
  pipe(
    () => fs.writeFile('firestore.rules', getFirestoreRule(c.securityRule?.type === 'allowAll')),
    T.chainFirst(() => std.task.sleep(std.date.mkMilliseconds(250)))
  );
