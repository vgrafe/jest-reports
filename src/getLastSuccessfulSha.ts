import * as core from "@actions/core";
import * as github from "@actions/github";
import { GITHUB_TOKEN } from "./env";

export const getLastSuccessfulSha = async () => {
  const octokit = github.getOctokit(GITHUB_TOKEN);

  core.info("getting last subcessful workflow runs...");
  core.info("workflow: " + github.context.workflow);

  const { data: runs } = await octokit.rest.actions.listWorkflowRuns({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    workflow_id: "compare-coverage.yaml",
    status: "success",
    event: "pull_request",
    branch: github.context.ref,
  });

  core.info(`found ${runs.workflow_runs.length} successes.`);

  const headCommits = runs.workflow_runs.map((run) => {
    return run.head_commit;
  });

  const sortedHeadCommits = headCommits.sort(
    (a, b) => Number(a!.timestamp) - Number(b!.timestamp)
  );

  return sortedHeadCommits[0]?.id;
};