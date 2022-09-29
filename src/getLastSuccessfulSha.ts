import * as github from "@actions/github";
import { GITHUB_TOKEN } from "./env";

export const getLastSuccessfulSha = async () => {
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const currentBranch = github.context.ref.replace("refs/heads/", "");

  const { data } = await octokit.rest.actions.listWorkflowRuns({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    workflow_id: github.context.workflow,
    status: "success",
    event: "push",
    branch: currentBranch,
  });

  const headCommits = data.workflow_runs.map((run) => {
    return run.head_commit;
  });

  const sortedHeadCommits = headCommits.sort(
    (a, b) => Number(a!.timestamp) - Number(b!.timestamp)
  );

  return sortedHeadCommits[0]?.id;
};
