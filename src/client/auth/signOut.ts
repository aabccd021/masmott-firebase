import { initializeApp } from 'firebase/app';
import { getAuth, signOut as _signOut } from 'firebase/auth';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { Stack } from '../../type';

type Type = Stack['client']['auth']['signOut'];

export const signOut: Type = (env) =>
  pipe(env.firebaseConfig, initializeApp, getAuth, (auth) =>
    taskEither.tryCatch(
      () => _signOut(auth),
      (value) => ({
        code: 'ProviderError' as const,
        capability: 'client.auth.signOut' as const,
        value,
      })
    )
  );
