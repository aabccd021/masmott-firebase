import { independence } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

independence.allSuites
  .map((suite) =>
    suite.name === 'functions is independent between test' ? { ...suite, retry: 3 } : suite
  )
  .forEach((suite) => runSuite({ suite }));
