import { console, option, readonlyArray, task, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { Option } from 'fp-ts/Option';
import * as std from 'fp-ts-std';
import * as fs from 'fs/promises';
import type { Stack as S } from 'masmott';
import { match } from 'ts-pattern';

import type { Stack } from '../type';

const wrapBucketRule = (content: string) => `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
${content}
  }
}
`;

const denyAll = `
    match /{allPaths=**} {
      allow read, write: if false;
    }
`;

const wrapMasmott = (content: string) => `
    match /masmott/{fileId} {
${content}
    }
`;

const getEqualStr = ({
  value,
}: {
  readonly value: S.ci.DeployStorage.AuthUid | S.ci.DeployStorage.DocumentField;
}): string =>
  match(value)
    .with({ type: 'AuthUid' }, () => 'request.auth.uid')
    .with(
      { type: 'DocumentField' },
      (documentField) =>
        `firestore.get(/databases/(default)/documents/${documentField.document.collection.value}/$(fileId))` +
        `.data.${documentField.fieldName.value}`
    )
    .exhaustive();

const getLessThanStr = ({
  value,
}: {
  readonly value: S.ci.DeployStorage.NumberContant | S.ci.DeployStorage.ObjectSize;
}): string =>
  match(value)
    .with({ type: 'ObjectSize' }, () => 'request.resource.size')
    .with({ type: 'NumberConstant' as const }, (numberConstant) => `${numberConstant.value}`)
    .exhaustive();

const createRuleStr = (param: S.ci.DeployStorage.Param): Option<string> =>
  pipe(
    param.securityRule?.create,
    option.fromNullable,
    option.map(
      flow(
        readonlyArray.map((rule): string =>
          match(rule)
            .with(
              { type: 'LessThan' },
              ({ compare: { lhs, rhs } }) =>
                `${getLessThanStr({ value: lhs })} < ${getLessThanStr({ value: rhs })}`
            )
            .with(
              { type: 'Equal' },
              ({ compare: { lhs, rhs } }) =>
                `${getEqualStr({ value: lhs })} == ${getEqualStr({ value: rhs })}`
            )
            .with({ type: 'True' }, () => 'true')
            .exhaustive()
        ),
        std.readonlyArray.join('\n        && '),
        (content) => `      allow create: if ${content};`
      )
    )
  );

const getRuleStr = (_param: S.ci.DeployStorage.Param): Option<string> =>
  option.some(`      allow get: if true;`);

const getStorageRule = (param: S.ci.DeployStorage.Param): string =>
  pipe(
    [createRuleStr(param), getRuleStr(param)],
    readonlyArray.compact,
    option.fromPredicate(readonlyArray.isNonEmpty),
    option.map(flow(std.readonlyArray.join('\n'), wrapMasmott)),
    option.getOrElse(() => denyAll),
    wrapBucketRule
  );

export const deployStorage: Stack['ci']['deployStorage'] = () => (param) =>
  pipe(
    () => fs.writeFile('storage.rules', getStorageRule(param), { encoding: 'utf8' }),
    task.chainIOK(() => console.log(getStorageRule(param))),
    task.chain(() =>
      std.task.sleep(
        std.date.mkMilliseconds(parseFloat(process.env['DEPLOY_STORAGE_DELAY'] ?? '1000'))
      )
    ),
    taskEither.fromTask
  );
