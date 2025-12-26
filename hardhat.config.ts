import "@fhevm/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@typechain/hardhat";
import "hardhat-deploy";
import "hardhat-gas-reporter";
import type { HardhatUserConfig } from "hardhat/config";
import "solidity-coverage";
import fs from "node:fs";
import * as dotenv from "dotenv";

import "./tasks/accounts";
import "./tasks/ObscuraMint";

dotenv.config();

function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
}

function tryRecoverEnvValueFromDotEnv(key: string): string | undefined {
  try {
    const content = fs.readFileSync(".env", "utf8");
    const lines = content.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (!line.startsWith(`${key}=`)) continue;
      const value = line.slice(key.length + 1).trim();
      if (value) return value;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function tryRecoverInfuraApiKeyFromMalformedDotEnv(): string | undefined {
  try {
    const content = fs.readFileSync(".env", "utf8");
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line.startsWith("INFURA_API_KEY=") && line.length === "INFURA_API_KEY=".length) {
        const candidate = lines[i + 1]?.trim() ?? "";
        if (/^[0-9a-fA-F]{32,}$/.test(candidate)) return candidate;
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

const PRIVATE_KEY = normalizePrivateKey(process.env.PRIVATE_KEY);
const PRIVATE_KEY_FALLBACK = normalizePrivateKey(tryRecoverEnvValueFromDotEnv("PRIVATE_KEY"));
const INFURA_API_KEY =
  (process.env.INFURA_API_KEY && process.env.INFURA_API_KEY.trim()) || tryRecoverInfuraApiKeyFromMalformedDotEnv();

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  etherscan: {
    apiKey: {
      sepolia:
        (process.env.ETHERSCAN_API_KEY && process.env.ETHERSCAN_API_KEY.trim()) ||
        tryRecoverEnvValueFromDotEnv("ETHERSCAN_API_KEY") ||
        "",
    },
  },
  gasReporter: {
    currency: "USD",
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: [],
  },
  networks: {
    hardhat: {
      chainId: 31337,
      saveDeployments: true,
    },
    localhost: {
      chainId: 31337,
      url: "http://127.0.0.1:8545",
      saveDeployments: true,
    },
    sepolia: {
      accounts: (PRIVATE_KEY || PRIVATE_KEY_FALLBACK) ? [PRIVATE_KEY || PRIVATE_KEY_FALLBACK!] : [],
      chainId: 11155111,
      url: INFURA_API_KEY ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}` : "",
    },
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.27",
    settings: {
      metadata: {
        // Not including the metadata hash
        // https://github.com/paulrberg/hardhat-template/issues/31
        bytecodeHash: "none",
      },
      // Disable the optimizer when debugging
      // https://hardhat.org/hardhat-network/#solidity-optimizer-support
      optimizer: {
        enabled: true,
        runs: 800,
      },
      evmVersion: "cancun",
    },
  },
  typechain: {
    outDir: "types",
    target: "ethers-v6",
  },
};

export default config;
