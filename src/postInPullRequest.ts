import * as github from "@actions/github";
import * as core from "@actions/core";

export const postInPullRequest = async (body: string) => {
  const GITHUB_TOKEN = process.env.INPUT_GITHUB_TOKEN as string;
  const octokit = github.getOctokit(GITHUB_TOKEN);

  const allComments = await octokit.rest.issues.listComments({
    issue_number: github.context.issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  });

  const existingComment = allComments.data.find((com) =>
    com.body?.startsWith(`jest-reports`)
  );

  const commentParams = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    body: `jest-reports\n---\n${body}`,
  };

  if (existingComment) {
    core.info("updating comment...");
    await octokit.rest.issues.updateComment({
      comment_id: existingComment.id,
      ...commentParams,
    });
  } else {
    core.info("adding comment...");
    await octokit.rest.issues.createComment({
      issue_number: github.context.issue.number,
      ...commentParams,
    });
  }
};
