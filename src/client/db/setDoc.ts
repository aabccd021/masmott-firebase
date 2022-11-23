import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc as _setDoc } from 'firebase/firestore/lite';
import { pipe } from 'fp-ts/function';
import { Stack } from 'masmott';

import { ClientEnv } from '../../type';

export const setDoc: Stack<ClientEnv>['client']['db']['setDoc'] =
  (env) =>
  ({ key: { collection, id }, data }) =>
    pipe(
      env.client.firebaseConfig,
      initializeApp,
      getFirestore,
      (firestore) => doc(firestore, collection, id),
      (docRef) => () => _setDoc(docRef, data)
    );
