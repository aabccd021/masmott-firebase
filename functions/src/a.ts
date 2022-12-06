import type { DeployFunctionParam, Stack } from 'masmott';
type Type = (server: Stack.server.Type) => DeployFunctionParam;

export const fns: Type = (server) => ({
  functions: {
    detectUserExists: {
      trigger: 'onAuthCreated',
      handler: () =>
        server.db.upsertDoc({
          key: { collection: 'detection', id: '1' },
          data: { status: 'true' },
        }),
    },
  },
});
