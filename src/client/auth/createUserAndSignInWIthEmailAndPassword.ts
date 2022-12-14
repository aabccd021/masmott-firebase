import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import { match } from 'ts-pattern';

import type { Stack } from '../../type';
import { CodedError } from '../../type';

type Type = Stack['client']['auth']['createUserAndSignInWithEmailAndPassword'];

const handleUnknownError = (value: unknown) => ({ code: 'Provider' as const, value });

export const createUserAndSignInWithEmailAndPassword: Type =
  (env) =>
  ({ email, password }) =>
    pipe(
      env.firebaseConfig,
      initializeApp,
      getAuth,
      (auth) =>
        taskEither.tryCatch(
          () => createUserWithEmailAndPassword(auth, email, password),
          flow(
            CodedError.decode,
            either.bimap(handleUnknownError, (codedError) =>
              match(codedError)
                .with({ code: 'auth/email-already-in-use' }, () => ({
                  code: 'EmailAlreadyInUse' as const,
                }))
                .otherwise(handleUnknownError)
            ),
            either.toUnion,
            (err) => ({
              ...err,
              capability: 'client.auth.createUserAndSignInWithEmailAndPassword' as const,
            })
          )
        ),
      taskEither.map((userCredential) => ({ authUser: { uid: userCredential.user.uid } }))
    );
