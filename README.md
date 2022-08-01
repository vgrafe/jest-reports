# What it does

Posts coverage report in a comment on your PR, or in a commit when pushing to your default branch.

![](docs/screenshot0.jpeg)

## Features

- can be run on both PR and pushes on main
- on a PR, it will compare coverage with base branch
  - 2x faster than other actions on the marketplace thanks to aggressive caching
- coming soon:
  - sharded tests support
  - better hanlding of github's 50 limit on annotations

## Usage

```yml
name: jest-reports
on:
  push:
    branches:
      - main
  pull_request:

jobs:
  compare-cov:
    runs-on: ubuntu-latest
    steps:
      - uses: vgrafe/jest-reports@v0.146
        with:
          cover-pr-changes-only: False
```

## Options

```yml
with:
  github-token:
    description: "A github access token"
    default: ${{ github.token }}
  cover-pr-changes-only:
    description: "Only run coverage on changes introduced in the PR"
    default: True
  run-steps:
    description: "skip any step by removing the corresponging item from this comma-separated list"
    default: "compare-with-base-branch,report-on-github,annotations-changes,annotations-all"
```
