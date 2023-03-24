import { augmentCapability } from 'masmott';

import type { Stack } from '../../type';
import { onSnapshot } from './onSnapshot';

export const getDocWhen: Stack['client']['db']['getDocWhen'] =
  augmentCapability.getDocWhen.fromOnSnapshot(onSnapshot);
