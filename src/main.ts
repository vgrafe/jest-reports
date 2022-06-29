import fs from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as cache from "@actions/cache";
import { exec } from "@actions/exec";
import { compareAndPost } from "./compareAndPost";
import { summariesToTable } from "./summaryToTable";

const getCoverageAtBranch = async (sha: string, fileName: string) => {
  await exec(`git fetch`, undefined, {
    cwd: `${process.cwd()}/${github.context.repo.repo}`,
  });
  await exec(`git checkout ${sha}`, undefined, {
    cwd: `${process.cwd()}/${github.context.repo.repo}`,
  });
  await exec(`yarn`, undefined, {
    cwd: `${process.cwd()}/${github.context.repo.repo}`,
  });
  await exec(
    `npx jest --ci --coverage --coverageReporters="json-summary"`,
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
  const sum1 = {
    total: {
      lines: { total: 10, covered: 10, skipped: 0, pct: 100 },
      statements: { total: 12, covered: 12, skipped: 0, pct: 100 },
      functions: { total: 3, covered: 3, skipped: 0, pct: 90 },
      branches: { total: 4, covered: 2, skipped: 0, pct: 50 },
      branchesTrue: { total: 0, covered: 0, skipped: 0, pct: 100 },
    },
    "/Users/vgrafe/Code/with-jest-app/components/TextSwitch.tsx": {
      lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
      functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
      statements: { total: 3, covered: 3, skipped: 0, pct: 100 },
      branches: { total: 2, covered: 1, skipped: 0, pct: 50 },
    },
    "/Users/vgrafe/Code/with-jest-app/components/TextSwitch2.tsx": {
      lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
      functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
      statements: { total: 3, covered: 3, skipped: 0, pct: 100 },
      branches: { total: 2, covered: 1, skipped: 0, pct: 50 },
    },
    "/Users/vgrafe/Code/with-jest-app/pages/index.tsx": {
      lines: { total: 6, covered: 6, skipped: 0, pct: 100 },
      functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
      statements: { total: 6, covered: 6, skipped: 0, pct: 100 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
    },
  };
  const sum2 = {
    total: {
      lines: { total: 10, covered: 10, skipped: 0, pct: 90 },
      statements: { total: 12, covered: 12, skipped: 0, pct: 100 },
      functions: { total: 3, covered: 3, skipped: 0, pct: 100 },
      branches: { total: 4, covered: 2, skipped: 0, pct: 50 },
      branchesTrue: { total: 0, covered: 0, skipped: 0, pct: 100 },
    },
    "/Users/vgrafe/Code/with-jest-app/components/TextSwitch.tsx": {
      lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
      functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
      statements: { total: 3, covered: 3, skipped: 0, pct: 100 },
      branches: { total: 2, covered: 1, skipped: 0, pct: 50 },
    },
    "/Users/vgrafe/Code/with-jest-app/components/TextSwitch2.tsx": {
      lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
      functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
      statements: { total: 3, covered: 3, skipped: 0, pct: 100 },
      branches: { total: 2, covered: 1, skipped: 0, pct: 50 },
    },
    "/Users/vgrafe/Code/with-jest-app/pages/index.tsx": {
      lines: { total: 6, covered: 6, skipped: 0, pct: 100 },
      functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
      statements: { total: 6, covered: 6, skipped: 0, pct: 100 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
    },
  };

  const a = summariesToTable(sum1, sum2);

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
