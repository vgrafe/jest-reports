import fs from "fs";
import * as core from "@actions/core";
import * as github from "@actions/github";
import * as cache from "@actions/cache";
import { exec } from "@actions/exec";
import { compareAndPost } from "./compareAndPost";

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
  console.log("starting couette...");

  try {
    const GITHUB_TOKEN = core.getInput("GITHUB_TOKEN");
    const octokit = github.getOctokit(GITHUB_TOKEN);
    const isPullRequest = github.context.eventName === "pull_request";

    if (isPullRequest) {
      const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: github.context.issue.number,
      });

      console.log("cloning repo...");

      await exec(
        `git clone https://oauth2:${GITHUB_TOKEN}@github.com/${github.context.repo.owner}/${github.context.repo.repo}.git`,
        undefined,
        {
          cwd: process.cwd(),
        }
      );

      console.log("computing coverage...");

      await getCoverageAtBranch(pullRequest.head.sha, "coverage/branch.json");

      const baseCoverageCacheKey = `couette-covbase-0-${pullRequest.base.sha}`;

      const baseCachePath = `${github.context.repo.repo}/coverage/base.json`;

      await cache.restoreCache([baseCachePath], baseCoverageCacheKey);

      try {
        console.log("checking for base coverage cache...");
        fs.readFileSync(
          `${process.cwd()}/${github.context.repo.repo}/coverage/base.json`
        );
        console.log("hit!");
      } catch {
        console.log("not found.");
        console.log("computing base coverage...");
        await getCoverageAtBranch(pullRequest.base.sha, "coverage/base.json");
        console.log("done. caching...");
        await cache.saveCache([baseCachePath], baseCoverageCacheKey);
      }

      await compareAndPost(GITHUB_TOKEN);
    }

    console.log("done!");
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
};

run();
