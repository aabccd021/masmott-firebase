import * as admin from 'firebase-admin';
import { apply, reader } from 'fp-ts';
import { makeFunctions, stack } from 'masmott-firebase';

const readerS = apply.sequenceS(reader.Apply);

export const masmottFunctions = makeFunctions({
  functions: { path: '', exportName: '' },
  server: readerS({
    db: readerS(stack.server.db),
  })({
    firebaseAdminApp: admin.initializeApp({ projectId: 'demo' }),
  }),
});

import * as functions from 'firebase-functions';

export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info('Hello logs!', { structuredData: true });
  response.send('Hello from Firebase!');
});
