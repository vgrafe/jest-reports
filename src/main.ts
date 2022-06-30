import fs from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as cache from "@actions/cache";
import * as glob from "@actions/glob";
import { exec } from "@actions/exec";
import { compareAndPost } from "./compareAndPost";
import { summariesToTable } from "./summaryToTable";
import { summary1, summary2 } from "./mock/json-summary";

const getCoverageAtBranch = async (sha: string, fileName: string) => {
  await exec(`git fetch`, undefined, {
    cwd: `${process.cwd()}/${github.context.repo.repo}`,
  });
  await exec(`git checkout ${sha}`, undefined, {
    cwd: `${process.cwd()}/${github.context.repo.repo}`,
  });

  // tries to get cached dependencies
  await cache.restoreCache(
    [`${github.context.repo.repo}/node_modules`],
    `couette-dependencies-0-${glob.hashFiles(
      `${github.context.repo.repo}/yarn.lock`
    )}`
  );

  await exec(`yarn`, undefined, {
    cwd: `${process.cwd()}/${github.context.repo.repo}`,
  });
  await exec(
    `npx jest --ci --coverage --coverageReporters=json --coverageReporters=json-summary --json  >> coverage/tests-output.json`,
    undefined,
    {
      cwd: `${process.cwd()}/${github.context.repo.repo}`,
    }
  );
  await exec(`mv coverage/coverage-summary.json ${fileName}`, undefined, {
    cwd: `${process.cwd()}/${github.context.repo.repo}`,
  });
};

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

      core.info("cloning repo...");

      await exec(
        `git clone https://oauth2:${GITHUB_TOKEN}@github.com/${github.context.repo.owner}/${github.context.repo.repo}.git`,
        undefined,
        {
          cwd: process.cwd(),
        }
      );

      core.info("computing coverage...");

      await getCoverageAtBranch(pullRequest.head.sha, "coverage/branch.json");

      // tries to get cached base coverage
      const baseCoverageCacheKey = `couette-covbase-0-${pullRequest.base.sha}`;
      const baseCachePath = `${github.context.repo.repo}/coverage/base.json`;
      await cache.restoreCache([baseCachePath], baseCoverageCacheKey);

      try {
        core.info("checking for base coverage cache...");
        fs.readFileSync(
          `${process.cwd()}/${github.context.repo.repo}/coverage/base.json`
        );
        core.info("hit!");
      } catch {
        core.info("not found.");
        core.info("computing base coverage...");
        await getCoverageAtBranch(pullRequest.base.sha, "coverage/base.json");
        core.info("done. caching...");
        await cache.saveCache([baseCachePath], baseCoverageCacheKey);
      }

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
