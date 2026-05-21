---
'@runfile-ai/schemas': patch
---

Enable PyPI publishing through the same Changesets workflow that handles
npm + Go tagging. Uses PyPI trusted publishing (OIDC) so no API token is
stored in GitHub secrets. The previous standalone `release.yml` is removed
since its only remaining responsibility was PyPI.
