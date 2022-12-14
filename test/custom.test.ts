import { functions } from 'masmott/dist/cjs/test';

import { runSuite } from './util';

runSuite({
  suite: {
    ...functions.onObjectCreated.suite,
    tests: functions.onObjectCreated.suite.tests.filter(
      (test) => test.name === 'onObjectCreated trigger params contains object id'
    ),
  },
});
