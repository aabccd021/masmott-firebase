/* eslint-disable functional/no-expression-statement */
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectStorageEmulator, getStorage, ref, uploadString } from 'firebase/storage';

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

const a = async () => {
  await uploadString(ref(storage, 'a'), 'emp').then((res) => console.log(res));
};

console.log('a');
a();
console.log('b');

