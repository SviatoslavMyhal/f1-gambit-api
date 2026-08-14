/**
 * HTTP routes are mounted under this global prefix via `setGlobalPrefix`.
 *
 * We keep product versioning in the path (`api/v1`) instead of Nest's
 * `enableVersioning` for now. Adopting `enableVersioning` (e.g. global prefix
 * `api` + URI version `v1`) would be a coordinated change across Lambda,
 * OpenAPI, and every client.
 *
 * For evolving JSON shapes without bumping the HTTP API, resources expose
 * `schemaVersion` where applicable (e.g. lobby `simulationResult`, session
 * payloads).
 */
export const GLOBAL_API_PREFIX = 'api/v1' as const;

/** OpenAPI document `info.version` (semver of the published spec). */
export const OPENAPI_SPEC_VERSION = '1.0' as const;

const OPENAPI_VERSIONING_SECTION = [
  '### Versioning',
  '',
  `- **HTTP:** All operations are under \`/${GLOBAL_API_PREFIX}/\`.`,
  '- **Breaking HTTP/DTO changes** for a new product generation should add a new path prefix (for example `api/v2`) or migrate to Nest `enableVersioning` with global prefix `api` in one release with Lambda, Swagger, and clients updated together.',
  '- **Payload evolution:** JSON bodies may include `schemaVersion` so clients can interpret the shape (for example multiplayer `simulationResult`) without changing the URL prefix.',
].join('\n');

export function withOpenApiVersioningNotes(baseDescription: string): string {
  return `${baseDescription.trim()}\n\n${OPENAPI_VERSIONING_SECTION}`;
}
