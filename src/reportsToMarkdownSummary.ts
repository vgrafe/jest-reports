import * as core from "@actions/core";
import { relative } from "path";
import { createCoverageAnnotationsFromReport } from "./annotations";

const collapsibleStart = (title: string) =>
  `<details><summary>${title}</summary>
  
  `;

const collapsibleEnd = () => `

</details>`;

const collapsible = (title: string, text: string) =>
  `${collapsibleStart(title)}${text}${collapsibleEnd()}`;

/**
 * Generates a markdown table using github's `core.summary` api to get the markdown string.
 */
const makeTable = (
  heading: string,
  rows: string[],
  compare = true,
  summary: any,
  baseSummary: any,
  annotations?: Annotation[]
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
        { data: "lines", header: true },
      ],
      ...rows.map((row) => [
        getIcon(getPercent(summary[row])),
        relative(process.cwd(), row),
        roundWithDigits(getPercent(summary[row])) + "%",
        addPlusIfPositive(
          roundWithDigits(
            getPercent(summary[row]) -
              (baseSummary[row] ? getPercent(baseSummary[row]) : 0)
          )
        ) + "%",
        annotations?.find((a) => a.path === relative(process.cwd(), row))
          ? annotations
              ?.filter((a) => a.path === relative(process.cwd(), row))
              .map((a) =>
                a.start_line === a.end_line
                  ? `${a.start_line}`
                  : `${a.start_line}-${a.end_line}`
              )
              .join(",")
          : "--",
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
        relative(process.cwd(), row),
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

export const reportsToMarkdownSummary = (
  summary: any,
  baseSummary?: any,
  testsOutput?: any
) => {
  // https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/
  // we're abusing of the summary api to avoid relying on a crappier dependency
  // to generage markdown tables. Using summaries could add value in the future.

  const annotations = createCoverageAnnotationsFromReport(
    testsOutput,
    "warning"
  );

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

  const hasImpactOnTotalCoverage =
    baseSummary &&
    ["lines", "statements", "branches", "functions"].some(
      (field) => summary.total[field].pct - baseSummary.total[field].pct !== 0
    );

  hasImpactOnTotalCoverage && core.info(`impact detected on total coverage`);

  if (hasImpactOnTotalCoverage || isFullReportOnDefaultBranch) {
    core.info(`building total coverage section...`);

    const columns = ["lines", "statements", "branches", "functions"];
    const headers = columns.map((c) => ({ data: c, header: true }));

    const cells = columns.map(
      (c) =>
        `${getIcon(summary.total[c].pct)} ${roundWithDigits(
          summary.total[c].pct
        )}% ${
          baseSummary && summary.total[c].pct !== baseSummary.total[c].pct
            ? "(<strong>" +
              addPlusIfPositive(
                roundWithDigits(summary.total[c].pct - baseSummary.total[c].pct)
              ) +
              "%</strong>)"
            : ""
        }`
    );

    core.summary.addTable([headers, cells]);
  }

  let added: string[] = [];
  let regressions: string[] = [];
  let noChange: string[] = [];
  let improved: string[] = [];

  core.info(`building impact section, ${summaryRows.length} rows`);
  for (const row of summaryRows) {
    core.info(row);
    if (!baseSummary || !baseSummary[row]) {
      added.push(row);
    } else {
      const pct = getPercent(summary[row]);
      const basePct = getPercent(baseSummary[row]);
      if (pct > basePct) {
        improved.push(row);
      } else if (pct === basePct) {
        noChange.push(row);
      } else {
        regressions.push(row);
      }
    }
  }

  if (regressions.length > 0 || added.length > 0 || improved.length > 0) {
    core.summary.addRaw(collapsibleStart("Breakdown"));

    if (regressions.length > 0) {
      core.info(`found regressions, adding section...`);
      makeTable(
        "Regressions",
        regressions,
        true,
        summary,
        baseSummary,
        annotations
      );
    }

    if (added.length > 0) {
      core.info(`found new files, adding section...`);
      const title = isFullReportOnDefaultBranch ? "Files" : "New files";
      makeTable(title, added, false, summary, baseSummary, annotations);
    }

    if (improved.length > 0) {
      core.info(`found improved files, adding section...`);
      makeTable("Improvements", improved, true, summary, baseSummary);
    }

    core.summary.addRaw(collapsibleEnd());
  }

  core.info(`done building summary`);

  return core.summary.stringify();
};
