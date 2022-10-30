import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import * as FIRESTORE from 'firebase/firestore/lite';
import {
  connectStorageEmulator,
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
} from 'firebase/storage';
import { either as E, io, task as T, taskEither as TE } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import * as _fs from 'fs/promises';
import * as Masmott from 'masmott';
import { MkStack, Stack } from 'masmott';
import { match } from 'ts-pattern';

import { GetDownloadUrlError } from './type';

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
// eslint-disable-next-line functional/no-expression-statement
connectAuthEmulator(auth, 'http://localhost:9099');

export const storage = getStorage(app);
// eslint-disable-next-line functional/no-expression-statement
connectStorageEmulator(storage, 'localhost', 9199);

export const db = FIRESTORE.getFirestore(app);
// eslint-disable-next-line functional/no-expression-statement
FIRESTORE.connectFirestoreEmulator(db, 'localhost', 8080);

// const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fs = {
  writeFile: (path: string, content: string) => () =>
    _fs.writeFile(path, content, { encoding: 'utf8' }),
};

const getStorageRule = (allow: boolean) => `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if ${allow};
    }
  }
}
`;

const getFirestoreRule = (allow: boolean) => `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if ${allow};
    }
  }
}
`;

export const deployStorage: Stack['admin']['deploy']['storage'] = (c) =>
  pipe(
    fs.writeFile('storage.rules', getStorageRule(c.securityRule?.type === 'allowAll')),
    T.chainFirst(() => std.task.sleep(std.date.mkMilliseconds(250)))
  );

export const deployDb: Stack['admin']['deploy']['db'] = (c) =>
  pipe(
    fs.writeFile('firestore.rules', getFirestoreRule(c.securityRule?.type === 'allowAll')),
    T.chainFirst(() => std.task.sleep(std.date.mkMilliseconds(250)))
  );

export const storageDir = 'masmott';

const upload: Stack['client']['storage']['upload'] =
  ({ key, file }) =>
  () =>
    uploadString(ref(storage, `${storageDir}/${key}`), file);

const getDownloadUrl: Stack['client']['storage']['getDownloadUrl'] = ({ key }) =>
  TE.tryCatch(
    () => getDownloadURL(ref(storage, `${storageDir}/${key}`)),
    flow(
      GetDownloadUrlError.type.decode,
      E.match(
        (unknownError) => Masmott.GetDownloadUrlError.Union.of.Unknown({ value: unknownError }),
        (knownError) =>
          match(knownError)
            .with({ code: 'storage/object-not-found' }, (_) =>
              Masmott.GetDownloadUrlError.Union.of.FileNotFound({})
            )
            .exhaustive()
      )
    )
  );

const setDoc: Stack['client']['db']['setDoc'] =
  ({ key, data }) =>
  () =>
    FIRESTORE.setDoc(FIRESTORE.doc(db, key.collection, key.id), data);

const getDataFromSnapshot =
  (snapshot: FIRESTORE.DocumentSnapshot): io.IO<FIRESTORE.DocumentData | undefined> =>
  () =>
    snapshot.data();

const getDoc: Stack['client']['db']['getDoc'] = ({ key }) =>
  pipe(
    TE.tryCatch(
      () => FIRESTORE.getDoc(FIRESTORE.doc(db, key.collection, key.id)),
      (unknownErr) => Masmott.GetDocError.Union.of.Unknown({ value: unknownErr })
    ),
    TE.chain(
      flow(
        getDataFromSnapshot,
        io.map(E.fromNullable(Masmott.GetDocError.Union.of.DocNotFound({}))),
        TE.fromIOEither
      )
    )
  );

export const mkStack: MkStack = async () => ({
  admin: {
    deploy: {
      db: deployDb,
      storage: deployStorage,
    },
  },
  client: {
    storage: {
      upload,
      getDownloadUrl,
    },
    db: {
      setDoc,
      getDoc,
    },
  },
});
