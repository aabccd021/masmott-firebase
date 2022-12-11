/* eslint-disable functional/no-conditional-statement */
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signOut } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import {
  connectFirestoreEmulator as connectFirestoreEmulatorLite,
  getFirestore as getFirestoreLite,
} from 'firebase/firestore/lite';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { existsSync } from 'fs';
import * as fs from 'fs/promises';
import { runSuiteWithConfig } from 'masmott/dist/cjs/test';
import fetch from 'node-fetch';
import * as path from 'path';
import { afterAll } from 'vitest';

import { env as serverEnv } from '../functions/src/masmott-firebase.server.env';
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

const clearStorage = async () => {
  const [files] = await serverEnv.firebaseAdminApp.storage().bucket(conf.storageBucket).getFiles();
  await Promise.all(files.map((file) => file.delete()));
};

// https://firebase.google.com/docs/emulator-suite/connect_firestore#clear_your_database_between_tests
const clearFirestore = () =>
  fetch(
    `http://${emulatorHost}:${firestorePort}/emulator/v1/projects/${conf.projectId}/databases/(default)/documents`,
    { method: 'DELETE' }
  );

// https://firebase.google.com/docs/reference/rest/auth#section-auth-emulator-clearaccounts
const clearAuth = () =>
  fetch(`${authEndpoint}/emulator/v1/projects/${conf.projectId}/accounts`, {
    method: 'DELETE',
  });

const signOutClient = () => signOut(getAuth(app));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const writeIfDifferent = async (filePath: string, expectedContent: string, delay: number) => {
  if (
    existsSync(filePath) &&
    (await fs.readFile(filePath, { encoding: 'utf8' })) === expectedContent
  ) {
    return;
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, expectedContent, { encoding: 'utf8' });
  await sleep(delay);
};

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

const clearFunctions = () =>
  writeIfDifferent(
    'functions/lib/index.js',
    noFn,
    parseFloat(process.env['DEPLOY_FUNCTIONS_DELAY'] ?? '7000')
  );

const defaultFirestoreRule = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
`;

const clearFirestoreRule = () =>
  writeIfDifferent(
    'firestore.rules',
    defaultFirestoreRule,
    parseFloat(process.env['DEPLOY_DB_DELAY'] ?? '3000')
  );

const clearAll = async () => {
  await clearFirestoreRule();
  await clearFunctions();
  await clearFirestore();
  await clearAuth();
  await clearStorage();
  await signOutClient();
};

export const runSuite = runSuiteWithConfig<StackType>({
  stack,
  getTestEnv: pipe(
    taskEither.tryCatch(clearAll, (err) => ({
      capability: 'getTestEnv',
      err: JSON.stringify(err, undefined, 2),
    })),
    taskEither.map(() => ({
      client: { firebaseConfig: conf },
      server: serverEnv,
      ci: undefined,
    }))
  ),
});

afterAll(clearAll);
