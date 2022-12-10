import { functions } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

functions.allSuites.forEach((suite) => runSuite({ suite }));
