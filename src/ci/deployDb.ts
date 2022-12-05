import { task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import * as fs from 'fs/promises';

import type { Stack } from '../type';

const getFirestoreRule = (allow: boolean) => `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if ${allow.toString()};
    }
  }
}
`;

export const deployDb: Stack['ci']['deployDb'] = () => () =>
  pipe(
    () => fs.writeFile('firestore.rules', getFirestoreRule(true)),
    task.chainFirst(() => std.task.sleep(std.date.mkMilliseconds(250))),
    taskEither.fromTask
  );
