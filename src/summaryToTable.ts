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

const roundWithOneDigit = (num: number) => Math.round(Number(num) * 1000) / 10;

const addPlusIfPositive = (num: number) => (Number(num) > 0 ? "+" + num : num);

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
        roundWithOneDigit(summary.total.lines.pct) + "%",
        addPlusIfPositive(
          roundWithOneDigit(
            summary.total.lines.pct - baseSummary.total.lines.pct
          )
        ) + "%",
      ],
      [
        "statements",
        roundWithOneDigit(summary.total.statements.pct) + "%",
        addPlusIfPositive(
          roundWithOneDigit(
            summary.total.statements.pct - baseSummary.total.statements.pct
          )
        ) + "%",
      ],
      [
        "branches",
        roundWithOneDigit(summary.total.branches.pct) + "%",
        addPlusIfPositive(
          roundWithOneDigit(
            summary.total.branches.pct - baseSummary.total.branches.pct
          )
        ) + "%",
      ],
      [
        "functions",
        roundWithOneDigit(summary.total.functions.pct) + "%",
        addPlusIfPositive(
          roundWithOneDigit(
            summary.total.functions.pct - baseSummary.total.functions.pct
          )
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
