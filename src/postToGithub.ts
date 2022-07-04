import * as github from "@actions/github";
import * as core from "@actions/core";

const collapsible = (
  title: string,
  text: string
) => `<details><summary>${title}</summary>

${text}

</details>`;

export const postToGithub = async (reportSections: any) => {
  const GITHUB_TOKEN = process.env.INPUT_GITHUB_TOKEN as string;
  const octokit = github.getOctokit(GITHUB_TOKEN);

  const allComments = await octokit.rest.issues.listComments({
    issue_number: github.context.issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  });

  const existingComment = allComments.data.find((com) =>
    com.body?.startsWith("## Coverage report")
  );

  let commentBody = "";

  commentBody = `## Coverage report\n`;
  if (reportSections.error) commentBody += reportSections.error;
  else {
    if (reportSections.summaryTable)
      commentBody += `${reportSections.summaryTable}\n`;
    if (reportSections.tables.regressions)
      commentBody += collapsible(
        "Regressions",
        reportSections.tables.regressions
      );
    if (reportSections.tables.added)
      commentBody += collapsible("New files", reportSections.tables.added);

    // no value in showing this table in a PR, but leaving it in for future reference
    // if (reportSections.tables.healthy)
    //   commentBody += collapsible("Unchanged", reportSections.tables.healthy);
    // }
  }

  const commentParams = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    body: commentBody,
  };

  if (existingComment) {
    core.info("updating comment...");
    await octokit.rest.issues.updateComment({
      comment_id: existingComment.id,
      ...commentParams,
    });
  } else {
    core.info("adding comment...");
    octokit.rest.issues.createComment({
      issue_number: github.context.issue.number,
      ...commentParams,
    });
  }
};
