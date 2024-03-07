const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("ContractFactory", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployCommunityFactoryFixture() {
    const [creator, addr1, addr2, addr3, addr4] = await ethers.getSigners();
    const Contract = await ethers.deployContract("CommunityFactory");
    const contract = await Contract.waitForDeployment();
    return { contract, creator, addr1, addr2, addr3, addr4 };
  }

  async function buyABXFixture() {
    // This is a fixture function that sets up the necessary conditions for buying 200 ABX.
    const { contract, addr1 } = await loadFixture(
      deployCommunityFactoryFixture
    );
    await contract
      .connect(addr1)
      .buyABX(2000, { value: ethers.parseUnits("20000", "wei") });
  }

  async function createCommunityFixture() {
    // This is a fixture function that sets up the necessary conditions for creating a community.
    const { contract, addr1 } = await loadFixture(
      deployCommunityFactoryFixture
    );
    await contract
      .connect(addr1)
      .createCommunity("Test Community", "TST", "T", "TKT");
    // const communityList = await contract.getAllCommunities();
    // const communityAddr = communityList[0];
    // return { contract, communityAddr };
  }

  describe("Buy ABX Token", function () {
    // This test suite is for testing the functionality of buying ABX tokens.

    it("Should buy ABX Token", async function () {
      // This test case verifies that a user can successfully buy ABX tokens by sending the correct amount of ether.
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
      // This test case checks that the contract reverts when a user tries to buy ABX tokens with an incorrect amount of ether.
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
      // This test case ensures that the contract creator cannot buy ABX tokens, as they are not allowed to do so.
      const { contract, creator } = await loadFixture(
        deployCommunityFactoryFixture
      );

      await expect(
        contract
          .connect(creator)
          .buyABX(200, { value: ethers.parseUnits("2000", "wei") })
      ).to.be.revertedWith("Owner can't buy ABX from himself!!");
    });

    it("Should add wei to creator balance", async function () {
      // This test case checks that when a user buys ABX tokens, the correct amount of ether is added to the creator's balance.
      const { contract, creator, addr1 } = await loadFixture(
        deployCommunityFactoryFixture
      );
      const creatorBalIni = await ethers.provider.getBalance(creator.address);
      await contract
        .connect(addr1)
        .buyABX(200, { value: ethers.parseUnits("2000", "wei") });
      const creatorBal = await ethers.provider.getBalance(creator.address);
      expect(creatorBal.toString()).to.equal(
        (creatorBalIni + BigInt(2000)).toString()
      );
    });
  });

  describe("Create Community", function () {
    // This test suite is for testing the functionality of creating a community.

    it("Should fail create a community for insufficient ABX token Balance", async function () {
      // This test case checks that a user cannot create a community if they do not have enough ABX tokens.
      const { contract, addr1, addr2 } = await loadFixture(
        deployCommunityFactoryFixture
      );
      await expect(
        contract
          .connect(addr2)
          .createCommunity("Test Community", "TST", "T", "TKT")
      ).to.be.revertedWith(
        "You don't have enough balance to create community."
      );
    });

    it("Should successfully create a community", async function () {
      // This test case verifies that a user can successfully create a community if they have enough ABX tokens.
      const { contract, addr1 } = await loadFixture(
        deployCommunityFactoryFixture
      );

      await loadFixture(buyABXFixture);

      await contract
        .connect(addr1)
        .createCommunity("Test Community", "TST", "T", "TKT");
      const communityList = await contract.getAllCommunities();
      const communityAddr = communityList[0];
      const community = await contract.communityInformation(communityAddr);
      expect(community.name).to.equal("Test Community");
    });

    it("Should successfully create another community for same creator", async function () {
      // This test case checks that the same creator can create multiple communities if they have enough ABX tokens.
      const { contract, addr1 } = await loadFixture(
        deployCommunityFactoryFixture
      );

      // await contract
      //   .connect(addr1)
      //   .buyABX(2000, { value: ethers.parseUnits("20000", "wei") });
      await loadFixture(buyABXFixture);

      await contract
        .connect(addr1)
        .createCommunity("Test Community", "TST", "T", "TKT");
      // await loadFixture(createCommunityFixture);

      await contract
        .connect(addr1)
        .createCommunity("Two Community", "TWST", "TW", "TWKT");

      const communityList = await contract.getAllCommunities();
      const communityAddrFirst = communityList[0];
      const communityAddrSec = communityList[1];
      const community1st = await contract.communityInformation(
        communityAddrFirst
      );
      const community2nd = await contract.communityInformation(
        communityAddrSec
      );
      expect(community1st.name).to.equal("Test Community");
      expect(community2nd.name).to.equal("Two Community");
    });
  });

  describe("Join Community", function () {
    // This test suite is for testing the functionality of joining a community.
    it("Should successfully join a community", async function () {
      // This test case verifies that a user can successfully join a community if they have enough ABX tokens.
      const { contract, addr1, addr2 } = await loadFixture(
        deployCommunityFactoryFixture
      );
      await loadFixture(buyABXFixture);
      // create a community
      await contract
        .connect(addr1)
        .createCommunity("Test Community", "TST", "T", "TKT");
      const communityList = await contract.getAllCommunities();
      const communityAddr = communityList[0];
      await contract.connect(addr2).joinCommunity(communityAddr);
      const isMember = await contract.communityMemberships(
        addr2.address,
        communityAddr
      );
      expect(isMember).to.equal(true);
    });
    it("Should fail to join community because already a member", async function () {
      // This test case checks that a user cannot join a community if they are already a member.
      const { contract, addr1, addr2 } = await loadFixture(
        deployCommunityFactoryFixture
      );

      await loadFixture(buyABXFixture);

      // create a community
      await contract
        .connect(addr1)
        .createCommunity("Test Community", "TST", "T", "TKT");
      const communityList = await contract.getAllCommunities();
      const communityAddr = communityList[0];
      await contract.connect(addr2).joinCommunity(communityAddr);
      await expect(
        contract.connect(addr2).joinCommunity(communityAddr)
      ).to.be.revertedWith("User is already a member of the community");
    });
  });
});
