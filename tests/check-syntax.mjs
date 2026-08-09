import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();

function collect(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collect(full));
    else if (entry.isFile() && entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

const files = collect(root);
const failures = [];
for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    failures.push(`${relative(root, file)}\n${error.stdout || error.stderr || error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`JS 语法检查通过：${files.length} 个文件`);
}
