/* eslint-disable functional/no-conditional-statement */
import { either, io, ioEither, ioOption } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { flow, pipe } from 'fp-ts/function';
// eslint-disable-next-line fp-ts/no-module-imports
import { chainTaskK, chainW as then } from 'fp-ts/TaskEither';
import type { DocData, FunctionsBuilder } from 'masmott';

import type { Test } from './aab';

const path = __filename;

export const independencyFunctions: FunctionsBuilder = (server) => ({
  functions: {
    createDocOnAuthCreated: {
      trigger: 'onAuthCreated',
      handler: () =>
        server.db.upsertDoc({
          key: { collection: 'detection', id: '1' },
          data: { status: 'true' },
        }),
    },
  },
});

export const independencyTest1: Test<unknown> = {
  name: `a test can deploy trigger`,
  expect: ({ client, ci, server }) =>
    pipe(
      ci.deployDb({
        detection: {
          schema: { status: { type: 'StringField' } },
          securityRule: { get: { type: 'True' } },
        },
      }),
      then(() =>
        ci.deployFunctions({
          functions: { path, exportName: 'independencyFunctions' },
          server,
        })
      ),
      then(() =>
        client.auth.createUserAndSignInWithEmailAndPassword({
          email: 'kira@sakurazaka.com',
          password: 'dorokatsu',
        })
      ),
      chainTaskK(
        () => () =>
          new Promise<DocData>((resolve) =>
            client.db.onSnapshot({
              key: { collection: 'detection', id: '1' },
              onChanged: flow(
                ioEither.fromEither,
                ioEither.chainIOK(
                  flow(
                    ioOption.fromOption,
                    ioOption.chainIOK((value) => () => resolve(value))
                  )
                ),
                io.map((_: Either<unknown, unknown>) => undefined)
              ),
            })()
          )
      )
    ),
  toResult: either.right({ status: 'true' }),
};

export const independencyTest2: Test<unknown> = {
  name: `another test shouldn't be affected by trigger from another test`,
  type: 'fail',
  expect: ({ client, ci }) =>
    pipe(
      ci.deployDb({
        detection: {
          schema: { status: { type: 'StringField' } },
          securityRule: { get: { type: 'True' } },
        },
      }),
      then(() =>
        client.auth.createUserAndSignInWithEmailAndPassword({
          email: 'kira@sakurazaka.com',
          password: 'dorokatsu',
        })
      ),
      chainTaskK(
        () => () =>
          new Promise<DocData>((resolve) =>
            client.db.onSnapshot({
              key: { collection: 'detection', id: '1' },
              onChanged: flow(
                ioEither.fromEither,
                ioEither.chainIOK(
                  flow(
                    ioOption.fromOption,
                    ioOption.chainIOK((value) => () => resolve(value))
                  )
                ),
                io.map((_: Either<unknown, unknown>) => undefined)
              ),
            })()
          )
      )
    ),
  toResult: either.right({ status: 'true' }),
};

export const test2Functions: FunctionsBuilder = (server) => ({
  functions: {
    detectUserExists: {
      trigger: 'onAuthCreated',
      handler: () =>
        server.db.upsertDoc({
          key: { collection: 'detection', id: '1' },
          data: { status: 'true' },
        }),
    },
  },
});

export const test2: Test<unknown> = {
  name: `onAuthCreated trigger can upsert doc`,
  expect: ({ client, ci, server }) =>
    pipe(
      ci.deployDb({
        detection: {
          schema: { status: { type: 'StringField' } },
          securityRule: { get: { type: 'True' } },
        },
      }),
      then(() =>
        ci.deployFunctions({
          functions: { path, exportName: 'test2Functions' },
          server,
        })
      ),
      then(() =>
        client.auth.createUserAndSignInWithEmailAndPassword({
          email: 'kira@sakurazaka.com',
          password: 'dorokatsu',
        })
      ),
      chainTaskK(
        () => () =>
          new Promise<DocData>((resolve) =>
            client.db.onSnapshot({
              key: { collection: 'detection', id: '1' },
              onChanged: flow(
                ioEither.fromEither,
                ioEither.chainIOK(
                  flow(
                    ioOption.fromOption,
                    ioOption.chainIOK((value) => () => resolve(value))
                  )
                ),
                io.map((_: Either<unknown, unknown>) => undefined)
              ),
            })()
          )
      )
    ),
  toResult: either.right({ status: 'true' }),
};

export const test3Functions: FunctionsBuilder = (server) => ({
  functions: {
    detectUserExists: {
      trigger: 'onAuthCreated',
      handler: () =>
        server.db.upsertDoc({
          key: { collection: 'detection', id: '1' },
          data: { status: 'true' },
        }),
    },
  },
});

export const test3: Test<unknown> = {
  name: `onAuthCreated trigger should not be called if not triggered`,
  type: 'fail',
  expect: ({ client, ci, server }) =>
    pipe(
      ci.deployDb({
        detection: {
          schema: { status: { type: 'StringField' } },
          securityRule: { get: { type: 'True' } },
        },
      }),
      then(() =>
        ci.deployFunctions({
          functions: { path, exportName: 'test3Functions' },
          server,
        })
      ),
      chainTaskK(
        () => () =>
          new Promise<DocData>((resolve) =>
            client.db.onSnapshot({
              key: { collection: 'detection', id: '1' },
              onChanged: flow(
                ioEither.fromEither,
                ioEither.chainIOK(
                  flow(
                    ioOption.fromOption,
                    ioOption.chainIOK((value) => () => resolve(value))
                  )
                ),
                io.map((_: Either<unknown, unknown>) => undefined)
              ),
            })()
          )
      )
    ),
  toResult: either.right({ status: 'true' }),
};

export const test4: Test<unknown> = {
  name: `document should not be created if trigger not deployed`,
  type: 'fail',
  expect: ({ client, ci }) =>
    pipe(
      ci.deployDb({
        detection: {
          schema: { status: { type: 'StringField' } },
          securityRule: { get: { type: 'True' } },
        },
      }),
      then(() =>
        client.auth.createUserAndSignInWithEmailAndPassword({
          email: 'kira@sakurazaka.com',
          password: 'dorokatsu',
        })
      ),
      chainTaskK(
        () => () =>
          new Promise<DocData>((resolve) =>
            client.db.onSnapshot({
              key: { collection: 'detection', id: '1' },
              onChanged: flow(
                ioEither.fromEither,
                ioEither.chainIOK(
                  flow(
                    ioOption.fromOption,
                    ioOption.chainIOK((value) => () => resolve(value))
                  )
                ),
                io.map((_: Either<unknown, unknown>) => undefined)
              ),
            })()
          )
      )
    ),
  toResult: either.right({ status: 'true' }),
};
