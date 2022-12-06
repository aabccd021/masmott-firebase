/* eslint-disable functional/no-expression-statement */
import { exec } from 'child_process';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as fs from 'fs/promises';
import { promisify } from 'util';

import type { Stack } from '../type';
import { sleepTest } from '../util';

const fnsStr = ({ path, exportName }: { readonly path: string; readonly exportName: string }) => `
import * as admin from 'firebase-admin';
import { apply, reader } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { makeFunctions, stack } from 'masmott-firebase';

import { ${exportName} as fns } from '${path}';

const readerS = apply.sequenceS(reader.Apply);

export const ${exportName} = pipe(
  { firebaseAdminApp: admin.initializeApp({ projectId: 'demo' }) },
  readerS({ db: readerS(stack.server.db) }),
  fns,
  makeFunctions
);
`;

type Type = Stack['ci']['deployFunctions'];
export const deployFunctions: Type = () => (p) =>
  pipe(
    taskEither.tryCatch(
      async () => {
        console.time('writeFile');
        await fs.writeFile('functions/src/index.ts', fnsStr(p.functions), { encoding: 'utf8' });
        console.timeEnd('writeFile');
        console.time('pnpm build');
        const a = await promisify(exec)('pnpm build', { cwd: 'functions' });
        console.log(a);
        console.timeEnd('pnpm build');
      },
      (details) => ({ code: 'FailedLoadingFunctions' as const, details })
    ),
    taskEither.chainTaskK(() => sleepTest)
  );
