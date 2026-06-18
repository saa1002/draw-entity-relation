const fs = require("fs");
const { execSync } = require("child_process");
const packageJson = require("../package.json");

const getCommit = () => {
    try {
        const commit =
            process.env.VERCEL_GIT_COMMIT_SHA ||
            execSync("git rev-parse --short HEAD", {
                encoding: "utf8",
                stdio: ["ignore", "pipe", "ignore"],
            }).trim();

        return commit.slice(0, 7);
    } catch {
        return "desconocido";
    }
};

const formatDate = () =>
    new Intl.DateTimeFormat("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Europe/Madrid",
    }).format(new Date());

const content = `// Archivo generado automáticamente por scripts/generateBuildInfo.js
export const APP_VERSION = "${packageJson.version}";
export const BUILD_DATE = "${formatDate()}";
export const BUILD_COMMIT = "${getCommit()}";
`;

fs.writeFileSync("src/buildInfo.js", content, "utf8");

console.log(
    `[build-info] v${packageJson.version} · ${formatDate()} · ${getCommit()}`,
);