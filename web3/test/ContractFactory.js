const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
require("ethers");

describe("ContractFactory", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployCommunityFactoryFixture() {
    const [creator, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const Contract = await ethers.deployContract("CommunityFactory");
    const contract = await Contract.waitForDeployment();
    return { contract, creator, addr1, addr2, addr3, addr4 };
  }

  describe("Buy ABX Token", function () {
    it("Should buy ABX Token", async function () {
      const { contract, addr1 } = await loadFixture(
        deployCommunityFactoryFixture
      );

      await contract
        .connect(addr1)
        .buyABX(200, { value: ethers.parseUnits("2000", "wei") });

      const ABXBAL = await contract.connect(addr1).ABXtokenBal();
      expect(ABXBAL.toString()).to.equal("200");
    });

    it("Should fail if the value is not enough or greater", async function () {
      const { contract, addr1 } = await loadFixture(
        deployCommunityFactoryFixture
      );

      await expect(
        contract
          .connect(addr1)
          .buyABX(200, { value: ethers.parseUnits("100", "wei") })
      ).to.be.revertedWith("Please select the specified amount of ether");
    });
    it("Should fail if the creator wants to buy ABX Token", async function () {
      const { contract, creator } = await loadFixture(
        deployCommunityFactoryFixture
      );

      await expect(
        contract
          .connect(creator)
          .buyABX(200, { value: ethers.parseUnits("2000", "wei") })
      ).to.be.revertedWith("Owner can't buy ABX from himself!!");
    });
  });
});
