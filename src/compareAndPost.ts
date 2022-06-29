// @ts-check

import fs from "fs";
import * as github from "@actions/github";

import { summariesToTable, summaryToTable } from "./summaryToTable";

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
      commentBody += `### Regressions\n${tables.tables.regressions}\n`;
    if (tables.tables.added)
      commentBody += `### New files\n${tables.tables.added}\n`;
    if (tables.tables.healthy)
      commentBody += `<details><summary>Unchanged</summary>
      <p>
      ### Components\n${tables.tables.healthy}
      </p>
      </details>`;
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
