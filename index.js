const { parse, parseCondition } = require('./lib/parser');
const { evaluate, evaluateCondition, evaluateWhen, resolvePath } = require('./lib/evaluator');

/**
 * Parse a rule string into a structured action object.
 *
 * @param {string} rule - e.g. "if typeof $.header is string then <hide> [col1, col2]"
 * @returns {{ action: { name, when: { lhs, op, rhs, rhsTo? }, applyOn?, value? } }}
 */
function parseNLP(rule) {
  return parse(rule);
}

/**
 * Parse + evaluate in one call.
 * Returns the action object if the condition matches, otherwise null.
 *
 * @param {string} rule - the rule string
 * @param {*} inputs - the data object ($ in the rule)
 * @returns {object|null}
 */
function applyNLP(rule, inputs) {
  const parsed = parse(rule);
  const matches = evaluate(parsed, inputs);
  return matches ? parsed.action : null;
}

module.exports = { parseNLP, applyNLP, evaluate, evaluateCondition, evaluateWhen, parseCondition, resolvePath };
