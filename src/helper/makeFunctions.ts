import * as firebaseFunctions from 'firebase-functions';
import { readonlyRecord, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import { getFunctionsDeployParam } from 'masmott';
import { match } from 'ts-pattern';

export const makeFunctions = flow(
  getFunctionsDeployParam,
  taskEither.map(({ functions }) =>
    pipe(
      functions,
      readonlyRecord.map((functionValue) =>
        match(functionValue)
          .with({ trigger: 'onAuthCreated' }, ({ handler }) =>
            firebaseFunctions.auth
              .user()
              .onCreate((authUser) => pipe(handler({ authUser }), std.task.execute))
          )
          .exhaustive()
      )
    )
  )
);
