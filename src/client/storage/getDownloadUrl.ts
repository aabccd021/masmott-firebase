import { initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';

import type { Stack } from '../../type';
import { GetDownloadUrlError } from '../../type';

export const getDownloadUrl: Stack['client']['storage']['getDownloadUrl'] =
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
              (value) => ({ code: 'ProviderError' as const, value }),
              GetDownloadUrlError.matchStrict({
                'storage/object-not-found': () => ({ code: 'FileNotFound' as const }),
              })
            ),
            either.toUnion,
            (err) => ({ ...err, capability: 'client.storage.getDownloadUrl' })
          )
        )
    );
