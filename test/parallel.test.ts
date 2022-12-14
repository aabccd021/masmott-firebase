import { capability, functions } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

[...capability.allSuites, ...functions.allSuites]
  .map((suite) =>
    suite.name === 'onAuthUserCreated functions'
      ? {
          ...suite,
          tests: suite.tests.map((test) =>
            test.name === 'onAuthCreated trigger can upsert doc'
              ? { ...test, retry: 3, timeOut: 60000 }
              : test
          ),
        }
      : suite
  )
  .forEach((suite) => runSuite({ suite }));
