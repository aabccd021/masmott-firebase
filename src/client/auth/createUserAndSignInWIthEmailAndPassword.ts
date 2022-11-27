import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { either, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import * as Masmott from 'masmott';
import { match } from 'ts-pattern';

import type { Client } from '../../type';
import { CodedError } from '../../type';

type Type = Client['auth']['createUserAndSignInWithEmailAndPassword'];

const handleUnknownError = (unknownError: unknown) =>
  Masmott.CreateUserAndSignInWithEmailAndPasswordError.Union.of.ProviderError({
    value: unknownError,
  });

export const createUserAndSignInWithEmailAndPassword: Type =
  (env) =>
  ({ email, password }) =>
    pipe(env.firebaseConfig, initializeApp, getAuth, (auth) =>
      taskEither.tryCatch(
        async () => {
          // eslint-disable-next-line functional/no-expression-statement
          await createUserWithEmailAndPassword(auth, email, password);
        },
        flow(
          CodedError.type.decode,
          either.bimap(handleUnknownError, (codedError) =>
            match(codedError)
              .with({ code: 'auth/email-already-in-use' }, () =>
                Masmott.CreateUserAndSignInWithEmailAndPasswordError.Union.of.UserAlreadyExists({})
              )
              .otherwise(handleUnknownError)
          ),
          either.toUnion
        )
      )
    );
