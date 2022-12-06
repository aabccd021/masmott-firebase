import { exec } from 'child_process';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as fs from 'fs/promises';
import { promisify } from 'util';

import type { Stack } from '../type';
import { sleepTest } from '../util';

const fnsStr = ({ path, exportName }: { readonly path: string; readonly exportName: string }) => `
import { env } from './masmott-firebase.server.config'
import { makeFunctions } from 'masmott-firebase';
import { ${exportName} as functionsBuilder } from '${path}';

export const masmottFunctions = makeFunctions({ env, functionsBuilder })
`;

type Type = Stack['ci']['deployFunctions'];
export const deployFunctions: Type = () => (p) =>
  pipe(
    taskEither.tryCatch(
      () =>
        fs
          .mkdir('functions/src', { recursive: true })
          .then(() =>
            fs.writeFile('functions/src/index.ts', fnsStr(p.functions), { encoding: 'utf8' })
          )
          .then(() => promisify(exec)('pnpm build', { cwd: 'functions' })),
      (details) => ({ code: 'FailedLoadingFunctions' as const, details })
    ),
    taskEither.chainTaskK(() => sleepTest(5000))
  );
