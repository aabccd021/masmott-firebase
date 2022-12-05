import { summonFor } from '@morphic-ts/batteries/lib/summoner-ESBST';
import type { AType } from '@morphic-ts/summoners/lib';
import { makeTagged } from '@morphic-ts/summoners/lib';
import type { FirebaseOptions } from 'firebase/app';
import type * as admin from 'firebase-admin';
import type { StackWithEnv } from 'masmott';

const { summon } = summonFor({});

export const CodedError = summon((F) => F.interface({ code: F.string() }, 'CodedError'));

export const GetDownloadUrlError = makeTagged(summon)('code')({
  'storage/object-not-found': summon((F) =>
    F.interface({ code: F.stringLiteral('storage/object-not-found') }, 'objectNotFound')
  ),
});

export type StorageObjectNotFoundError = AType<typeof GetDownloadUrlError>;

export const UploadDataUrlError = makeTagged(summon)('code')({
  'storage/invalid-format': summon((F) =>
    F.interface({ code: F.stringLiteral('storage/invalid-format') }, 'StorageInvalidFormatError')
  ),
});

export type UploadDataUrlError = AType<typeof UploadDataUrlError>;

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
