## Regression Testing

### Which unit and integration tests are currently included?
All backend unit and integration tests (`backend/tests/`) are part of the regression suite. Every test is tagged with `@pytest.mark.regression`, so the suite can be run with `pytest -m regression`. If we later need to narrow regression runs to key tests, we can do so by changing which tests carry the tag.

### How did we decide which tests belong in the regression suite?
The full suite is fast enough that running every test is the simplest and safest choice. If the suite grows past a few minutes, we will consider limiting regression runs to key tests.

### When does the suite run?
On every pull request into `dev` or `main`, and on every push to `dev` or `main` (so it runs again on the merged result). The backend deploy depends on it: the `deploy-backend` job only runs after the suite passes, so a commit with a failing test never reaches Render.

### Which tools or frameworks execute it?
- **GitHub Actions** runs the suite: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- **pytest** is the test framework: [`backend/tests/`](../backend/tests/)
- **testcontainers** starts a throwaway `postgres:16-alpine` database for the run.

### Approximately how long does the suite take?
Under one minute, so we can run it on every PR.

### What happens when a regression test fails?
The PR shows a failing check (red ✗), which signals that the change should be fixed before merging. Further we have a ruleset that disallows merging if any tests fail.

### Where can the instructor see evidence from a recent run?
A recent CI run is available here: [GitHub Actions run #44649239590](https://github.com/BisonRIdes/Comp4350Project/actions/runs/44649239590)