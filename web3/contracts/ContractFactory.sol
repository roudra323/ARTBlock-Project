// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "hardhat/console.sol";

error CommunityNotFound();
error UnauthorizedAccess();
error InsufficientBalance();
error ProductNotFound();
error Locked();
error TransferFailed();
error InvalidAmount();
error AlreadyMember();
error VotingTimeError();
error AlreadyVoted();

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
        if (mContract.lockedStatus()) {
            revert Locked();
        }
        // require(!mContract.lockedStatus(), "Community is locked");
        _;
    }
}

interface INFTfactory {
    function listAsNFT(
        string memory _name,
        string memory _symbol,
        string memory _uri,
        bytes4 _uniCode,
        address _creator
    ) external;

    function changeNFTOwner(address newOwner, address nftAddress) external;

    function getnftAddress(bytes4 code) external view returns (address);
}

/**
 * @title CommunityFactory
 * @dev Manages the creation and functionalities of communities and associated ERC20 tokens.
 */
contract CommunityFactory {
    // Mappings
    mapping(address => CommunityInfo) public communityInformation;
    // mapping(address => TokenInfo) public tokenInformation;
    mapping(address => mapping(address => bool)) public communityMemberships;
    mapping(address => mapping(bytes4 => ProductInfo)) public commListedProd;
    mapping(address => mapping(bytes4 => ProductInfo)) commApprovedProd;
    mapping(bytes4 => int256) public commProdVote;
    mapping(bytes4 => ProductInfo) commProdInfo;
    mapping(address => mapping(bytes4 => bool)) hasVoted;

    // Structs
    struct CommunityInfo {
        string name;
        string tkName;
        string tkSymbol;
        string description;
        address creator;
        address tokenAddress;
    }

    struct ProductInfo {
        string pdName;
        string pdDesc;
        address pdCommunity;
        bool isExclusive;
        uint256 prdPrice;
        bool listedForVote;
        bool listedForSale;
        int256 voteWeight;
        uint listedTime;
        address _creator;
        address _owner;
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
    address private immutable ABXADDR;
    INFTfactory public nftFactoryContract;
    ERC20Token public token;
    address[] listedCommunities;
    ProductInfo[] listedForVoting;
    ProductInfo[] listedForMarket;
    bool public isLocked = true;
    address public immutable contractOwner;

    // Constructor
    constructor(address nftAddress) {
        contractOwner = msg.sender;
        ERC20Token newToken = new ERC20Token("ABX TOKEN", "ABX", msg.sender);
        ABXADDR = address(newToken);
        nftFactoryContract = INFTfactory(nftAddress);
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
        // check if the caller is the contract owner
        if (msg.sender == contractOwner || msg.sender == address(0)) {
            revert UnauthorizedAccess();
        }
        uint256 etherQuan = 10 wei * _avxquantity;
        // check if the user has sent the specified amount of ether to buy the ABX token
        if (etherQuan != msg.value) {
            revert InvalidAmount();
        }
        (bool success, ) = contractOwner.call{value: msg.value}("");
        // check if the transfer of ABX is successful
        if (!success) {
            revert TransferFailed();
        }

        token = ERC20Token(ABXADDR);
        isLocked = false;
        token.mint(msg.sender, _avxquantity);
        isLocked = true;
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
        // check if the user has minumum 100 ABX token to create the community
        if (ABXtokenBal() < 100) {
            revert InsufficientBalance();
        }
        token = ERC20Token(ABXADDR);
        isLocked = false;
        token.burn(msg.sender, 100);
        isLocked = true;
        ERC20Token communityToken = new ERC20Token(
            tokenName,
            tokenSymbol,
            msg.sender
        );

        communityInformation[address(communityToken)] = CommunityInfo({
            name: communityName,
            description: communityDescription,
            creator: msg.sender,
            tokenAddress: address(communityToken),
            tkName: tokenName,
            tkSymbol: tokenSymbol
        });
        listedCommunities.push(address(communityToken));
        communityMemberships[msg.sender][address(communityToken)] = true;
        emit CommunityCreated(
            address(communityToken),
            communityName,
            communityDescription
        );
        emit JoinedCommunity(msg.sender, address(communityToken));
    }

    /**
     * @dev Function for users to join a community.
     * @param communityAddress The address of the community to join.
     */
    function joinCommunity(address communityAddress) external {
        // check if the community exists
        if (communityInformation[communityAddress].creator == address(0)) {
            revert CommunityNotFound();
        }
        // check if the user is already a member of the community
        if (communityMemberships[msg.sender][communityAddress] == true) {
            revert AlreadyMember();
        }
        communityMemberships[msg.sender][communityAddress] = true;
        emit JoinedCommunity(msg.sender, communityAddress);
    }

    /**
     * @dev Allows users to buy native tokens of the community.
     * @param tokenAddress The address of the community's ERC20 token.
     * @param tokenQuantity The quantity of tokens to purchase. Minimum token 10
     */
    function buyCommToken(
        address tokenAddress,
        uint256 tokenQuantity
    ) public payable onlyCommunityMember(tokenAddress) {
        // check if the Native token quantity is minimum 10
        if (tokenQuantity < 10) {
            revert InvalidAmount();
        }
        // check if the user has enough ABX token to buy the community token
        if (ABXtokenBal() < tokenQuantity / 10) {
            revert InsufficientBalance();
        }
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
        uint256 prdPrice
    ) external {
        // check if the community exists
        if (communityInformation[comAddr].tokenAddress == address(0)) {
            revert CommunityNotFound();
        }
        // check if the caller is the creator of the community
        if (communityInformation[comAddr].creator != msg.sender) {
            revert UnauthorizedAccess();
        }
        // Calculate the minimum required token balance
        // considering potential loss of precision due to division
        uint256 min_token_balance = (prdPrice * 50) / 100;

        // Check if the token balance is sufficient
        if (getCommTokenBal(comAddr) < min_token_balance) {
            revert InsufficientBalance();
        }

        token = ERC20Token(comAddr);
        // Stacking 50% of product price
        isLocked = false;
        token.burn(msg.sender, min_token_balance);
        isLocked = true;

        uint256 blockTime = block.timestamp;

        ProductInfo memory tempPrd = ProductInfo(
            name,
            description,
            comAddr,
            isExclusive,
            prdPrice,
            true,
            false,
            0,
            blockTime,
            msg.sender,
            msg.sender
        );
        // listed for vote = True
        listedForVoting.push(tempPrd);

        // Should Add blocktime
        commListedProd[comAddr][
            getCode(comAddr, name, prdPrice, blockTime)
        ] = tempPrd; // created product

        // Testing
        // console.log("Product is published for voting!!");
        // console.log("Product Name: %s", name);
    }

    function upVote(
        string memory name,
        address communiAddr,
        uint256 prdPrice,
        uint256 time
    )
        external
        onlyCommunityMember(communiAddr)
        checkVotingRequirement(name, communiAddr, prdPrice, time)
    {
        bytes4 code = getCode(communiAddr, name, prdPrice, time);
        uint256 tokenBalance = getCommTokenBal(communiAddr);
        commProdVote[code] += int256(tokenBalance);
        // console.log("TOken Balance", tokenBalance);
        hasVoted[msg.sender][code] = true;
    }

    function downVote(
        string memory name,
        address communiAddr,
        uint256 prdPrice,
        uint256 time
    )
        external
        onlyCommunityMember(communiAddr)
        checkVotingRequirement(name, communiAddr, prdPrice, time)
    {
        bytes4 code = getCode(communiAddr, name, prdPrice, time);
        uint256 tokenBalance = getCommTokenBal(communiAddr);
        commProdVote[code] -= int256(tokenBalance);
        hasVoted[msg.sender][code] = true;
    }

    function votingResult(
        string memory name,
        address communiAddr,
        uint256 prdPrice,
        uint256 time
    ) external {
        bytes4 code = getCode(communiAddr, name, prdPrice, time);
        // check if the product is listed for vote
        if (commListedProd[communiAddr][code].listedForVote == false) {
            revert ProductNotFound();
        }
        // check if the caller is the creator of the community
        if (getCommunityInformation(communiAddr).creator != msg.sender) {
            revert UnauthorizedAccess();
        }
        // check if the voting time is still remaining
        if (
            commListedProd[communiAddr][code].listedTime + 172800 >
            block.timestamp
        ) {
            revert VotingTimeError();
        }
        if (commProdVote[code] >= 0) {
            commListedProd[communiAddr][code].listedForSale = true;
            commListedProd[communiAddr][code].voteWeight = commProdVote[code];
            listedForMarket.push(commListedProd[communiAddr][code]);

            token = ERC20Token(communiAddr);
            // Returning 50% of product price
            isLocked = false;
            token.mint(msg.sender, (prdPrice / 100) * 50);
            isLocked = true;

            // Checking if the product is exclusive
            if (commListedProd[communiAddr][code].isExclusive) {
                nftFactoryContract.listAsNFT(
                    name,
                    "TestSymbol",
                    "TestURI",
                    code,
                    msg.sender
                );
            }
        } else {
            // if downvotes are more than upvotes
            // then cut 25% of product price and return 25% to the creator
            isLocked = false;
            token.mint(msg.sender, (prdPrice / 100) * 25); // returning 25% of product price if not voted
            isLocked = true;
        }
    }

    function buyProduct(
        string memory name,
        address communiAddr,
        uint256 prdPrice,
        uint256 time
    ) external payable {
        bytes4 code = getCode(communiAddr, name, prdPrice, time);
        // check if the product is listed for sale
        if (commListedProd[communiAddr][code].listedForSale == false) {
            revert ProductNotFound();
        }
        // check if the caller has sent the specified amount of ether to buy the product
        if (msg.value != prdPrice) {
            revert InvalidAmount();
        }
        // check if the caller has enough balance to buy the product
        if (getCommTokenBal(communiAddr) < 1) {
            revert InsufficientBalance();
        }

        token = ERC20Token(communiAddr);
        token.transferFrom(
            msg.sender,
            commListedProd[communiAddr][code]._owner,
            prdPrice
        );
        commListedProd[communiAddr][code]._owner = msg.sender;
        if (!commListedProd[communiAddr][code].isExclusive) {
            nftFactoryContract.changeNFTOwner(
                msg.sender,
                nftFactoryContract.getnftAddress(code)
            );
        }
        // Transfer the product price to the creator
        (bool success, ) = commListedProd[communiAddr][code]._creator.call{
            value: prdPrice
        }("");
        if (!success) {
            revert TransferFailed();
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
        uint256 price,
        uint256 time
    ) public pure returns (bytes4) {
        bytes memory data = abi.encodePacked(comm, name, price, time);
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

    function getCommProdInfo(
        address comm,
        string memory name,
        uint256 price,
        uint256 time
    ) public view returns (ProductInfo memory) {
        return commListedProd[comm][getCode(comm, name, price, time)];
    }

    // Modifiers

    /**
     * @dev Modifier to check if the caller is a member of the given community.
     * @param communityAddress The address of the community.
     */
    modifier onlyCommunityMember(address communityAddress) {
        // Check if the community exists
        if (communityInformation[communityAddress].tokenAddress == address(0)) {
            revert CommunityNotFound();
        }
        // Check if the caller is a member of the community
        if (!communityMemberships[msg.sender][communityAddress]) {
            revert UnauthorizedAccess();
        }
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
        uint256 prdPrice,
        uint256 time
    ) {
        bytes4 code = getCode(communiAddr, name, prdPrice, time);
        // Check if the product exists
        // console.log(commListedProd[communiAddr][code]);
        if (commListedProd[communiAddr][code].listedForVote == false) {
            revert ProductNotFound();
        }
        // Check if the caller has enough Community tokens to vote
        if (getCommTokenBal(communiAddr) < 1) {
            revert InsufficientBalance();
        }
        // Check if the voting time is over (48 hours = 2 days = 172800 seconds)
        if (
            commListedProd[communiAddr][code].listedTime + 172800 <
            block.timestamp
        ) {
            revert VotingTimeError();
        }
        // Check if the caller has already voted
        if (hasVoted[msg.sender][code]) {
            revert AlreadyVoted();
        }
        _;
    }
}
