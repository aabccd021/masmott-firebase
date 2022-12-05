import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';

import type { Stack } from '../../type';
import { UploadDataUrlError } from '../../type';

export const uploadDataUrl: Stack['client']['storage']['uploadDataUrl'] =
  (env) =>
  ({ key, dataUrl }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getStorage,
      (storage) => ref(storage, key),
      (objectRef) =>
        taskEither.tryCatch(
          () => uploadString(objectRef, dataUrl, 'data_url').then(() => undefined),
          flow(
            UploadDataUrlError.type.decode,
            either.bimap(
              (value) => ({ code: 'ProviderError' as const, value }),
              UploadDataUrlError.matchStrict({
                'storage/invalid-format': () => ({ code: 'InvalidDataUrlFormat' as const }),
              })
            ),
            either.toUnion
          )
        )
    );
