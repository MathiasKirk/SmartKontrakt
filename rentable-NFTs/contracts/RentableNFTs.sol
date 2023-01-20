// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./ERC4907.sol";
import "../node_modules/@openzeppelin/contracts/utils/Counters.sol"; // Counters is a library for managing uint256 IDs


contract RentableNFTs is ERC4907 {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds; // Counters.Counter is a struct that stores a single uint256 value
  
  constructor() ERC4907("RentableNFTs", "RNFT") {}
  event LogNewMint(uint256 previousId, uint256 newTokenId, address msgSender);

  // The mint function is used to create a new token and assign it to the user who called the function.
  function mint(string memory _tokenURI) public {
    uint256 previousId = _tokenIds.current();
    _tokenIds.increment();
    uint256 newTokenId = _tokenIds.current();
    require(_owners[newTokenId] == address(0), "Token ID already exists"); // check if the token ID is already in use
    _safeMint(msg.sender, newTokenId);
    _setTokenURI(newTokenId, _tokenURI);
    _owners[newTokenId] = msg.sender;
    _tokenOfOwner[msg.sender].push(newTokenId);
    setUser(newTokenId, msg.sender, 0);
    emit LogNewMint(previousId, newTokenId, msg.sender);
}

  function totalSupply() public view returns(uint256) {
    return _tokenIds.current();
}

  function burn(uint256 tokenId) public {
    require(tokenId <= _tokenIds.current(), "Invalid token ID.");
    require(_users[tokenId].expires > 0, "Invalid token ID.");
    require(_owners[tokenId] == msg.sender, "You are not the owner of this token.");
    emit UpdateUser(tokenId, address(0), 0);
    _users[tokenId].expires = 0;
    _burn(tokenId);
}


}