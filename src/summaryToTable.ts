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

  return (covered / total) * 100;
};

const roundWithOneDigit = (num: number) => Number(num);

const addPlusIfPositive = (num: number) => (num > 0 ? "+" + num : num);

const getIcon = (num: number) =>
  roundWithOneDigit(num) < 70
    ? "🔴"
    : roundWithOneDigit(num) < 80
    ? "🟠"
    : "🟢";

export const summaryToTable = (summary: any) => {
  const [_, ...summaryRows] = Object.keys(summary);

  const summaryTable = markdownTable(
    [
      ["", "total", "coverage"],
      ...["lines", "statements", "branches", "functions"].map((field) => [
        getIcon(summary.total[field].total),
        field,
        roundWithOneDigit(summary.total[field].total) + "%",
      ]),
    ],
    { align: ["l", "l", "r"] }
  );

  const tables = {
    all: markdownTable(
      [
        ["", "module", "coverage"],
        ...summaryRows.map((row) => [
          getIcon(getPercent(summary[row])),
          row.replace(process.cwd(), ""),
          roundWithOneDigit(getPercent(summary[row])) + "%",
        ]),
      ],
      { align: ["l", "l", "r"] }
    ),
  };

  return { summaryTable, tables };
};

export const summariesToTable = (summary: any, baseSummary: any) => {
  const [_, ...summaryRows] = Object.keys(summary);

  const summaryTable = markdownTable(
    [
      ["", "total", "coverage", "change"],
      ...["lines", "statements", "branches", "functions"].map((field) => [
        getIcon(summary.total[field].pct),
        field,
        summary.total[field].pct + "%",
        addPlusIfPositive(
          summary.total[field].pct - baseSummary.total[field].pct
        ) + "%",
      ]),
    ],
    { align: ["l", "l", "r", "r"] }
  );

  let added: string[] = [];
  let regressions: string[] = [];
  let healthy: string[] = [];

  for (const row of summaryRows) {
    if (!baseSummary[row]) added.push(row);
    else {
      const pct = getPercent(summary[row]);
      const basePct = getPercent(baseSummary[row]);
      if (pct >= basePct) {
        healthy.push(row);
      } else {
        regressions.push(row);
      }
    }
  }

  const makeTable = (rows: string[]) => {
    if (rows.length === 0) return null;

    return markdownTable(
      [
        ["", "module", "coverage", "change"],
        ...rows.map((row) => [
          getIcon(getPercent(summary[row])),
          row.replace(process.cwd(), ""),
          roundWithOneDigit(getPercent(summary[row])) + "%",
          addPlusIfPositive(
            roundWithOneDigit(
              getPercent(summary[row]) -
                (baseSummary[row] ? getPercent(baseSummary[row]) : 0)
            )
          ) + "%",
        ]),
      ],
      { align: ["l", "l", "r", "r"] }
    );
  };
  const tables = {
    added: makeTable(added),
    regressions: makeTable(regressions),
    healthy: makeTable(healthy),
  };

  return { summaryTable, tables };
};
