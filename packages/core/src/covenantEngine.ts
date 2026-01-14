import type { FormulaExpression, ThresholdOperator } from "@covenantpulse/shared";

export type CovenantComputation = {
  computedValue: number;
  passFail: "Pass" | "Fail";
};

export function evaluateExpression(
  expression: FormulaExpression,
  metrics: Record<string, number>
): number {
  switch (expression.type) {
    case "number":
      return expression.value;
    case "var": {
      const value = metrics[expression.key];
      if (typeof value !== "number") {
        throw new Error(`Missing metric: ${expression.key}`);
      }
      return value;
    }
    case "op": {
      const left = evaluateExpression(expression.left, metrics);
      const right = evaluateExpression(expression.right, metrics);
      switch (expression.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          if (right === 0) {
            throw new Error("Division by zero");
          }
          return left / right;
        default:
          return NaN;
      }
    }
    default:
      return NaN;
  }
}

export function compareThreshold(
  computedValue: number,
  thresholdOp: ThresholdOperator,
  thresholdValue: number
): boolean {
  switch (thresholdOp) {
    case "<=":
      return computedValue <= thresholdValue;
    case ">=":
      return computedValue >= thresholdValue;
    case "<":
      return computedValue < thresholdValue;
    case ">":
      return computedValue > thresholdValue;
    case "=":
      return computedValue === thresholdValue;
    default:
      return false;
  }
}

export function computeCovenant(
  expression: FormulaExpression,
  metrics: Record<string, number>,
  thresholdOp: ThresholdOperator,
  thresholdValue: number
): CovenantComputation {
  const computedValue = evaluateExpression(expression, metrics);
  const pass = compareThreshold(computedValue, thresholdOp, thresholdValue);
  return {
    computedValue,
    passFail: pass ? "Pass" : "Fail"
  };
}
