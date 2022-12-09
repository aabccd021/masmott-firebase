import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import {
  connectFirestoreEmulator as connectFirestoreEmulatorLite,
  getFirestore as getFirestoreLite,
} from 'firebase/firestore/lite';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import * as admin from 'firebase-admin';
import { readonlyArray, taskEither } from 'fp-ts';
import { identity, pipe } from 'fp-ts/function';
import * as fs from 'fs/promises';
import { runTests } from 'masmott/dist/cjs/test';
import fetch from 'node-fetch';

import { stack } from '../src';
import type { StackType } from '../src/type';

const conf = {
  projectId: 'demo',
  storageBucket: 'demo.appspot.com',
  messagingSenderId: '234522610378',
  appId: '1:234522610378:web:7c187b1d5ac02616f74233',

  // https://stackoverflow.com/a/72839398/9611638
  apiKey: 'demoapikey',
};
const emulatorHost = 'localhost';
const firestorePort = 8080;
const authEndpoint = `http://${emulatorHost}:9099`;

// https://firebase.google.com/docs/emulator-suite/connect_and_prototype#connect_your_app_to_the_emulators
const app = initializeApp(conf);
connectAuthEmulator(getAuth(app), authEndpoint);
connectStorageEmulator(getStorage(app), emulatorHost, 9199);
connectFirestoreEmulatorLite(getFirestoreLite(app), emulatorHost, firestorePort);
connectFirestoreEmulator(getFirestore(app), emulatorHost, firestorePort);

// https://firebase.google.com/docs/emulator-suite/connect_storage#admin_sdks
const adminConfig = { projectId: conf.projectId };
const adminApp = admin.initializeApp(adminConfig);
const bucket = adminApp.storage().bucket(conf.storageBucket);

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
      `http://${emulatorHost}:${firestorePort}/emulator/v1/projects/${conf.projectId}/databases/(default)/documents`,
      { method: 'DELETE' }
    ),
  identity
);

// https://firebase.google.com/docs/reference/rest/auth#section-auth-emulator-clearaccounts
const clearAuth = taskEither.tryCatch(
  () =>
    fetch(`${authEndpoint}/emulator/v1/projects/${conf.projectId}/accounts`, {
      method: 'DELETE',
    }),
  identity
);

const signOutClient = taskEither.tryCatch(() => signOut(getAuth(app)), identity);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const noFn = `
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "masmottFunctions", {
    enumerable: true,
    get: function() {
        return masmottFunctions;
    }
});
var masmottFunctions = {};
`;

export const clearFunctions = taskEither.tryCatch(async () => {
  const content = await fs.readFile('functions/lib/index.js', { encoding: 'utf8' });
  // eslint-disable-next-line functional/no-conditional-statement
  if (content !== noFn) {
    await fs.writeFile('functions/lib/index.js', noFn, { encoding: 'utf8' });
    await sleep(1000 * parseFloat(process.env['TEST_DELAY'] ?? '1'));
  }
}, identity);

const mkTestClientEnv = pipe(
  clearStorage,
  taskEither.chainIOK(() => clearFunctions),
  taskEither.chainW(() => clearFirestore),
  taskEither.chainW(() => clearAuth),
  taskEither.chainW(() => signOutClient),
  taskEither.map(() => ({
    client: { firebaseConfig: conf },
    server: { firebaseAdminApp: adminApp },
    ci: undefined,
  }))
);

runTests<StackType>(stack, mkTestClientEnv);
