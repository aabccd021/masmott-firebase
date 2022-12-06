import { option, readonlyArray, readonlyRecord, readonlyTuple, taskEither } from 'fp-ts';
import { flow, pipe } from 'fp-ts/function';
import type { Option } from 'fp-ts/Option';
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

const equalRuleStr = (comparable: StackT.ci.DeployDb.Comparable[0]) =>
  match(comparable)
    .with({ type: 'AuthUid' }, () => 'request.auth.uid')
    .with({ type: 'DocumentField' }, ({ fieldName }) => `request.resource.data.${fieldName}`)
    .exhaustive();

const createSecurityRuleStr = (nullableRule: StackT.ci.DeployDb.CreateRule | undefined) =>
  pipe(
    option.fromNullable(nullableRule),
    option.map((rule) =>
      match(rule)
        .with({ type: 'True' }, () => 'true')
        .with(
          { type: 'Equal' },
          ({ compare: [lhs, rhs] }) => `${equalRuleStr(lhs)} == ${equalRuleStr(rhs)}`
        )
        .exhaustive()
    )
  );

const createSchemaRuleStr = (schema: StackT.ci.DeployDb.Schema): Option<string> =>
  pipe(
    schema,
    readonlyRecord.fromRecord,
    readonlyRecord.mapWithIndex((fieldName, field) =>
      match(field)
        .with({ type: 'IntField' }, () => `request.resource.data.${fieldName} is int`)
        .with({ type: 'StringField' }, () => `request.resource.data.${fieldName} is string`)
        .exhaustive()
    ),
    readonlyRecord.toReadonlyArray,
    readonlyArray.map(readonlyTuple.snd),
    option.fromPredicate(readonlyArray.isNonEmpty),
    option.map(std.readonlyArray.join('\n        && '))
  );

const createRuleStr = (conf: StackT.ci.DeployDb.CollectionConfig) =>
  pipe(
    [createSecurityRuleStr(conf.securityRule?.create), createSchemaRuleStr(conf.schema)],
    readonlyArray.sequence(option.Applicative),
    option.map(std.readonlyArray.join('\n        && ')),
    option.map((content) => `\n      allow create: if ${content};`)
  );

const collectionRuleStr = (collectionName: string) => (content: string) =>
  `\n    match /${collectionName}/{documentId} {\n${content}\n    } `;

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
        [getRuleStr(collectionRule.securityRule?.get), createRuleStr(collectionRule)],
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
    option.map((content) => `  match /databases/{database}/documents {\n${content}\n  }`),
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
    taskEither.chainTaskK(() => std.task.sleep(std.date.mkMilliseconds(1000))),
    taskEither.fromTask
  );
