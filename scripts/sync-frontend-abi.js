/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

function usage() {
  console.log("Usage: node scripts/sync-frontend-abi.js [network]");
  console.log("Example: node scripts/sync-frontend-abi.js sepolia");
}

const network = process.argv[2] || "sepolia";
const deploymentPath = path.join(__dirname, "..", "deployments", network, "ObscuraMint.json");
const frontendContractsPath = path.join(__dirname, "..", "frontend", "src", "config", "contracts.ts");

if (!fs.existsSync(deploymentPath)) {
  console.error(`Deployment file not found: ${deploymentPath}`);
  usage();
  process.exit(1);
}

const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
if (!deployment || typeof deployment.address !== "string" || !Array.isArray(deployment.abi)) {
  console.error(`Invalid deployment JSON: ${deploymentPath}`);
  process.exit(1);
}

const output =
  `export const CONTRACT_ADDRESS = '${deployment.address}';\n\n` +
  `export const CONTRACT_ABI = ${JSON.stringify(deployment.abi, null, 2)} as const;\n`;

fs.writeFileSync(frontendContractsPath, output, "utf8");
console.log(`Synced ABI and address to ${frontendContractsPath}`);

