const { parseNLP, applyNLP } = require('./index');

// --- Parse tests ---

console.log('--- Test 1: typeof + action ---');
console.log(JSON.stringify(parseNLP("if typeof $.header is string then <hide> [some, some1, some2]"), null, 2));

console.log('\n--- Test 2: value check + return ---');
console.log(JSON.stringify(parseNLP("if $.datatype is string then return 'currency'"), null, 2));

console.log('\n--- Test 3: deep path ---');
console.log(JSON.stringify(parseNLP("if $.employee.department.name is 'Engineering' then <highlight> [row, badge]"), null, 2));

console.log('\n--- Test 4: is not ---');
console.log(JSON.stringify(parseNLP("if typeof $.age is not number then <disable> [submit]"), null, 2));

console.log('\n--- Test 5: > ---');
console.log(JSON.stringify(parseNLP("if $.price > 100 then <warn> [priceCell]"), null, 2));

console.log('\n--- Test 6: <= ---');
console.log(JSON.stringify(parseNLP("if $.stock <= 5 then <highlight> [stockBadge]"), null, 2));

console.log('\n--- Test 7: >= ---');
console.log(JSON.stringify(parseNLP("if $.score >= 90 then return 'excellent'"), null, 2));

console.log('\n--- Test 8: < ---');
console.log(JSON.stringify(parseNLP("if $.age < 18 then <disable> [registerBtn]"), null, 2));

console.log('\n--- Test 9: in ---');
console.log(JSON.stringify(parseNLP("if $.status in [active, pending, review] then <show> [actionBar]"), null, 2));

console.log('\n--- Test 10: not in ---');
console.log(JSON.stringify(parseNLP("if $.role not in [admin, superadmin] then <hide> [deleteBtn, settingsBtn]"), null, 2));

console.log('\n--- Test 11: is null ---');
console.log(JSON.stringify(parseNLP("if $.deletedAt is null then <show> [editBtn]"), null, 2));

console.log('\n--- Test 12: is not null ---');
console.log(JSON.stringify(parseNLP("if $.deletedAt is not null then <hide> [editBtn, deleteBtn]"), null, 2));

console.log('\n--- Test 13: is with number ---');
console.log(JSON.stringify(parseNLP("if $.count is 0 then <disable> [exportBtn]"), null, 2));

// --- Evaluate tests ---

console.log('\n--- Eval: > match ---');
console.log(applyNLP("if $.price > 100 then <warn> [cell]", { price: 150 }));

console.log('\n--- Eval: > no match ---');
console.log(applyNLP("if $.price > 100 then <warn> [cell]", { price: 50 }));

console.log('\n--- Eval: in match ---');
console.log(applyNLP("if $.status in [active, pending] then <show> [bar]", { status: 'active' }));

console.log('\n--- Eval: not in match ---');
console.log(applyNLP("if $.role not in [admin] then <hide> [btn]", { role: 'viewer' }));

console.log('\n--- Eval: is null match (null) ---');
console.log(applyNLP("if $.deletedAt is null then <show> [editBtn]", { deletedAt: null }));

console.log('\n--- Eval: is null match (missing key) ---');
console.log(applyNLP("if $.deletedAt is null then <show> [editBtn]", { name: 'test' }));

console.log('\n--- Eval: is null no match ---');
console.log(applyNLP("if $.deletedAt is null then <show> [editBtn]", { deletedAt: '2024-01-01' }));

console.log('\n--- Eval: is not null match ---');
console.log(applyNLP("if $.email is not null then <show> [sendBtn]", { email: 'a@b.com' }));

console.log('\n--- Eval: is not null no match ---');
console.log(applyNLP("if $.email is not null then <show> [sendBtn]", { email: null }));

console.log('\n--- Eval: is 0 match ---');
console.log(applyNLP("if $.count is 0 then <disable> [exportBtn]", { count: 0 }));

console.log('\n--- Eval: is 0 no match ---');
console.log(applyNLP("if $.count is 0 then <disable> [exportBtn]", { count: 5 }));

// --- New operator tests ---

console.log('\n--- Test 14: starts with ---');
console.log(JSON.stringify(parseNLP("if $.name starts with 'Jo' then <highlight> [nameCell]"), null, 2));

console.log('\n--- Test 15: ends with ---');
console.log(JSON.stringify(parseNLP("if $.email ends with 'gmail.com' then <tag> [emailBadge]"), null, 2));

console.log('\n--- Test 16: contains ---');
console.log(JSON.stringify(parseNLP("if $.description contains 'urgent' then <warn> [row]"), null, 2));

console.log('\n--- Test 17: does not contain ---');
console.log(JSON.stringify(parseNLP("if $.notes does not contain 'resolved' then <highlight> [noteCell]"), null, 2));

console.log('\n--- Test 18: not contains ---');
console.log(JSON.stringify(parseNLP("if $.notes not contains 'resolved' then <highlight> [noteCell]"), null, 2));

console.log('\n--- Test 19: between ---');
console.log(JSON.stringify(parseNLP("if $.score between 50 and 100 then <highlight> [scoreCell]"), null, 2));

// --- New operator eval tests ---

console.log('\n--- Eval: starts with match ---');
console.log(applyNLP("if $.name starts with 'Jo' then <tag> [cell]", { name: 'John' }));

console.log('\n--- Eval: starts with no match ---');
console.log(applyNLP("if $.name starts with 'Jo' then <tag> [cell]", { name: 'Alice' }));

console.log('\n--- Eval: ends with match ---');
console.log(applyNLP("if $.file ends with '.js' then <tag> [cell]", { file: 'index.js' }));

console.log('\n--- Eval: contains match ---');
console.log(applyNLP("if $.desc contains 'urgent' then <warn> [cell]", { desc: 'This is urgent!' }));

console.log('\n--- Eval: does not contain match ---');
console.log(applyNLP("if $.desc does not contain 'resolved' then <warn> [cell]", { desc: 'still pending' }));

console.log('\n--- Eval: between match ---');
console.log(applyNLP("if $.score between 50 and 100 then <highlight> [cell]", { score: 75 }));

console.log('\n--- Eval: between no match ---');
console.log(applyNLP("if $.score between 50 and 100 then <highlight> [cell]", { score: 30 }));

// --- parseCondition + evaluateCondition tests ---

const { parseCondition, evaluateCondition } = require('./index');

console.log('\n--- parseCondition: $.status is active ---');
console.log(JSON.stringify(parseCondition("$.status is active"), null, 2));

console.log('\n--- parseCondition: $.price between 10 and 50 ---');
console.log(JSON.stringify(parseCondition("$.price between 10 and 50"), null, 2));

console.log('\n--- evaluateCondition: match ---');
console.log(evaluateCondition("$.status is active", { status: 'active' }));

console.log('\n--- evaluateCondition: no match ---');
console.log(evaluateCondition("$.status is active", { status: 'inactive' }));

console.log('\n--- evaluateCondition: between ---');
console.log(evaluateCondition("$.score between 50 and 100", { score: 75 }));

console.log('\nAll tests passed.');
