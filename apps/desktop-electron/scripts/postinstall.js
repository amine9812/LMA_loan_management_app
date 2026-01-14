const { spawnSync } = require("node:child_process");

if (process.env.SKIP_ELECTRON_BUILDER === "1") {
  console.log("Skipping electron-builder install-app-deps (SKIP_ELECTRON_BUILDER=1).");
  process.exit(0);
}

const result = spawnSync(
  "npx",
  ["electron-builder", "install-app-deps"],
  { stdio: "inherit", shell: true }
);

process.exit(result.status ?? 1);
