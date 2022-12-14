import { initializeApp } from 'firebase/app';
import { doc, getFirestore, onSnapshot as _onSnapshot } from 'firebase/firestore';
import { either, option } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import { match } from 'ts-pattern';

import type { Stack } from '../../type';

type Type = Stack['client']['db']['onSnapshot'];

const handleUnknownError = (value: unknown) => ({ code: 'Provider' as const, value });

export const onSnapshot: Type = (env) => (param) =>
  pipe(
    env.firebaseConfig,
    initializeApp,
    getFirestore,
    (firestore) => doc(firestore, param.key.collection, param.key.id),
    (docRef) => () =>
      _onSnapshot(
        docRef,
        (snapshot) =>
          pipe(snapshot.data(), option.fromNullable, either.right, param.onChanged, std.io.execute),
        (err) =>
          pipe(
            match(err)
              .with({ code: 'permission-denied' }, () => ({
                code: 'Forbidden' as const,
              }))
              .otherwise(handleUnknownError),
            either.left,
            param.onChanged,
            std.io.execute
          )
      )
  );
