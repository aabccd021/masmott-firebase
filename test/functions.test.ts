import { functions, independence } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

functions.allSuites.forEach((suite) => runSuite({ suite }));

[
  independence.functions,
  ...functions.allSuites
].forEach((suite) => runSuite({ suite }));
