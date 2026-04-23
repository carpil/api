# Changelog

## [1.1.0](https://github.com/carpil/api/compare/carpil-api-v1.0.0...carpil-api-v1.1.0) (2026-04-23)


### Features

* add Sentry to API for distributed tracing ([02cb123](https://github.com/carpil/api/commit/02cb12373de0d49be8c89a700c26c16ff0abc89c))
* set profileCompleted on user creation and profile update ([b5e8d5d](https://github.com/carpil/api/commit/b5e8d5d4b3cb8c7526f120e5480b7de74e871412))
* **users:** add account deletion endpoint ([9c397eb](https://github.com/carpil/api/commit/9c397eb9ff0a9d82510ee3d1f89b8f498316bdab))
* **users:** add role field and PATCH /me endpoint ([5e569fd](https://github.com/carpil/api/commit/5e569fdfd15c7876eff33302d263c5ce533d45bd))


### Bug Fixes

* block account deletion when user has any active or in-progress ride ([a59b988](https://github.com/carpil/api/commit/a59b9889f7be15708ebf6fe3ac3a9d364fc7fcc7))
* exclude soft-deleted rides from active ride check on account deletion ([1508252](https://github.com/carpil/api/commit/150825209e6396f9825b18b86b186475425dc6fd))
* explicit firebase-admin init per environment, emulator needs no credentials ([ad0fb3b](https://github.com/carpil/api/commit/ad0fb3b0c0a6f862190ac3e0fc00fa7dfe525dda))
* parse PR number from release-please JSON output for auto-merge ([990327a](https://github.com/carpil/api/commit/990327ad05f8804b8e2d46f0056ea8171441e553))
* pass projectId explicitly when initializing firebase-admin without credentials ([24b7bdf](https://github.com/carpil/api/commit/24b7bdff8c34c001180e16056bf42d7aad5981a3))
* **rides:** stop incrementing availableSeats when passenger leaves ([0c5bbe1](https://github.com/carpil/api/commit/0c5bbe10c259e4f672678a48a43e4116e85caa8b))
* use RELEASE_PLEASE_PAT so merge and tag trigger downstream workflows ([4588b47](https://github.com/carpil/api/commit/4588b47b252e9c6e6bd5aced68bf11d5d3add490))
* **users:** check both currentRideId and inRide before deleting account ([30d3038](https://github.com/carpil/api/commit/30d3038934398ea9fc87754c16b4bdfb65890128))
