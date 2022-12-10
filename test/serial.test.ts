import { independence } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

independence.allSuites.forEach((suite) => runSuite({ suite }));
