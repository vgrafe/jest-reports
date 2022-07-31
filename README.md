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
          coverage-annotations: "all"
          cover-pr-changes-only: True
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
  cover-default-branch:
    description: "Run full test suite when the default branch gets pushed. Will add a comment to the commit."
    default: True
  coverage-annotations:
    description: "Add aggregated coverage annotations. Default to 'changes-only'. Other values are 'none' and 'all'"
    default: "changes-only"
```
