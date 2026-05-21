# @runfile-ai/schemas

## 0.1.2

### Patch Changes

- [`4ad5c7d`](https://github.com/runfile-ai/schemas/commit/4ad5c7df1c08f995cbd099139cf2bbfae70303d4) Thanks [@ada-raj](https://github.com/ada-raj)! - Enable PyPI publishing through the same Changesets workflow that handles
  npm + Go tagging. Uses PyPI trusted publishing (OIDC) so no API token is
  stored in GitHub secrets. The previous standalone `release.yml` is removed
  since its only remaining responsibility was PyPI.

## 0.1.1

### Patch Changes

- [`36259de`](https://github.com/runfile-ai/schemas/commit/36259def73e0d1225905e3e812b1f81124f0545d) Thanks [@ada-raj](https://github.com/ada-raj)! - Initial automated release through Changesets. Establishes the `v0.1.1`
  git tag so Go consumers can fetch the module via
  `go get github.com/runfile-ai/schemas@v0.1.1`. Same shapes as `0.1.0`
  (which was a one-time manual publish to claim the npm name).
