import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite';
import { connectStorageEmulator, deleteObject, getStorage, listAll, ref } from 'firebase/storage';
import { readonlyArray, task as T } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { Task } from 'fp-ts/Task';
import { independencyTests } from 'masmott';
import fetch from 'node-fetch';
import { beforeEach } from 'vitest';

import { mkMkStack, storageDir } from '../src';

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
const storage = getStorage(app);
const firestore = getFirestore(app);

connectAuthEmulator(auth, 'http://localhost:9099');
connectStorageEmulator(storage, 'localhost', 9199);
connectFirestoreEmulator(firestore, 'localhost', 8080);

const mkStack = mkMkStack(firebaseConfig);

const clearStorage: Task<unknown> = pipe(
  () => listAll(ref(storage, storageDir)),
  T.chain((files) =>
    pipe(
      files.items,
      readonlyArray.fromArray,
      readonlyArray.traverse(T.ApplicativePar)((delRef) => () => deleteObject(delRef))
    )
  )
);

const clearFirestore: Task<unknown> = () =>
  fetch('http://localhost:8080/emulator/v1/projects/demo/databases/(default)/documents', {
    method: 'DELETE',
  });

const beforeEachTask = pipe(
  T.Do,
  T.bind('stack', () => mkStack),
  T.chainFirst(({ stack }) => stack.admin.deploy.storage({ securityRule: { type: 'allowAll' } })),
  T.chainFirst(() => clearStorage),
  T.chainFirst(({ stack }) => stack.admin.deploy.storage({ securityRule: {} })),
  T.chainFirst(({ stack }) => stack.admin.deploy.db({ securityRule: {} })),
  T.chainFirst(() => clearFirestore)
);

beforeEach(async () => {
  await beforeEachTask();
});

independencyTests(mkStack);
