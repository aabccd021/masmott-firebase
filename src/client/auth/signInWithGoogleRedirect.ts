import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';
import { pipe } from 'fp-ts/function';

import type { Stack } from '../../type';

type SignInWithGoogleRedirect = Stack['client']['auth']['signInWithGoogleRedirect'];

export const signInWithGoogleRedirect: SignInWithGoogleRedirect = (env) =>
  pipe(
    env.firebaseConfig,
    initializeApp,
    getAuth,
    (auth) => () => signInWithRedirect(auth, new GoogleAuthProvider())
  );
