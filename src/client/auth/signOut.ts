import { initializeApp } from 'firebase/app';
import { getAuth, signOut as _signOut } from 'firebase/auth';
import { pipe } from 'fp-ts/function';

import type { Client } from '../../type';

type Type = Client['auth']['signOut'];

export const signOut: Type = (env) =>
  pipe(env.firebaseConfig, initializeApp, getAuth, (auth) => () => _signOut(auth));
