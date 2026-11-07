## Regression Testing

### Which unit and integration tests are currently included?
All backend unit and integration tests (`backend/tests/`) are part of the regression suite. Every test is tagged with `@pytest.mark.regression`, so the suite can be run with `pytest -m regression`. If we later need to narrow regression runs to key tests, we can do so by changing which tests carry the tag.

### How did we decide which tests belong in the regression suite?
The full suite is fast enough that running every test is the simplest and safest choice. If the suite grows past a few minutes, we will consider limiting regression runs to key tests.

### When does the suite run?
On every pull request, including PRs into `dev` and `main`.

### Which tools or frameworks execute it?
- **GitHub Actions** runs the suite: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- **pytest** is the test framework: [`backend/tests/`](../backend/tests/)
### Approximately how long does the suite take?
Under one minute, so we can run it on every PR.

### What happens when a regression test fails?
The PR shows a failing check (red ✗), which signals that the change should be fixed before merging.

### Where can the instructor see evidence from a recent run?
TODO: link a recent CI run near the end of the sprint.