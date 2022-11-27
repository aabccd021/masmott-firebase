import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { pipe } from 'fp-ts/function';

import type { Client } from '../../type';

type Type = Client['auth']['createUserAndSignInWithEmailAndPassword'];

export const createUserAndSignInWithEmailAndPassword: Type =
  (env) =>
  ({ email, password }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getAuth,
      (auth) => () => createUserWithEmailAndPassword(auth, email, password)
    );
