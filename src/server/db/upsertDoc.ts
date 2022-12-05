import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc as _setDoc } from 'firebase/firestore/lite';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';

import type { Stack } from '../../type';

export const upsertDoc: Stack['server']['db']['upsertDoc'] =
  () =>
  ({ key: { collection, id }, data }) =>
    pipe(
      initializeApp(),
      getFirestore,
      (firestore) => doc(firestore, collection, id),
      (docRef) =>
        taskEither.tryCatch(
          () => _setDoc(docRef, data),
          (value) => ({ code: 'ProviderError' as const, value })
        )
    );
