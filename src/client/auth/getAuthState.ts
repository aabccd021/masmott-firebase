import { ioRef, option, task, taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { AuthState } from 'masmott';

import type { Stack } from '../../type';
import { onAuthStateChanged } from './onAuthStateChanged';

type Type = Stack['client']['auth']['getAuthState'];

export const getAuthState: Type = (env) =>
  pipe(
    ioRef.newIORef<AuthState>(option.none),
    task.fromIO,
    task.chain((authStateRef) =>
      pipe(
        task.fromIO(onAuthStateChanged(env)(authStateRef.write)),
        task.chainFirst(() => std.task.sleep(std.date.mkMilliseconds(250))),
        task.chain((unsubscribe) => task.fromIO(unsubscribe)),
        task.chain(() => task.fromIO(authStateRef.read))
      )
    ),
    taskEither.fromTask
  );
