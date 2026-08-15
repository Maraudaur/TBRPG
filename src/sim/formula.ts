// ============================================================================
// Tiny safe(ish) formula evaluator for Effect `formula` strings, e.g.
// "atk * 1.5 + stacksConsumed * 5". Local dev tool only — not exposed to
// untrusted input in production, so a whitelisted-syntax `Function`
// evaluation is an acceptable tradeoff for simplicity.
// ============================================================================

const SAFE_EXPRESSION = /^[0-9a-zA-Z_+\-*/(). \t]*$/;

export function evaluateFormula(formula: string, vars: Record<string, number>): number {
  if (!SAFE_EXPRESSION.test(formula)) {
    throw new Error(`Unsafe or invalid formula: "${formula}"`);
  }
  const names = Object.keys(vars);
  const values = names.map((n) => vars[n]);
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(...names, `"use strict"; return (${formula});`);
    const result = fn(...values);
    if (typeof result !== 'number' || Number.isNaN(result)) {
      throw new Error(`Formula "${formula}" did not evaluate to a number`);
    }
    return result;
  } catch (err) {
    throw new Error(`Failed to evaluate formula "${formula}": ${(err as Error).message}`);
  }
}
