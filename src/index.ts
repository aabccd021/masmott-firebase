/* eslint-disable functional/no-expression-statement */
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { connectStorageEmulator, getStorage, ref, uploadString } from 'firebase/storage';
import { task, taskEither } from 'fp-ts';

import { MakeServer } from './test';

const firebaseConfig = {
  apiKey: 'demo',
  authDomain: 'demo.firebaseapp.com',
  projectId: 'demo',
  storageBucket: 'demo.appspot.com',
  messagingSenderId: '234522610378',
  appId: '1:234522610378:web:7c187b1d5ac02616f74233',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
connectAuthEmulator(auth, 'http://localhost:9099');
const storage = getStorage(app);
connectStorageEmulator(storage, 'localhost', 9199);

const cr = (email: string, password: string) => () =>
  createUserWithEmailAndPassword(auth, email, password).then(console.log);

export const makeServer: MakeServer = task.of({
  admin: {
    migrate: (_) => task.of(undefined),
  },
  client: {
    storage: {
      upload: () =>
        taskEither.fromTask(() => uploadString(ref(storage, 'a'), 'emp').then((_) => true)),
    },
    auth: {
      signIn: (_) => cr('aab@gmail.com', 'aabccd'),
    },
  },
});
