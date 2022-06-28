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

  const tables = mainCov
    ? summariesToTable(branchCov, mainCov)
    : summaryToTable(branchCov);

  const allComments = await octokit.rest.issues.listComments({
    issue_number: github.context.issue.number,
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
  });

  const existingComment = allComments.data.find((com) =>
    com.body?.startsWith("## Coverage report")
  );

  const commentBody = `## Coverage report\n${
    !mainCov ? "base branch coverage report not found.\n" : ""
  }\n\n${tables.summaryTable}\n\n${tables.componentsTable}`;

  const commentParams = {
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    body: commentBody,
  };

  if (existingComment) {
    console.log("building coverage reports...");
    await octokit.rest.issues.updateComment({
      comment_id: existingComment.id,
      ...commentParams,
    });
  } else {
    console.log("building coverage reports...");
    octokit.rest.issues.createComment({
      issue_number: github.context.issue.number,
      ...commentParams,
    });
  }
};
