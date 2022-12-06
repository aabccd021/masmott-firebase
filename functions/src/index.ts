import * as admin from 'firebase-admin';
import { apply, reader } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { makeFunctions, stack } from 'masmott-firebase';

import { fns } from './a';

const readerS = apply.sequenceS(reader.Apply);

export const masmottFunctions = pipe(
  { firebaseAdminApp: admin.initializeApp({ projectId: 'demo' }) },
  readerS({ db: readerS(stack.server.db) }),
  fns,
  makeFunctions
);
