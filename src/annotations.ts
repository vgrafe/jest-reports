import { relative } from "path";
import { context } from "@actions/github";

const isValidNumber = (value: unknown): value is number =>
  typeof value === "number" && !isNaN(value);

const getLocation = (
  start = { line: 0, column: undefined },
  end = { line: 0, column: undefined }
): {
  start_line?: number;
  end_line?: number;
  start_column?: number;
  end_column?: number;
} => ({
  start_line: start.line,
  end_line: end.line,
  start_column:
    start.line === end.line && start.column !== null && end.column !== null
      ? start.column
      : undefined,
  end_column:
    start.line === end.line && start.column !== null && end.column !== null
      ? end.column
      : undefined,
});

export const createCoverageAnnotationsFromReport = (jsonReport: any) => {
  const annotations: any[] = [];

  Object.entries(jsonReport.coverageMap).forEach(
    ([fileName, fileCoverage]: [string, any]) => {
      const normalizedFilename = relative(process.cwd(), fileName);
      Object.entries(fileCoverage.statementMap).forEach(
        ([statementIndex, statementCoverage]: [string, any]) => {
          if (fileCoverage.s[+statementIndex] === 0) {
            annotations.push({
              ...getLocation(statementCoverage.start, statementCoverage.end),
              path: normalizedFilename,
              annotation_level: "warning",
              title: "Statement not covered",
              // message: "notCoveredStatementMessage",
            });
          }
        }
      );

      Object.entries(fileCoverage.branchMap).forEach(
        ([branchIndex, branchCoverage]: [string, any]) => {
          if (branchCoverage.locations) {
            branchCoverage.locations.forEach(
              (location: any, locationIndex: any) => {
                if (fileCoverage.b[+branchIndex][locationIndex] === 0) {
                  annotations.push({
                    ...getLocation(location.start, location.end),
                    path: normalizedFilename,
                    annotation_level: "warning",
                    title: "Branch not covered",
                    // message: "notCoveredBranchMessage",
                  });
                }
              }
            );
          }
        }
      );

      Object.entries(fileCoverage.fnMap).forEach(
        ([functionIndex, functionCoverage]: [string, any]) => {
          if (fileCoverage.f[+functionIndex] === 0) {
            annotations.push({
              ...getLocation(
                functionCoverage.decl.start,
                functionCoverage.decl.end
              ),
              path: normalizedFilename,
              annotation_level: "warning",
              title: "Function not covered",
              // message: "notCoveredFunctionMessage",
            });
          }
        }
      );
    }
  );

  return annotations.filter(
    (annotation) =>
      isValidNumber(annotation.start_line) && isValidNumber(annotation.end_line)
  );
};

const maxReportedAnnotations = 100;

export const formatCoverageAnnotations = (annotations: any) => ({
  ...context.repo,
  status: "completed",
  head_sha: context.payload.pull_request?.head.sha ?? context.sha,
  conclusion: "success",
  name: "annotate-cov",
  output: {
    title: "Coverage annotations",
    summary: "See below the parts of the submission that are not covered",
    text: [
      `${annotations.length} occurences reported, only the first ${maxReportedAnnotations} are shown.`,
      annotations.length > maxReportedAnnotations &&
        `hiding ${annotations.length - maxReportedAnnotations} annotations`,
    ]
      .filter(Boolean)
      .join("\n"),
    annotations: annotations.slice(0, maxReportedAnnotations - 1),
  },
});
