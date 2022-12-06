
import * as admin from 'firebase-admin';
import { apply, reader } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { makeFunctions, stack } from 'masmott-firebase';

import { test3Functions as fns } from '/home/aabccd021/ghq/github.com/aabccd021/masmott-firebase/node_modules/.pnpm/masmott@1.13.2_xbpvxrvmp5lyzipg7btlnwttfi/node_modules/masmott/dist/cjs/test/functions.js';

const readerS = apply.sequenceS(reader.Apply);

export const test3Functions = pipe(
  { firebaseAdminApp: admin.initializeApp({ projectId: 'demo' }) },
  readerS({ db: readerS(stack.server.db) }),
  fns,
  makeFunctions
);
