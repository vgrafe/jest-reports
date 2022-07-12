import fs from "fs";
import * as core from "@actions/core";
import * as cache from "@actions/cache";
import { exec } from "@actions/exec";
import * as glob from "@actions/glob";

const appName = "jest-reports";

export const getCoverageForSha = async (sha: string, sinceSha?: string) => {
  let mainCoverage = { coverageSummary: {}, testsOutput: {} };

  const coverageCacheKey = sinceSha
    ? `${appName}-coverage-for-${sha}-since-${sinceSha}`
    : `${appName}-coverage-for-${sha}`;

  const baseCachePath = `coverage`;

  core.info(`restoring coverage outputs for ${coverageCacheKey}...`);
  const foundCoverageOutputs = await cache.restoreCache(
    [baseCachePath],
    coverageCacheKey
  );

  if (foundCoverageOutputs) {
    core.info(`found.`);
    const summaryFile = fs.readFileSync(
      `${process.cwd()}/coverage/coverage-summary.json`
    );
    mainCoverage.coverageSummary = JSON.parse(summaryFile.toString());

    const testsOutputFile = fs.readFileSync(
      `${process.cwd()}/coverage/tests-output.json`
    );
    mainCoverage.testsOutput = JSON.parse(testsOutputFile.toString());
  } else {
    core.info(`not found, let's checkout and run jest...`);
    mainCoverage = await computeCoverageForSha(sha, sinceSha);
    core.info("done. caching...");
    await cache.saveCache([baseCachePath], coverageCacheKey);
  }

  return mainCoverage;
};

const computeCoverageForSha = async (sha: string, sinceSha?: string) => {
  await exec(`git fetch`);
  await exec(`git -c advice.detachedHead=false checkout ${sha}`);

  core.info(`restoring node_modules...`);
  const dependenciesCacheKey = `${appName}-dependencies-9-${glob.hashFiles(
    `**/yarn.lock`
  )}`;

  const found = await cache.restoreCache(
    ["**/node_modules"],
    dependenciesCacheKey
  );

  if (!found) {
    core.info("running yarn...");
    await exec(`yarn`);
    core.info("caching node_modules...");
    await cache.saveCache(["**/node_modules"], dependenciesCacheKey);
  }

  const since = sinceSha ? `--changedSince=${sinceSha}` : "";

  // --coverageReporters=json-summary reports the small summary used to build the markdown tables in the PR comment
  // --json outputs `coverage/tests-output.json` which includes `coverageMap` used for coverage annotations
  await exec(
    `npx`,
    [
      `jest`,
      since,
      "--ci",
      "--coverage",
      "--coverageReporters=json-summary",
      "--json",
      "--outputFile=coverage/tests-output.json",
    ],
    {
      ignoreReturnCode: true,
    }
  );

  const summaryFile = fs.readFileSync(
    `${process.cwd()}/coverage/coverage-summary.json`
  );
  const coverageSummary = JSON.parse(summaryFile.toString());

  const testsOutputFile = fs.readFileSync(
    `${process.cwd()}/coverage/tests-output.json`
  );
  const testsOutput = JSON.parse(testsOutputFile.toString());

  return { coverageSummary, testsOutput };
};
