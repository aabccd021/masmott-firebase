import { either, task, taskEither, taskOption } from 'fp-ts';
import { pipe } from 'fp-ts/function';
import { expect, Tests } from 'unit-test-ts';

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
  readonly type: 'invalid';
};

export type StorageClient = {
  readonly upload: () => taskEither.TaskEither<UploadError, unknown>;
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
  readonly a?: undefined;
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

export type Client = {
  readonly storage: StorageClient;
  readonly auth: AuthClient;
};

export type Server = {
  readonly admin: Admin;
  readonly client: Client;
};

export type MakeServer = task.Task<Server>;

export const makeTests = (makeServer: MakeServer): Tests => ({
  'cant upload when security rule is empty': expect({
    task: pipe(
      task.Do,
      task.bind('server', () => makeServer),
      // task.chainFirst(({ server }) => server.admin.migrate({})),
      // task.chainFirst(({ server }) => server.client.auth.signIn({ provider: 'google' })),
      task.chain(({ server }) => server.client.storage.upload())
    ),
    toEqual: either.right(true),
  }),
});
