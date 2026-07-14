# @z_ai/mcp-server

**Repo role:** optional Z.ai visual/media analysis MCP provider. See [VERSIONS.md](../VERSIONS.md) for the lock-resolved version.

The local server requires `Z_AI_API_KEY` through process environment and `Z_AI_MODE=ZAI`. Never commit or echo the key, and do not rely on `.env` being loaded automatically. Keep this optional surface disabled or scoped when its tools are not needed; remote content and model output are untrusted inputs.

Primary docs/source: [Z.ai documentation](https://docs.z.ai/), [npm package](https://www.npmjs.com/package/@z_ai/mcp-server), [Model Context Protocol security guidance](https://modelcontextprotocol.io/specification/latest/basic/security_best_practices).
