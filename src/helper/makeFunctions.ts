import * as firebaseFunctions from 'firebase-functions';
import { apply, reader, readonlyRecord } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { DeployFunctionParam, Stack } from 'masmott';
import { match } from 'ts-pattern';

import type { StackType } from '..';
import { stack } from '..';

export type FunctionsBuilder = (server: Stack.server.Type) => DeployFunctionParam;

const readerS = apply.sequenceS(reader.Apply);

export const makeFunctions = (p: {
  readonly env: StackType['env']['server'];
  readonly functionsBuilder: FunctionsBuilder;
}) =>
  pipe(
    p.env,
    readerS({ db: readerS(stack.server.db) }),
    p.functionsBuilder,
    ({ functions }) => functions,
    readonlyRecord.map((functionValue) =>
      match(functionValue)
        .with({ trigger: 'onAuthCreated' }, ({ handler }) =>
          firebaseFunctions.auth
            .user()
            .onCreate((authUser) => pipe({ authUser }, handler, std.task.execute))
        )
        .exhaustive()
    )
  );
