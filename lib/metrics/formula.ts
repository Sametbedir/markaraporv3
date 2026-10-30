/**
 * Türetilmiş metrik formülleri için küçük ve güvenli bir hesaplayıcı (eval kullanılmaz).
 *
 * Desteklenen: sayılar (1.5), değişkenler (spend, leads…), + - * /, parantez, eksi işareti.
 * Formül dönemin TOPLAMLARI üzerinden hesaplanır (örn. "spend / leads" = toplam harcama ÷ toplam lead).
 * Payda 0 ise veya bir değişkenin o dönemde değeri yoksa sonuç null'dır (0 değil).
 */

export type Expr =
  | { t: 'num'; v: number }
  | { t: 'var'; name: string }
  | { t: 'neg'; e: Expr }
  | { t: 'bin'; op: '+' | '-' | '*' | '/'; l: Expr; r: Expr };

type Token = { kind: 'num'; v: number } | { kind: 'id'; v: string } | { kind: 'op'; v: string };

const MAX_LENGTH = 200;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      const m = text.slice(i).match(/^\d+(?:\.\d+)?|^\.\d+/);
      if (!m) throw new Error(`Geçersiz sayı: "${text.slice(i, i + 5)}"`);
      tokens.push({ kind: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const m = text.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/)!;
      tokens.push({ kind: 'id', v: m[0] });
      i += m[0].length;
      continue;
    }
    if ('+-*/()'.includes(ch)) {
      tokens.push({ kind: 'op', v: ch });
      i++;
      continue;
    }
    throw new Error(`Formülde izin verilmeyen karakter: "${ch}"`);
  }
  return tokens;
}

/** Formülü ayrıştırır; yalnızca `allowed` içindeki değişkenlere izin verir. */
export function parseFormula(text: string, allowed: Set<string>): { expr: Expr; vars: string[] } | { error: string } {
  const source = text.trim();
  if (!source) return { error: 'Formül boş.' };
  if (source.length > MAX_LENGTH) return { error: `Formül en fazla ${MAX_LENGTH} karakter olabilir.` };
  let tokens: Token[];
  try {
    tokens = tokenize(source);
  } catch (e: any) {
    return { error: e.message };
  }
  let pos = 0;
  const vars = new Set<string>();
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.kind === 'op' && peek()!.v === v;

  function primary(): Expr {
    const tok = tokens[pos++];
    if (!tok) throw new Error('Formül eksik bitiyor.');
    if (tok.kind === 'num') return { t: 'num', v: tok.v };
    if (tok.kind === 'id') {
      if (!allowed.has(tok.v)) throw new Error(`Bilinmeyen metrik: "${tok.v}"`);
      vars.add(tok.v);
      return { t: 'var', name: tok.v };
    }
    if (tok.v === '(') {
      const e = additive();
      if (!isOp(')')) throw new Error('Kapanmayan parantez.');
      pos++;
      return e;
    }
    if (tok.v === '-') return { t: 'neg', e: primary() };
    throw new Error(`Beklenmeyen "${tok.v}".`);
  }
  function multiplicative(): Expr {
    let l = primary();
    while (isOp('*') || isOp('/')) {
      const op = (tokens[pos++] as { v: '*' | '/' }).v;
      l = { t: 'bin', op, l, r: primary() };
    }
    return l;
  }
  function additive(): Expr {
    let l = multiplicative();
    while (isOp('+') || isOp('-')) {
      const op = (tokens[pos++] as { v: '+' | '-' }).v;
      l = { t: 'bin', op, l, r: multiplicative() };
    }
    return l;
  }

  try {
    const expr = additive();
    if (pos < tokens.length) throw new Error(`Beklenmeyen "${(tokens[pos] as { v: unknown }).v}".`);
    if (!vars.size) throw new Error('Formül en az bir metrik içermeli.');
    return { expr, vars: [...vars] };
  } catch (e: any) {
    return { error: e.message };
  }
}

export function evaluate(expr: Expr, values: Record<string, number | null | undefined>): number | null {
  switch (expr.t) {
    case 'num':
      return expr.v;
    case 'var': {
      const v = values[expr.name];
      return v === undefined || v === null || !Number.isFinite(v) ? null : v;
    }
    case 'neg': {
      const v = evaluate(expr.e, values);
      return v === null ? null : -v;
    }
    case 'bin': {
      const l = evaluate(expr.l, values);
      const r = evaluate(expr.r, values);
      if (l === null || r === null) return null;
      if (expr.op === '/') return r === 0 ? null : l / r;
      const out = expr.op === '+' ? l + r : expr.op === '-' ? l - r : l * r;
      return Number.isFinite(out) ? out : null;
    }
  }
}
