import * as core from "@actions/core";

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

export const reportsToMarkdownSummary = (summary: any, baseSummary: any) => {
  // https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/
  // we're abusing of the summary api to avoid relying on a crappier dependency
  // to generage markdown tables. Using summaries could add value in the future.

  // clearing the buffer to make sure we start fresh
  core.summary.clear();

  const [_, ...summaryRows] = Object.keys(summary);

  const error =
    summary.total.lines.total === "Unknown"
      ? "The tests ran without error, but coverage could not be calculated."
      : null;

  const summaryTable = core.summary
    .addTable([
      [
        { data: "", header: true },
        { data: "total", header: true },
        { data: "coverage", header: true },
        { data: "change", header: true },
      ],
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
    ])
    .stringify();

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

  /**
   * Generates a markdown table using github's `core.summary` api to get the markdown string.
   */
  const makeTable = (rows: string[], compare = true) => {
    // clearing the buffer to avoid adding to previously generated data.
    core.summary.clear();

    if (rows.length === 0) return null;

    if (compare)
      return core.summary
        .addTable([
          [
            { data: "", header: true },
            { data: "module", header: true },
            { data: "coverage", header: true },
            { data: "change", header: true },
          ],
          ...rows.map((row) => [
            getIcon(getPercent(summary[row])),
            row.replace(process.cwd() + `/`, ""),
            roundWithOneDigit(getPercent(summary[row])) + "%",
            addPlusIfPositive(
              roundWithOneDigit(
                getPercent(summary[row]) -
                  (baseSummary[row] ? getPercent(baseSummary[row]) : 0)
              )
            ) + "%",
          ]),
        ])
        .stringify();
    else
      return core.summary
        .addTable([
          [
            { data: "", header: true },
            { data: "module", header: true },
            { data: "coverage", header: true },
          ],
          ...rows.map((row) => [
            getIcon(getPercent(summary[row])),
            row.replace(process.cwd() + `/`, ""),
            roundWithOneDigit(getPercent(summary[row])) + "%",
          ]),
        ])
        .stringify();
  };

  const tables = {
    added: makeTable(added, false),
    regressions: makeTable(regressions),
    healthy: makeTable(healthy, false),
  };

  return { summaryTable, tables, error };
};