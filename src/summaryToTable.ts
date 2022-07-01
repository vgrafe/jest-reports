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

const roundWithOneDigit = (num: number) => Number(num).toFixed(1);

const addPlusIfPositive = (num: number | string) =>
  num.toString().includes("-") ? num : "+" + num;

const getIcon = (num: number) => (num < 70 ? "🔴" : num < 80 ? "🟠" : "🟢");

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
        roundWithOneDigit(summary.total[field].pct) + "%",
        addPlusIfPositive(
          roundWithOneDigit(
            summary.total[field].pct - baseSummary.total[field].pct
          )
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

  const makeTable = (rows: string[], compare = true) => {
    if (rows.length === 0) return null;

    if (compare)
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
    else
      return markdownTable(
        [
          ["", "module", "coverage"],
          ...rows.map((row) => [
            getIcon(getPercent(summary[row])),
            row.replace(process.cwd(), ""),
            roundWithOneDigit(getPercent(summary[row])) + "%",
          ]),
        ],
        { align: ["l", "l", "r"] }
      );
  };
  const tables = {
    added: makeTable(added, false),
    regressions: makeTable(regressions),
    healthy: makeTable(healthy, false),
  };

  return { summaryTable, tables };
};
