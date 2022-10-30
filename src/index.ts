import { FirebaseOptions, initializeApp } from 'firebase/app';
import * as FIRESTORE from 'firebase/firestore/lite';
import * as STORAGE from 'firebase/storage';
import { apply, either as E, reader as R, readerTask, task as T, taskEither as TE } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import { Reader } from 'fp-ts/Reader';
import { ReaderTask } from 'fp-ts/ReaderTask';
import * as std from 'fp-ts-std';
import * as _fs from 'fs/promises';
import * as Masmott from 'masmott';
import { Stack } from 'masmott';
import { match } from 'ts-pattern';

import { GetDownloadUrlError } from './type';

const fs = {
  writeFile: (path: string, content: string) => () =>
    _fs.writeFile(path, content, { encoding: 'utf8' }),
};

export type Env = FirebaseOptions;

const getApp = (config: FirebaseOptions) => initializeApp(config);

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

export const deployStorage: Reader<Env, Stack['admin']['deploy']['storage']> = (_) =>
  flow(
    (c) => fs.writeFile('storage.rules', getStorageRule(c.securityRule?.type === 'allowAll')),
    T.chainFirst(() => std.task.sleep(std.date.mkMilliseconds(250)))
  );

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

export const deployDb: Reader<Env, Stack['admin']['deploy']['db']> = (_) => (c) =>
  pipe(
    fs.writeFile('firestore.rules', getFirestoreRule(c.securityRule?.type === 'allowAll')),
    T.chainFirst(() => std.task.sleep(std.date.mkMilliseconds(250)))
  );

const getStorage = flow(getApp, STORAGE.getStorage);

const upload: Reader<Env, Stack['client']['storage']['upload']> = flow(
  getStorage,
  (storage) =>
    ({ key, file }) =>
    () =>
      STORAGE.uploadString(STORAGE.ref(storage, key), file)
);

const getDownloadUrl: Reader<Env, Stack['client']['storage']['getDownloadUrl']> =
  (opt) =>
  ({ key }) =>
    TE.tryCatch(
      () => STORAGE.getDownloadURL(STORAGE.ref(getStorage(opt), key)),
      flow(
        GetDownloadUrlError.type.decode,
        E.match(
          (unknownErr) => Masmott.GetDownloadUrlError.Union.of.Unknown({ value: unknownErr }),
          (knownErr) =>
            match(knownErr)
              .with({ code: 'storage/object-not-found' }, (_) =>
                Masmott.GetDownloadUrlError.Union.of.FileNotFound({})
              )
              .exhaustive()
        )
      )
    );

const getFirestore = flow(getApp, FIRESTORE.getFirestore);

const setDoc: Reader<Env, Stack['client']['db']['setDoc']> = flow(
  getFirestore,
  (db) =>
    ({ key, data }) =>
    () =>
      FIRESTORE.setDoc(FIRESTORE.doc(db, key.collection, key.id), data)
);

const getDoc: Reader<Env, Stack['client']['db']['getDoc']> = flow(getFirestore, (db) =>
  flow(
    ({ key }) =>
      TE.tryCatch(
        () => FIRESTORE.getDoc(FIRESTORE.doc(db, key.collection, key.id)),
        (unknownErr) => Masmott.GetDocError.Union.of.Unknown({ value: unknownErr })
      ),
    TE.chain(
      flow(
        (snapshot) => snapshot.data(),
        E.fromNullable(Masmott.GetDocError.Union.of.DocNotFound({})),
        TE.fromEither
      )
    )
  )
);

const deploy = apply.sequenceS(R.Apply)({
  db: deployDb,
  storage: deployStorage,
});

const admin = apply.sequenceS(R.Apply)({
  deploy,
});

const storage = apply.sequenceS(R.Apply)({
  upload,
  getDownloadUrl,
});

const db = apply.sequenceS(R.Apply)({
  getDoc,
  setDoc,
});

const client = apply.sequenceS(R.Apply)({
  storage,
  db,
});

export const mkStack: ReaderTask<Env, Stack> = pipe(
  { admin, client },
  apply.sequenceS(R.Apply),
  readerTask.fromReader
);
