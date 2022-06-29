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
    const tables = summariesToTable(branchCov, mainCov);

    commentBody = `## Coverage report\n`;
    if (!mainCov) commentBody += "base branch coverage report not found\n";
    if (tables.summaryTable)
      commentBody += `### Coverage\n${tables.summaryTable}\n`;
    if (tables.tables.regressions)
      commentBody += collapsible("Regressions", tables.tables.regressions);
    if (tables.tables.added)
      commentBody += collapsible("New files", tables.tables.added);
    if (tables.tables.healthy)
      commentBody += collapsible("Unchanged", tables.tables.healthy);
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
