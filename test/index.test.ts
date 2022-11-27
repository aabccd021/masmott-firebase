import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import * as admin from 'firebase-admin';
import { readonlyArray, taskEither } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import { runTests } from 'masmott/dist/cjs/test';
import fetch from 'node-fetch';

import { stack } from '../src';

const firebaseConfig = {
  projectId: 'demo',
  storageBucket: 'demo.appspot.com',

  // https://stackoverflow.com/a/72839398/9611638
  apiKey: 'demoapikey',
};
const firestoreHost = 'localhost';
const firestorePort = 8080;

// https://firebase.google.com/docs/emulator-suite/connect_and_prototype#connect_your_app_to_the_emulators
const app = initializeApp(firebaseConfig);
connectAuthEmulator(getAuth(app), `http://localhost:9099`);
connectStorageEmulator(getStorage(app), 'localhost', 9199);
connectFirestoreEmulator(getFirestore(app), firestoreHost, firestorePort);

// https://firebase.google.com/docs/emulator-suite/connect_storage#admin_sdks
const adminApp = admin.initializeApp({ projectId: firebaseConfig.projectId });
const bucket = admin.storage(adminApp).bucket(firebaseConfig.storageBucket);

const clearStorage = pipe(
  taskEither.tryCatch(() => bucket.getFiles(), identity),
  taskEither.map(([files]) => files),
  taskEither.chainW(
    readonlyArray.traverse(taskEither.ApplicativeSeq)((file) =>
      taskEither.tryCatch(() => file.delete(), identity)
    )
  )
);

// https://firebase.google.com/docs/emulator-suite/connect_firestore#clear_your_database_between_tests
const clearFirestore = taskEither.tryCatch(
  () =>
    fetch(
      `http://${firestoreHost}:${firestorePort}/emulator/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`,
      { method: 'DELETE' }
    ),
  identity
);

const mkTestClientEnv = pipe(
  clearStorage,
  taskEither.chainW(() => clearFirestore),
  taskEither.map(() => ({ firebaseConfig }))
);

runTests(stack, mkTestClientEnv);
