import * as core from "@actions/core";
import * as github from "@actions/github";
import { exec } from "@actions/exec";
import { postInPullRequest } from "./postInPullRequest";
import { reportsToMarkdownSummary } from "./reportsToMarkdownSummary";
import { summary1, summary2 } from "./mock/json-summary";
import { getCoverageForSha } from "./getCoverageForSha";
import {
  createCoverageAnnotationsFromReport,
  formatCoverageAnnotations,
} from "./annotations";
import { SCOPE, DEFAULT_BRANCH, GITHUB_TOKEN, RUN_STEPS } from "./env";
import { getLastSuccessfulSha } from "./getLastSuccessfulSha";

/*

to push a new version in one command:
 yarn all && git add . && git commit -m "improves logs" && git tag -a -m "v0.1.2" v0.1.2 && git push --follow-tags

*/

// to merge shard reports
// npx nyc merge coverage coverage/merged-coverage.json
// npx nyc report -t coverage --report-dir coverage --reporter=json-summary
// nyc is deprecated, so let's do:L
// npx istanbul-merge --out coverage/coverage-merged.json coverage/*
// ok istambul is also deprecated, wtf
// looks like merging can be done simply by merging the json outputs

const run = async () => {
  core.info("starting jest-reports...");

  try {
    const octokit = github.getOctokit(GITHUB_TOKEN);
    const currentBranch = github.context.ref.replace("refs/heads/", "");

    core.info(`eventName: ${github.context.eventName}`);
    core.info(`branch: ${currentBranch}`);

    const isPullRequest = github.context.eventName === "pull_request";
    const isPushOnDefaultBranch =
      github.context.eventName === "push" && currentBranch === DEFAULT_BRANCH;

    if (!isPullRequest && !isPushOnDefaultBranch)
      core.setFailed(
        `event dispatching is not a PR push or a merge on default branch, stopping everything`
      );

    core.info(`cloning ${github.context.repo.repo}...`);

    await exec(
      `git clone https://oauth2:${GITHUB_TOKEN}@github.com/${github.context.repo.owner}/${github.context.repo.repo}.git .`
    );

    if (isPushOnDefaultBranch) {
      const coverage = await getCoverageForSha({
        sha: github.context.sha,
      });

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

      let sinceSha = undefined;
      if (SCOPE === "all") core.info("computing test + coverage...");
      if (SCOPE === "pr-changes") {
        core.info("computing test + coverage scoped to PR changes...");
        sinceSha = pullRequest.base.sha;
      }
      if (SCOPE === "changes-since-last-success") {
        // finding last time that workflow was successful on that branch
        sinceSha = await getLastSuccessfulSha();

        if (!sinceSha) {
          core.info(
            `PR #${pullRequest.id} had no succesful test run yet, running tests since base branch at ${pullRequest.base.sha}`
          );
          sinceSha = pullRequest.base.sha;
        } else {
          core.info(
            `running tests since last success run on PR #${pullRequest.id}: ${sinceSha}`
          );
        }
      }

      const prCoverage = await getCoverageForSha({
        sha: pullRequest.head.sha,
        sinceSha,
      });

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
        let baseCoverage;
        if (RUN_STEPS.includes("compare-with-base-branch")) {
          core.info("computing base coverage...");
          baseCoverage = await getCoverageForSha({
            sha: pullRequest.base.sha,
          });
        } else core.info("base branch comparison turned off, skipping it.");

        core.info("compiling coverage files into markdown report...");
        const coverageMarkdownReport = reportsToMarkdownSummary(
          prCoverage.coverageSummary,
          baseCoverage?.coverageSummary,
          prCoverage.testsOutput
        );

        if (coverageMarkdownReport.length > 0) {
          core.info("report complete! posting markdown report to github...");
          await postInPullRequest(coverageMarkdownReport);
        } else core.info("coverage report is empty, skipping posting comment.");

        if (!prCoverage.testsOutput)
          core.info("no test outputs found, skipping annotations.");
        else {
          let annotations;

          if (!RUN_STEPS.includes("annotations-changes"))
            core.info("annotations-changes are turned off, skipping them.");
          else {
            core.info(
              "building 'warning' coverage annotations for PR changes..."
            );
            annotations = createCoverageAnnotationsFromReport(
              prCoverage.testsOutput,
              "warning"
            );
          }

          if (!RUN_STEPS.includes("annotations-all"))
            core.info("annotations-all are turned off, skipping them.");
          else {
            core.info(
              "building 'info' coverage annotations for all codebase..."
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
          if (annotations)
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

run();
