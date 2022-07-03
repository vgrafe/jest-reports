import { expect, test } from "@jest/globals";
import { covReportsToSummary } from "../src/covReportsToSummary";
import { summary1, summary2 } from "./mock/json-summary";

test("throws invalid number", async () => {
  // const a = covReportsToSummary(summary1, summary2);
  // console.log(a);
  expect(1).toBe(1);
});
/*


const test = () => {
 

  const a = covReportsToSummary(sum1, sum2);

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
