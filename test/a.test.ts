import { either, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import * as fs from 'fs/promises';
import { defineTest } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

const storageRule = `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow write: if request.resource.size < 2;
    }
  }
}
`;

runSuite({
  suite: {
    name: 'custom test',
    tests: [
      defineTest({
        name: 'a',
        expect: ({ client }) =>
          pipe(
            () => fs.writeFile('storage.rules', storageRule, { encoding: 'utf8' }),
            task.chain(() =>
              std.task.sleep(
                std.date.mkMilliseconds(parseFloat(process.env['DEPLOY_STORAGE_DELAY'] ?? '1000'))
              )
            ),
            taskEither.fromTask,
            taskEither.chainW(() =>
              client.storage.uploadDataUrl({
                key: 'kira_key',
                dataUrl: `data:;base64,${Buffer.from('a').toString('base64')}`,
              })
            )
          ),
        toResult: either.right(undefined),
      }),

      defineTest({
        name: 'aa',
        expect: ({ client }) =>
          pipe(
            () => fs.writeFile('storage.rules', storageRule, { encoding: 'utf8' }),
            task.chain(() =>
              std.task.sleep(
                std.date.mkMilliseconds(parseFloat(process.env['DEPLOY_STORAGE_DELAY'] ?? '1000'))
              )
            ),
            taskEither.fromTask,
            taskEither.chainW(() =>
              client.storage.uploadDataUrl({
                key: 'kira_key',
                dataUrl: `data:;base64,${Buffer.from('aa').toString('base64')}`,
              })
            )
          ),
        toResult: either.left(undefined),
      }),

      defineTest({
        name: 'a string',
        expect: ({ client }) =>
          pipe(
            () => fs.writeFile('storage.rules', storageRule, { encoding: 'utf8' }),
            task.chain(() =>
              std.task.sleep(
                std.date.mkMilliseconds(parseFloat(process.env['DEPLOY_STORAGE_DELAY'] ?? '1000'))
              )
            ),
            taskEither.fromTask,
            taskEither.chainW(() =>
              client.storage.uploadDataUrl({
                key: 'kira_key',
                dataUrl: `data:,a`,
              })
            )
          ),
        toResult: either.right(undefined),
      }),

      defineTest({
        name: 'aa string',
        expect: ({ client }) =>
          pipe(
            () => fs.writeFile('storage.rules', storageRule, { encoding: 'utf8' }),
            task.chain(() =>
              std.task.sleep(
                std.date.mkMilliseconds(parseFloat(process.env['DEPLOY_STORAGE_DELAY'] ?? '1000'))
              )
            ),
            taskEither.fromTask,
            taskEither.chainW(() =>
              client.storage.uploadDataUrl({
                key: 'kira_key',
                dataUrl: `data:,aa`,
              })
            )
          ),
        toResult: either.left(undefined),
      }),
    ],
  },
});
