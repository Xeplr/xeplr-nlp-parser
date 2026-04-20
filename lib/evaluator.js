const { parseCondition } = require('./parser');

/**
 * Resolves a $-path against a data object.
 * $.employee.department.name  →  data.employee.department.name
 * $                           →  data (the root itself)
 */
function resolvePath(path, data) {
  const parts = path.replace(/^\$\.?/, '').split('.');
  let current = data;
  for (const part of parts) {
    if (!part) continue;
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Coerce value for numeric comparisons.
 * If both sides can be numbers, compare as numbers.
 */
function toComparable(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && !isNaN(val) && val !== '') return Number(val);
  return val;
}

/**
 * Evaluate a when condition object against data.
 * when: { lhs, op, rhs, rhsTo? }
 */
function evaluateWhen(when, data) {
  const raw = resolvePath(when.lhs, data);
  const value = toComparable(raw);
  const rhs = toComparable(when.rhs);

  switch (when.op) {
    case 'is':           return value === rhs;
    case 'is_not':       return value !== rhs;
    case 'is_null':      return raw == null || raw === '';
    case 'is_not_null':  return raw != null && raw !== '';
    case 'typeof':       return typeof raw === when.rhs;
    case 'typeof_not':   return typeof raw !== when.rhs;
    case '>':            return value > rhs;
    case '<':            return value < rhs;
    case '>=':           return value >= rhs;
    case '<=':           return value <= rhs;
    case 'between': {
      const rhsTo = toComparable(when.rhsTo);
      if (rhsTo == null) return value >= rhs;
      return value >= rhs && value <= rhsTo;
    }
    case 'in': {
      const list = Array.isArray(when.rhs) ? when.rhs : [when.rhs];
      return list.some(item => toComparable(item) === value);
    }
    case 'not_in': {
      const list = Array.isArray(when.rhs) ? when.rhs : [when.rhs];
      return !list.some(item => toComparable(item) === value);
    }
    case 'starts_with': {
      if (raw == null) return false;
      return String(raw).toLowerCase().startsWith(String(when.rhs).toLowerCase());
    }
    case 'ends_with': {
      if (raw == null) return false;
      return String(raw).toLowerCase().endsWith(String(when.rhs).toLowerCase());
    }
    case 'contains': {
      if (raw == null) return false;
      return String(raw).toLowerCase().includes(String(when.rhs).toLowerCase());
    }
    case 'not_contains': {
      if (raw == null) return false;
      return !String(raw).toLowerCase().includes(String(when.rhs).toLowerCase());
    }
    default: return false;
  }
}

/**
 * Evaluates a parsed rule's condition against actual data.
 * Returns true if the condition matches.
 */
function evaluate(parsed, data) {
  return evaluateWhen(parsed.action.when, data);
}

/**
 * Parse + evaluate a standalone condition string against data.
 * No "if"/"then" needed — just the condition.
 *
 * @param {string} conditionStr - e.g. "$.status is active", "$.price > 100"
 * @param {object} data         - the data object
 * @returns {boolean}
 */
function evaluateCondition(conditionStr, data) {
  var when = parseCondition(conditionStr);
  return evaluateWhen(when, data);
}

module.exports = { evaluate, evaluateCondition, evaluateWhen, resolvePath };
