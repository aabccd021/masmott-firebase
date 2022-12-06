import * as firebaseFunctions from 'firebase-functions';
import { readonlyRecord } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import type { DeployFunctionParam } from 'masmott/dist/cjs/type';
import { match } from 'ts-pattern';

export const makeFunctions = (p: DeployFunctionParam) =>
  pipe(
    p.functions,
    readonlyRecord.map((functionValue) =>
      match(functionValue)
        .with({ trigger: 'onAuthCreated' }, ({ handler }) =>
          firebaseFunctions.auth
            .user()
            .onCreate((authUser) => pipe(handler({ authUser }), std.task.execute))
        )
        .exhaustive()
    )
  );
