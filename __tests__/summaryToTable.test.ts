import { expect, test } from "@jest/globals";
import { summariesToTable } from "../src/summaryToTable";

const sum1 = {
  total: {
    lines: { total: 10, covered: 10, skipped: 0, pct: 100 },
    statements: { total: 12, covered: 12, skipped: 0, pct: 100 },
    functions: { total: 3, covered: 3, skipped: 0, pct: 90 },
    branches: { total: 4, covered: 2, skipped: 0, pct: 50 },
    branchesTrue: { total: 0, covered: 0, skipped: 0, pct: 100 },
  },
  "/Users/vgrafe/Code/with-jest-app/components/TextSwitch.tsx": {
    lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
    functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
    statements: { total: 3, covered: 3, skipped: 0, pct: 100 },
    branches: { total: 2, covered: 1, skipped: 0, pct: 50 },
  },
  "/Users/vgrafe/Code/with-jest-app/components/TextSwitch2.tsx": {
    lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
    functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
    statements: { total: 3, covered: 3, skipped: 0, pct: 100 },
    branches: { total: 2, covered: 1, skipped: 0, pct: 50 },
  },
  "/Users/vgrafe/Code/with-jest-app/pages/index.tsx": {
    lines: { total: 6, covered: 6, skipped: 0, pct: 100 },
    functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
    statements: { total: 6, covered: 6, skipped: 0, pct: 100 },
    branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
  },
};
const sum2 = {
  total: {
    lines: { total: 10, covered: 10, skipped: 0, pct: 90 },
    statements: { total: 12, covered: 12, skipped: 0, pct: 100 },
    functions: { total: 3, covered: 3, skipped: 0, pct: 100 },
    branches: { total: 4, covered: 2, skipped: 0, pct: 50 },
    branchesTrue: { total: 0, covered: 0, skipped: 0, pct: 100 },
  },
  "/Users/vgrafe/Code/with-jest-app/components/TextSwitch.tsx": {
    lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
    functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
    statements: { total: 3, covered: 3, skipped: 0, pct: 100 },
    branches: { total: 2, covered: 1, skipped: 0, pct: 50 },
  },
  "/Users/vgrafe/Code/with-jest-app/components/TextSwitch2.tsx": {
    lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
    functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
    statements: { total: 3, covered: 3, skipped: 0, pct: 100 },
    branches: { total: 2, covered: 1, skipped: 0, pct: 50 },
  },
  "/Users/vgrafe/Code/with-jest-app/pages/index.tsx": {
    lines: { total: 6, covered: 6, skipped: 0, pct: 100 },
    functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
    statements: { total: 6, covered: 6, skipped: 0, pct: 100 },
    branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
  },
};

test("throws invalid number", async () => {
  // const a = summariesToTable(sum1, sum2);
  // console.log(a);
  expect(1).toBe(1);
});
/*


const test = () => {
 

  const a = summariesToTable(sum1, sum2);

  console.log("summaryTable");
  console.log(a.summaryTable);

  console.log("added");
  console.log(a.tables.added);

  console.log("healthy");
  console.log(a.tables.healthy);

  console.log("regressions");
  console.log(a.tables.regressions);
};

*/
// test("wait 500 ms", async () => {
//   const start = new Date();
//   await wait(500);
//   const end = new Date();
//   var delta = Math.abs(end.getTime() - start.getTime());
//   expect(delta).toBeGreaterThan(450);
// });

// // shows how the runner will run a javascript action with env / stdout protocol
// test("test runs", () => {
//   process.env["INPUT_MILLISECONDS"] = "500";
//   const np = process.execPath;
//   const ip = path.join(__dirname, "..", "lib", "main.js");
//   const options: cp.ExecFileSyncOptions = {
//     env: process.env,
//   };
//   console.log(cp.execFileSync(np, [ip], options).toString());
// });
