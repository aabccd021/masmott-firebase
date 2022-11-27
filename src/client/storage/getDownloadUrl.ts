import { initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import * as Masmott from 'masmott';

import type { Client } from '../../type';
import { GetDownloadUrlError } from '../../type';

export const getDownloadUrl: Client['storage']['getDownloadUrl'] =
  (env) =>
  ({ key }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getStorage,
      (storage) => ref(storage, key),
      (objectRef) =>
        taskEither.tryCatch(
          () => getDownloadURL(objectRef),
          flow(
            GetDownloadUrlError.type.decode,
            either.bimap(
              (value) => Masmott.GetDownloadUrlError.Union.of.ProviderError({ value }),
              GetDownloadUrlError.matchStrict({
                'storage/object-not-found': () =>
                  Masmott.GetDownloadUrlError.Union.of.FileNotFound({}),
              })
            ),
            either.toUnion
          )
        )
    );
