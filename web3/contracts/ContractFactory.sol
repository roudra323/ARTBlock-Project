// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

/**
 * @title ERC20Token
 * @dev Extends ERC20 and Ownable contracts to create a custom ERC20 token.
 */
contract ERC20Token is ERC20, Ownable {
    event TokenCreatedERC20(
        string indexed tokenSymbol,
        string tokenName,
        address indexed owner
    );

    address private immutable mainContract;

    /**
     * @dev Constructor to initialize the ERC20 token.
     * @param initialName The name of the token.
     * @param initialSymbol The symbol of the token.
     * @param initialOwner The initial owner of the token.
     */
    constructor(
        string memory initialName,
        string memory initialSymbol,
        address initialOwner
    ) ERC20(initialName, initialSymbol) Ownable(initialOwner) {
        mainContract = msg.sender;
        emit TokenCreatedERC20(initialSymbol, initialName, initialOwner);
    }

    /**
     * @dev Mints new tokens and sends them to the specified address.
     * @param to The address to which new tokens will be minted.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external lockedCheck {
        _mint(to, amount);
    }

    /**
     * @dev Burns existing tokens from the specified address.
     * @param from The address from which tokens will be burned.
     * @param amount The amount of tokens to burn.
     */
    function burn(address from, uint256 amount) external lockedCheck {
        _burn(from, amount);
    }

    /**
     * @dev Modifier to check if the community is locked.
     */
    modifier lockedCheck() {
        CommunityFactory mContract = CommunityFactory(mainContract);
        require(!mContract.lockedStatus(), "Community is locked");
        _;
    }
}

/**
 * @title CommunityFactory
 * @dev Manages the creation and functionalities of communities and associated ERC20 tokens.
 */
contract CommunityFactory {
    // Mappings
    mapping(address => CommunityInfo) public communityInformation;
    mapping(address => TokenInfo) public tokenInformation;
    mapping(address => mapping(address => bool)) public communityMemberships;
    mapping(address => mapping(bytes4 => ProductInfo)) commListedProd;
    mapping(address => mapping(bytes4 => ProductInfo)) commApprovedProd;
    mapping(bytes4 => int256) commProdVote;
    mapping(bytes4 => ProductInfo) commProdInfo;
    mapping(address => mapping(bytes4 => bool)) hasVoted;

    // Structs
    struct CommunityInfo {
        string name;
        string description;
        address creator;
        address tokenAddress;
    }

    struct TokenInfo {
        string name;
        string symbol;
        address creator;
    }

    struct ProductInfo {
        string pdName;
        string pdDesc;
        address pdCommunity;
        bool isExclusive;
        uint16 prdPrice;
        bool listedForVote;
        bool listedForSale;
        int256 voteWeight;
        uint listedTime;
    }

    // Events
    event CommunityCreated(
        address indexed communityTokenAddress,
        string communityName,
        string communityDescription
    );
    event TokenCreatedERC20(
        string indexed tokenSymbol,
        string tokenName,
        address indexed owner
    );
    event JoinedCommunity(address indexed member, address indexed community);

    // State variables
    address private ABXADDR;
    ERC20Token public token;
    address[] listedCommunities;
    ProductInfo[] listedForVoting;
    ProductInfo[] listedForMarket;
    bool public isLocked = true;

    // Constructor
    constructor() {
        ERC20Token newToken = new ERC20Token("ABX TOKEN", "ABX", msg.sender);
        tokenInformation[address(newToken)] = TokenInfo({
            name: "ABX TOKEN",
            symbol: "ABX",
            creator: msg.sender
        });
        ABXADDR = address(newToken);
    }

    // Functions

    /**
     * @dev Retrieves the locked status of the community.
     * @return A boolean indicating whether the community is locked or not.
     */
    function lockedStatus() external view returns (bool) {
        return isLocked;
    }

    /**
     * @dev Allows users to buy ABX tokens by sending ETH where 10 wei = 1 ABX token.
     * @param _avxquantity The quantity of ABX to purchase.
     */
    function buyABX(uint256 _avxquantity) external payable {
        require(msg.sender != address(0), "User is not valid");
        require(
            msg.sender != tokenInformation[ABXADDR].creator,
            "Owner can't buy ABX from himself!!"
        );
        uint256 etherQuan = 10 wei * _avxquantity;
        require(
            etherQuan == msg.value,
            "Please select the specified amount of ether"
        );
        (bool success, ) = tokenInformation[ABXADDR].creator.call{
            value: msg.value
        }("");
        require(success, "The transfer is not successful");
        token = ERC20Token(ABXADDR);
        isLocked = false;
        token.mint(msg.sender, _avxquantity); // EVERYONE CAN CALL THE MINT FUNCTION
        isLocked = true;
    }

    /**
     * @dev Creates a new ERC20 token internally.
     * @param tokenName The name of the new token.
     * @param tokenSymbol The symbol of the new token.
     * @param creator The address of the token creator.
     * @return An ERC20Token contract representing the newly created token.
     */
    function createToken(
        string memory tokenName,
        string memory tokenSymbol,
        address creator
    ) internal returns (ERC20Token) {
        ERC20Token newToken = new ERC20Token(tokenName, tokenSymbol, creator);
        tokenInformation[address(newToken)] = TokenInfo({
            name: tokenName,
            symbol: tokenSymbol,
            creator: creator
        });
        return newToken;
    }

    /**
     * @dev Creates a new community and an associated ERC20 token.
     * @param communityName The name of the new community.
     * @param communityDescription A description of the community.
     * @param tokenName The name of the community's ERC20 token.
     * @param tokenSymbol The symbol of the community's ERC20 token.
     */
    function createCommunity(
        string memory communityName,
        string memory communityDescription,
        string memory tokenName,
        string memory tokenSymbol
    ) external payable {
        require(
            ABXtokenBal() >= 100,
            "You don't have enough balance to create community."
        );

        token = ERC20Token(ABXADDR);
        isLocked = false;
        token.burn(msg.sender, 100); // EVERYONE CAN CALL THE BURN FUNCTION
        isLocked = true;
        ERC20Token communityToken = createToken(
            tokenName,
            tokenSymbol,
            msg.sender
        );

        communityInformation[address(communityToken)] = CommunityInfo({
            name: communityName,
            description: communityDescription,
            creator: msg.sender,
            tokenAddress: address(communityToken)
        });

        listedCommunities.push(address(communityToken));
        communityMemberships[msg.sender][address(communityToken)] = true;

        emit JoinedCommunity(msg.sender, address(communityToken));

        emit CommunityCreated(
            address(communityToken),
            communityName,
            communityDescription
        );
    }

    /**
     * @dev Function for users to join a community.
     * @param communityAddress The address of the community to join.
     */
    function joinCommunity(address communityAddress) external {
        require(
            communityInformation[communityAddress].creator != address(0),
            "Community does not exist"
        );
        require(
            !communityMemberships[msg.sender][communityAddress],
            "User is already a member of the community"
        );
        communityMemberships[msg.sender][communityAddress] = true;
        emit JoinedCommunity(msg.sender, communityAddress);
    }

    /**
     * @dev Allows users to buy native tokens of the community.
     * @param tokenAddress The address of the community's ERC20 token.
     * @param tokenQuantity The quantity of tokens to purchase.
     */
    function buyCommToken(
        address tokenAddress,
        uint256 tokenQuantity
    ) public payable onlyCommunityMember(tokenAddress) {
        require(tokenQuantity > 0, "Quantity should be greater than 0");
        require(
            ABXtokenBal() >= tokenQuantity / 10,
            "You don't have enough balance to buy community token."
        );
        token = ERC20Token(ABXADDR);
        isLocked = false;
        token.burn(msg.sender, tokenQuantity / 10); // EVERYONE CAN CALL THE MINT FUNCTION
        isLocked = true;
        token = ERC20Token(tokenAddress);
        // Minting native token
        isLocked = false;
        token.mint(msg.sender, tokenQuantity); // EVERYONE CAN CALL THE MINT FUNCTION
        isLocked = true;
    }

    /**
     * @dev Retrieves the token balance of the user for a specific token.
     * @param tokenAddress The address of the token.
     * @return The token balance of the user.
     */
    function getCommTokenBal(
        address tokenAddress
    ) public view returns (uint256) {
        ERC20Token tokenContract = ERC20Token(tokenAddress);
        return tokenContract.balanceOf(msg.sender);
    }

    /**
     * @dev Retrieves the balance of the ABX token for the user.
     * @return The balance of ABX tokens for the user.
     */
    function ABXtokenBal() public view returns (uint256) {
        ERC20Token tokenContract = ERC20Token(ABXADDR);
        return tokenContract.balanceOf(msg.sender);
    }

    /**
     * @dev Retrieves all the listed communities.
     * @return An array containing the addresses of all listed communities.
     */
    function getAllCommunities() external view returns (address[] memory) {
        return listedCommunities;
    }

    // Functions for MileStone-2

    /**
     * @dev Publishes a product for voting.
     * @param name The name of the product.
     * @param description The description of the product.
     * @param comAddr The address of the community.
     * @param isExclusive Whether the product is exclusive or not.
     * @param prdPrice The price of the product.
     */
    function publishProduct(
        string memory name,
        string memory description,
        address comAddr,
        bool isExclusive,
        uint16 prdPrice
    ) external {
        require(
            communityInformation[comAddr].tokenAddress != address(0),
            "The Community does not exist!!"
        );
        require(
            communityInformation[comAddr].creator == msg.sender,
            "Only community creator can publish product!!"
        );
        // Calculate the minimum required token balance
        // considering potential loss of precision due to division
        uint16 min_token_balance = (prdPrice * 50) / 100;

        // Check if the token balance is sufficient
        require(
            getCommTokenBal(comAddr) >= min_token_balance,
            "You don't have enough community native token."
        );

        token = ERC20Token(comAddr);
        // Stacking 50% of product price
        isLocked = false;
        token.burn(msg.sender, min_token_balance);
        isLocked = true;

        ProductInfo memory tempPrd = ProductInfo(
            name,
            description,
            comAddr,
            isExclusive,
            prdPrice,
            true,
            false,
            0,
            block.timestamp
        );
        // listed for vote = True
        listedForVoting.push(tempPrd);
        commListedProd[comAddr][getCode(comAddr, name, prdPrice)] = tempPrd; // created product

        // Testing
        console.log("Product is published for voting!!");
        console.log("Product Name: %s", name);
    }

    function upVote(
        string memory name,
        address communiAddr,
        uint8 prdPrice
    )
        external
        onlyCommunityMember(communiAddr)
        checkVotingRequirement(name, communiAddr, prdPrice)
    {
        bytes4 code = getCode(communiAddr, name, prdPrice);
        uint256 tokenBalance = getCommTokenBal(msg.sender);
        commProdVote[code] += int256(tokenBalance);
        hasVoted[msg.sender][code] = true;
    }

    function downVote(
        string memory name,
        address communiAddr,
        uint8 prdPrice
    )
        external
        onlyCommunityMember(communiAddr)
        checkVotingRequirement(name, communiAddr, prdPrice)
    {
        bytes4 code = getCode(communiAddr, name, prdPrice);
        uint256 tokenBalance = getCommTokenBal(msg.sender);
        commProdVote[code] -= int256(tokenBalance);
        hasVoted[msg.sender][code] = true;
    }

    function votingResult(
        string memory name,
        address communiAddr,
        uint8 prdPrice
    ) external onlyCommunityMember(communiAddr) {
        require(
            getCommunityInformation(communiAddr).creator == msg.sender,
            "Only Community Creator can call this func!!"
        );
        bytes4 code = getCode(communiAddr, name, prdPrice);
        require(
            commListedProd[communiAddr][code].listedTime + 172800 >
                block.timestamp,
            "Voting time is still remaning!!"
        );
        if (commProdVote[code] >= 0) {
            commListedProd[communiAddr][code].listedForSale = true;
            commListedProd[communiAddr][code].voteWeight = commProdVote[code];
            listedForMarket.push(commListedProd[communiAddr][code]);

            token = ERC20Token(communiAddr);
            // Returning 50% of product price
            isLocked = false;
            token.mint(msg.sender, (prdPrice * 50) / 100);
            isLocked = true;
            // if downvotes are more than upvotes
            // then cut 25% of product price and return 25% to the creator
        } else {
            isLocked = false;
            token.mint(msg.sender, (prdPrice * 25) / 100); // returning 25% of product price if not voted
            isLocked = true;
        }
    }

    /**


    */
    function getAllPendingPrd() external view returns (ProductInfo[] memory) {
        return listedForVoting;
    }

    /**


    */
    function getAllMktPrd() external view returns (ProductInfo[] memory) {
        return listedForMarket;
    }

    // Internal functions

    function getCode(
        address comm,
        string memory name,
        uint16 price
    ) internal view returns (bytes4) {
        bytes memory data = abi.encodePacked(
            comm,
            name,
            price,
            block.timestamp
        );
        return bytes4(keccak256(data));
    }

    function getTime() public view returns (uint) {
        return block.timestamp;
    }

    function getCommunityInformation(
        address comm
    ) public view returns (CommunityInfo memory) {
        return communityInformation[comm];
    }

    // Modifiers

    /**
     * @dev Modifier to check if the caller is a member of the given community.
     * @param communityAddress The address of the community.
     */
    modifier onlyCommunityMember(address communityAddress) {
        require(
            communityInformation[communityAddress].tokenAddress != address(0),
            "The Community does not exist!!"
        );
        require(
            communityMemberships[msg.sender][communityAddress],
            "Not a member of the community"
        );
        _;
    }
    /**
     * @dev Modifier to check if the caller qualifies certain requirements to vote for a product.
     * @param name The name of the product.
     * @param communiAddr The address of the community.
     * @param prdPrice The price of the product.
     */
    modifier checkVotingRequirement(
        string memory name,
        address communiAddr,
        uint8 prdPrice
    ) {
        bytes4 code = getCode(communiAddr, name, prdPrice);
        require(
            commListedProd[communiAddr][code].listedForVote,
            "Product dosen't exist!!"
        );
        // Check if the voting time is over (48 hours = 2 days)
        require(
            commListedProd[communiAddr][code].listedTime + 172800 >
                block.timestamp,
            "Voting time is over!!"
        );
        require(
            !hasVoted[msg.sender][code],
            "You have already voted for this product."
        );
        _;
    }
}
