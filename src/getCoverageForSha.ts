import fs from "fs";
import * as core from "@actions/core";
import * as cache from "@actions/cache";
import { exec } from "@actions/exec";
import * as glob from "@actions/glob";

const appName = "jest-reports";
const baseCachePath = `coverage`;

export const getCoverageForSha = async (sha: string, sinceSha?: string) => {
  if (sinceSha) core.info("computing PR coverage since base...");
  else core.info("computing coverage on all tests...");

  let mainCoverage = { coverageSummary: {}, testsOutput: {} };

  const coverageCacheKey = sinceSha
    ? `${appName}-cache-coverage-for-${sha}-since-${sinceSha}`
    : `${appName}-cache-coverage-for-${sha}`;

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

const installNodeModules = async () => {
  const lockFileHash = await glob.hashFiles(`**/yarn.lock`);
  const dependenciesCacheKey = `${appName}-cache-dependencies-${lockFileHash}`;
  core.info(`restoring node_modules with key: ${dependenciesCacheKey}`);

  const found = await cache.restoreCache(
    ["**/node_modules"],
    dependenciesCacheKey
  );

  if (found) {
    core.info("cache was restored, no need to install the dependencies.");
  } else {
    core.info("cache not found, installing dependencies...");
    await exec(`yarn`);
    core.info("saving node_modules to cache...");
    await cache.saveCache(["**/node_modules"], dependenciesCacheKey);
  }
};

const computeCoverageForSha = async (sha: string, sinceSha?: string) => {
  await exec(`git fetch`);
  await exec(`git -c advice.detachedHead=false checkout ${sha}`);

  await installNodeModules();

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
