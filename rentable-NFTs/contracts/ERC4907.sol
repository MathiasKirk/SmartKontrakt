// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./IERC4907.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract ERC4907 is IERC4907, ERC721URIStorage { // The contract itself is named ERC4907, which inherits from IERC4907 and ERC721URIStorage.

  // It has a struct named UserInfo that stores information about a user, an address and an expiration timestamp.
  struct UserInfo {
    address user;
    uint64 expires; // uint64 is for gas perpose
  }

  // It also has a mapping variable named _users that stores the user information for each token ID.
  mapping(uint256 => UserInfo) internal _users;    // tokenId of NFT (uint256) => UserInfo
  mapping(uint256 => address) _owners; // store the owner of the token
  mapping (address => uint256[]) _tokenOfOwner;

  // The constructor function initializes the token's name and symbol and the setUser function sets the user and expiration date for a specific token ID.
  constructor(string memory name_, string memory symbol_) ERC721(name_, symbol_) {}

  /// @notice set the user and expires of an NFT
  /// @dev The zero address indicates there is no user
  /// Throws if `tokenId` is not valid NFT
  /// @param user  The new user of the NFT
  /// @param expires  UNIX timestamp, The new user could use the NFT before expires
  function setUser(uint256 tokenId, address user, uint64 expires) public virtual override{ 
    require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not owner nor approved"); // require that the caller is the owner or approved
    UserInfo storage info = _users[tokenId];
    info.user = user;
    info.expires = expires;
    emit UpdateUser(tokenId, user, expires); // emit event
  }

  /// @notice Get the user address of an NFT
  /// @dev The zero address indicates that there is no user or the user is expired
  /// @param tokenId The NFT to get the user address for
  /// @return The user address for this NFT
  // The userOf function returns the user address for a specific token ID if the expiration date has not passed.
  function userOf(uint256 tokenId) public view override virtual returns(address) {
    if (uint256(_users[tokenId].expires) >= block.timestamp) {
      return _users[tokenId].user;
    } else {
      return address(0);
    }
  }

  /// @notice Get the user expires of an NFT
  /// @dev The zero value indicates that there is no user
  /// @param tokenId The NFT to get the user expires for
  /// @return The user expires for this NFT
  // The userExpires function returns the expiration date for a specific token ID.
  function userExpires(uint256 tokenId) public virtual override view returns(uint256) {
    return _users[tokenId].expires;
  }

  //// support interface
  // The supportsInterface function is used to check if the contract implements a specific interface.
  function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
    return interfaceId == type(IERC4907).interfaceId || super.supportsInterface(interfaceId);
  }

  // The _beforeTokenTransfer function is called before a token transfer, it clears the user information if the token is transferred to a different user.
  function _beforeTokenTransfer(address from, address to, uint256, uint256 tokenId) internal virtual override {
      super._beforeTokenTransfer(from, to, 1, tokenId);
      // Check if the user is renting the token before clearing its user information
      address user = userOf(tokenId);
      uint256 expires = userExpires(tokenId);
      if (from != to && user != address(0) && expires < block.timestamp) {
          delete _users[tokenId];
          emit UpdateUser(tokenId, address(0), 0);
      }
  }

  function tokenExists(uint256 tokenId) public view returns(bool) {
    return  _users[tokenId].user != address(0);
}

  // This function is an override of the built-in transferFrom function in the ERC721 standard, it checks if the user is expired before allowing the transfer to proceed, it uses the userExpires function to get the user expiration date, compares it to the block timestamp and if the user is expired it reverts the transaction with a message "User is expired, can't transfer the NFT". It's important to note that this function will only prevent the user from selling the NFT when it is expired, if the user is not expired the transfer will be allowed, you should check if that's the behavior you want.
  function transferFrom(address from, address to, uint256 tokenId) public virtual override {
    require(_isApprovedOrOwner(msg.sender, tokenId), "ERC721: caller is not owner nor approved"); // require that the caller is the owner or approved
    // Check if token is currently being rented by a user
    address user = userOf(tokenId);
    uint256 expires = userExpires(tokenId);
    require(user == address(0) || expires < block.timestamp, "NFT is rented");
    // Perform the transfer
    _transfer(from, to, tokenId);
    emit Transfer(from, to, tokenId);
}

  function isRented(uint256 tokenId) public view returns (bool) {
  return _users[tokenId].expires > block.timestamp;
  }

  function tokenOfOwnerByIndex(address owner, uint256 index) public view returns(uint256) {
    require(index < _tokenOfOwner[owner].length, "Index out of range");
    return _tokenOfOwner[owner][index];
  }

  function balanceOf(address _owner) public view override returns (uint256) {
    return _tokenOfOwner[_owner].length;
  }
  


}