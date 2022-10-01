import { executeTests } from 'unit-test-ts';
import * as vitest from 'vitest';

import { makeServer } from '../src/';
import { makeTests } from '../src/test';

const tests = makeTests(makeServer);

executeTests(tests, vitest);
