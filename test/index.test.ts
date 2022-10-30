import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore/lite';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import * as admin from 'firebase-admin';
import { independencyTests } from 'masmott';
import fetch from 'node-fetch';
import { beforeEach } from 'vitest';

import { mkStack } from '../src';

const config = {
  projectId: 'demo',
  storageBucket: 'demo.appspot.com',

  // https://stackoverflow.com/a/72839398/9611638
  apiKey: 'demoapikey',
};
const firestoreHost = 'localhost';
const firestorePort = 8080;

// https://firebase.google.com/docs/emulator-suite/connect_and_prototype#connect_your_app_to_the_emulators
const app = initializeApp(config);
connectAuthEmulator(getAuth(app), 'http://localhost:9099');
connectStorageEmulator(getStorage(app), 'localhost', 9199);
connectFirestoreEmulator(getFirestore(app), firestoreHost, firestorePort);

// https://firebase.google.com/docs/emulator-suite/connect_storage#admin_sdks
admin.initializeApp({ projectId: config.projectId });

beforeEach(async () => {
  // clear storage
  const [files] = await admin.storage().bucket(config.storageBucket).getFiles();
  await Promise.all(files.map((file) => file.delete()));

  // https://firebase.google.com/docs/emulator-suite/connect_firestore#clear_your_database_between_tests
  await fetch(
    `http://${firestoreHost}:${firestorePort}/emulator/v1/projects/${config.projectId}/databases/(default)/documents`,
    { method: 'DELETE' }
  );
});

independencyTests(mkStack(config));
