import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("obscura:address", "Prints the ObscuraMint address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const deployment = await deployments.get("ObscuraMint");
  console.log("ObscuraMint address is " + deployment.address);
});

task("obscura:create-series", "Creates a new NFT series")
  .addOptionalParam("address", "Optionally specify the ObscuraMint contract address")
  .addParam("name", "Series name")
  .addParam("max", "Max supply")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers } = hre;

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ObscuraMint");
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("ObscuraMint", deployment.address);

    const maxSupply = Number(taskArguments.max);
    if (!Number.isInteger(maxSupply) || maxSupply <= 0 || maxSupply > 0xffffffff) {
      throw new Error(`Argument --max must be a positive uint32`);
    }

    const tx = await contract.connect(signers[0]).createSeries(taskArguments.name, maxSupply);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("obscura:mint", "Mints from an NFT series")
  .addOptionalParam("address", "Optionally specify the ObscuraMint contract address")
  .addParam("id", "Series id")
  .addOptionalParam("amount", "Mint amount (default: 1)", "1")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers } = hre;

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ObscuraMint");
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("ObscuraMint", deployment.address);

    const seriesId = BigInt(taskArguments.id);
    const amount = Number(taskArguments.amount);
    if (!Number.isInteger(amount) || amount <= 0 || amount > 0xffffffff) {
      throw new Error(`Argument --amount must be a positive uint32`);
    }

    const tx = await contract.connect(signers[0]).mint(seriesId, amount);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("obscura:set-owner", "Sets the encrypted obscuraOwner for a series (owner only)")
  .addOptionalParam("address", "Optionally specify the ObscuraMint contract address")
  .addParam("id", "Series id")
  .addParam("owner", "Cleartext owner address to encrypt")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ObscuraMint");
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("ObscuraMint", deployment.address);

    const clearOwner = ethers.getAddress(taskArguments.owner);

    const encrypted = await fhevm
      .createEncryptedInput(deployment.address, signers[0].address)
      .addAddress(clearOwner)
      .encrypt();

    const tx = await contract.connect(signers[0]).setObscuraOwner(taskArguments.id, encrypted.handles[0], encrypted.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("obscura:decrypt-owner", "Decrypts the obscuraOwner for a series (owner only)")
  .addOptionalParam("address", "Optionally specify the ObscuraMint contract address")
  .addParam("id", "Series id")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { deployments, ethers, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("ObscuraMint");
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("ObscuraMint", deployment.address);

    const handle = await contract.getObscuraOwner(taskArguments.id);
    if (handle === ethers.ZeroHash) {
      console.log("obscuraOwner is not set");
      return;
    }

    const keypair = fhevm.generateKeypair();
    const contractAddresses = [deployment.address];
    const startTimestamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = "10";
    const eip712 = fhevm.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);

    const signature = await signers[0].signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message,
    );

    const result = await fhevm.userDecrypt(
      [{ handle, contractAddress: deployment.address }],
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      signers[0].address,
      startTimestamp,
      durationDays,
    );

    console.log(`Encrypted obscuraOwner: ${handle}`);
    console.log(`Clear obscuraOwner    : ${(result as unknown as Record<string, unknown>)[handle]}`);
  });
