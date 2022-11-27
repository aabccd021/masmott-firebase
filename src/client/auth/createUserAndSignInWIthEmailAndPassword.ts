import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as Masmott from 'masmott';

import type { Client } from '../../type';

type Type = Client['auth']['createUserAndSignInWithEmailAndPassword'];

export const createUserAndSignInWithEmailAndPassword: Type =
  (env) =>
  ({ email, password }) =>
    pipe(env.firebaseConfig, initializeApp, getAuth, (auth) =>
      taskEither.tryCatch(
        async () => {
          // eslint-disable-next-line functional/no-expression-statement
          await createUserWithEmailAndPassword(auth, email, password);
        },
        (value) =>
          Masmott.CreateUserAndSignInWithEmailAndPasswordError.Union.of.ProviderError({ value })
      )
    );
