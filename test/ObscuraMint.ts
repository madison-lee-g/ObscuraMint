import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { ObscuraMint, ObscuraMint__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("ObscuraMint")) as ObscuraMint__factory;
  const obscuraMint = (await factory.deploy()) as ObscuraMint;
  const obscuraMintAddress = await obscuraMint.getAddress();
  return { obscuraMint, obscuraMintAddress };
}

async function userDecryptEaddress(handleBytes32: string, contractAddress: string, user: HardhatEthersSigner) {
  const keypair = fhevm.generateKeypair();
  const contractAddresses = [contractAddress];
  const startTimestamp = Math.floor(Date.now() / 1000).toString();
  const durationDays = "10";
  const eip712 = fhevm.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
  const signature = await user.signTypedData(
    eip712.domain,
    { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    eip712.message,
  );

  const result = await fhevm.userDecrypt(
    [{ handle: handleBytes32, contractAddress }],
    keypair.privateKey,
    keypair.publicKey,
    signature.replace("0x", ""),
    contractAddresses,
    user.address,
    startTimestamp,
    durationDays,
  );

  return (result as unknown as Record<string, unknown>)[handleBytes32] as string;
}

describe("ObscuraMint", function () {
  let signers: Signers;
  let obscuraMint: ObscuraMint;
  let obscuraMintAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ obscuraMint, obscuraMintAddress } = await deployFixture());
  });

  it("initializes the owner", async function () {
    expect(await obscuraMint.owner()).to.eq(signers.deployer.address);
  });

  it("creates a series and mints within supply", async function () {
    await expect(obscuraMint.connect(signers.alice).createSeries("Genesis", 3))
      .to.emit(obscuraMint, "SeriesCreated")
      .withArgs(0, signers.alice.address, "Genesis", 3);

    expect(await obscuraMint.seriesCount()).to.eq(1);

    const [name, maxSupply, minted, creator] = await obscuraMint.getSeries(0);
    expect(name).to.eq("Genesis");
    expect(maxSupply).to.eq(3);
    expect(minted).to.eq(0);
    expect(creator).to.eq(signers.alice.address);

    await expect(obscuraMint.connect(signers.bob).mintOne(0))
      .to.emit(obscuraMint, "Minted")
      .withArgs(0, signers.bob.address, 1);

    expect(await obscuraMint.balanceOf(signers.bob.address, 0)).to.eq(1);

    const [, , mintedAfter] = await obscuraMint.getSeries(0);
    expect(mintedAfter).to.eq(1);

    await obscuraMint.connect(signers.bob).mint(0, 2);
    expect(await obscuraMint.balanceOf(signers.bob.address, 0)).to.eq(3);

    await expect(obscuraMint.connect(signers.bob).mintOne(0)).to.be.revertedWithCustomError(
      obscuraMint,
      "MaxSupplyExceeded",
    );
  });

  it("allows only the owner to set and decrypt obscuraOwner", async function () {
    await obscuraMint.connect(signers.alice).createSeries("HiddenOwner", 1);

    const encryptedInput = await fhevm
      .createEncryptedInput(obscuraMintAddress, signers.deployer.address)
      .addAddress(signers.bob.address)
      .encrypt();

    await expect(
      obscuraMint.connect(signers.alice).setObscuraOwner(0, encryptedInput.handles[0], encryptedInput.inputProof),
    ).to.be.revertedWithCustomError(obscuraMint, "NotOwner");

    await expect(
      obscuraMint.connect(signers.deployer).setObscuraOwner(0, encryptedInput.handles[0], encryptedInput.inputProof),
    )
      .to.emit(obscuraMint, "ObscuraOwnerUpdated")
      .withArgs(0);

    const handle = await obscuraMint.getObscuraOwner(0);
    expect(handle).to.not.eq(ethers.ZeroHash);

    const clearOwner = await userDecryptEaddress(handle, obscuraMintAddress, signers.deployer);
    expect(ethers.getAddress(clearOwner)).to.eq(ethers.getAddress(signers.bob.address));
  });
});
