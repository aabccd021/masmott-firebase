import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { pipe } from 'fp-ts/function';
import { Stack } from 'masmott';

import { ClientEnv } from '../../type';

type Type = Stack<ClientEnv>['client']['auth']['createUserAndSignInWithEmailAndPassword'];

export const createUserAndSignInWithEmailAndPassword: Type = (env) => (email, password) =>
  pipe(
    env.client.firebaseConfig,
    initializeApp,
    getAuth,
    (auth) => () => createUserWithEmailAndPassword(auth, email, password)
  );
