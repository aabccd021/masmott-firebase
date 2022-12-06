import { execSync } from 'child_process';
import { taskEither } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import * as fs from 'fs/promises';

import type { Stack } from '../type';

const fnsStr = ({ path, exportName }: { readonly path: string; readonly exportName: string }) => `
import * as admin from 'firebase-admin';
import { apply, reader } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { makeFunctions, stack } from 'masmott-firebase';

import { ${exportName} as fns } from '${path}';

const readerS = apply.sequenceS(reader.Apply);

export const masmottFunctions = pipe(
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
      () => fs.writeFile('functions/src/index.ts', fnsStr(p.functions), { encoding: 'utf8' }),
      (details) => ({ code: 'FailedLoadingFunctions' as const, details })
    ),
    taskEither.chainIOK(() => () => execSync('pnpm build', { cwd: 'functions' })),
    taskEither.chainTaskK(() => std.task.sleep(std.date.mkMilliseconds(10000)))
  );
