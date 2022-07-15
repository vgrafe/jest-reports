# What it does

Posts coverage report on your PR

![](docs/screenshot0.jpeg)

# Get insights on your tests

- blazing AND fast
  - caches node_modules properly so you don't have to
  - caches test results for base branches
- smart logic to play well with github's 50 annotations limit
  - aggregates annotations when on the same LOC (still hard limit to 50 annotations from github)
- soon:
  - more control on the output
  - use the output in other workflow steps
  - summarises annotations on the same file when 50 limit is reached
  - more than just coverage reports

## Usage

```yml
name: coverage
on: [pull_request]

jobs:
  compare-cov:
    runs-on: ubuntu-latest
    concurrency:
      group: ${{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: vgrafe/couette@v0.113
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          coverage-annotations: none
          cover-pr-changes-only: False
```
