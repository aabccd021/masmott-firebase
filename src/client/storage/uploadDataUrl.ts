import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import * as Masmott from 'masmott';

import type { Client } from '../../type';
import { UploadDataUrlError } from '../../type';

export const uploadDataUrl: Client['storage']['uploadDataUrl'] =
  (env) =>
  ({ key, dataUrl }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getStorage,
      (storage) => ref(storage, key),
      (objectRef) =>
        taskEither.tryCatch(
          async () => {
            // eslint-disable-next-line functional/no-expression-statement
            await uploadString(objectRef, dataUrl, 'data_url');
          },
          flow(
            UploadDataUrlError.type.decode,
            either.bimap(
              (value) => Masmott.UploadDataUrlError.Union.of.ProviderError({ value }),
              UploadDataUrlError.matchStrict({
                'storage/invalid-format': () =>
                  Masmott.UploadDataUrlError.Union.of.InvalidDataUrlFormat({}),
              })
            ),
            either.toUnion
          )
        )
    );
