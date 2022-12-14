import { initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

import type { Stack } from '../../type';
import { CodedError } from '../../type';

const handleUnknownError = (value: unknown) => ({ code: 'ProviderError' as const, value });

export const getDownloadUrl: Stack['client']['storage']['getDownloadUrl'] =
  (env) =>
  ({ key }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getStorage,
      (storage) => ref(storage, `masmott/${key}`),
      (objectRef) =>
        taskEither.tryCatch(
          () => getDownloadURL(objectRef),
          flow(
            CodedError.decode,
            either.bimap(handleUnknownError, (codedError) =>
              match(codedError)
                .with({ code: 'storage/object-not-found' }, () => ({
                  code: 'FileNotFound' as const,
                }))
                .otherwise(handleUnknownError)
            ),
            either.toUnion,
            (err) => ({ ...err, capability: 'client.storage.getDownloadUrl' })
          )
        )
    );
