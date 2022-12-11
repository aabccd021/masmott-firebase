import * as firebaseFunctions from 'firebase-functions';
import { readonlyRecord } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { FunctionsBuilder } from 'masmott';
import { applyServerEnv } from 'masmott';
import { match } from 'ts-pattern';

import { stack } from '..';
import type { StackType } from '../type';

export const makeFunctions = (param: {
  readonly functionsBuilder: FunctionsBuilder;
  readonly env: StackType['env']['server'];
}) =>
  pipe(
    applyServerEnv<StackType>({ stack: stack.server, env: param.env }),
    param.functionsBuilder,
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
