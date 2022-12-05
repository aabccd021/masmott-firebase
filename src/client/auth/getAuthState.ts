import { augmentCapability } from 'masmott';

import type { Stack } from '../../type';
import { onAuthStateChanged } from './onAuthStateChanged';

type Type = Stack['client']['auth']['getAuthState'];

export const getAuthState: Type =
  augmentCapability.getAuthState.fromOnAuthStateChanged(onAuthStateChanged);
