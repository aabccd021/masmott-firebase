import { capability, independence } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

[
  independence.db,
  independence.storage,
  independence.authUser,
  independence.serverDb,
  independence.authState,
  ...capability.allSuites,
].forEach((suite) => runSuite({ suite }));
