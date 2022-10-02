import { either, task, taskEither, taskOption } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { expect, Tests } from 'unit-test-ts';

export type Params = {
  readonly client: {
    readonly storage: {
      readonly upload: {
        readonly return: {
          readonly left: unknown;
          readonly right: unknown;
        };
      };
    };
  };
};

export type TableDBTriggers = unknown;

export type DocKey = {
  readonly table: string;
  readonly id: string;
};

export type DocData = Record<string, unknown>;

export type DocSnapshot = {
  readonly key: DocKey;
  readonly data: DocData;
};

export type StorageAdmin = {
  readonly upload: () => task.Task<unknown>;
  readonly download: (id: string) => taskOption.TaskOption<Blob>;
};

export type ReadonlyStorageAdmin = Pick<StorageAdmin, 'download'>;

export type WriteonlyStorageAdmin = Omit<StorageAdmin, keyof ReadonlyStorageAdmin>;

export type StorageTriggers = {
  readonly onUploaded?: (id: string) => task.Task<unknown>;
};

export type UploadError = {
  readonly type: 'unauthorized' | 'unknown';
};

export type StorageClientUpload<T extends Params['client']['storage']['upload']> =
  () => taskEither.TaskEither<UploadError & T['return']['left'], T['return']['right']>;

export type StorageClient<T extends Params['client']['storage']> = {
  readonly upload: StorageClientUpload<T['upload']>;
};

export type DBClient = {
  readonly setDoc: (snapshot: DocSnapshot) => task.Task<unknown>;
  readonly getDoc: (key: DocKey) => taskOption.TaskOption<DocData>;
};

export type TableDBAdmin = {
  readonly setDoc: (snapshot: DocSnapshot) => task.Task<unknown>;
  readonly getDoc: (key: DocKey) => taskOption.TaskOption<DocData>;
};

export type Config = {
  readonly storage?: (storage: ReadonlyStorageAdmin) => StorageTriggers;
  readonly db?: (storage: TableDBAdmin) => TableDBTriggers;
};

export type Storage = {
  readonly upload: () => task.Task<unknown>;
  readonly download: (id: string) => taskOption.TaskOption<Blob>;
};

export type DeployParams = {
  readonly allow: boolean;
};

export type Admin = {
  readonly migrate: (p: DeployParams) => task.Task<unknown>;
};

export type SignInParams = {
  readonly provider: 'google';
};

export type AuthClient = {
  readonly signIn: (p: SignInParams) => task.Task<unknown>;
};

export type Client<T extends Params['client']> = {
  readonly storage: StorageClient<T['storage']>;
  readonly auth: AuthClient;
};

export type Server<T extends Params> = {
  readonly admin: Admin;
  readonly client: Client<T['client']>;
};

export type MakeServer<T extends Params> = task.Task<Server<T>>;

export const makeTests = <T extends Params>(makeServer: MakeServer<T>): Tests => ({
  'cant upload when security rule is empty': expect({
    task: pipe(
      task.Do,
      task.bind('server', () => makeServer),
      task.chainFirst(({ server }) => server.admin.migrate({ allow: true })),
      // task.chainFirst(({ server }) => server.client.auth.signIn({ provider: 'google' })),
      task.chain(({ server }) => server.client.storage.upload()),
      task.map(either.isRight)
    ),
    toEqual: true,
  }),
  'zz zz': expect({
    task: pipe(
      task.Do,
      task.bind('server', () => makeServer),
      task.chainFirst(({ server }) => server.admin.migrate({ allow: false })),
      // task.chainFirst(({ server }) => server.client.auth.signIn({ provider: 'google' })),
      task.chain(({ server }) => server.client.storage.upload()),
      taskEither.mapLeft((a) => a.type)
    ),
    toEqual: either.left('unauthorized' as const),
  }),
});
