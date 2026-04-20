const { tokenize } = require('./tokenizer');

/**
 * Create a token walker with peek/advance/expect helpers.
 */
function createWalker(tokens) {
  var pos = 0;
  function peek() { return tokens[pos] || null; }
  function advance() { return tokens[pos++]; }
  function expect(type, value) {
    const t = advance();
    if (!t) throw new Error(`Unexpected end of rule, expected ${type}${value ? ' ' + value : ''}`);
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new Error(`Expected ${type} "${value || ''}", got ${t.type} "${t.value}"`);
    }
    return t;
  }
  return { peek, advance, expect };
}

/**
 * Parse a condition from the token stream.
 * condition := ['typeof'] path operator rhs ['and' rhs2]
 *
 * Returns { lhs, op, rhs, rhsTo? }
 */
function parseConditionTokens(w) {
  // optional typeof
  var usesTypeof = false;
  if (w.peek() && w.peek().type === 'KEYWORD' && w.peek().value === 'typeof') {
    w.advance();
    usesTypeof = true;
  }

  var path = w.expect('PATH');

  // operator
  var op;
  var opToken = w.peek();

  if (opToken && opToken.type === 'OP') {
    op = w.advance().value;
    if (usesTypeof) op = 'typeof_' + op;
  } else if (opToken && opToken.type === 'KEYWORD' && opToken.value === 'is') {
    w.advance();
    var negated = false;
    if (w.peek() && w.peek().type === 'KEYWORD' && w.peek().value === 'not') {
      w.advance();
      negated = true;
    }
    if (w.peek() && w.peek().type === 'KEYWORD' && w.peek().value === 'null') {
      w.advance();
      op = negated ? 'is_not_null' : 'is_null';
    } else {
      op = usesTypeof ? 'typeof' : 'is';
      if (negated) op += '_not';
    }
  } else if (opToken && opToken.type === 'KEYWORD' && opToken.value === 'not') {
    w.advance();
    if (w.peek() && w.peek().type === 'KEYWORD' && w.peek().value === 'in') {
      w.advance();
      op = 'not_in';
    } else if (w.peek() && w.peek().type === 'KEYWORD' && w.peek().value === 'contains') {
      w.advance();
      op = 'not_contains';
    } else {
      throw new Error(`Expected "in" or "contains" after "not", got ${w.peek() ? w.peek().value : 'end of input'}`);
    }
  } else if (opToken && opToken.type === 'KEYWORD' && opToken.value === 'in') {
    w.advance();
    op = 'in';
  } else if (opToken && opToken.type === 'KEYWORD' && opToken.value === 'starts') {
    w.advance();
    w.expect('KEYWORD', 'with');
    op = 'starts_with';
  } else if (opToken && opToken.type === 'KEYWORD' && opToken.value === 'ends') {
    w.advance();
    w.expect('KEYWORD', 'with');
    op = 'ends_with';
  } else if (opToken && opToken.type === 'KEYWORD' && opToken.value === 'contains') {
    w.advance();
    op = 'contains';
  } else if (opToken && opToken.type === 'KEYWORD' && opToken.value === 'does') {
    w.advance();
    w.expect('KEYWORD', 'not');
    // accept both "contain" and "contains"
    var containToken = w.peek();
    if (containToken && containToken.type === 'KEYWORD' && (containToken.value === 'contains' || containToken.value === 'contain')) {
      w.advance();
    } else {
      throw new Error(`Expected "contain" or "contains" after "does not", got ${containToken ? containToken.value : 'end of input'}`);
    }
    op = 'not_contains';
  } else if (opToken && opToken.type === 'KEYWORD' && opToken.value === 'between') {
    w.advance();
    op = 'between';
  } else {
    throw new Error(`Expected operator, got ${opToken ? opToken.type + ' ' + opToken.value : 'end of input'}`);
  }

  // rhs
  var rhs = null;
  var rhsTo = null;
  if (op !== 'is_null' && op !== 'is_not_null') {
    var rhsToken = w.peek();
    if (rhsToken && rhsToken.type === 'STRING') {
      rhs = w.advance().value;
    } else if (rhsToken && rhsToken.type === 'NUMBER') {
      rhs = w.advance().value;
    } else if (rhsToken && rhsToken.type === 'IDENTIFIER') {
      rhs = w.advance().value;
    } else if (rhsToken && rhsToken.type === 'ARRAY') {
      rhs = w.advance().value;
    } else {
      throw new Error(`Expected value after operator, got ${rhsToken ? rhsToken.type : 'end of input'}`);
    }

    // between X and Y
    if (op === 'between' && w.peek() && w.peek().type === 'KEYWORD' && w.peek().value === 'and') {
      w.advance();
      var toToken = w.peek();
      if (toToken && (toToken.type === 'NUMBER' || toToken.type === 'STRING' || toToken.type === 'IDENTIFIER')) {
        rhsTo = w.advance().value;
      } else {
        throw new Error(`Expected second value after "and" in between, got ${toToken ? toToken.type : 'end of input'}`);
      }
    }
  }

  var when = { lhs: path.value, op: op, rhs: rhs };
  if (rhsTo !== null) when.rhsTo = rhsTo;
  return when;
}

/**
 * Parse a full rule: "if <condition> then <action/return>"
 */
function parse(rule) {
  var tokens = tokenize(rule);
  var w = createWalker(tokens);

  w.expect('KEYWORD', 'if');
  var when = parseConditionTokens(w);
  w.expect('KEYWORD', 'then');

  // result := '<action>' '[targets]' | 'return' value
  var next = w.peek();
  if (!next) throw new Error('Unexpected end of rule after "then"');

  if (next.type === 'ACTION') {
    var actionName = w.advance().value;
    var applyOn = [];
    if (w.peek() && w.peek().type === 'ARRAY') {
      applyOn = w.advance().value;
    }
    return { action: { name: actionName, when: when, applyOn: applyOn } };
  }

  if (next.type === 'KEYWORD' && next.value === 'return') {
    w.advance();
    var valToken = w.peek();
    var value;
    if (valToken && valToken.type === 'STRING') {
      value = w.advance().value;
    } else if (valToken && valToken.type === 'IDENTIFIER') {
      value = w.advance().value;
    } else {
      throw new Error(`Expected return value, got ${valToken ? valToken.type : 'end of input'}`);
    }
    return { action: { name: 'return', when: when, value: value } };
  }

  throw new Error(`Expected <action> or return, got ${next.type} "${next.value}"`);
}

/**
 * Parse a standalone condition string (no "if"/"then" needed).
 * Input: "$.field is active" or "$.price > 100" or "$.name starts with 'Jo'"
 *
 * Returns: { lhs, op, rhs, rhsTo? }
 */
function parseCondition(conditionStr) {
  var tokens = tokenize(conditionStr);
  var w = createWalker(tokens);
  return parseConditionTokens(w);
}

module.exports = { parse, parseCondition };
