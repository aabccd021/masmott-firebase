import { option, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { Stack } from '../../type';

export const getDoc: Stack['server']['db']['getDoc'] =
  (env) =>
  ({ key: { collection, id } }) =>
    pipe(
      taskEither.tryCatch(
        () => env.firebaseAdminApp.firestore().doc(`${collection}/${id}`).get(),
        (value) => ({
          code: 'ProviderError' as const,
          value,
          capability: 'server.db.getDoc' as const,
        })
      ),
      taskEither.map((snapshot) => snapshot.data()),
      taskEither.map(option.fromNullable)
    );
