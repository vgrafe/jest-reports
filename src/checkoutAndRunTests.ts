import * as core from "@actions/core";
import * as cache from "@actions/cache";
import { exec } from "@actions/exec";
import * as glob from "@actions/glob";

export const checkoutAndBuildCoverage = async (
  sha: string,
  targetFileName: string
) => {
  await exec(`git fetch`, undefined, {
    cwd: process.cwd(),
  });
  await exec(`git checkout ${sha}`, undefined, {
    cwd: process.cwd(),
  });

  core.info(`restoring node_modules...`);
  const dependenciesCacheKey = `couette-dependencies-3-${glob.hashFiles(
    `**/yarn.lock`
  )}`;

  const found = await cache.restoreCache(
    ["**/node_modules"],
    dependenciesCacheKey
  );

  if (!found) {
    core.info("running yarn...");
    await exec(`yarn`, undefined, {
      cwd: process.cwd(),
    });
    core.info("caching node_modules...");
    await cache.saveCache(["**/node_modules"], dependenciesCacheKey);
  }

  await exec(
    `npx jest --maxWorkers=2 --ci --coverage --coverageReporters=json --coverageReporters=json-summary --reporters=github-actions --json --outputFile=coverage/tests-output.json`,
    undefined,
    {
      cwd: process.cwd(),
    }
  );

  await exec(`mv coverage/coverage-summary.json ${targetFileName}`, undefined, {
    cwd: process.cwd(),
  });
};
