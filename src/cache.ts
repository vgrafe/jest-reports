import * as cache from "@actions/cache";
import fs from "fs";

const filePath = `__cache__`;

export const writeLastSuccessShaForPr = async (
  pullRequestId: number,
  value: string
) => {
  // create the cache folder if it does not exist
  if (!fs.existsSync(filePath)) fs.mkdirSync(filePath, { recursive: true });

  // lists all files in `filePath` folder to know which one to write to
  const files = fs.readdirSync(filePath);
  const newFileName = `${files.length}.txt`;

  fs.writeFileSync(`${filePath}/${newFileName}`, value, { encoding: "utf8" });
  return cache.saveCache([filePath], `pull-${pullRequestId}-success-sha-logs`);
};

export const readLastSuccessShaForPr = async (pullRequestId: number) => {
  const foundCoverageOutputs = await cache.restoreCache(
    [filePath],
    `pull-${pullRequestId}-success-sha-logs`
  );

  // lists all files in `filePath` folder to know which one to read from
  const files = fs.existsSync(filePath) && fs.readdirSync(filePath);

  if (foundCoverageOutputs && files && files.length > 0)
    return fs.readFileSync(`${filePath}/${files.length - 1}.txt`, "utf8");
  else return undefined;
};
