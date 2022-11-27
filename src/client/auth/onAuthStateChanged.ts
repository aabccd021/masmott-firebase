import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged as _onAuthStateChanged } from 'firebase/auth';
import { option } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';

import type { Client } from '../../type';

type Type = Client['auth']['onAuthStateChanged'];

export const onAuthStateChanged: Type = (env) => (onChangeCallback) =>
  pipe(
    env.firebaseConfig,
    initializeApp,
    getAuth,
    (auth) => () =>
      _onAuthStateChanged(
        auth,
        flow(
          option.fromNullable,
          option.chain((user) => option.fromNullable(user.uid)),
          (uid) => onChangeCallback(uid),
          std.io.execute
        )
      )
  );
