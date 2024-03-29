import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

import type { Stack } from '../../type';
import { CodedError } from '../../type';

const handleUnknownError = (value: unknown) => ({ code: 'Provider' as const, value });

export const uploadDataUrl: Stack['client']['storage']['uploadDataUrl'] =
  (env) =>
  ({ key, dataUrl }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getStorage,
      (storage) => ref(storage, `masmott/${key}`),
      (objectRef) =>
        taskEither.tryCatch(
          () => uploadString(objectRef, dataUrl, 'data_url').then(() => undefined),
          flow(
            CodedError.decode,
            either.bimap(handleUnknownError, (codedError) =>
              match(codedError)
                .with({ code: 'storage/invalid-format' }, () => ({
                  code: 'InvalidDataUrlFormat' as const,
                }))
                .with({ code: 'storage/unauthorized' }, () => ({
                  code: 'Forbidden' as const,
                }))
                .otherwise(handleUnknownError)
            ),
            either.toUnion,
            (err) => ({ ...err, capability: 'client.storage.uploadDataUrl' })
          )
        )
    );
