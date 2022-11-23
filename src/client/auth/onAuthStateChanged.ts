/* eslint-disable functional/no-return-void */
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged as _onAuthStateChanged } from 'firebase/auth';
import { option } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import { Stack } from 'masmott';

import { ClientEnv } from '../../type';

type Type = Stack<ClientEnv>['client']['auth']['onAuthStateChanged'];

export const onAuthStateChanged: Type = (env) => (onChangeCallback) =>
  pipe(
    env.client.firebaseConfig,
    initializeApp,
    getAuth,
    (auth) => () =>
      _onAuthStateChanged(
        auth,
        flow(
          option.fromNullable,
          option.chain((user) => option.fromNullable(user.uid)),
          (uid) => onChangeCallback(uid)()
        )
      )
  );
