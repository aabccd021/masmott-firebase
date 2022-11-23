import { initializeApp } from 'firebase/app';
import { doc, getDoc as _getDoc, getFirestore } from 'firebase/firestore/lite';
import { either, task } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { Stack } from 'masmott';
import * as Masmott from 'masmott';

import { ClientEnv } from '../../type';

export const getDoc: Stack<ClientEnv>['client']['db']['getDoc'] =
  (env) =>
  ({ key: { collection, id } }) =>
    pipe(
      env.client.firebaseConfig,
      initializeApp,
      getFirestore,
      (firestore) => doc(firestore, collection, id),
      (docRef) => () => _getDoc(docRef),
      task.chainIOK((snapshot) => () => snapshot.data()),
      task.map(either.fromNullable(Masmott.GetDocError.Union.of.DocNotFound({})))
    );
