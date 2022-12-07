/* eslint-disable fp-ts/no-module-imports */
import { apply, either, io, ioRef, option, reader } from 'fp-ts';
import type { Either } from 'fp-ts/Either';
import { identity, pipe } from 'fp-ts/function';
import type { TaskEither } from 'fp-ts/TaskEither';
import {
  chainEitherKW,
  chainW as then,
  fromIO,
  fromIOEither,
  map,
  right,
  tryCatch,
} from 'fp-ts/TaskEither';
import type { AuthState, Stack, StackType, StackWithEnv } from 'masmott';
import fetch from 'node-fetch';
import { describe, expect, test as test_ } from 'vitest';

import * as functions from './functions';

const readerS = apply.sequenceS(reader.Apply);

export type Test<T> = {
  readonly name: string;
  readonly expect: (stack: Stack.Type) => TaskEither<unknown, T>;
  readonly toResult: Either<unknown, T>;
  readonly type?: 'fail';
};

const mkTest =
  <T extends StackType>(stack: StackWithEnv<T>, getTestEnv: TaskEither<unknown, T['env']>) =>
  <R>({ name, expect: fn, toResult, type }: Test<R>) =>
    (type === 'fail' ? test_.fails : test_)(name, async () => {
      const result = pipe(
        getTestEnv,
        map(({ client, ci, server }) => ({
          client: readerS({
            auth: readerS(stack.client.auth),
            db: readerS(stack.client.db),
            storage: readerS(stack.client.storage),
          })(client),
          ci: readerS(stack.ci)(ci),
          server: readerS({
            db: readerS(stack.server.db),
          })(server),
        })),
        then(fn)
      );
      expect(await result()).toEqual(toResult);
    });

export const runTests = <T extends StackType>(
  realStack: StackWithEnv<T>,
  getTestEnv: TaskEither<unknown, T['env']>
) => {
  const test = mkTest(realStack, getTestEnv);

  describe('storage is independent between tests', () => {
    test({
      name: 'a server can upload file kira',
      expect: ({ client, ci }) =>
        pipe(
          ci.deployStorage({ securityRule: { type: 'allowAll' } }),
          then(() => client.storage.uploadDataUrl({ key: 'kira_key', dataUrl: 'data:,foo' })),
          then(() => client.storage.getDownloadUrl({ key: 'kira_key' })),
          then(() => right('download success'))
        ),
      toResult: either.right('download success'),
    });

    test({
      name: 'server from another test can not access file kira',
      expect: ({ client, ci }) =>
        pipe(
          ci.deployStorage({ securityRule: { type: 'allowAll' } }),
          then(() => client.storage.getDownloadUrl({ key: 'kira_key' })),
          then(() => right('download success'))
        ),
      toResult: either.left({ code: 'FileNotFound' }),
    });
  });

  describe('db is independent between tests', () => {
    test({
      name: 'a server can create document kira',
      expect: ({ client, ci }) =>
        pipe(
          ci.deployDb({
            user: {
              schema: { name: { type: 'StringField' } },
              securityRule: {
                create: { type: 'True' },
                get: { type: 'True' },
              },
            },
          }),
          then(() =>
            client.db.upsertDoc({
              key: { collection: 'user', id: 'kira_id' },
              data: { name: 'masumoto' },
            })
          ),
          then(() => client.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
        ),
      toResult: either.right(option.some({ name: 'masumoto' })),
    });

    test({
      name: 'server from another test can not access document kira',
      expect: ({ client, ci }) =>
        pipe(
          ci.deployDb({
            user: {
              schema: { name: { type: 'StringField' } },
              securityRule: {
                create: { type: 'True' },
                get: { type: 'True' },
              },
            },
          }),
          then(() => client.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
        ),
      toResult: either.right(option.none),
    });
  });

  describe('db is independent between tests using server API', () => {
    test({
      name: 'a server can create document kira',
      expect: ({ server, ci }) =>
        pipe(
          ci.deployDb({
            user: {
              schema: { name: { type: 'StringField' } },
              securityRule: {
                create: { type: 'True' },
                get: { type: 'True' },
              },
            },
          }),
          then(() =>
            server.db.upsertDoc({
              key: { collection: 'user', id: 'kira_id' },
              data: { name: 'masumoto' },
            })
          ),
          then(() => server.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
        ),
      toResult: either.right(option.some({ name: 'masumoto' })),
    });

    test({
      name: 'another test can not access document kira using server API',
      expect: ({ server, ci }) =>
        pipe(
          ci.deployDb({
            user: {
              schema: { name: { type: 'StringField' } },
              securityRule: {
                create: { type: 'True' },
                get: { type: 'True' },
              },
            },
          }),
          then(() => server.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
        ),
      toResult: either.right(option.none),
    });
  });

  describe('user is independent between test', () => {
    test({
      name: 'a test can create user kira for the first time and return error for the second time',
      expect: ({ client }) =>
        pipe(
          client.auth.createUserAndSignInWithEmailAndPassword({
            email: 'kira@sakurazaka.com',
            password: 'dorokatsu',
          }),
          then(() =>
            client.auth.createUserAndSignInWithEmailAndPassword({
              email: 'kira@sakurazaka.com',
              password: 'dorokatsu',
            })
          ),
          then(() => right('create user kira two times success'))
        ),
      toResult: either.left({ code: 'EmailAlreadyInUse' }),
    });

    test({
      name: 'another test can create the same user',
      expect: ({ client }) =>
        pipe(
          client.auth.createUserAndSignInWithEmailAndPassword({
            email: 'kira@sakurazaka.com',
            password: 'dorokatsu',
          }),
          then(() => right('create user kira success'))
        ),
      toResult: either.right('create user kira success'),
    });
  });

  describe('sign in state is independent between test', () => {
    test({
      name: 'a test can sign in and change state to signed in',
      expect: ({ client }) =>
        pipe(
          client.auth.createUserAndSignInWithEmailAndPassword({
            email: 'kira@sakurazaka.com',
            password: 'dorokatsu',
          }),
          then(() => client.auth.getAuthState),
          map(option.isSome)
        ),
      toResult: either.right(true),
    });

    test({
      name: 'another test should initially signed out',
      expect: ({ client }) => pipe(client.auth.getAuthState, map(option.isSome)),
      toResult: either.right(false),
    });
  });

  describe.only('functions is independent between test', () => {
    test(functions.independencyTest1);
    test(functions.independencyTest2);
  });

  test({
    name: 'can upload data url and get download url',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployStorage({ securityRule: { type: 'allowAll' } }),
        then(() =>
          client.storage.uploadDataUrl({
            key: 'kira_key',
            dataUrl: `data:;base64,${Buffer.from('kira masumoto').toString('base64')}`,
          })
        ),
        then(() => client.storage.getDownloadUrl({ key: 'kira_key' })),
        then((url) => tryCatch(() => fetch(url), identity)),
        then((downloadResult) => tryCatch(() => downloadResult.text(), identity))
      ),
    toResult: either.right('kira masumoto'),
  });

  test({
    name: 'return left on invalid dataUrl upload',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployStorage({ securityRule: { type: 'allowAll' } }),
        then(() => client.storage.uploadDataUrl({ key: 'kira_key', dataUrl: 'invalidDataUrl' }))
      ),
    toResult: either.left({ code: 'InvalidDataUrlFormat' }),
  });

  test({
    name: 'initial auth state is signed out',
    expect: ({ client }) =>
      pipe(
        ioRef.newIORef<AuthState>(option.none),
        io.chain((authStateRef) =>
          pipe(
            client.auth.onAuthStateChanged(authStateRef.write),
            io.chain(() => authStateRef.read)
          )
        ),
        fromIO
      ),
    toResult: either.right(option.none),
  });

  test({
    name: 'auth state changes to signed in after sign in',
    expect: ({ client }) =>
      pipe(
        fromIO(ioRef.newIORef<AuthState>(option.none)),
        then((authStateRef) =>
          pipe(
            fromIO(client.auth.onAuthStateChanged(authStateRef.write)),
            then(() =>
              client.auth.createUserAndSignInWithEmailAndPassword({
                email: 'kira@sakurazaka.com',
                password: 'dorokatsu',
              })
            ),
            then(() => fromIO(authStateRef.read))
          )
        ),
        map(option.isSome)
      ),
    toResult: either.right(true),
  });

  test({
    name: 'auth state changes to signed in after sign in when subscribed',
    expect: ({ client }) =>
      pipe(
        fromIO(ioRef.newIORef<AuthState>(option.none)),
        then((authStateRef) =>
          pipe(
            client.auth.createUserAndSignInWithEmailAndPassword({
              email: 'kira@sakurazaka.com',
              password: 'dorokatsu',
            }),
            then(() => fromIO(client.auth.onAuthStateChanged(authStateRef.write))),
            then(() => fromIO(authStateRef.read))
          )
        ),
        map(option.isSome)
      ),
    toResult: either.right(true),
  });

  test({
    name: 'auth state changes to signed out after sign in and then sign out',
    expect: ({ client }) =>
      pipe(
        fromIO(ioRef.newIORef<AuthState>(option.none)),
        then((authStateRef) =>
          pipe(
            fromIO(client.auth.onAuthStateChanged(authStateRef.write)),
            then(() =>
              client.auth.createUserAndSignInWithEmailAndPassword({
                email: 'kira@sakurazaka.com',
                password: 'dorokatsu',
              })
            ),
            then(() => client.auth.signOut),
            then(() => fromIO(authStateRef.read))
          )
        )
      ),
    toResult: either.right(option.none),
  });

  test({
    name: 'auth state changes to signed out after sign in and then sign out and subscribe',
    expect: ({ client }) =>
      pipe(
        fromIO(ioRef.newIORef<AuthState>(option.none)),
        then((authStateRef) =>
          pipe(
            client.auth.createUserAndSignInWithEmailAndPassword({
              email: 'kira@sakurazaka.com',
              password: 'dorokatsu',
            }),
            then(() => client.auth.signOut),
            then(() => fromIO(client.auth.onAuthStateChanged(authStateRef.write))),
            then(() => fromIO(authStateRef.read))
          )
        )
      ),
    toResult: either.right(option.none),
  });

  test({
    name: `auth state changes to signed out after sign in and then sign out when subscribed in between`,
    expect: ({ client }) =>
      pipe(
        fromIO(ioRef.newIORef<AuthState>(option.none)),
        then((authStateRef) =>
          pipe(
            client.auth.createUserAndSignInWithEmailAndPassword({
              email: 'kira@sakurazaka.com',
              password: 'dorokatsu',
            }),
            then(() => fromIO(client.auth.onAuthStateChanged(authStateRef.write))),
            then(() => client.auth.signOut),
            then(() => fromIO(authStateRef.read))
          )
        )
      ),
    toResult: either.right(option.none),
  });

  test({
    name: 'auth state does not change after unsubscribed',
    expect: ({ client }) =>
      pipe(
        fromIO(ioRef.newIORef<AuthState>(option.none)),
        then((authStateRef) =>
          pipe(
            fromIO(client.auth.onAuthStateChanged(authStateRef.write)),
            then((unsubscribe) => fromIO(unsubscribe)),
            then(() =>
              client.auth.createUserAndSignInWithEmailAndPassword({
                email: 'kira@sakurazaka.com',
                password: 'dorokatsu',
              })
            ),
            then(() => fromIO(authStateRef.read))
          )
        )
      ),
    toResult: either.right(option.none),
  });

  test({
    name: 'can client.db.upsertDoc and client.db.getDoc',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              create: { type: 'True' },
              get: { type: 'True' },
            },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() => client.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
      ),
    toResult: either.right(option.some({ name: 'masumoto' })),
  });

  test({
    name: 'client.db.getDoc always returns the latest doc state',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              create: { type: 'True' },
              get: { type: 'True' },
            },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'dorokatsu' },
          })
        ),
        then(() => client.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
      ),
    toResult: either.right(option.some({ name: 'dorokatsu' })),
  });

  test({
    name: 'can client.db.upsertDoc and get doc with client.db.onSnapshot',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              create: { type: 'True' },
              get: { type: 'True' },
            },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() =>
          fromIO(
            ioRef.newIORef<Stack.client.db.OnSnapshot.DocState>(
              either.left({ code: 'ProviderError' as const, value: 'not saved' })
            )
          )
        ),
        then((docState) =>
          pipe(
            client.db.onSnapshot({
              key: { collection: 'user', id: 'kira_id' },
              onChanged: docState.write,
            }),
            io.chain(() => docState.read),
            fromIOEither
          )
        )
      ),
    toResult: either.right(option.some({ name: 'masumoto' })),
  });

  test({
    name: 'client.db.onSnapshot always returns the latest doc state',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              create: { type: 'True' },
              get: { type: 'True' },
            },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'dorokatsu' },
          })
        ),
        then(() =>
          fromIO(
            ioRef.newIORef<Stack.client.db.OnSnapshot.DocState>(
              either.left({ code: 'ProviderError' as const, value: 'not saved' })
            )
          )
        ),
        then((docState) =>
          pipe(
            client.db.onSnapshot({
              key: { collection: 'user', id: 'kira_id' },
              onChanged: docState.write,
            }),
            io.chain(() => docState.read),
            fromIOEither
          )
        )
      ),
    toResult: either.right(option.some({ name: 'dorokatsu' })),
  });

  test({
    name: 'client.db.onSnapshot callback does not called after unsubscribed',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              create: { type: 'True' },
              get: { type: 'True' },
            },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() =>
          fromIO(
            ioRef.newIORef<Stack.client.db.OnSnapshot.DocState>(
              either.left({ code: 'ProviderError' as const, value: 'not saved' })
            )
          )
        ),
        then((docState) =>
          pipe(
            fromIO(
              client.db.onSnapshot({
                key: { collection: 'user', id: 'kira_id' },
                onChanged: docState.write,
              })
            ),
            then((unsubscribe) => fromIO(unsubscribe)),
            then(() =>
              client.db.upsertDoc({
                key: { collection: 'user', id: 'kira_id' },
                data: { name: 'dorokatsu' },
              })
            ),
            then(() => fromIOEither(docState.read))
          )
        )
      ),
    toResult: either.right(option.some({ name: 'masumoto' })),
  });

  test({
    name: 'can not get doc if forbidden',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              create: { type: 'True' },
            },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() => client.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: 'client.db.onSnapshot returns left if forbidden',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              create: { type: 'True' },
            },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() =>
          fromIO(
            ioRef.newIORef<Stack.client.db.OnSnapshot.DocState>(
              either.left({ code: 'ProviderError' as const, value: 'not saved' })
            )
          )
        ),
        then((docState) =>
          pipe(
            client.db.onSnapshot({
              key: { collection: 'user', id: 'kira_id' },
              onChanged: docState.write,
            }),
            io.chain(() => docState.read),
            fromIOEither
          )
        )
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: 'can upsert doc',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: { create: { type: 'True' } },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() => right('upload success'))
      ),
    toResult: either.right('upload success'),
  });

  test({
    name: 'fail upsert doc if not explicitly allowed',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        )
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: 'fail upsert doc if string given when int field required',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'IntField' } },
            securityRule: { create: { type: 'True' } },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        )
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: 'fail upsert doc if int given when string field required',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: { create: { type: 'True' } },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 46 },
          })
        )
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: 'fail upsert doc if schema not specified',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: {},
            securityRule: { create: { type: 'True' } },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        )
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: 'can not get doc if forbidden, even if the doc absent',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
          },
        }),
        then(() => client.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: 'client.db.getDoc returns ForbiddenError if forbidden and document absent',
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
          },
        }),
        then(() =>
          fromIO(
            ioRef.newIORef<Stack.client.db.OnSnapshot.DocState>(
              either.left({ code: 'ProviderError' as const, value: 'not saved' })
            )
          )
        ),
        then((docState) =>
          pipe(
            client.db.onSnapshot({
              key: { collection: 'user', id: 'kira_id' },
              onChanged: docState.write,
            }),
            io.chain(() => docState.read),
            fromIOEither
          )
        )
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: 'initial result of getAuthState is signed out',
    expect: ({ client }) => client.auth.getAuthState,
    toResult: either.right(option.none),
  });

  test({
    name: 'getAuthState returns signed in after sign in',
    expect: ({ client }) =>
      pipe(
        client.auth.createUserAndSignInWithEmailAndPassword({
          email: 'kira@sakurazaka.com',
          password: 'dorokatsu',
        }),
        then(() => client.auth.getAuthState),
        map(option.isSome)
      ),
    toResult: either.right(true),
  });

  test({
    name: 'server API can upsert and get doc',
    expect: ({ server, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              create: { type: 'True' },
              get: { type: 'True' },
            },
          },
        }),
        then(() =>
          server.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() => server.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
      ),
    toResult: either.right(option.some({ name: 'masumoto' })),
  });

  test({
    name: 'server db API can get doc even if forbidden by security rule',
    expect: ({ server, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              create: { type: 'True' },
            },
          },
        }),
        then(() =>
          server.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() => server.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
      ),
    toResult: either.right(option.some({ name: 'masumoto' })),
  });

  test({
    name: 'server db API can upsert doc',
    expect: ({ server, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: { create: { type: 'True' } },
          },
        }),
        then(() =>
          server.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() => right('upload success'))
      ),
    toResult: either.right('upload success'),
  });

  test({
    name: 'server db API can upsert doc if not explicitly allowed',
    expect: ({ server, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: { get: { type: 'True' } },
          },
        }),
        then(() =>
          server.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() => right('upload success'))
      ),
    toResult: either.right('upload success'),
  });

  test({
    name: 'server db API can get doc if forbidden, even if the doc absent',
    expect: ({ server, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
          },
        }),
        then(() => server.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
      ),
    toResult: either.right(option.none),
  });

  test({
    name: 'getAuthState returns signed out after sign in and then sign out',
    expect: ({ client }) =>
      pipe(
        client.auth.createUserAndSignInWithEmailAndPassword({
          email: 'kira@sakurazaka.com',
          password: 'dorokatsu',
        }),
        then(() => client.auth.signOut),
        then(() => client.auth.getAuthState)
      ),
    toResult: either.right(option.none),
  });

  test({
    name: `can create tweet if owner field value is owner's auth uid`,
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          tweet: {
            schema: { owner: { type: 'StringField' } },
            securityRule: {
              create: {
                type: 'Equal',
                compare: [{ type: 'AuthUid' }, { type: 'DocumentField', fieldName: 'owner' }],
              },
            },
          },
        }),
        then(() =>
          client.auth.createUserAndSignInWithEmailAndPassword({
            email: 'kira@sakurazaka.com',
            password: 'dorokatsu',
          })
        ),
        then(() => client.auth.getAuthState),
        chainEitherKW(either.fromOption(() => ({ code: 'user not signed in' }))),
        then((authUser) =>
          client.db.upsertDoc({
            key: { collection: 'tweet', id: '1' },
            data: { owner: authUser.uid },
          })
        ),
        map(() => 'upsert success')
      ),
    toResult: either.right('upsert success'),
  });

  test({
    name: `can not create tweet if owner field value is not owner's auth uid, even if signed in`,
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          tweet: {
            schema: { owner: { type: 'StringField' } },
            securityRule: {
              create: {
                type: 'Equal',
                compare: [{ type: 'AuthUid' }, { type: 'DocumentField', fieldName: 'owner' }],
              },
            },
          },
        }),
        then(() =>
          client.auth.createUserAndSignInWithEmailAndPassword({
            email: 'kira@sakurazaka.com',
            password: 'dorokatsu',
          })
        ),
        then(() => client.auth.getAuthState),
        chainEitherKW(either.fromOption(() => ({ code: 'user not signed in' }))),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'tweet', id: '1' },
            data: { owner: 'random auth user uid' },
          })
        )
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: `can not create tweet if not signed in`,
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          tweet: {
            schema: { owner: { type: 'StringField' } },
            securityRule: {
              create: {
                type: 'Equal',
                compare: [{ type: 'AuthUid' }, { type: 'DocumentField', fieldName: 'owner' }],
              },
            },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'tweet', id: '1' },
            data: { owner: 'random auth user uid' },
          })
        )
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: `server db API can create tweet even if not signed in`,
    expect: ({ server, ci }) =>
      pipe(
        ci.deployDb({
          tweet: {
            schema: { owner: { type: 'StringField' } },
            securityRule: {
              create: {
                type: 'Equal',
                compare: [{ type: 'AuthUid' }, { type: 'DocumentField', fieldName: 'owner' }],
              },
            },
          },
        }),
        then(() =>
          server.db.upsertDoc({
            key: { collection: 'tweet', id: '1' },
            data: { owner: 'random auth user uid' },
          })
        ),
        map(() => 'upsert success')
      ),
    toResult: either.right('upsert success'),
  });

  test({
    name: `can not create tweet if not signed in, swap comparation`,
    expect: ({ client, ci }) =>
      pipe(
        ci.deployDb({
          tweet: {
            schema: { owner: { type: 'StringField' } },
            securityRule: {
              create: {
                type: 'Equal',
                compare: [{ type: 'DocumentField', fieldName: 'owner' }, { type: 'AuthUid' }],
              },
            },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'tweet', id: '1' },
            data: { owner: 'random auth user uid' },
          })
        )
      ),
    toResult: either.left({ code: 'ForbiddenError' }),
  });

  test({
    name: 'can upsert on server and get doc on client',
    expect: ({ server, client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              get: { type: 'True' },
            },
          },
        }),
        then(() =>
          server.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() => client.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
      ),
    toResult: either.right(option.some({ name: 'masumoto' })),
  });

  test({
    name: 'can server.db.upsertDoc then client.db.onSnapshot',
    expect: ({ client, ci, server }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: {
              get: { type: 'True' },
            },
          },
        }),
        then(() =>
          server.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() =>
          fromIO(
            ioRef.newIORef<Stack.client.db.OnSnapshot.DocState>(
              either.left({ code: 'ProviderError' as const, value: 'not saved' })
            )
          )
        ),
        then((docState) =>
          pipe(
            client.db.onSnapshot({
              key: { collection: 'user', id: 'kira_id' },
              onChanged: docState.write,
            }),
            io.chain(() => docState.read),
            fromIOEither
          )
        )
      ),
    toResult: either.right(option.some({ name: 'masumoto' })),
  });

  test({
    name: 'can upsert on client and get doc on server',
    expect: ({ server, client, ci }) =>
      pipe(
        ci.deployDb({
          user: {
            schema: { name: { type: 'StringField' } },
            securityRule: { create: { type: 'True' } },
          },
        }),
        then(() =>
          client.db.upsertDoc({
            key: { collection: 'user', id: 'kira_id' },
            data: { name: 'masumoto' },
          })
        ),
        then(() => server.db.getDoc({ key: { collection: 'user', id: 'kira_id' } }))
      ),
    toResult: either.right(option.some({ name: 'masumoto' })),
  });

  test(functions.test2);
  test(functions.test3);
  test(functions.test4);
};
