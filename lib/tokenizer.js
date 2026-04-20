const KEYWORDS = new Set(['if', 'typeof', 'is', 'not', 'in', 'then', 'return', 'and', 'or', 'null', 'starts', 'ends', 'with', 'contains', 'contain', 'does', 'between']);

function tokenize(input) {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    // whitespace
    if (/\s/.test(input[i])) { i++; continue; }

    // path: $...
    if (input[i] === '$') {
      let path = '';
      while (i < input.length && /[a-zA-Z0-9_.$]/.test(input[i])) {
        path += input[i++];
      }
      tokens.push({ type: 'PATH', value: path });
      continue;
    }

    // comparison operators: >=, <=, >, <
    // distinguish from <action> by peeking: if '<' is followed by '=' it's <=
    // if '<' is followed by a word and then '>' it's an action
    if (input[i] === '>' && input[i + 1] === '=') {
      tokens.push({ type: 'OP', value: '>=' }); i += 2; continue;
    }
    if (input[i] === '>') {
      tokens.push({ type: 'OP', value: '>' }); i++; continue;
    }
    if (input[i] === '<' && input[i + 1] === '=') {
      tokens.push({ type: 'OP', value: '<=' }); i += 2; continue;
    }
    if (input[i] === '<') {
      // peek ahead: if content until '>' looks like a word, it's an <action>
      let j = i + 1;
      let candidate = '';
      while (j < input.length && input[j] !== '>' && input[j] !== '<' && input[j] !== '\n') {
        candidate += input[j++];
      }
      if (j < input.length && input[j] === '>' && /^[a-zA-Z_][\w-]*$/.test(candidate.trim())) {
        // it's an <action>
        i++; // skip <
        let name = '';
        while (i < input.length && input[i] !== '>') {
          name += input[i++];
        }
        if (i < input.length) i++; // skip >
        tokens.push({ type: 'ACTION', value: name.trim() });
        continue;
      }
      // otherwise it's the < operator
      tokens.push({ type: 'OP', value: '<' }); i++; continue;
    }

    // array: [a, b, c]
    if (input[i] === '[') {
      i++;
      let content = '';
      while (i < input.length && input[i] !== ']') {
        content += input[i++];
      }
      if (i < input.length) i++; // skip ]
      const items = content.split(',').map(s => s.trim()).filter(Boolean);
      tokens.push({ type: 'ARRAY', value: items });
      continue;
    }

    // string literal: 'value' or "value"
    if (input[i] === "'" || input[i] === '"') {
      const quote = input[i++];
      let str = '';
      while (i < input.length && input[i] !== quote) {
        str += input[i++];
      }
      if (i < input.length) i++; // skip closing quote
      tokens.push({ type: 'STRING', value: str });
      continue;
    }

    // number: 123, 3.14, -5
    if (/[0-9]/.test(input[i]) || (input[i] === '-' && i + 1 < input.length && /[0-9]/.test(input[i + 1]))) {
      let num = '';
      if (input[i] === '-') { num += input[i++]; }
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i++];
      }
      tokens.push({ type: 'NUMBER', value: Number(num) });
      continue;
    }

    // word: keyword or identifier
    if (/[a-zA-Z_]/.test(input[i])) {
      let word = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        word += input[i++];
      }
      const lower = word.toLowerCase();
      if (KEYWORDS.has(lower)) {
        tokens.push({ type: 'KEYWORD', value: lower });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: word });
      }
      continue;
    }

    // skip unknown characters
    i++;
  }

  return tokens;
}

module.exports = { tokenize };
