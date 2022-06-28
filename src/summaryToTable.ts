//@ts-check

import { markdownTable } from "markdown-table";

const getPercent = (summaryRow: any) => {
  const total =
    summaryRow.lines.total +
    summaryRow.statements.total +
    summaryRow.branches.total +
    summaryRow.functions.total;

  const covered =
    summaryRow.lines.covered +
    summaryRow.statements.covered +
    summaryRow.branches.covered +
    summaryRow.functions.covered;

  return covered / total;
};

const roundWithOneDigit = (num: number) => Math.round(num * 1000) / 10;

const addPlusIfPositive = (num: number) => (num > 0 ? "+" + num : num);

export const summaryToTable = (summary: any) => {
  const summaryRows = Object.keys(summary);

  return markdownTable(
    [
      ["module", "coverage"],
      ...summaryRows.map((row) => [
        row.replace("/home/runner/work/test-action-app/test-action-app/", ""),
        roundWithOneDigit(getPercent(summary[row])) + "%",
      ]),
    ],
    { align: ["l", "r"] }
  );
};

export const summariesToTable = (summary: any, baseSummary: any) => {
  const summaryRows = Object.keys(summary);

  return markdownTable(
    [
      ["module", "coverage", "change"],
      ...summaryRows.map((row) => [
        row.replace("/home/runner/work/test-action-app/test-action-app/", ""),
        roundWithOneDigit(getPercent(summary[row])) + "%",
        addPlusIfPositive(
          roundWithOneDigit(
            getPercent(summary[row]) - getPercent(baseSummary[row])
          )
        ) + "%",
      ]),
    ],
    { align: ["l", "r", "r"] }
  );
};
