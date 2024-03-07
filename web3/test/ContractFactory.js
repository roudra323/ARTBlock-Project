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
    const { contract, addr1, addr2, addr3 } = await loadFixture(
      deployCommunityFactoryFixture
    );
    await contract
      .connect(addr1)
      .buyABX(2000, { value: ethers.parseUnits("20000", "wei") });
    return { contract, addr1, addr2, addr3 };
  }

  async function createCommunityFixture() {
    // This is a fixture function that sets up the necessary conditions for creating a community.
    const { contract, addr1, addr2, addr3 } = await loadFixture(buyABXFixture);
    await contract
      .connect(addr1)
      .createCommunity("Test Community", "TST", "T", "TKT");
    // join community
    const communityList = await contract.getAllCommunities();
    const communityAddr = communityList[0];
    // await contract.connect(addr2).joinCommunity(communityAddr);
    return { contract, addr1, addr2, addr3, communityAddr };
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
        .createCommunity(anyValue, anyValue, anyValue, anyValue);
      const communityList = await contract.getAllCommunities();
      const communityAddr = communityList[0];
      await contract.connect(addr2).joinCommunity(communityAddr);
      await expect(
        contract.connect(addr2).joinCommunity(communityAddr)
      ).to.be.revertedWith("User is already a member of the community");
    });
    it("Should fail because community does not exist", async function () {
      // This test case checks that a user cannot join a community that does not exist.
      const { contract, addr1 } = await loadFixture(
        deployCommunityFactoryFixture
      );
      await expect(
        contract
          .connect(addr1)
          .joinCommunity("0x0000000000000000000000000000000000000000")
      ).to.be.revertedWith("Community does not exist");
    });
    it("Should emit event when joining a community", async function () {
      // This test case checks that the correct event is emitted when a user joins a community.
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
      await expect(contract.connect(addr2).joinCommunity(communityAddr))
        .to.emit(contract, "JoinedCommunity")
        .withArgs(addr2.address, communityAddr);
    });
  });

  describe("Buy Community Token", function () {
    // This test suite is for testing the functionality of buying community tokens.
    it("Should fail because Not a member of the community", async function () {
      // This test case checks that a user cannot buy community tokens Not a member of the community.
      await loadFixture(buyABXFixture);
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await expect(
        contract.connect(addr2).buyCommToken(communityAddr, 200)
      ).to.be.revertedWith("Not a member of the community");
    });
    it("Should fail because community does not exist", async function () {
      // This test case checks that a user cannot buy community tokens if the community does not exist.
      const { contract, addr1 } = await loadFixture(buyABXFixture);
      await expect(
        contract
          .connect(addr1)
          .buyCommToken("0x0000000000000000000000000000000000000000", 200)
      ).to.be.revertedWith("The Community does not exist!!");
    });
    it("Should fail because insufficient ABX token balance", async function () {
      // This test case checks that a user cannot buy community tokens if they do not have enough ABX tokens.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      // join community
      await contract.connect(addr2).joinCommunity(communityAddr);
      await expect(
        contract.connect(addr2).buyCommToken(communityAddr, 200)
      ).to.be.revertedWith(
        "You don't have enough balance to buy community token."
      );
    });
    it("Should successfully buy community token", async function () {
      // This test case verifies that a user can successfully buy community tokens if they have enough ABX tokens.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      // join community
      await contract.connect(addr2).joinCommunity(communityAddr);
      // buy 2000 ABX token
      await contract
        .connect(addr2)
        .buyABX(2000, { value: ethers.parseUnits("20000", "wei") });
      // buy 200 community token
      await contract.connect(addr2).buyCommToken(communityAddr, 200);
      const userCommTokenBal = await contract
        .connect(addr2)
        .getCommTokenBal(communityAddr);
      expect(userCommTokenBal.toString()).to.equal("200");
    });
  });

  describe("Publish Product", function () {
    // This test suite is for testing the functionality of publishing a product.
    it("Should fail cause community dosen't exist", async function () {
      // This test case checks that a user cannot publish a product if the community does not exist.
      const { contract, addr1, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await expect(
        contract
          .connect(addr1)
          .publishProduct(
            "TP",
            "Test Product",
            "0x0000000000000000000000000000000000000000",
            true,
            200
          )
      ).to.be.revertedWith("The Community does not exist!!");
    });

    it("Should fail cause rather than community creator , other addresses will call", async function () {
      // This test case checks that a user cannot publish a product if they are not the creator of the community.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      // community information
      const community = await contract.communityInformation(communityAddr);
      console.log(community.creator);
      console.log(addr1.address);

      // join community
      await contract.connect(addr2).joinCommunity(communityAddr);

      await expect(
        contract
          .connect(addr2)
          .publishProduct("TP", "Test Product", communityAddr, true, 200)
      ).to.be.revertedWith("Only community creator can publish product!!");
    });
    it("Should be successful, community creator will call", async function () {
      // This test case checks that a creator can publish a product.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      // buy Community Token
      await contract.connect(addr1).buyCommToken(communityAddr, 200);
      await contract
        .connect(addr1)
        .publishProduct("TP", "Test Product", communityAddr, true, 200);
    });
    it("Should fail, native community token balance is insuffitient", async function () {
      // This test case checks if the creator has enough community native token to publish a product.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      // buy Community Token
      await contract.connect(addr1).buyCommToken(communityAddr, 50);
      await expect(
        contract
          .connect(addr1)
          .publishProduct("TP", "Test Product", communityAddr, true, 200)
      ).to.be.revertedWith("You don't have enough community native token.");
    });

    // it("", async function () {});
    // it("", async function () {});
    // it("", async function () {});
    // it("", async function () {});
  });
});
