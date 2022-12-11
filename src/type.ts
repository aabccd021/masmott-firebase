import type { FirebaseOptions } from 'firebase/app';
import type * as admin from 'firebase-admin';
import * as t from 'io-ts';
import type { StackWithEnv } from 'masmott';

export const CodedError = t.type({
  code: t.string,
});

export type StackType = {
  readonly env: {
    readonly client: {
      readonly firebaseConfig: FirebaseOptions;
    };
    readonly server: {
      readonly firebaseAdminApp: admin.app.App;
    };
    readonly ci: undefined;
  };
};

export type Stack = StackWithEnv<StackType>;
