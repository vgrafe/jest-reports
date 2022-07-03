import fs from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as cache from "@actions/cache";
import { exec } from "@actions/exec";
import { postToGithub } from "./postToGithub";
import { covReportsToSummary } from "./covReportsToSummary";
import { summary1, summary2 } from "./mock/json-summary";
import { success } from "./mock/json-result";
import { checkoutAndBuildCoverage } from "./checkoutAndRunTests";
import {
  createCoverageAnnotationsFromReport,
  formatCoverageAnnotations,
} from "./annotations";

const run = async () => {
  core.info("starting couette...");

  try {
    const GITHUB_TOKEN = process.env.INPUT_GITHUB_TOKEN as string;
    const octokit = github.getOctokit(GITHUB_TOKEN);

    core.info(`cloning ${github.context.repo.repo}...`);

    await exec(
      `git clone https://oauth2:${GITHUB_TOKEN}@github.com/${github.context.repo.owner}/${github.context.repo.repo}.git .`
    );

    const isPullRequest = github.context.eventName === "pull_request";
    if (isPullRequest) {
      core.info(`starting the pull request workflow...`);

      const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: github.context.issue.number,
      });

      core.info("computing PR coverage...");

      await checkoutAndBuildCoverage(
        pullRequest.head.sha,
        "coverage/branch.json"
      );

      const testsOutput = fs.readFileSync(
        `${process.cwd()}/coverage/tests-output.json`
      );
      const jsonReport = JSON.parse(testsOutput.toString());

      const annotations = createCoverageAnnotationsFromReport(jsonReport);
      await octokit.rest.checks.create(formatCoverageAnnotations(annotations));

      core.info("checking if base coverage was cached...");

      const baseCoverageCacheKey = `couette-covbase-9-${pullRequest.base.sha}`;
      const baseCachePath = `coverage`;
      const found = await cache.restoreCache(
        [baseCachePath],
        baseCoverageCacheKey
      );
      if (!found) {
        core.info("computing base coverage...");
        await checkoutAndBuildCoverage(
          pullRequest.base.sha,
          "coverage/base.json"
        );
        core.info("done. caching...");
        await cache.saveCache([baseCachePath], baseCoverageCacheKey);
      }

      core.info("converting coverage file into mardown table...");

      const mainCoverage = fs.readFileSync(
        `${process.cwd()}/coverage/base.json`
      );
      const mainCov = JSON.parse(mainCoverage.toString());

      const branchCoverage = fs.readFileSync(
        process.cwd() + `/coverage/branch.json`
      );
      const branchCov = JSON.parse(branchCoverage.toString());

      const coverageMarkdownReport = covReportsToSummary(
        branchCoverage,
        mainCoverage
      );

      await postToGithub(coverageMarkdownReport);
    }

    core.info("done!");

    // clears buffer in case stuff was left out, which would be written.
    core.summary.clear();
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
};

const test = () => {
  const a = covReportsToSummary(summary1, summary2);

  console.log("summaryTable");
  console.log(a.summaryTable);

  console.log("regressions");
  console.log(a.tables.regressions);

  console.log("added");
  console.log(a.tables.added);

  console.log("healthy");
  console.log(a.tables.healthy);

  console.log("annotations");

  const annotations = createCoverageAnnotationsFromReport(success);
  console.log(formatCoverageAnnotations(annotations));
};

run();

// test();

/*

 yarn all
 git add .
 git commit -m "update"
 git tag -a -m "some update" v0.1x
 git push --follow-tags

*/

// to merge shard reports
// npx nyc merge coverage coverage/merged-coverage.json
// npx nyc report -t coverage --report-dir coverage --reporter=json-summary
// nyc is deprecated, so let's do:L
// npx istanbul-merge --out coverage/coverage-merged.json coverage/*
// ok istambul is also deprecated, wtf
