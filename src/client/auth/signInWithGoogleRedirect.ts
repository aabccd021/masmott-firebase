import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { pipe } from 'fp-ts/function';
import { Stack } from 'masmott';

import { ClientEnv } from '../../type';

type SignInWithGoogleRedirect = Stack<ClientEnv>['client']['auth']['signInWithGoogleRedirect'];

export const signInWithGoogleRedirect: SignInWithGoogleRedirect = (env) =>
  pipe(
    env.client.firebaseConfig,
    initializeApp,
    getAuth,
    (auth) => () => signInWithRedirect(auth, new GoogleAuthProvider())
  );
