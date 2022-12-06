import { initializeApp } from 'firebase/app';
import { doc, getDoc as _getDoc, getFirestore } from 'firebase/firestore/lite';
import { either, option, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

import type { Stack } from '../../type';
import { CodedError } from '../../type';
import { sleepTest } from '../../util';

const handleUnknownError = (value: unknown) => ({ code: 'ProviderError' as const, value });

export const getDoc: Stack['client']['db']['getDoc'] =
  (env) =>
  ({ key: { collection, id } }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getFirestore,
      (firestore) => doc(firestore, collection, id),
      taskEither.of,
      taskEither.chainFirstTaskK(() => sleepTest(3000)),
      taskEither.chain((docRef) =>
        taskEither.tryCatch(
          () => _getDoc(docRef),
          flow(
            CodedError.type.decode,
            either.bimap(handleUnknownError, (codedError) =>
              match(codedError)
                .with({ code: 'permission-denied' }, () => ({
                  code: 'ForbiddenError' as const,
                }))
                .otherwise(handleUnknownError)
            ),
            either.toUnion
          )
        )
      ),
      taskEither.map((snapshot) => snapshot.data()),
      taskEither.map(option.fromNullable)
    );
