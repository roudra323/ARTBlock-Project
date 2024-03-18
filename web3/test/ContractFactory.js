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
    // const { nftContract } = await loadFixture(deployNFTFactoryFixture);
    // const Contract = await ethers.deployContract("CommunityFactory");
    // const contract = await Contract.waitForDeployment();
    // Deploying the NFT contract
    const NFTcontract = await ethers.getContractFactory("NFTfactory");
    const nftcontract = await NFTcontract.deploy();
    // Deploying the Community Factory contract
    const Contract = await ethers.getContractFactory("CommunityFactory");
    const contract = await Contract.deploy(nftcontract);
    console.log("Contract Factory address -> ", contract.address);
    console.log("NFT Factory address -> ", nftcontract.address);
    return { contract, creator, addr1, addr2, addr3, addr4, nftcontract };
  }

  // // We define a fixture to reuse the same setup in every test.
  // async function deployNFTFactoryFixture() {
  //   const [creator, addr1, addr2, addr3, addr4] = await ethers.getSigners();
  //   const nftContract = await ethers.deployContract("NFTfactory");
  //   console.log(nftContract.address);
  //   // const nftcontract = await nftContract.waitForDeployment();
  //   return { nftContract };
  // }

  async function buyABXFixture() {
    // This is a fixture function that sets up the necessary conditions for buying 200 ABX.
    const { contract, addr1, addr2, addr3, nftcontract } = await loadFixture(
      deployCommunityFactoryFixture
    );
    await contract
      .connect(addr1)
      .buyABX(2000, { value: ethers.parseUnits("20000", "wei") });
    return { contract, addr1, addr2, addr3, nftcontract };
  }

  async function createCommunityFixture() {
    // This is a fixture function that sets up the necessary conditions for creating a community.
    const { contract, addr1, addr2, addr3, nftcontract } = await loadFixture(
      buyABXFixture
    );
    await contract
      .connect(addr1)
      .createCommunity("Test Community", "TST", "T", "TKT");
    // join community
    const communityList = await contract.getAllCommunities();
    const communityAddr = communityList[0];
    // await contract.connect(addr2).joinCommunity(communityAddr);
    return { contract, addr1, addr2, addr3, communityAddr, nftcontract };
  }

  async function publishProductFixture() {
    const { contract, addr1, addr2, addr3, communityAddr, nftcontract } =
      await loadFixture(createCommunityFixture);
    // Join Community Address 2 and 3
    await contract.connect(addr2).joinCommunity(communityAddr);
    await contract.connect(addr3).joinCommunity(communityAddr);
    // Buy Abx for Address 2 and 3
    await contract
      .connect(addr2)
      .buyABX(200, { value: ethers.parseUnits("2000", "wei") });
    await contract
      .connect(addr3)
      .buyABX(200, { value: ethers.parseUnits("2000", "wei") });

    // Buy Community Token for Address 1
    await contract.connect(addr1).buyCommToken(communityAddr, 300);
    // Publish product for Address 1
    await contract
      .connect(addr1)
      .publishProduct("TP", "Test Product", communityAddr, true, 200);
    return { contract, addr1, addr2, addr3, communityAddr, nftcontract };
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
      ).to.be.revertedWithCustomError(contract, "InvalidAmount");
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
      ).to.be.revertedWithCustomError(contract, "UnauthorizedAccess");
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
      ).to.be.revertedWithCustomError(contract, "InsufficientBalance");
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
        .createCommunity("anyValue", "anyValue", "anyValue", "anyValue");
      const communityList = await contract.getAllCommunities();
      const communityAddr = communityList[0];
      await contract.connect(addr2).joinCommunity(communityAddr);
      await expect(
        contract.connect(addr2).joinCommunity(communityAddr)
      ).to.be.revertedWithCustomError(contract, "AlreadyMember");
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
      ).to.be.revertedWithCustomError(contract, "CommunityNotFound");
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
      ).to.be.revertedWithCustomError(contract, "UnauthorizedAccess");
    });
    it("Should fail because community does not exist", async function () {
      // This test case checks that a user cannot buy community tokens if the community does not exist.
      const { contract, addr1 } = await loadFixture(buyABXFixture);
      await expect(
        contract
          .connect(addr1)
          .buyCommToken("0x0000000000000000000000000000000000000000", 200)
      ).to.be.revertedWithCustomError(contract, "CommunityNotFound");
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
      ).to.be.revertedWithCustomError(contract, "InsufficientBalance");
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
      ).to.be.revertedWithCustomError(contract, "CommunityNotFound");
    });
    it("Should fail cause rather than community creator , other addresses will call", async function () {
      // This test case checks that a user cannot publish a product if they are not the creator of the community.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      // community information
      const community = await contract.communityInformation(communityAddr);
      // join community
      await contract.connect(addr2).joinCommunity(communityAddr);

      await expect(
        contract
          .connect(addr2)
          .publishProduct("TP", "Test Product", communityAddr, true, 200)
      ).to.be.revertedWithCustomError(contract, "UnauthorizedAccess");
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
        .publishProduct("CTP", "CTest Product", communityAddr, true, 200);
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
          .publishProduct("XP", "X Product", communityAddr, true, 200)
      ).to.be.revertedWithCustomError(contract, "InsufficientBalance");
    });
    it("Should successfully stack the product for voting", async function () {
      // This test case checks if the product is published or not.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      // buy Community Token
      await contract.connect(addr1).buyCommToken(communityAddr, 300);
      await contract
        .connect(addr1)
        .publishProduct("TP", "Test Product", communityAddr, true, 200);

      const prodictInfo = await contract.getAllPendingPrd();
      // console.log(prodictInfo);
    });
  });

  describe("Vote Product", function () {
    // This test suite is for testing the functionality of voting a product.
    it("Should fail because Not a member of the community", async function () {
      // This test case checks that a user cannot buy community tokens Not a member of the community.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await expect(
        contract.connect(addr2).downVote("Test", communityAddr, 200)
      ).to.be.revertedWithCustomError(contract, "UnauthorizedAccess");
    });
    it("Should revert cause the product does not exist", async function () {
      // This test case checks that a user cannot vote on a product that does not exist.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await contract.connect(addr2).joinCommunity(communityAddr);
      await expect(
        contract.connect(addr2).upVote("Test", communityAddr, 200)
      ).to.be.revertedWithCustomError(contract, "ProductNotFound");
    });
    it("Should fail cause voting time is over", async function () {
      // This test case checks that a user cannot vote on a product if the voting time is over.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await contract.connect(addr2).joinCommunity(communityAddr);
      await contract.connect(addr1).buyCommToken(communityAddr, 300);
      await contract
        .connect(addr2)
        .buyABX(2000, { value: ethers.parseUnits("20000", "wei") });
      await contract.connect(addr2).buyCommToken(communityAddr, 200);

      await contract
        .connect(addr1)
        .publishProduct("TP", "Test Product", communityAddr, true, 200);
      const productInfo = await contract.getCommProdInfo(
        communityAddr,
        "TP",
        200
      );
      await time.increase(Number(productInfo.listedTime) + 172900);
      await expect(
        contract.connect(addr2).upVote("TP", communityAddr, 200)
      ).to.be.revertedWithCustomError(contract, "VotingTimeError");
    });

    it("Should upvote successfuly", async function () {
      // This test case checks that a user can upvote on a product.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await contract.connect(addr2).joinCommunity(communityAddr);
      await contract
        .connect(addr2)
        .buyABX(200, { value: ethers.parseUnits("2000", "wei") });
      await contract.connect(addr2).buyCommToken(communityAddr, 200);

      await contract.connect(addr1).buyCommToken(communityAddr, 300);
      await contract
        .connect(addr1)
        .publishProduct("TP", "Test Product", communityAddr, true, 200);
      const productInfo = await contract.getCommProdInfo(
        communityAddr,
        "TP",
        200
      );
      await time.increase(172600);
      // console.log("get time after increase", await time.latest());
      const code = await contract.getCode(communityAddr, "TP", 200);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      const voteCount = await contract.commProdVote(code);
      // console.log("voteCount", voteCount);
      expect(voteCount.toString()).to.equal("200");
    });
    it("Should downvote successfuly", async function () {
      // This test case checks that a user can downvote on a product.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await contract.connect(addr2).joinCommunity(communityAddr);
      await contract
        .connect(addr2)
        .buyABX(200, { value: ethers.parseUnits("2000", "wei") });
      await contract.connect(addr2).buyCommToken(communityAddr, 200);
      await contract.connect(addr1).buyCommToken(communityAddr, 300);
      await contract
        .connect(addr1)
        .publishProduct("TP", "Test Product", communityAddr, true, 200);
      await time.increase(172600);
      // console.log("get time after increase", await time.latest());
      await contract.connect(addr2).downVote("TP", communityAddr, 200);
      const code = await contract.getCode(communityAddr, "TP", 200);
      const voteCount = await contract.commProdVote(code);
      // console.log("voteCount", voteCount);
      expect(voteCount.toString()).to.equal("-200");
    });

    it("Should fail cause can't vote twice", async function () {
      // This test case checks that a user can't vote twice.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await contract.connect(addr2).joinCommunity(communityAddr);
      await contract
        .connect(addr2)
        .buyABX(200, { value: ethers.parseUnits("2000", "wei") });
      await contract.connect(addr2).buyCommToken(communityAddr, 200);
      await contract.connect(addr1).buyCommToken(communityAddr, 300);
      await contract
        .connect(addr1)
        .publishProduct("TP", "Test Product", communityAddr, true, 200);
      await time.increase(172600);
      // console.log("get time after increase", await time.latest());
      const code = await contract.getCode(communityAddr, "TP", 200);
      await contract.connect(addr2).downVote("TP", communityAddr, 200);
      await expect(
        contract.connect(addr2).upVote("TP", communityAddr, 200)
      ).to.be.revertedWithCustomError(contract, "AlreadyVoted");
    });

    it("Should fail cause user has insufficient balance for vote", async function () {
      // This test case checks if a user has insuffitient balance.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await contract.connect(addr2).joinCommunity(communityAddr);
      await contract
        .connect(addr2)
        .buyABX(200, { value: ethers.parseUnits("2000", "wei") });
      await contract.connect(addr1).buyCommToken(communityAddr, 300);
      await contract
        .connect(addr1)
        .publishProduct("TP", "Test Product", communityAddr, true, 200);
      await time.increase(172600);
      await expect(
        contract.connect(addr2).upVote("TP", communityAddr, 200)
      ).to.be.revertedWithCustomError(contract, "InsufficientBalance");
    });

    it("Should combine the upvotes and downvotes", async function () {
      // This test case checks if a user has insuffitient balance.
      const { contract, addr1, addr2, addr3, communityAddr } =
        await loadFixture(publishProductFixture);

      await contract.connect(addr2).buyCommToken(communityAddr, 100);
      await contract.connect(addr3).buyCommToken(communityAddr, 400);

      // Time increasing
      await time.increase(172600);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      await contract.connect(addr3).downVote("TP", communityAddr, 200);
      const code = await contract.getCode(communityAddr, "TP", 200);
      const voteCount = await contract.commProdVote(code);
      // console.log("voteCount", voteCount);
      expect(voteCount.toString()).to.equal("-300");
    });
  });
  describe("Voting Result", function () {
    // This test suite is for testing the functionality of voting result.
    it("Should fail cause product does not exist", async function () {
      // This test case checks that a user cannot vote on a product that does not exist.
      const { contract, addr1, addr2, communityAddr } = await loadFixture(
        createCommunityFixture
      );
      await expect(
        contract.connect(addr1).votingResult("Test", communityAddr, 200)
      ).to.be.revertedWithCustomError(contract, "ProductNotFound");
    });
    it("Should fail cause the caller is not the community owner", async function () {
      // This test case checks that a user is not the community owner.
      const { contract, addr1, addr2, addr3, communityAddr } =
        await loadFixture(publishProductFixture);

      await contract.connect(addr2).buyCommToken(communityAddr, 100);
      await contract.connect(addr3).buyCommToken(communityAddr, 400);

      // Time increasing
      await time.increase(172600);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      await contract.connect(addr3).downVote("TP", communityAddr, 200);
      // const code = await contract.getCode(communityAddr, "TP", 200);
      // const productInfo = await contract.commListedProd(communityAddr, code);
      await expect(
        contract.connect(addr2).votingResult("TP", communityAddr, 200)
      ).to.be.revertedWithCustomError(contract, "UnauthorizedAccess");
    });

    it("Should fail cause voting time is still reamining", async function () {
      // This test case checks if the voting time is remaining.
      const { contract, addr1, addr2, addr3, communityAddr } =
        await loadFixture(publishProductFixture);

      await contract.connect(addr2).buyCommToken(communityAddr, 100);
      await contract.connect(addr3).buyCommToken(communityAddr, 400);

      // Time increasing
      // await time.increase(172600);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      await contract.connect(addr3).downVote("TP", communityAddr, 200);
      // const code = await contract.getCode(communityAddr, "TP", 200);
      // const productInfo = await contract.commListedProd(communityAddr, code);
      await expect(
        contract.connect(addr1).votingResult("TP", communityAddr, 200)
      ).to.be.revertedWithCustomError(contract, "VotingTimeError");
    });

    it("Should list the product for sale", async function () {
      // This test case checks if the product is listed for sale.
      const { contract, addr1, addr2, addr3, communityAddr } =
        await loadFixture(publishProductFixture);

      await contract.connect(addr2).buyCommToken(communityAddr, 400);
      await contract.connect(addr3).buyCommToken(communityAddr, 200);

      // Time increasing
      await time.increase(172400);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      await contract.connect(addr3).downVote("TP", communityAddr, 200);

      // Increasing time for checkcing voting result
      await time.increase(600);
      await contract.connect(addr1).votingResult("TP", communityAddr, 200);

      const code = await contract.getCode(communityAddr, "TP", 200);
      const productInfo = await contract.commListedProd(communityAddr, code);
      // console.log("productInfo", productInfo);
      expect(productInfo.listedForSale).to.equal(true);

      // const allMktProd = await contract.getAllMktPrd();
      // console.log("allMktProd", allMktProd);
    });

    it("Should return 50% the product price for successful listing", async function () {
      // This test case checks if 50% is returned or not.
      const { contract, addr1, addr2, addr3, communityAddr, nftcontract } =
        await loadFixture(publishProductFixture);

      await contract.connect(addr2).buyCommToken(communityAddr, 400);
      await contract.connect(addr3).buyCommToken(communityAddr, 200);

      // Time increasing
      await time.increase(172400);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      await contract.connect(addr3).downVote("TP", communityAddr, 200);

      const creatorNativeTokenBalBefore = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // Increasing time for checkcing voting result
      await time.increase(600);
      await contract.connect(addr1).votingResult("TP", communityAddr, 200);

      const code = await contract.getCode(communityAddr, "TP", 200);
      const productInfo = await contract.commListedProd(communityAddr, code);
      // console.log("productInfo", productInfo);
      expect(productInfo.listedForSale).to.equal(true);

      //checking the native token balance of the creator
      const creatorNativeTokenBalAfter = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // console.log("creatorNativeTokenBalBefore", creatorNativeTokenBalBefore);
      // console.log("creatorNativeTokenBalAfter", creatorNativeTokenBalAfter);
      expect(creatorNativeTokenBalAfter).to.equal(
        creatorNativeTokenBalBefore +
          BigInt((Number(productInfo.prdPrice) * 50) / 100)
      );
      // const allMktProd = await contract.getAllMktPrd();
      // console.log("allMktProd", allMktProd);
    });

    it("Should return 25% the product price for unsuccessful listing", async function () {
      // This test case checks if 50% is returned or not.
      const { contract, addr1, addr2, addr3, communityAddr } =
        await loadFixture(publishProductFixture);

      await contract.connect(addr2).buyCommToken(communityAddr, 100);
      await contract.connect(addr3).buyCommToken(communityAddr, 200);

      // Time increasing
      await time.increase(172400);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      await contract.connect(addr3).downVote("TP", communityAddr, 200);

      const creatorNativeTokenBalBefore = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // Increasing time for checkcing voting result
      await time.increase(600);
      await contract.connect(addr1).votingResult("TP", communityAddr, 200);

      const code = await contract.getCode(communityAddr, "TP", 200);
      const productInfo = await contract.commListedProd(communityAddr, code);
      // console.log("productInfo", productInfo);
      expect(productInfo.listedForSale).to.equal(false);

      //checking the native token balance of the creator
      const creatorNativeTokenBalAfter = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // console.log("creatorNativeTokenBalBefore", creatorNativeTokenBalBefore);
      // console.log("creatorNativeTokenBalAfter", creatorNativeTokenBalAfter);

      expect(creatorNativeTokenBalAfter).to.equal(
        creatorNativeTokenBalBefore +
          BigInt((Number(productInfo.prdPrice) * 25) / 100)
      );
    });
  });

  describe("Test NFT Contract", function () {
    it("Should call the NFTFactory contract", async function () {
      // This test case checks if 50% is returned or not.
      const { contract, addr1, addr2, addr3, communityAddr, nftcontract } =
        await loadFixture(publishProductFixture);

      await contract.connect(addr2).buyCommToken(communityAddr, 400);
      await contract.connect(addr3).buyCommToken(communityAddr, 200);

      // Time increasing
      await time.increase(172400);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      await contract.connect(addr3).downVote("TP", communityAddr, 200);

      const creatorNativeTokenBalBefore = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // Increasing time for checkcing voting result
      await time.increase(600);
      await contract.connect(addr1).votingResult("TP", communityAddr, 200);

      const code = await contract.getCode(communityAddr, "TP", 200);
      const productInfo = await contract.commListedProd(communityAddr, code);
      // console.log("productInfo", productInfo);
      expect(productInfo.listedForSale).to.equal(true);

      //checking the native token balance of the creator
      const creatorNativeTokenBalAfter = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // console.log("creatorNativeTokenBalBefore", creatorNativeTokenBalBefore);
      // console.log("creatorNativeTokenBalAfter", creatorNativeTokenBalAfter);
      expect(creatorNativeTokenBalAfter).to.equal(
        creatorNativeTokenBalBefore +
          BigInt((Number(productInfo.prdPrice) * 50) / 100)
      );
      // const allMktProd = await contract.getAllMktPrd();
      // console.log("allMktProd", allMktProd);

      const nftOwner = await nftcontract.getOwner();
      // console.log("nftOwner", nftOwner);

      const nftAddress = await nftcontract.getnftAddress(code);

      const getInformation = await nftcontract.getNFTinformation(nftAddress);

      // console.log("getInformation", getInformation);
    });

    it("Should call the NFT contract", async function () {
      // This test case checks if 50% is returned or not.
      const { contract, addr1, addr2, addr3, communityAddr, nftcontract } =
        await loadFixture(publishProductFixture);

      await contract.connect(addr2).buyCommToken(communityAddr, 400);
      await contract.connect(addr3).buyCommToken(communityAddr, 200);

      // Time increasing
      await time.increase(172400);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      await contract.connect(addr3).downVote("TP", communityAddr, 200);

      const creatorNativeTokenBalBefore = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // Increasing time for checkcing voting result
      await time.increase(600);
      await contract.connect(addr1).votingResult("TP", communityAddr, 200);

      const code = await contract.getCode(communityAddr, "TP", 200);
      const productInfo = await contract.commListedProd(communityAddr, code);
      // console.log("productInfo", productInfo);
      expect(productInfo.listedForSale).to.equal(true);

      //checking the native token balance of the creator
      const creatorNativeTokenBalAfter = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // console.log("creatorNativeTokenBalBefore", creatorNativeTokenBalBefore);
      // console.log("creatorNativeTokenBalAfter", creatorNativeTokenBalAfter);
      expect(creatorNativeTokenBalAfter).to.equal(
        creatorNativeTokenBalBefore +
          BigInt((Number(productInfo.prdPrice) * 50) / 100)
      );
      // const allMktProd = await contract.getAllMktPrd();
      // console.log("allMktProd", allMktProd);

      const nftOwner = await nftcontract.getOwner();
      // console.log("nftOwner", nftOwner);

      const nftAddress = await nftcontract.getnftAddress(code);

      const getInformation = await nftcontract.getNFTinformation(nftAddress);

      // console.log("getInformation", getInformation);

      // Method - 1
      // const NFT = await ethers.getContractFactory("NFT");
      // const nft = await NFT.attach(nftAddress);
      // Method - 2
      const nft = await ethers.getContractAt("NFT", nftAddress);

      const nftOwner1 = await nft.ownerOf(0);
      // console.log("nftOwner1", nftOwner1);
      expect(nftOwner1).to.equal(nftOwner);
    });
    it("Should approve the contract for selling NFT", async function () {
      // This test case checks if 50% is returned or not.
      const { contract, addr1, addr2, addr3, communityAddr, nftcontract } =
        await loadFixture(publishProductFixture);

      await contract.connect(addr2).buyCommToken(communityAddr, 400);
      await contract.connect(addr3).buyCommToken(communityAddr, 200);

      // Time increasing
      await time.increase(172400);
      await contract.connect(addr2).upVote("TP", communityAddr, 200);
      await contract.connect(addr3).downVote("TP", communityAddr, 200);

      const creatorNativeTokenBalBefore = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // Increasing time for checkcing voting result
      await time.increase(600);
      await contract.connect(addr1).votingResult("TP", communityAddr, 200);

      const code = await contract.getCode(communityAddr, "TP", 200);
      const productInfo = await contract.commListedProd(communityAddr, code);
      // console.log("productInfo", productInfo);
      expect(productInfo.listedForSale).to.equal(true);

      //checking the native token balance of the creator
      const creatorNativeTokenBalAfter = await contract
        .connect(addr1)
        .getCommTokenBal(communityAddr);

      // console.log("creatorNativeTokenBalBefore", creatorNativeTokenBalBefore);
      // console.log("creatorNativeTokenBalAfter", creatorNativeTokenBalAfter);
      expect(creatorNativeTokenBalAfter).to.equal(
        creatorNativeTokenBalBefore +
          BigInt((Number(productInfo.prdPrice) * 50) / 100)
      );
      // const allMktProd = await contract.getAllMktPrd();
      // console.log("allMktProd", allMktProd);
      const nftOwner = await nftcontract.getOwner();
      const nftAddress = await nftcontract.getnftAddress(code);
      const getInformation = await nftcontract.getNFTinformation(nftAddress);
      const nft = await ethers.getContractAt("NFT", nftAddress);
      const nftOwner1 = await nft.ownerOf(0);
      expect(nftOwner1).to.equal(nftOwner);

      // approve the contract for selling NFT
      await nft.connect(addr1).approveContract(nftcontract);
      await nftcontract.changeNFTOwner(addr3, nftAddress);
      const nftOwner2 = await nftcontract.getOwner();
      console.log("nftOwner2", nftOwner2);
      console.log("addr3", addr3.address);
      expect(nftOwner2).to.equal(addr3.address);
    });
  });
});
