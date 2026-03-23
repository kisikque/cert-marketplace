import path from "path";
import { spawn } from "child_process";

function buildDefaultSqliteUrl() {
  const absolutePath = path.resolve(process.cwd(), "prisma/dev.db").replace(/\\/g, "/");
  const normalizedPath = /^[A-Za-z]:\//.test(absolutePath) ? `/${absolutePath}` : absolutePath;
  return `file:${normalizedPath}`;
}

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || buildDefaultSqliteUrl()
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

await run("npx", ["prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"]);
await run("node", ["src/server.js"]);
