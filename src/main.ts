import * as core from "@actions/core";
import * as github from "@actions/github";
import { exec } from "@actions/exec";
import { postToGithub } from "./postToGithub";
import { reportsToMarkdownSummary } from "./reportsToMarkdownSummary";
import { summary1, summary2 } from "./mock/json-summary";
import { success } from "./mock/json-result";
import { getCoverageForSha } from "./getCoverageForSha";
import {
  createCoverageAnnotationsFromReport,
  formatCoverageAnnotations,
} from "./annotations";

const run = async () => {
  core.info("starting jest-reports...");

  try {
    const GITHUB_TOKEN = process.env.INPUT_GITHUB_TOKEN as string;
    const COVER_CHANGES_ONLY = process.env.INPUT_COVER_CHANGES_ONLY === "True";
    const COVERAGE_ANNOTATIONS = process.env
      .INPUT_INPUT_COVERAGE_ANNOTATIONS as "none" | "all" | "changes-only";

    core.info(`GITHUB_TOKEN=${GITHUB_TOKEN}`);
    core.info(`COVER_CHANGES_ONLY=${COVER_CHANGES_ONLY}`);
    core.info(`COVERAGE_ANNOTATIONS=${COVERAGE_ANNOTATIONS}`);

    const octokit = github.getOctokit(GITHUB_TOKEN);

    core.info(`cloning ${github.context.repo.repo}...`);

    await exec(
      `git clone https://oauth2:${GITHUB_TOKEN}@github.com/${github.context.repo.owner}/${github.context.repo.repo}.git .`
    );

    const isPullRequest = github.context.eventName === "pull_request";
    if (isPullRequest) {
      core.info(`starting the pull request workflow...`);

      const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: github.context.issue.number,
      });

      core.info("computing PR total coverage...");
      const prCoverage = await getCoverageForSha(pullRequest.head.sha);

      core.info("computing base coverage...");
      const baseCoverage = await getCoverageForSha(pullRequest.base.sha);

      core.info("converting coverage file into mardown reports...");
      const coverageMarkdownReport = reportsToMarkdownSummary(
        prCoverage.coverageSummary,
        baseCoverage.coverageSummary
      );

      if (coverageMarkdownReport.length) {
        core.info("posting mardown reports to github...");
        await postToGithub(coverageMarkdownReport);
      }

      const coverageData = await getCoverageForSha(
        pullRequest.head.sha,
        COVER_CHANGES_ONLY ? pullRequest.base.sha : undefined
      );

      const failedTests = (coverageData.testsOutput as any).testResults.filter(
        (a: any) => a.status !== "passed"
      );
      if (failedTests.length > 0) {
        //todo report tests in comment, exit with code != 0
        const error = core.summary
          .addRaw(`The following tests failed:`)
          .addList(failedTests.map((ft: any) => ft.name))
          .stringify();

        postToGithub(error);

        core.setFailed(`${failedTests.length} tests failed!`);
      }

      if (coverageData.testsOutput && COVERAGE_ANNOTATIONS !== "none") {
        core.info("building 'warning' coverage annotations for PR changes...");
        let annotations = createCoverageAnnotationsFromReport(
          coverageData.testsOutput,
          "warning"
        );

        if (COVERAGE_ANNOTATIONS === "all") {
          core.info(
            "appending 'info' coverage annotations for existing work..."
          );
          annotations = createCoverageAnnotationsFromReport(
            prCoverage.testsOutput,
            "notice",
            annotations
          );
        }

        // converting to individual annotations and posting them.
        // in the future, we could decide to aggregate them more aggressively if their number is
        // over github's limit.
        await octokit.rest.checks.create(
          formatCoverageAnnotations(annotations)
        );
      }
    }

    core.info("done, see ya.");

    // clears buffer in case stuff was left out, which would be written when the action ends
    core.summary.clear();
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
};

const test = () => {
  const a = reportsToMarkdownSummary(summary1, summary2);

  console.log(a);

  console.log("annotations");

  const annotations = createCoverageAnnotationsFromReport(success, "warning");
  console.log(formatCoverageAnnotations(annotations));
};

run();

// test();

/*

 yarn all
 git add .
 git commit -m "update"
 git tag -a -m "some update" v0.1x
 git push --follow-tags

*/

// to merge shard reports
// npx nyc merge coverage coverage/merged-coverage.json
// npx nyc report -t coverage --report-dir coverage --reporter=json-summary
// nyc is deprecated, so let's do:L
// npx istanbul-merge --out coverage/coverage-merged.json coverage/*
// ok istambul is also deprecated, wtf
