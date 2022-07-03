import * as core from "@actions/core";
import * as cache from "@actions/cache";
import { exec } from "@actions/exec";
import * as glob from "@actions/glob";

export const checkoutAndBuildCoverage = async (
  sha: string,
  targetFileName: string
) => {
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

  // --json outputs `coverage/tests-output.json` which includes `coverageMap` used for coverage annotations
  // --coverageReporters=json-summary reports the small summary used to build the markdown tables in the PR comment
  await exec(
    `npx jest --ci --coverage --coverageReporters=json-summary --json --outputFile=coverage/tests-output.json`
  );

  await exec(`mv coverage/coverage-summary.json ${targetFileName}`);
};
