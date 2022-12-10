import { capability } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

capability.allSuites.forEach((suite) => runSuite({ suite }));
