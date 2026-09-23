# codov — technical documentation

The [top-level README](../README.md) covers installing and deploying the app. These pages explain how
it works inside.

| Page | What it answers |
|---|---|
| [architecture.md](architecture.md) | How a request flows, what the subsystems are, what not to break |
| [database.md](database.md) | Every model, the cascades, how migrations are run |
| [access-control.md](access-control.md) | Sessions, roles, and which lessons a student may open |
| [student-workspace.md](student-workspace.md) | Editor, preview, integrity recording, draft → submission → grade |
| [autotests.md](autotests.md) | Rule types and how to write tests that hold |
| [content-pipeline.md](content-pipeline.md) | How course content is authored and imported |
| [operations.md](operations.md) | Environments, variables, releases, scripts, backups |

Guides for the teacher (in Russian) live with the course materials, outside this repository:
`Documents/codov/docs` — using the admin area, the state of the START course, and working with the site.

## Ground rules

- **Student code is untrusted.** It runs in frames without `allow-same-origin`, and answers are never
  inlined into a page a student can view-source.
- **Content stays out of this repository.** Lesson sources contain model solutions.
- **Access is checked in the action, not in the proxy.** The proxy only redirects.
- **Additive migrations.** New columns get defaults; the build runs `prisma migrate deploy` before the
  new code serves.
- **Both languages, always.** Every dictionary key and every lesson exists in `uz` and `ru`.
