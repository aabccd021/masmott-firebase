import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged as _onAuthStateChanged } from 'firebase/auth';
import { option } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';

import type { Stack } from '../../type';

type Type = Stack['client']['auth']['onAuthStateChanged'];

export const onAuthStateChanged: Type = (env) => (onChangeCallback) =>
  pipe(
    env.firebaseConfig,
    initializeApp,
    getAuth,
    (auth) => () =>
      _onAuthStateChanged(auth, flow(option.fromNullable, onChangeCallback, std.io.execute))
  );
