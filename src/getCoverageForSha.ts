import fs from "fs";
import * as core from "@actions/core";
import * as cache from "@actions/cache";
import { exec } from "@actions/exec";
import * as glob from "@actions/glob";

export const getCoverageForSha = async (sha: string, sinceSha?: string) => {
  let mainCoverage = { coverageSummary: {}, testsOutput: {} };

  // first, check if those outputs were cached
  const coverageCacheKey = sinceSha
    ? `couette-coverage-for-${sha}-since-${sinceSha}`
    : `couette-coverage-for-${sha}`;

  const baseCachePath = `coverage`;

  const foundCoverageOutputs = await cache.restoreCache(
    [baseCachePath],
    coverageCacheKey
  );

  if (foundCoverageOutputs) {
    const summaryFile = fs.readFileSync(
      `${process.cwd()}/coverage/coverage-summary.json`
    );
    mainCoverage.coverageSummary = JSON.parse(summaryFile.toString());

    const testsOutputFile = fs.readFileSync(
      `${process.cwd()}/coverage/tests-output.json`
    );
    mainCoverage.testsOutput = JSON.parse(testsOutputFile.toString());
  } else {
    core.info("computing base coverage...");
    mainCoverage = await computeCoverageForSha(sha, sinceSha);
    core.info("done. caching...");
    await cache.saveCache([baseCachePath], coverageCacheKey);
  }

  return mainCoverage;
};

const computeCoverageForSha = async (sha: string, sinceSha?: string) => {
  await exec(`git fetch`);
  await exec(`git checkout ${sha}`);

  core.info(`restoring node_modules...`);
  const dependenciesCacheKey = `couette-dependencies-9-${glob.hashFiles(
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

  await exec(`npx`, [
    `jest`,
    since,
    "--ci",
    "--coverage",
    // --coverageReporters=json-summary reports the small summary used to build the markdown tables in the PR comment
    "--coverageReporters=json-summary",
    // --json outputs `coverage/tests-output.json` which includes `coverageMap` used for coverage annotations
    "--json",
    "--outputFile=coverage/tests-output.json",
  ]);

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
