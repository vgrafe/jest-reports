import * as cache from "@actions/cache";
import fs from "fs";

const filePath = "____lastsuccess.txt";

export const writeLastSuccessShaForPr = async (
  pullRequestId: number,
  value: string
) => {
  fs.writeFileSync(filePath, value, { encoding: "utf8" });
  return cache.saveCache([filePath], `pull-${pullRequestId}-last-success-sha`);
};

export const readLastSuccessShaForPr = async (pullRequestId: number) => {
  const foundCoverageOutputs = await cache.restoreCache(
    [filePath],
    `pull-${pullRequestId}-last-success-sha`
  );

  if (foundCoverageOutputs) return fs.readFileSync(filePath, "utf8");
  else return undefined;
};
