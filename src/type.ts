import { summonFor } from '@morphic-ts/batteries/es6/summoner-ESBST';
import { AType } from '@morphic-ts/summoners/es6';

const { summon } = summonFor({});

export const GetDownloadUrlError = summon((F) =>
  F.interface(
    {
      code: F.stringLiteral('storage/object-not-found'),
    },
    'GetDownloadUrlError'
  )
);

export type GetDownloadUrlError = AType<typeof GetDownloadUrlError>;
