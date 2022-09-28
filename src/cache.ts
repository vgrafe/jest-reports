import * as cache from "@actions/cache";
import fs from "fs";

const filePath = `__cache__/strings`;

export const writeLastSuccessShaForPr = async (
  pullRequestId: number,
  value: string
) => {
  // lists all files in `filePath` folder to know which one to write to
  const files = fs.readdirSync(filePath);
  const newFileName = `${files.length}.txt`;

  fs.mkdirSync(filePath, { recursive: true });
  fs.writeFileSync(`${filePath}/${newFileName}`, value, { encoding: "utf8" });
  return cache.saveCache([filePath], `pull-${pullRequestId}-last-success-sha`);
};

export const readLastSuccessShaForPr = async (pullRequestId: number) => {
  const foundCoverageOutputs = await cache.restoreCache(
    [filePath],
    `pull-${pullRequestId}-last-success-sha`
  );

  // lists all files in `filePath` folder to know which one to read from
  const files = fs.readdirSync(filePath);

  if (foundCoverageOutputs && files.length > 0)
    return fs.readFileSync(`${filePath}/${files.length - 1}.txt`, "utf8");
  else return undefined;
};
