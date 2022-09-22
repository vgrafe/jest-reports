import * as cache from "@actions/cache";
import fs from "fs";

const filePath = `__cache__/strings`;

export const writeLastSuccessShaForPr = async (
  pullRequestId: number,
  value: string
) => {
  fs.mkdirSync(filePath)
  fs.writeFileSync(`${filePath}/lastsuccess.txt`, value, { encoding: "utf8", mode:  });
  return cache.saveCache([filePath], `pull-${pullRequestId}-last-success-sha`);
};

export const readLastSuccessShaForPr = async (pullRequestId: number) => {
  const foundCoverageOutputs = await cache.restoreCache(
    [filePath],
    `pull-${pullRequestId}-last-success-sha`
  );

  if (foundCoverageOutputs)
    return fs.readFileSync(`${filePath}/lastsuccess.txt`, "utf8");
  else return undefined;
};
