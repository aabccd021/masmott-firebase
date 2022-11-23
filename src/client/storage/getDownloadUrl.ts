import { initializeApp } from 'firebase/app';
import { getDownloadURL, getStorage, ref } from 'firebase/storage';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import * as Masmott from 'masmott';
import { Stack } from 'masmott';
import { match } from 'ts-pattern';

import { ClientEnv, GetDownloadUrlError } from '../../type';

export const getDownloadUrl: Stack<ClientEnv>['client']['storage']['getDownloadUrl'] =
  (env) =>
  ({ key }) =>
    pipe(
      env.client.firebaseConfig,
      initializeApp,
      getStorage,
      (storage) => ref(storage, key),
      (objectRef) =>
        taskEither.tryCatch(
          () => getDownloadURL(objectRef),
          flow(
            GetDownloadUrlError.type.decode,
            either.match(
              (unknownErr) => Masmott.GetDownloadUrlError.Union.of.Unknown({ value: unknownErr }),
              (knownErr) =>
                match(knownErr)
                  .with({ code: 'storage/object-not-found' }, (_) =>
                    Masmott.GetDownloadUrlError.Union.of.FileNotFound({})
                  )
                  .exhaustive()
            )
          )
        )
    );
