import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectStorageEmulator,
  getDownloadURL,
  getStorage,
  ref,
  uploadString,
} from 'firebase/storage';
import { either as E, taskEither as TE } from 'fp-ts';
import { flow } from 'fp-ts/function';
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

export const deploy: Stack['admin']['deploy'] = (c) =>
  fs.writeFile('storage.rules', getStorageRule(c.storage?.securityRule?.type === 'allowAll'));

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
              Masmott.GetDownloadUrlError.Union.of.NotFound({})
            )
            .exhaustive()
      )
    )
  );

export const mkStack: MkStack = async () => ({
  admin: {
    deploy,
  },
  client: {
    storage: {
      upload,
      getDownloadUrl,
    },
  },
});
