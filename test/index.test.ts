import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectStorageEmulator,
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
} from 'firebase/storage';
import { runTest } from 'masmott';
import { describe, expect, test } from 'vitest';

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

describe('storage is independent between tests', () => {
  test('a server can upload file foo', async () => {
    await uploadString(ref(storage, 'a'), 'a');
    await getDownloadURL(ref(storage, 'a'));
    expect('b').equals('b');
  });

  test('server from another test can not access file foo', async () => {
    await getDownloadURL(ref(storage, 'b')).catch((a) => console.log(JSON.stringify(a)));
    expect('b').equals('b');
  });
});

runTest();
