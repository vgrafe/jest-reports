import * as core from "@actions/core";

/**
 * Generates a markdown table using github's `core.summary` api to get the markdown string.
 */
const makeTable = (
  heading: string,
  rows: string[],
  compare = true,
  summary: any,
  baseSummary: any
) => {
  core.info(`maketable with ${rows.length} rows`);
  if (rows.length === 0) return null;

  if (compare)
    core.summary.addHeading(heading, 2).addTable([
      [
        { data: "", header: true },
        { data: "module", header: true },
        { data: "coverage", header: true },
        { data: "change", header: true },
      ],
      ...rows.map((row) => [
        getIcon(getPercent(summary[row])),
        row.replace(process.cwd() + `/`, ""),
        roundWithDigits(getPercent(summary[row])) + "%",
        addPlusIfPositive(
          roundWithDigits(
            getPercent(summary[row]) -
              (baseSummary[row] ? getPercent(baseSummary[row]) : 0)
          )
        ) + "%",
      ]),
    ]);
  else
    core.summary.addHeading(heading, 2).addTable([
      [
        { data: "", header: true },
        { data: "module", header: true },
        { data: "coverage", header: true },
      ],
      ...rows.map((row) => [
        getIcon(getPercent(summary[row])),
        row.replace(process.cwd() + `/`, ""),
        roundWithDigits(getPercent(summary[row])) + "%",
      ]),
    ]);
};

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

const roundWithDigits = (num: number, digits = 1) =>
  Number(num).toFixed(digits);

const addPlusIfPositive = (num: number | string) =>
  num.toString().includes("-") ? num : "+" + num;

const getIcon = (num: number) => (num < 70 ? "🔴" : num < 80 ? "🟠" : "🟢");

export const reportsToMarkdownSummary = (summary: any, baseSummary?: any) => {
  // https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/
  // we're abusing of the summary api to avoid relying on a crappier dependency
  // to generage markdown tables. Using summaries could add value in the future.

  core.info(
    `calling reportsToMarkdownSummary with ${
      Object.keys(summary).length
    } summary rows`
  );
  baseSummary &&
    core.info(`and ${Object.keys(baseSummary).length} baseSummary rows`);

  // if there's no base summary, we can assume this is a push/merge on default branch and not a PR
  const isFullReportOnDefaultBranch = !baseSummary;

  // clearing the buffer to make sure we start fresh
  core.summary.clear();

  const [_, ...summaryRows] = Object.keys(summary);

  const hasImpactOnTotalCoverage = [
    "lines",
    "statements",
    "branches",
    "functions",
  ].some((field) =>
    summary.total[field].pct - baseSummary
      ? baseSummary.total[field].pct !== 0
      : 0
  );

  hasImpactOnTotalCoverage && core.info(`detected impact on total coverage`);

  if (hasImpactOnTotalCoverage || isFullReportOnDefaultBranch) {
    core.info(`building total coverage section...`);

    const columns = ["lines", "statements", "branches", "functions"];
    const headers = columns.map((c) => ({ data: c, header: true }));

    const cells = columns.map(
      (c) =>
        `${getIcon(summary.total[c].pct)} ${roundWithDigits(
          summary.total[c].pct
        )}% ${
          summary.total[c].pct - baseSummary
            ? baseSummary.total[c].pct !== 0
            : 0
            ? "(<strong>" +
              addPlusIfPositive(
                roundWithDigits(
                  summary.total[c].pct - baseSummary
                    ? baseSummary.total[c].pct
                    : 0
                )
              ) +
              "%</strong>)"
            : ""
        }`
    );

    const title = isFullReportOnDefaultBranch
      ? "Total coverage"
      : "Impact on total coverage";
    core.summary.addHeading(title, 2).addTable([headers, cells]);
  }

  let added: string[] = [];
  let regressions: string[] = [];
  let noChange: string[] = [];
  let improved: string[] = [];

  core.info(`building impact section, ${summaryRows.length} rows`);
  for (const row of summaryRows) {
    core.info(row);
    if (!baseSummary || !baseSummary[row]) {
      core.info(`detected as new`);
      added.push(row);
    } else {
      const pct = getPercent(summary[row]);
      const basePct = getPercent(baseSummary[row]);
      core.info(`pct=${pct}, basePct=${basePct}`);
      if (pct > basePct) {
        core.info(`detected as healthy`);
        improved.push(row);
      } else if (pct === basePct) {
        core.info(`detected as nochange`);
        noChange.push(row);
      } else {
        core.info(`detected as regression`);
        regressions.push(row);
      }
    }
  }

  if (regressions.length > 0) {
    core.info(`found regressions, adding section...`);
    makeTable("Regressions", regressions, true, summary, baseSummary);
  }

  if (added.length > 0) {
    core.info(`found new files, adding section...`);
    const title = isFullReportOnDefaultBranch ? "Files" : "Added files";
    makeTable(title, added, false, summary, baseSummary);
  }

  if (improved.length > 0) {
    core.info(`found improved files, adding section...`);
    makeTable("Improvements", improved, true, summary, baseSummary);
  }

  core.info(`done building summary`);

  core.info(core.summary.stringify());

  return core.summary.stringify();
};
