# Get insights on your tests

- blazing AND fast
  - caches node_modules properly so you don't have to
  - caches test results for base branches
- smart logic to play well with github's 50 annotations limit
  - aggregates annotations when on the same LOC (still hard limit to 50 annotationa from github)

## Usage

```yml
name: jest-reports
on: [pull_request]

jobs:
  compare-cov:
    runs-on: ubuntu-latest
    steps:
      - uses: vgrafe/jest-reports@v0.110
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```
