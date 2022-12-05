import { option, readonlyArray, readonlyRecord, readonlyTuple, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import * as std from 'fp-ts-std';
import * as fs from 'fs/promises';
import type { Stack as StackT } from 'masmott';
import { match } from 'ts-pattern';

import type { Stack } from '../type';

const getRuleStr = (rule: StackT.ci.DeployDb.True | undefined) =>
  pipe(
    option.fromNullable(rule),
    option.map(() => 'true'),
    option.map((content) => `\n      allow get: if ${content};`)
  );

const equalRuleStr = (collectionName: string, comparable: StackT.ci.DeployDb.Comparable[0]) =>
  match(comparable)
    .with({ type: 'AuthUid' }, () => 'request.auth.uid')
    .with(
      { type: 'DocumentField' },
      ({ fieldName }) =>
        `get(/databases/$(database)/documents/${collectionName}/$(resource.id)).data.${fieldName}`
    )
    .exhaustive();

const createRuleStr = (
  collectionName: string,
  nullableRule: StackT.ci.DeployDb.CreateRule | undefined
) =>
  pipe(
    option.fromNullable(nullableRule),

    option.map((rule) =>
      match(rule)
        .with({ type: 'True' }, () => 'true')
        .with(
          { type: 'Equal' },
          ({ compare: [lhs, rhs] }) =>
            `${equalRuleStr(collectionName, lhs)} == ${equalRuleStr(collectionName, rhs)}`
        )
        .exhaustive()
    ),

    option.map((content) => `\n     allow create: if ${content};`)
  );

const collectionRuleStr = (collectionName: string) => (content: string) =>
  `\n    match /${collectionName}/{documentId} {\n${content}\n      } `;

const allRuleStr = (content: string) => `
rules_version = '2';
service cloud.firestore {
${content}
}
`;

const getFirestoreRuleStr = (rules: StackT.ci.DeployDb.Param): string =>
  pipe(
    rules,
    readonlyRecord.mapWithIndex((collectionName, collectionRule) =>
      pipe(
        [
          getRuleStr(collectionRule.securityRule?.get),
          createRuleStr(collectionName, collectionRule.securityRule?.create),
        ],
        readonlyArray.compact,
        option.fromPredicate(readonlyArray.isNonEmpty),
        option.map(flow(std.readonlyArray.join('\n'), collectionRuleStr(collectionName)))
      )
    ),
    readonlyRecord.toReadonlyArray,
    readonlyArray.map(readonlyTuple.snd),
    readonlyArray.compact,
    option.fromPredicate(readonlyArray.isNonEmpty),
    option.map(std.readonlyArray.join('\n')),
    option.map((content) => `  match /databases/{database}/documents {\n${content}\n}`),
    option.getOrElseW(
      () => '  match /{document=**} { \n      allow read, write: if false; \n    }'
    ),
    allRuleStr
  );

export const deployDb: Stack['ci']['deployDb'] = () => (rules) =>
  pipe(
    taskEither.tryCatch(
      () => fs.writeFile('firestore.rules', getFirestoreRuleStr(rules)),
      (value) => ({ code: 'ProviderError', value })
    ),
    taskEither.chainTaskK(() => std.task.sleep(std.date.mkMilliseconds(250))),
    taskEither.fromTask
  );
