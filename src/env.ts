type RunStep =
  | "compare-with-base-branch"
  | "report-on-github"
  | "annotations-changes"
  | "annotations-all";

export const GITHUB_TOKEN = process.env.INPUT_GITHUB_TOKEN as string;
export const COVER_PR_CHANGES_ONLY =
  process.env.INPUT_COVER_PR_CHANGES_ONLY === "true";
export const RUN_STEPS: RunStep[] = (process.env.INPUT_RUN_STEPS || "")
  .split(",")
  .map((item) => item as RunStep);
export const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH;
export const BASE_SHA = process.env.BASE_SHA;
