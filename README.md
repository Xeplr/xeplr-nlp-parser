# @xeplr/nlp-parser

**A small English-like rule language, parsed into plain objects.** `if $.price > 100 then <warn> [priceCell]` becomes `{ action: { name: 'warn', when: { lhs: '$.price', op: '>', rhs: 100 }, applyOn: ['priceCell'] } }`, and the condition can be evaluated against a data object.

Use it when non-programmers (or stored configuration) need to say *"when this field is that, do this to those things"* and your code decides what `hide`, `warn` or `highlight` mean. The package only parses and evaluates the condition — it never performs the action. No dependencies and no Node APIs, so the same rules run on the server and in the browser.

## Install

```sh
npm i @xeplr/nlp-parser
```

No dependencies, no peers. CommonJS (see [CommonJS / ESM](#commonjs--esm)).

## Quick start

```js
const { parseNLP, applyNLP, evaluateCondition } = require('@xeplr/nlp-parser')

parseNLP('if $.status in [active, pending] then <show> [actionBar]')
// → { action: { name: 'show',
//               when: { lhs: '$.status', op: 'in', rhs: ['active', 'pending'] },
//               applyOn: ['actionBar'] } }

applyNLP('if $.price > 100 then <warn> [priceCell]', { price: 150 })
// → { name: 'warn', when: { lhs: '$.price', op: '>', rhs: 100 }, applyOn: ['priceCell'] }
applyNLP('if $.price > 100 then <warn> [priceCell]', { price: 50 })
// → null

applyNLP("if $.score >= 90 then return 'excellent'", { score: 95 })
// → { name: 'return', when: { lhs: '$.score', op: '>=', rhs: 90 }, value: 'excellent' }

evaluateCondition("$.name starts with 'jo'", { name: 'John' })   // → true
```

## API

| export | signature | does |
|---|---|---|
| `parseNLP` | `(rule: string) → { action }` | Parses a full `if … then …` rule. Throws on a syntax error. |
| `applyNLP` | `(rule: string, data) → action \| null` | Parses, evaluates against `data`; the `action` object if the condition matches, else `null`. Parses on every call. |
| `evaluate` | `(parsed, data) → boolean` | Evaluates `parsed.action.when` from an earlier `parseNLP`. |
| `parseCondition` | `(condition: string) → when` | Parses a condition alone — no `if` / `then`. |
| `evaluateCondition` | `(condition: string, data) → boolean` | `parseCondition` + `evaluateWhen`. |
| `evaluateWhen` | `(when, data) → boolean` | Evaluates a `{ lhs, op, rhs, rhsTo? }` object — parsed or built by hand. |
| `resolvePath` | `(path: string, data) → any` | Reads a `$` path: `'$.a.b'` → `data.a.b`, `'$'` → `data`. `undefined` if a step is missing. |

To evaluate one rule against many rows, parse once and call `evaluate(parsed, row)` per row.

## What `parseNLP` returns

An action rule:

```js
{ action: { name: 'hide', when: { lhs: '$.header', op: 'typeof', rhs: 'string' }, applyOn: ['col1', 'col2'] } }
```

A return rule:

```js
{ action: { name: 'return', when: { lhs: '$.datatype', op: 'is', rhs: 'string' }, value: 'currency' } }
```

| key | |
|---|---|
| `name` | the text inside `<…>`, or `'return'` |
| `when.lhs` | the path as written, including `$` (`'$.employee.department.name'`) |
| `when.op` | an op key from the [operators](#operators) table |
| `when.rhs` | a string, a number, an array of strings, or `null` (for `is null` / `is not null`) |
| `when.rhsTo` | only for `between X and Y` |
| `applyOn` | the `[…]` list after the action; `[]` when there is none |
| `value` | return rules only |

## Syntax

```
rule       := 'if' condition 'then' result
condition  := ['typeof'] path operator [value ['and' value]]
result     := '<' name '>' ['[' item, item, … ']']
            | 'return' (string | word)
```

### Tokens

| token | form | example |
|---|---|---|
| path | `$` followed by letters, digits, `_`, `.`, `$` | `$.employee.department.name`, `$.items.0.name`, `$` |
| action | `<name>`, name is a letter or `_` then word characters or `-` | `<hide>`, `<set-color>` |
| array | `[ … ]`, split on commas, each item trimmed, empties dropped | `[active, pending]` → `['active', 'pending']` |
| string | `'…'` or `"…"`, no escapes | `'Engineering'`, `"two words"` |
| number | digits and `.`, optional leading `-` | `0`, `3.14`, `-5` |
| comparison | `>`, `>=`, `<`, `<=` | |
| keyword | case-insensitive: `if typeof is not in then return and or null starts ends with contains contain does between` | `IF … THEN` works |
| word | a letter or `_` then letters, digits, `_` — not a keyword; case kept | `active`, `string` |

Any other character is skipped silently — including `=`, `!`, `(`, `)`.

### Operators

| write | `op` | true when |
|---|---|---|
| `$.p is X` | `is` | `value === X` (see [comparison](#how-values-are-compared)) |
| `$.p is not X` | `is_not` | `value !== X` |
| `$.p is null` | `is_null` | the raw value is `null`, `undefined` or `''` |
| `$.p is not null` | `is_not_null` | the raw value is none of those |
| `typeof $.p is T` | `typeof` | `typeof raw === T` (`string`, `number`, `boolean`, `object`, `undefined`, …) |
| `typeof $.p is not T` | `typeof_not` | `typeof raw !== T` |
| `$.p > X` / `< X` / `>= X` / `<= X` | `>` `<` `>=` `<=` | JavaScript comparison of the compared values |
| `$.p between X and Y` | `between` | `value >= X && value <= Y` (bounds not reordered) |
| `$.p between X` | `between` | `value >= X` (no `rhsTo`) |
| `$.p in [a, b]` | `in` | some item equals the value |
| `$.p not in [a, b]` | `not_in` | no item equals the value |
| `$.p starts with X` | `starts_with` | case-insensitive prefix; `false` if the raw value is `null` / `undefined` |
| `$.p ends with X` | `ends_with` | case-insensitive suffix; same `null` rule |
| `$.p contains X` | `contains` | case-insensitive substring; same `null` rule |
| `$.p not contains X`, `$.p does not contain X`, `$.p does not contains X` | `not_contains` | no case-insensitive substring; **also `false`** if the raw value is `null` / `undefined` |

`X` may be a string, number, word or array. `Y` (after `between … and`) may be a string, number or word.

### How values are compared

Before `is`, `is not`, `>`, `<`, `>=`, `<=`, `between`, `in` and `not in`, both sides go through one coercion: a number stays a number; a non-empty string that `isNaN` accepts becomes `Number(s)`; anything else is unchanged.

| consequence | example |
|---|---|
| numeric strings equal numbers | `$.n is '5'` matches `{ n: 5 }`; `$.a in [1, 2]` matches `{ a: 2 }` and `{ a: '2' }` |
| `is` is case-sensitive | `$.s is 'Active'` does not match `'active'` |
| there are no boolean literals | `true` is the word `'true'`: `$.flag is true` does **not** match `{ flag: true }` |
| array items are raw text | `[a, 'b']` → `['a', "'b'"]` — quotes are kept |
| comparisons are plain JS | `$.a > 'b'` compares strings; `$.a < 5` is `true` for `{ a: null }` |
| `typeof` reads the raw value | `typeof $.x is not number` is `true` for `{ x: '5' }` |
| a missing path is `undefined` | `$.a.b is null` is `true` for `{}` |

## Errors

`parseNLP` and `parseCondition` throw a plain `Error` (no custom class or code) on the first problem:

| input | message |
|---|---|
| does not start with `if` | `Expected KEYWORD "if", got PATH "$.a"` |
| condition does not start with a `$` path | `Expected PATH "", got IDENTIFIER "name"` |
| no operator | `Expected operator, got KEYWORD then` |
| `not` without `in` / `contains` | `Expected "in" or "contains" after "not", got 1` |
| `does not` without `contain(s)` | `Expected "contain" or "contains" after "does not", got like` |
| `starts` / `ends` without `with` | `Expected KEYWORD "with", got STRING "x"` |
| no value after the operator | `Expected value after operator, got KEYWORD` |
| bad second `between` value | `Expected second value after "and" in between, got ARRAY` |
| no `then` | `Unexpected end of rule, expected KEYWORD then` |
| nothing after `then` | `Unexpected end of rule after "then"` |
| neither `<action>` nor `return` after `then` | `Expected <action> or return, got NUMBER "5"` |
| `return` with a number or nothing | `Expected return value, got NUMBER` |

Evaluation does not throw for a well-formed `when`: an unknown `op` returns `false`.

## Limits to know

| behaviour | effect |
|---|---|
| One condition per rule | `and` / `or` are reserved but there is no compound condition. `parseNLP('if $.a is 1 and $.b is 2 then …')` throws `Expected KEYWORD "then", got KEYWORD "and"`. |
| Tokens after a complete rule or condition are ignored | `parseCondition('$.a is 1 and $.b is 2')` returns just `$.a is 1`, silently. `$.a is two words` compares against `'two'` — quote multi-word values. |
| `=`, `==`, `!=` are not operators | `=` and `!` are skipped, so `$.a == 5` throws `Expected operator, got NUMBER 5`. Use `is` / `is not`. |
| `typeof` with a comparison parses but never matches | `typeof $.s > 3` gives `op: 'typeof_>'`, which evaluates to `false`. |
| `typeof $.p is null` | parses as `is_null`; `typeof` is dropped. |
| `<word>` is always an action | `$.a <b> …` is read as an action `b`; write `$.a < b` with spaces. |
| `return` takes a string or word only | `then return 5` throws; write `then return '5'`. |
| Keywords cannot be bare values | quote them: `$.op is 'contains'`. |

## CommonJS / ESM

CommonJS (`main: index.js`, no `exports` map):

```js
const { parseNLP, applyNLP } = require('@xeplr/nlp-parser')
```

From ESM in Node, named imports work (the exports are a shorthand object literal Node can detect), as does the default import:

```js
import { parseNLP, evaluateCondition } from '@xeplr/nlp-parser'
import nlp from '@xeplr/nlp-parser'
```

In the browser, use a bundler that handles CommonJS.

## Tests

```sh
node test.js
```

Prints parse results and evaluations for each operator, and `All tests passed.` at the end. It has no assertions — it fails only if a rule throws — so check the printed output. There is no `npm test` script.

## License

MIT
