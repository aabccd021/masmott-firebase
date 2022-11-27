import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc as _setDoc } from 'firebase/firestore/lite';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { Client } from '../../type';

export const setDoc: Client['db']['setDoc'] =
  (env) =>
  ({ key: { collection, id }, data }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getFirestore,
      (firestore) => doc(firestore, collection, id),
      (docRef) =>
        taskEither.tryCatch(
          () => _setDoc(docRef, data),
          (err) => ({ code: 'unknown', err })
        )
    );
