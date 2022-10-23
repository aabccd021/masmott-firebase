/* eslint-disable functional/no-conditional-statement */
/* eslint-disable functional/no-expression-statement */
import { FirebaseError, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import {
  connectStorageEmulator,
  getStorage,
  ref,
  UploadResult,
  uploadString,
} from 'firebase/storage';
import { task, taskEither } from 'fp-ts';
import { writeFile } from 'fs/promises';

import { MakeServer } from './test';

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

const cr = (email: string, password: string) => () =>
  createUserWithEmailAndPassword(auth, email, password).then(console.log);

export type FParams = {
  readonly client: {
    readonly storage: {
      readonly upload: {
        readonly return: {
          readonly left: unknown;
          readonly right: UploadResult;
        };
      };
    };
  };
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const makeServer: MakeServer<FParams> = task.of({
  admin: {
    migrate:
      ({ allow }) =>
      async () => {
        if (allow) {
          console.log(allow);
          await writeFile(
            'storage.rules',
            `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
`
          );
        } else {
          console.log(allow);
          await writeFile(
            'storage.rules',
            `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
`
          );
        }
        await delay(10);
      },
  },
  client: {
    storage: {
      upload: () =>
        taskEither.tryCatch(
          () => uploadString(ref(storage, 'a'), 'emp'),
          (e) => {
            console.log(e);
            if (e instanceof FirebaseError) {
              if (e.code === 'storage/unauthorized') {
                return { type: 'unauthorized' };
              }
            }
            return { type: 'unknown' };
          }
        ),
    },
    auth: {
      signIn: () => cr('aab@gmail.com', 'aabccd'),
    },
  },
});
