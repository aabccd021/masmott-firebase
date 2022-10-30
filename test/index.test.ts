import { deleteObject, listAll, ref } from 'firebase/storage';
import { readonlyArray, task as T, taskEither as TE } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import { independencyTests } from 'masmott';
import fetch from 'node-fetch';
import { beforeEach } from 'vitest';

import { deployDb, deployStorage, mkStack, storage, storageDir } from '../src';

const beforeEachTask = pipe(
  T.Do,
  T.chain(() => deployStorage({ securityRule: { type: 'allowAll' } })),
  T.chain(() => () => listAll(ref(storage, storageDir))),
  T.chain((files) =>
    pipe(
      files.items,
      readonlyArray.fromArray,
      readonlyArray.traverse(T.ApplicativePar)((delRef) => () => deleteObject(delRef))
    )
  ),
  T.chain(() => deployStorage({ securityRule: {} })),
  T.chain(() => deployDb({ securityRule: {} })),
  T.chain(() =>
    TE.tryCatch(
      () =>
        fetch('http://localhost:8080/emulator/v1/projects/demo/databases/(default)/documents', {
          method: 'DELETE',
        }),
      identity
    )
  )
);

beforeEach(async () => {
  await beforeEachTask();
});

independencyTests(mkStack);
