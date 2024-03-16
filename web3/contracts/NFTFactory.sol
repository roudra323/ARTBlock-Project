// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFT is ERC721, ERC721URIStorage, Ownable {
    address private immutable mainContract;
    address private immutable creator;

    constructor(
        string memory initialName,
        string memory initialSymbol,
        address _creator
    ) ERC721(initialName, initialSymbol) Ownable(_creator) {
        mainContract = msg.sender;
        creator = _creator;
    }

    function safeMint(address to, string memory uri) external isAuth isLocked {
        _safeMint(to, 0);
        _setTokenURI(0, uri);
    }

    // The following functions are overrides required by Solidity.

    function approveContract(address to) external onlyOwner {
        approve(to, 0);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    modifier isAuth() {
        require(msg.sender == mainContract, "You are not allowed");
        _;
    }
    modifier isLocked() {
        NFTfactory mContract = NFTfactory(mainContract);
        require(!mContract.isLockedCheck(), "minting is locked");
        _;
    }
}

contract NFTfactory {
    struct NFTinfo {
        string name;
        string symbol;
        string uri;
        address creator;
        address currentOwner;
    }

    NFT private nftAddr;
    bool private isNFTmintLocked = true;
    mapping(bytes4 => address) getNFTAddr;
    mapping(address => NFTinfo) NFTinformation;

    function listAsNFT(
        string memory _name,
        string memory _symbol,
        string memory _uri,
        bytes4 _uniCode,
        address _creator
    ) external {
        nftAddr = new NFT(_name, _symbol, _creator);
        require(address(nftAddr) != address(0), "NFT contract not deployed");
        isNFTmintLocked = false;
        nftAddr.safeMint(_creator, _uri);
        isNFTmintLocked = true;
        getNFTAddr[_uniCode] = address(nftAddr);
        NFTinformation[address(nftAddr)] = NFTinfo(
            _name,
            _symbol,
            _uri,
            _creator,
            _creator
        );
    }

    // Next the creator has to APPROVE for the NFT to this contract address

    function changeNFTOwner(address newOwner) external {
        require(address(nftAddr) != address(0), "NFT contract not deployed");
        nftAddr.transferFrom(nftAddr.ownerOf(0), newOwner, 0);
    }

    function getOwner() external view returns (address) {
        return nftAddr.ownerOf(0);
    }

    function getnftAddress(bytes4 code) external view returns (address) {
        return getNFTAddr[code];
    }

    function getNFTinformation(
        address _nftaddr
    ) external view returns (NFTinfo memory) {
        return NFTinformation[_nftaddr];
    }

    function isLockedCheck() external view returns (bool) {
        return isNFTmintLocked;
    }
}
