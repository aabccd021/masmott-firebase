import { summonFor } from '@morphic-ts/batteries/lib/summoner-ESBST';
import type { AType } from '@morphic-ts/summoners/lib';
import { makeTagged } from '@morphic-ts/summoners/lib';
import type { FirebaseOptions } from 'firebase/app';
import type { Client as Client_, Stack as Stack_ } from 'masmott';

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

export type ClientEnv = {
  readonly firebaseConfig: FirebaseOptions;
};

export type Client = Client_<ClientEnv>;

export type Stack = Stack_<ClientEnv>;
