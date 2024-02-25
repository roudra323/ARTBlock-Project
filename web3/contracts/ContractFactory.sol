// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC20Token is ERC20, Ownable {
    event TokenCreatedERC20(
        string indexed tokenSymbol,
        string tokenName,
        address indexed owner
    );

    constructor(
        string memory initialName,
        string memory initialSymbol,
        address initialOwner
    ) ERC20(initialName, initialSymbol) Ownable(initialOwner) {
        emit TokenCreatedERC20(initialSymbol, initialName, initialOwner);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}

contract CommunityFactory {
    // Mappings
    mapping(address => CommunityInfo) public communityInformation;
    mapping(address => TokenInfo) public tokenInformation;
    mapping(address => mapping(address => bool)) public communityMemberships; // Mapping to track community memberships

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

    /// @notice Allows users to buy ABX tokens by sending ETH where  10 wei = 1 ABX tokens.
    /// @param _avxquantity The quantity of ABX to purchase.
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
        token.mint(msg.sender, _avxquantity); //EVERYONE CAN CALL THE MINT FUNCTION
    }

    /// @notice Creates a new ERC20 token internally.
    /// @param tokenName The name of the new token.
    /// @param tokenSymbol The symbol of the new token.
    /// @param creator The address of the token creator.
    /// @return An ERC20Token contract representing the newly created token.
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

    /// @notice Creates a new community and an associated ERC20 token.
    /// @param communityName The name of the new community.
    /// @param communityDescription A description of the community.
    /// @param tokenName The name of the community's ERC20 token.
    /// @param tokenSymbol The symbol of the community's ERC20 token.
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
        // require(100 == msg.value, "Please select 100 wei to create community");

        token = ERC20Token(ABXADDR);
        token.burn(msg.sender, 100); //EVERYONE CAN CALL THE BURN FUNCTION

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

        emit CommunityCreated(
            address(communityToken),
            communityName,
            communityDescription
        );
    }

    // Function for users to join a community
    function joinCommunity(address communityAddress) external {
        require(
            communityInformation[communityAddress].creator != address(0),
            "Community does not exist"
        );
        communityMemberships[msg.sender][communityAddress] = true;
        emit JoinedCommunity(msg.sender, communityAddress);
    }

    function buyCommToken(address tokenAddress, uint256 tokenQuantity)
        public
        payable
        onlyCommunityMember(tokenAddress)
    {
        require(msg.sender != address(0), "User is not valid");
        require(
            msg.sender != tokenInformation[tokenAddress].creator,
            "Owner can't buy native token for himself!!"
        );
        require(
            communityInformation[tokenAddress].tokenAddress == address(0),
            "The community isn't created yet!"
        );

        token = ERC20Token(ABXADDR);

        token.burn(msg.sender, tokenQuantity / 10); //EVERYONE CAN CALL THE MINT FUNCTION
        token = ERC20Token(tokenAddress);
        //minting native token
        token.mint(msg.sender, tokenQuantity); //EVERYONE CAN CALL THE MINT FUNCTION
    }

    function getCommTokenBal(address tokenAddress)
        public
        view
        returns (uint256)
    {
        ERC20Token tokenContract = ERC20Token(tokenAddress);
        return tokenContract.balanceOf(msg.sender);
    }

    function ABXtokenBal() public view returns (uint256) {
        ERC20Token tokenContract = ERC20Token(ABXADDR);
        // token = ERC20Token(ABXADDR);
        return tokenContract.balanceOf(msg.sender);
    }

    function getAllCommunities() external view returns (address[] memory) {
        return listedCommunities;
    }

    // Modifiers

    // Modifier to check if the caller is a member of the given community
    modifier onlyCommunityMember(address communityAddress) {
        require(
            communityMemberships[msg.sender][communityAddress],
            "Not a member of the community"
        );
        _;
    }
}
