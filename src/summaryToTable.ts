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
  const [_, ...summaryRows] = Object.keys(summary);

  const summaryTable = markdownTable(
    [
      ["total", "coverage"],
      ["lines", roundWithOneDigit(summary.total.lines.total) + "%"],
      ["statements", roundWithOneDigit(summary.total.statements.total) + "%"],
      ["branches", roundWithOneDigit(summary.total.branches.total) + "%"],
      ["functions", roundWithOneDigit(summary.total.functions.total) + "%"],
    ],
    { align: ["l", "r"] }
  );

  const componentsTable = markdownTable(
    [
      ["module", "coverage"],
      ...summaryRows.map((row) => [
        row.replace("/home/runner/work/test-action-app/test-action-app/", ""),
        roundWithOneDigit(getPercent(summary[row])) + "%",
      ]),
    ],
    { align: ["l", "r"] }
  );

  return { summaryTable, componentsTable };
};

export const summariesToTable = (summary: any, baseSummary: any) => {
  const [_, ...summaryRows] = Object.keys(summary);

  const summaryTable = markdownTable(
    [
      ["total", "coverage", "change"],
      [
        "lines",
        roundWithOneDigit(summary.total.lines.total) + "%",
        roundWithOneDigit(
          summary.total.lines.total - baseSummary.total.lines.total
        ) + "%",
      ],
      [
        "statements",
        roundWithOneDigit(summary.total.statements.total) + "%",
        roundWithOneDigit(
          summary.total.statements.total - baseSummary.total.statements.total
        ) + "%",
      ],
      [
        "branches",
        roundWithOneDigit(summary.total.branches.total) + "%",
        roundWithOneDigit(
          summary.total.branches.total - baseSummary.total.branches.total
        ) + "%",
      ],
      [
        "functions",
        roundWithOneDigit(summary.total.functions.total) + "%",
        roundWithOneDigit(
          summary.total.functions.total - baseSummary.total.functions.total
        ) + "%",
      ],
    ],
    { align: ["l", "r", "r"] }
  );

  const componentsTable = markdownTable(
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

  return { summaryTable, componentsTable };
};
