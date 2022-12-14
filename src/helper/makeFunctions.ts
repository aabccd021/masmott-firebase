import * as firebaseFunctions from 'firebase-functions';
import { console, readonlyRecord, string, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
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
        .with({ trigger: 'onAuthUserCreated' }, ({ handler }) =>
          firebaseFunctions.auth
            .user()
            .onCreate((authUser) => pipe({ authUser }, handler, std.task.execute))
        )
        .with({ trigger: 'onObjectCreated' }, ({ handler }) =>
          firebaseFunctions.storage.object().onFinalize((object) =>
            pipe(
              object.name,
              taskEither.fromNullable({
                code: 'ProviderError',
                details: 'object name is undefined',
              }),
              taskEither.map(
                flow(string.replace('masmott/', ''), (name) => ({ object: { key: name } }))
              ),
              taskEither.chainFirstIOK(console.log),
              taskEither.chain(handler),
              taskEither.chainFirstIOK(console.log),
              std.task.execute
            )
          )
        )
        .exhaustive()
    )
  );
