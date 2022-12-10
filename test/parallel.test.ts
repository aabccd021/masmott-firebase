import { capability, functions } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

[...capability.allSuites, ...functions.allSuites].forEach((suite) => runSuite({ suite }));
