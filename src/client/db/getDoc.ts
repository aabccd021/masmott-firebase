import { initializeApp } from 'firebase/app';
import { doc, getDoc as _getDoc, getFirestore } from 'firebase/firestore/lite';
import { option, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { Client } from '../../type';

export const getDoc: Client['db']['getDoc'] =
  (env) =>
  ({ key: { collection, id } }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getFirestore,
      (firestore) => doc(firestore, collection, id),
      (docRef) => () => _getDoc(docRef),
      task.chainIOK((snapshot) => () => snapshot.data()),
      task.map(option.fromNullable),
      taskEither.fromTask
    );
