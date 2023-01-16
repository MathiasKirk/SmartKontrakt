// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./ERC4907.sol";
import "./node_modules/@openzeppelin/contracts/utils/Counters.sol"; // Counters is a library for managing uint256 IDs

contract RentableNFTs is ERC4907 {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds; // Counters.Counter is a struct that stores a single uint256 value
  
  constructor() ERC4907("RentableNFTs", "RNFT") {}


  // The mint function is used to create a new token and assign it to the user who called the function.
  function mint(string memory _tokenURI) public {
    _tokenIds.increment(); // _tokenIds is a Counters.Counter struct, so we can use the increment function to increase the value by 1
    uint256 newTokenId = _tokenIds.current(); // current returns the current value of the counter
    _safeMint(msg.sender, newTokenId); // _safeMint is a function from ERC721.sol
    _setTokenURI(newTokenId, _tokenURI); // _setTokenURI is a function from ERC721URIStorage.sol
  }

  function burn(uint256 tokenId) public {
    emit UpdateUser(tokenId, address(0), 0);
    _users[tokenId].expires = 0;
    _burn(tokenId);
  }

}