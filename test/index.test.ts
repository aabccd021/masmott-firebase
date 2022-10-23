import { deleteObject, listAll, ref } from 'firebase/storage';
import { readonlyArray, task as T } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { runTests } from 'masmott';
import { beforeEach } from 'vitest';

import { deployStorageRule, mkStack, storage, storageDir } from '../src';

const beforeEachTask = pipe(
  T.Do,
  T.chainFirst(() => deployStorageRule({ storage: { securityRule: { type: 'allowAll' } } })),
  T.bind('files', () => () => listAll(ref(storage, storageDir))),
  T.chainFirst(({ files }) =>
    pipe(
      files.items,
      readonlyArray.fromArray,
      readonlyArray.traverse(T.ApplicativePar)((delRef) => () => deleteObject(delRef))
    )
  )
);

beforeEach(async () => {
  await beforeEachTask();
});

runTests(mkStack);
