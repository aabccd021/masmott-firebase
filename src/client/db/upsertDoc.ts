import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc as _setDoc } from 'firebase/firestore/lite';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

import type { Stack } from '../../type';
import { CodedError } from '../../type';

const handleUnknownError = (value: unknown) => ({
  code: 'ProviderError' as const,
  value,
});

export const upsertDoc: Stack['client']['db']['upsertDoc'] =
  (env) =>
  ({ key: { collection, id }, data }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getFirestore,
      (firestore) => doc(firestore, collection, id),
      (docRef) =>
        taskEither.tryCatch(
          () => _setDoc(docRef, data),
          flow(
            CodedError.type.decode,
            either.bimap(handleUnknownError, (codedError) =>
              match(codedError)
                .with({ code: 'permission-denied' }, () => ({
                  code: 'ForbiddenError' as const,
                }))
                .otherwise(handleUnknownError)
            ),
            either.toUnion,
            (err) => ({ ...err, capability: 'client.db.upsertDoc' })
          )
        )
    );
