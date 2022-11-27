import { initializeApp } from 'firebase/app';
import { getAuth, signOut as _signOut } from 'firebase/auth';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as Masmott from 'masmott';

import type { Client } from '../../type';

type Type = Client['auth']['signOut'];

export const signOut: Type = (env) =>
  pipe(env.firebaseConfig, initializeApp, getAuth, (auth) =>
    taskEither.tryCatch(
      () => _signOut(auth),
      (value) => Masmott.SignOutError.Union.of.ProviderError({ value })
    )
  );
