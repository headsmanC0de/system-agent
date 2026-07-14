# String literal and SSOT policy

A string literal is acceptable when it is local, descriptive, and has no synchronization contract:
unique user-facing copy, an error explanation, a parser token/format, a regular expression, or a
fixed behavioral example in a test.

A value must have a domain-owned SSOT when any of these is true:

- it is external metadata: package/runtime version, product/package/application ID, URL or origin;
- it is a process/persistence contract: IPC channel, storage key, schema identity, status or enum;
- it controls security or runtime behavior: CSP, permission, environment flag, path, interval, limit;
- changing it correctly would otherwise require edits in two production modules;
- a mismatch can produce a false success, security bypass, data loss, or fake telemetry.

Do not solve this with a global constants bucket. Ownership stays close to the domain: branding in
`branding.json`, channels in `channels.ts`, storage keys in `storage.ts`, database values inside the
repository, dependency versions in manifests/lock, and runtime facts in a live probe. Tests import or
derive metadata from the same source; only expected behavior remains literal.

Review every new literal by asking: “Can this external fact or contract change independently?” If
yes, name it and centralize it now. If no, keep the literal local until real reuse appears.

## Review decision

| Literal kind | Keep inline when | Move to SSOT when |
| --- | --- | --- |
| UI copy and errors | It describes one local interaction and is not a machine contract | Product terminology must remain identical across screens or processes |
| Parser tokens, regular expressions, SQL fragments | They belong to one parser or repository implementation | Another production module must interpret the same value |
| Test strings | They are deliberately chosen inputs or expected behavior | They repeat product metadata or a production contract that tests can import/derive |
| Versions and capabilities | Never as a manually maintained production fact | Always derive from the manifest, lockfile, runtime probe, or provider response |
| IPC channels, statuses, schema IDs, storage keys | Never outside their owning domain module | Define once as typed constants/unions and import them |
| URLs, origins, paths, environment flags | Only if the value is inherently local to one call and cannot change independently | Centralize as soon as it configures trust, deployment, storage, or external integration |
| Limits, intervals, timeouts, permissions | Only as a private implementation constant in the owning module | Export/share when another module or test must enforce the same policy |

The mandatory check happens when a literal is added or changed, during review, and in the automated
SSOT regression test. Re-check an existing literal whenever its ownership, consumers, deployment
environment, security impact, or update cadence changes. Identical spelling alone is not a reason to
extract a constant; shared meaning and synchronized change are.
