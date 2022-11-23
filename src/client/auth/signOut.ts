import { initializeApp } from 'firebase/app';
import { getAuth, signOut as _signOut } from 'firebase/auth';
import { pipe } from 'fp-ts/function';
import { Stack } from 'masmott';

import { ClientEnv } from '../../type';

export const signOut: Stack<ClientEnv>['client']['auth']['signOut'] = (env) =>
  pipe(env.client.firebaseConfig, initializeApp, getAuth, (auth) => () => _signOut(auth));
