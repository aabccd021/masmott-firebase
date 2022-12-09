import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { Stack } from '../../type';

export const upsertDoc: Stack['server']['db']['upsertDoc'] =
  (env) =>
  ({ key: { collection, id }, data }) =>
    pipe(
      taskEither.tryCatch(
        () => env.firebaseAdminApp.firestore().doc(`${collection}/${id}`).set(data),
        (value) => ({
          code: 'ProviderError' as const,
          value,
          capability: 'server.db.upsertDoc' as const,
        })
      ),
      taskEither.map(() => undefined)
    );
