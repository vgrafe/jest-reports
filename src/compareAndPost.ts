// @ts-check

import fs from "fs";
import * as github from "@actions/github";

import { summariesToTable, summaryToTable } from "./summaryToTable";

const collapsible = (
  title: string,
  text: string
) => `<details><summary>${title}</summary>

${text}

</details>`;

export const compareAndPost = async (ghToken: string) => {
  let mainCov;
  try {
    const mainCoverage = fs.readFileSync(
      `${process.cwd()}/${github.context.repo.repo}/coverage/base.json`
    );
    mainCov = JSON.parse(mainCoverage.toString());
  } catch {
    console.log("No main coverage file found");
  }

  const branchCoverage = fs.readFileSync(
    process.cwd() + `/${github.context.repo.repo}/coverage/branch.json`
  );
  const branchCov = JSON.parse(branchCoverage.toString());

  const octokit = github.getOctokit(ghToken);

  console.log("building coverage reports...");

  const allComments = await octokit.rest.issues.listComments({
    issue_number: github.context.issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  });

  const existingComment = allComments.data.find((com) =>
    com.body?.startsWith("## Coverage report")
  );

  let commentBody = "";

  if (mainCov) {
    const reports = summariesToTable(branchCov, mainCov);

    commentBody = `## Coverage report\n`;
    if (reports.error) commentBody += reports.error;
    else {
      if (!mainCov) commentBody += "base branch coverage report not found\n";
      if (reports.summaryTable) commentBody += `${reports.summaryTable}\n`;
      if (reports.tables.regressions)
        commentBody += collapsible("Regressions", reports.tables.regressions);
      if (reports.tables.added)
        commentBody += collapsible("New files", reports.tables.added);
      if (reports.tables.healthy)
        commentBody += collapsible("Unchanged", reports.tables.healthy);
    }
  } else {
    const tables = summaryToTable(branchCov);

    commentBody = `## Coverage report\n${
      !mainCov ? "base branch coverage report not found.\n" : ""
    }\n\n${tables.summaryTable}\n\n${tables.tables.all}`;
  }

  const commentParams = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    body: commentBody,
  };

  if (existingComment) {
    console.log("updating comment...");
    await octokit.rest.issues.updateComment({
      comment_id: existingComment.id,
      ...commentParams,
    });
  } else {
    console.log("adding comment...");
    octokit.rest.issues.createComment({
      issue_number: github.context.issue.number,
      ...commentParams,
    });
  }
};
