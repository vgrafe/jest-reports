import * as core from "@actions/core";
import * as github from "@actions/github";
import { exec } from "@actions/exec";
import { postInPullRequest } from "./postInPullRequest";
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
    const COVER_PR_CHANGES_ONLY =
      process.env.INPUT_COVER_PR_CHANGES_ONLY === "true";
    const COVERAGE_ANNOTATIONS = process.env.INPUT_COVERAGE_ANNOTATIONS;
    const DEFAULT_BRANCH = process.env.DEFAULT_BRANCH;

    const octokit = github.getOctokit(GITHUB_TOKEN);

    core.info(`eventName: ${github.context.eventName}`);
    core.info(`branch: ${github.context.ref.replace("refs/heads/", "")}`);

    const isPullRequest = github.context.eventName === "pull_request";
    const isPushOnDefaultBranch =
      github.context.eventName === "push" &&
      github.context.ref.replace("refs/heads/", "") === DEFAULT_BRANCH;

    if (!isPullRequest && !isPushOnDefaultBranch)
      core.setFailed(
        `event dispatching is not a PR push or a merge on default branch, stopping everything`
      );

    core.info(`cloning ${github.context.repo.repo}...`);

    await exec(
      `git clone https://oauth2:${GITHUB_TOKEN}@github.com/${github.context.repo.owner}/${github.context.repo.repo}.git .`
    );

    if (isPushOnDefaultBranch) {
      const coverage = await getCoverageForSha(github.context.sha);

      const coverageMarkdownReport = reportsToMarkdownSummary(
        coverage.coverageSummary
      );

      await octokit.rest.repos.createCommitComment({
        ...github.context.repo,
        commit_sha: github.context.sha,
        body: coverageMarkdownReport,
      });
    }

    if (isPullRequest) {
      core.info(
        `starting the PR workflow on #${github.context.issue.number}...`
      );

      const { data: pullRequest } = await octokit.rest.pulls.get({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: github.context.issue.number,
      });

      core.info("computing PR total coverage...");
      const prCoverage = await getCoverageForSha(
        pullRequest.head.sha,
        COVER_PR_CHANGES_ONLY ? pullRequest.base.sha : undefined
      );

      const failedTests = (prCoverage.testsOutput as any).testResults.filter(
        (a: any) => a.status !== "passed"
      );

      if (failedTests.length > 0) {
        //todo report tests in comment, exit with code != 0
        const error = core.summary
          .addRaw(`The following tests failed:`)
          .addList(
            failedTests.map(
              (ft: any) => ft.name.replace(process.cwd() + `/`, "`") + "``"
            )
          )
          .stringify();

        postInPullRequest(error);

        core.setFailed(`${failedTests.length} tests failed!`);
      } else {
        core.info("computing base coverage...");
        const baseCoverage = await getCoverageForSha(pullRequest.base.sha);

        core.info("compiling coverage files into markdown report...");
        const coverageMarkdownReport = reportsToMarkdownSummary(
          prCoverage.coverageSummary,
          baseCoverage.coverageSummary
        );
        core.info(coverageMarkdownReport);

        if (coverageMarkdownReport.length > 0) {
          core.info("report complete! posting markdown report to github...");
          await postInPullRequest(coverageMarkdownReport);
        } else core.info("coverage report is empty, skipping posting comment.");

        if (prCoverage.testsOutput && COVERAGE_ANNOTATIONS !== "none") {
          core.info(
            "building 'warning' coverage annotations for PR changes..."
          );
          let annotations = createCoverageAnnotationsFromReport(
            prCoverage.testsOutput,
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
    }
    await core.summary.write();
    core.info("done, see ya.");
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
};

const test = () => {
  const a = reportsToMarkdownSummary(summary1, summary2);

  console.log(a.length);

  console.log("annotations");

  // const annotations = createCoverageAnnotationsFromReport(success, "warning");
  // console.log(formatCoverageAnnotations(annotations));
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
