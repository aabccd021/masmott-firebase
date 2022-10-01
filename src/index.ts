/* eslint-disable functional/no-expression-statement */
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { connectStorageEmulator, getStorage, ref, uploadString } from 'firebase/storage';
import { task, taskEither } from 'fp-ts';

import { MakeServer } from './test';

const auth = getAuth();
connectAuthEmulator(auth, 'http://localhost:9099');
const storage = getStorage();
connectStorageEmulator(storage, 'localhost', 9199);

const cr = (email: string, password: string) => () =>
  createUserWithEmailAndPassword(auth, email, password);

export const makeServer: MakeServer = task.of({
  admin: {
    migrate: (_) => task.of(undefined),
  },
  client: {
    storage: {
      upload: (_) =>
        taskEither.tryCatch(
          () => uploadString(ref(storage, 'mountains.jpg'), ''),
          () => ({ type: 'invalid' } as const)
        ),
    },
    auth: {
      signIn: (_) => cr('aab', 'ccd'),
    },
  },
});
