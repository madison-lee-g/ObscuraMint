import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (hre.network.name === "sepolia") {
    const accounts = (hre.network.config as unknown as { accounts?: unknown }).accounts;
    const url = (hre.network.config as unknown as { url?: string }).url;
    if (!url) {
      throw new Error("Missing Sepolia RPC URL. Ensure INFURA_API_KEY is set in .env.");
    }
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error("Missing PRIVATE_KEY in .env (without the 0x prefix).");
    }
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedObscuraMint = await deploy("ObscuraMint", {
    from: deployer,
    log: true,
  });

  console.log(`ObscuraMint contract: `, deployedObscuraMint.address);
};
export default func;
func.id = "deploy_obscuraMint"; // id required to prevent reexecution
func.tags = ["ObscuraMint"];
