import * as core from "@actions/core";
import * as github from "@actions/github";
import * as cache from "@actions/cache";
import { exec } from "@actions/exec";
import { compareAndPost } from "./compareAndPost";
import { summariesToTable } from "./summaryToTable";
import { summary1, summary2 } from "./mock/json-summary";
import { checkoutAndBuildCoverage } from "./checkoutAndRunTests";
import {
  createCoverageAnnotations,
  formatCoverageAnnotations,
} from "./annotations";

const run = async () => {
  core.info("starting couette...");

  try {
    const GITHUB_TOKEN = process.env.INPUT_GITHUB_TOKEN as string;
    const octokit = github.getOctokit(GITHUB_TOKEN);
    const isPullRequest = github.context.eventName === "pull_request";

    if (isPullRequest) {
      const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: github.context.issue.number,
      });

      core.info(`cloning ${github.context.repo.repo}...`);

      await exec(
        `git clone https://oauth2:${GITHUB_TOKEN}@github.com/${github.context.repo.owner}/${github.context.repo.repo}.git`,
        undefined,
        {
          cwd: process.cwd(),
        }
      );

      core.info("computing PR coverage...");

      await checkoutAndBuildCoverage(
        pullRequest.head.sha,
        "coverage/branch.json"
      );

      const annotations = createCoverageAnnotations();
      await octokit.rest.checks.create(formatCoverageAnnotations(annotations));

      core.info("checking if base coverage was cached...");

      const baseCoverageCacheKey = `couette-covbase-0-${pullRequest.base.sha}`;
      const baseCachePath = `${github.context.repo.repo}/coverage`;
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
      await compareAndPost(GITHUB_TOKEN);
    }

    core.info("done!");
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
};

const test = () => {
  const a = summariesToTable(summary1, summary2);

  console.log("summaryTable");
  console.log(a.summaryTable);

  console.log("regressions");
  console.log(a.tables.regressions);

  console.log("added");
  console.log(a.tables.added);

  console.log("healthy");
  console.log(a.tables.healthy);
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
