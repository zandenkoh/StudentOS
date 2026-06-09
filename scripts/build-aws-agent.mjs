import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "dist", "aws");
const serverOnlyShim = path.join(rootDir, "src", "aws", "server-only-shim.ts");

const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];

function resolveSourcePath(importPath) {
  const basePath = path.join(rootDir, "src", importPath.slice(2));

  if (existsSync(basePath)) return basePath;

  for (const extension of extensions) {
    const candidate = `${basePath}${extension}`;
    if (existsSync(candidate)) return candidate;
  }

  for (const extension of extensions) {
    const candidate = path.join(basePath, `index${extension}`);
    if (existsSync(candidate)) return candidate;
  }

  return undefined;
}

const studentosAwsAliases = {
  name: "studentos-aws-aliases",
  setup(bundle) {
    bundle.onResolve({ filter: /^server-only$/ }, () => ({ path: serverOnlyShim }));

    bundle.onResolve({ filter: /^@\// }, (args) => {
      const resolvedPath = resolveSourcePath(args.path);

      if (!resolvedPath) {
        return {
          errors: [{ text: `Unable to resolve ${args.path} from ${args.importer}` }],
        };
      }

      return { path: resolvedPath };
    });
  },
};

rmSync(outputDir, { force: true, recursive: true });

await build({
  entryPoints: [path.join(rootDir, "src", "aws", "analyse-student-chaos-handler.ts")],
  outfile: path.join(outputDir, "analyse-student-chaos-handler.js"),
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  sourcemap: true,
  treeShaking: true,
  plugins: [studentosAwsAliases],
  logLevel: "info",
});
