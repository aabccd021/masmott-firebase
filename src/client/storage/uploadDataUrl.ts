import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadString } from 'firebase/storage';
import { pipe } from 'fp-ts/function';
import { Stack } from 'masmott';

import { ClientEnv } from '../../type';

export const uploadDataUrl: Stack<ClientEnv>['client']['storage']['uploadDataUrl'] =
  (env) =>
  ({ key, file }) =>
    pipe(
      env.client.firebaseConfig,
      initializeApp,
      getStorage,
      (storage) => ref(storage, key),
      (objectRef) => () => uploadString(objectRef, file, 'data_url')
    );
