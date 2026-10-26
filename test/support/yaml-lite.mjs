// 零依赖的 entry-list YAML 子集解析器，只为测试用。
//
// 为什么不 import 第三方 yaml 包：本仓库不带 dependencies，CI 里 `node --test`
// 跑起来时没有 yaml 解析器可用。宿主自己的方言是 js-yaml + `!!js` 自定义 tag
// （见 app.asar 里的 entryListSchema），这里复刻同一套语义，但只覆盖
// cordis.patch.yml 用到的子集。
//
// 支持：
//   - 顶层序列、嵌套 mapping、嵌套序列
//   - `key: value` 标量（单引号 / 双引号 / 裸值）
//   - `key: |` 字面块（preset 里 plan-mode 的 section 用到）
//   - `!!js <expr>` → { __jsExpr: '<expr>' }，与宿主一致
//   - 布尔 true/false、null、整数
//   - 注释与空行
//
// 不支持（遇到会显式抛错，不静默猜）：
//   - 流式写法 `{a: 1}` / `[1, 2]`
//   - 锚点、别名、多文档
//   - `- - a` 这种序列套序列的行内写法

const BLOCK = '\u0000BLOCK';

class YamlLiteError extends Error {
  constructor(message) {
    super(message);
    this.name = 'YamlLiteError';
  }
}

/** 把 `key: value` 拆开。跳过引号里的冒号，URL 这类值不会被截断。 */
function splitKeyValue(text) {
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === ':') {
      const after = text[i + 1];
      if (after === undefined || after === ' ' || after === '\t') {
        return { key: text.slice(0, i).trim(), value: text.slice(i + 1).trim() };
      }
    }
  }
  throw new YamlLiteError(`这一行不是 key: value：${JSON.stringify(text)}`);
}

function unquote(text) {
  if (text.length >= 2 && text[0] === "'" && text[text.length - 1] === "'") {
    return text.slice(1, -1).replaceAll("''", "'");
  }
  if (text.length >= 2 && text[0] === '"' && text[text.length - 1] === '"') {
    return text.slice(1, -1).replaceAll('\\"', '"').replaceAll('\\n', '\n');
  }
  return text;
}

function parseScalar(text, blocks) {
  const raw = text.trim();
  if (raw.startsWith('!!js ')) return { __jsExpr: raw.slice(5).trim() };
  if (raw === '!!js') throw new YamlLiteError('!!js 后面没有表达式');
  if (raw.startsWith(BLOCK)) {
    const index = Number(raw.slice(BLOCK.length));
    if (!Number.isInteger(index) || blocks[index] === undefined) {
      throw new YamlLiteError(`块标量占位符损坏：${JSON.stringify(raw)}`);
    }
    return blocks[index];
  }
  if (raw === '' || raw === 'null' || raw === '~') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  return unquote(raw);
}

/** 预处理成扁平行流：序列标记行 + 内容行分开，块标量折成占位符。 */
function preprocess(text) {
  const blocks = [];
  const rawLines = text.replace(/^\uFEFF/, '').split('\n');
  const logical = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      i++;
      continue;
    }
    const indent = /^[ \t]*/.exec(line)[0].length;
    const content = line.trim();

    if (/^[[{]/.test(content)) {
      throw new YamlLiteError(`不支持流式写法：${content}`);
    }
    if (content.startsWith('&') || content.startsWith('*')) {
      throw new YamlLiteError(`不支持锚点或别名：${content}`);
    }

    const blockMatch = /^([\w$.-]+):[ \t]*([|>])([-+]?)[ \t]*$/.exec(content);
    if (blockMatch) {
      const key = blockMatch[1];
      const style = blockMatch[2];
      i++;
      const body = [];
      let bodyIndent = null;
      while (i < rawLines.length) {
        const next = rawLines[i];
        if (/^\s*$/.test(next)) {
          body.push('');
          i++;
          continue;
        }
        const nextIndent = /^[ \t]*/.exec(next)[0].length;
        if (nextIndent <= indent) break;
        if (bodyIndent === null) bodyIndent = nextIndent;
        body.push(next.slice(Math.min(nextIndent, bodyIndent)));
        i++;
      }
      while (body.length > 0 && body[body.length - 1] === '') body.pop();
      const joined = style === '|' ? body.join('\n') : body.join(' ');
      const index = blocks.push(`${joined}\n`) - 1;
      logical.push({ indent, seq: false, text: `${key}: ${BLOCK}${index}` });
      continue;
    }

    const seqMatch = /^-[ \t]?(.*)$/.exec(content);
    if (seqMatch) {
      const rest = seqMatch[1];
      if (/^-[ \t]/.test(rest)) {
        throw new YamlLiteError(`不支持 "- -" 行内序列套序列：${content}`);
      }
      logical.push({ indent, seq: true, text: '' });
      if (rest.trim() !== '') {
        logical.push({ indent: indent + 2, seq: false, text: rest });
      }
      i++;
      continue;
    }

    logical.push({ indent, seq: false, text: content });
    i++;
  }

  return { logical, blocks };
}

function parseSeq(logical, pos, indent, blocks) {
  const items = [];
  while (pos < logical.length) {
    const line = logical[pos];
    if (line.indent !== indent || !line.seq) break;
    pos++;
    if (pos < logical.length && logical[pos].indent > indent) {
      const [value, next] = parseNode(logical, pos, logical[pos].indent, blocks);
      items.push(value);
      pos = next;
    } else {
      items.push(null);
    }
  }
  return [items, pos];
}

function parseMap(logical, pos, indent, blocks) {
  const record = {};
  while (pos < logical.length) {
    const line = logical[pos];
    if (line.indent !== indent || line.seq) break;
    const { key, value } = splitKeyValue(line.text);
    pos++;
    if (value === '') {
      if (pos < logical.length && logical[pos].indent > indent) {
        const [child, next] = parseNode(logical, pos, logical[pos].indent, blocks);
        record[key] = child;
        pos = next;
      } else {
        record[key] = null;
      }
    } else {
      record[key] = parseScalar(value, blocks);
    }
  }
  return [record, pos];
}

function parseNode(logical, pos, indent, blocks) {
  if (logical[pos].seq) return parseSeq(logical, pos, indent, blocks);
  return parseMap(logical, pos, indent, blocks);
}

/**
 * 解析 entry-list YAML。
 * @param {string} text
 * @returns {unknown}
 */
export function parseYamlLite(text) {
  const { logical, blocks } = preprocess(text);
  if (logical.length === 0) return null;
  const [value, pos] = parseNode(logical, 0, logical[0].indent, blocks);
  if (pos !== logical.length) {
    const leftover = logical[pos];
    throw new YamlLiteError(
      `有 ${logical.length - pos} 行没被消费，从第 ${pos} 个逻辑行开始：缩进 ${leftover.indent} ${JSON.stringify(leftover.text)}`,
    );
  }
  return value;
}

/** 宿主用 isJsExpr 判断 `!!js` 节点，这里给测试同款判断。 */
export function isJsExpr(value) {
  return typeof value === 'object' && value !== null && '__jsExpr' in value;
}

export { YamlLiteError };
