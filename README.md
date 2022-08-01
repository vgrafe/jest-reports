# What it does

Posts coverage report on your PR.

![](docs/screenshot0.jpeg)

# Get insights on your tests

- blazing AND fast: caches everything reusable without you having to worry about it
- smart logic to play well with github's 50 annotations limit
  - aggregates annotations when on the same LOC (still hard limit to 50 annotations from github)
- soon:
  - sharded tests support
  - more control on the output
  - use the output in other workflow steps
  - summarises annotations on the same file when 50 limit is reached
  - more than just coverage reports

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
