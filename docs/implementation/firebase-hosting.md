# LuLu Firebase Hosting

Deployed on 24 October 2026 through the official Firebase MCP server.

- Project: `khora-lulu-2026`, display name `KHORA` (Google rejected the accent in `KHÔRA`).
- Registered web app: `LuLu`, app ID `1:687182197240:web:c4068518eef4197621660d`.
- Live app: https://khora-lulu-2026.web.app
- Hosting release version: `aa9ffae08cb66ba1`.
- Build output: `dist/app`; SPA rewrite and immutable hashed asset caching.
- Verification: `npm run build:app` passed; Firebase MCP deployment reported success at 100%; live browser page loaded the LuLu journal UI and logo.
- Public output includes compiled app files and four transparent logo assets. Internal review documents, original design boards, preserved framed demo and videos are outside the hosting output.

Confessions was inspected as a hosting precedent. Its project, services and data were not modified. This release hosts the current frontend; hosting does not establish implemented authentication, encryption, database synchronisation or AI services. Claims visible in generated screen designs must be reconciled with those implementations as functionality is connected.

The plugin launcher failed in npm dependency resolution (`Invalid Version`). The installed Firebase MCP runtime was connected directly with the MCP SDK to complete project creation, app registration, hosting initialisation and deployment through MCP tools.
