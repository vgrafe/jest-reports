import * as core from "@actions/core";
import * as github from "@actions/github";

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

// export const summaryToTable = (summary: any) => {
//   core.summary.clear();

//   const [_, ...summaryRows] = Object.keys(summary);

//   const summaryTable = core.summary
//     .addTable([
//       [
//         { data: "", header: true },
//         { data: "total", header: true },
//         { data: "coverage", header: true },
//       ],
//       ...["lines", "statements", "branches", "functions"].map((field) => [
//         getIcon(summary.total[field].total),
//         field,
//         roundWithOneDigit(summary.total[field].total) + "%",
//       ]),
//     ])
//     .stringify();

//   const tables = {
//     all: core.summary
//       .addTable([
//         [
//           { data: "", header: true },
//           { data: "module", header: true },
//           { data: "coverage", header: true },
//         ],
//         ...summaryRows.map((row) => [
//           getIcon(getPercent(summary[row])),
//           row.replace(process.cwd() + `/${github.context.repo.repo}/`, ""),
//           roundWithOneDigit(getPercent(summary[row])) + "%",
//         ]),
//       ])
//       .stringify(),
//   };

//   return { summaryTable, tables };
// };

export const covReportsToSummary = (summary: any, baseSummary: any) => {
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

  const makeTable = (rows: string[], compare = true) => {
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
            row.replace(process.cwd() + `/${github.context.repo.repo}/`, ""),
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
            row.replace(process.cwd() + `/${github.context.repo.repo}/`, ""),
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
