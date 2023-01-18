require("@openzeppelin/test-helpers/configure")({ provider: web3.currentProvider, singletons: { abstraction: "truffle"}});

const {constants, expectRevert, expectEvent} = require("@openzeppelin/test-helpers");
const { inTransaction } = require("@openzeppelin/test-helpers/src/expectEvent");
const { increaseTo } = require("@openzeppelin/test-helpers/src/time");
const RentableNFTs = artifacts.require("RentableNFTs");

contract ("RentableNFTs", function (accounts) {
  // The first test is checking if the smart contract supports the ERC721 and ERC4907 standards by calling the "supportsInterface" function and checking if it returns true for the ERC721 and ERC4907 interface IDs.
  it("should support the ERC721 and ERC4907 standards", async () => {
    const rentableNFTs = await RentableNFTs.deployed();
    const ERC721InterfaceId = "0x80ac58cd";
    const ERC4907InterfaceId = "0xad092b5c";
    const isERC721 = await rentableNFTs.supportsInterface(ERC721InterfaceId);
    const isERC4907 = await rentableNFTs.supportsInterface(ERC4907InterfaceId);
    assert.equal(isERC721, true, "RentableNFTs does not support the ERC721 standard");
    assert.equal(isERC4907, true, "RentableNFTs does not support the ERC4907 standard");
  });
  // The second test is checking if the "setUser" function works correctly by trying to call the function from an account that is not the owner and expecting a revert. It then checks that the NFT is set to the zero address and the expiration date is 0.
  it("should not set UserInfo if not the owner", async () => {
    const rentableNFTs = await RentableNFTs.deployed();
    const expirationDatePast = 1660252958; 
    await rentableNFTs.mint("fakeURI");
    // Failed require in function
    await expectRevert(rentableNFTs.setUser(1, accounts[1], expirationDatePast, {from: accounts[1]}), "caller is not owner nor approved");
    // Assert no UserInfo for NFT
    var user = await rentableNFTs.userOf.call(1);
    var date = await rentableNFTs.userExpires.call(1);
    assert.equal(user, constants.ZERO_ADDRESS, "NFT is not set to zero address");
    assert.equal(date, 0, "NFT expiration date is not zero");
  });

  // The third test checks if the smart contract is returning the correct UserInfo by minting two NFTs, setting the user and expiration date of one of them to a past date and the other to a future date, and then calling the "userOf" and "userExpires" functions to check if they retur    sdn the correct information.
  it("should return the correct UserInfo", async () => {
    const rentableNFTs = await RentableNFTs.deployed();
    const expirationDatePast = Math.round((new Date().getTime() / 1000) - 3600);
    const expirationDateFuture = Math.round((new Date().getTime() / 1000) + 3600);
    await rentableNFTs.mint("fakeURI");
    await rentableNFTs.mint("fakeURI");
    // set and get UserInfo
    var expiredTx = await rentableNFTs.setUser(2, accounts[1], expirationDatePast);
    var unexpiredTx = await rentableNFTs.setUser(3, accounts[2], expirationDateFuture);
    var expiredNFTUser = await rentableNFTs.userOf.call(2);
    var expiredNFTDate = await rentableNFTs.userExpires.call(2);
    var unexpiredNFTUser = await rentableNFTs.userOf.call(3);
    var unexpiredNFTDate = await rentableNFTs.userExpires.call(3);
    // Assert UserInfo and event transmission
    assert.equal(expiredNFTDate, expirationDatePast, "Expired NFT has wrong expiration date");
    const latestBlockTimestamp = await web3.eth.getBlock("latest").timestamp;
    if (latestBlockTimestamp >= expirationDatePast) {
    assert.equal(expiredNFTUser, constants.ZERO_ADDRESS, "Expired NFT has wrong user");
    }
    expectEvent(expiredTx, "UpdateUser", {tokenId: "2", user: accounts[1], expires: expirationDatePast.toString()});
    assert.equal(unexpiredNFTUser, accounts[2], "Expired NFT has wrong user");
    assert.equal(unexpiredNFTDate, expirationDateFuture, "Expired NFT has wrong expiration date");
    expectEvent(unexpiredTx, "UpdateUser", {tokenId: "3", user: accounts[2], expires: expirationDateFuture.toString()});
    // Burn expired NFT
    unexpiredTx = await rentableNFTs.burn(3);
    // Assert UserInfo was deleted
    unexpiredNFTUser = await rentableNFTs.userOf.call(3);
    unexpiredNFTDate = await rentableNFTs.userExpires.call(3);
    assert.equal(unexpiredNFTUser, constants.ZERO_ADDRESS, "NFT user is not zero address");
    assert.equal(unexpiredNFTDate, 0, "NFT expiration date is not 0");
    expectEvent(unexpiredTx, "UpdateUser", {tokenId: "3", user: constants.ZERO_ADDRESS, expires: "0"});
    });

    // This test case starts by deploying an instance of the RentableNFTs contract. Then it mints a new NFT, and sets the user and expiration date of the NFT using the setUser function, while passing the token Id, the new user address, the expires date and the msg.sender address. The test case then checks if the "UpdateUser" event is emitted with the correct arguments. Finally, it checks if the NFT user and expiration date are set correctly. 
    it("should set the NFT's user and expiration date correctly", async () => {
      const rentableNFTs = await RentableNFTs.deployed();
      // Mint a new NFT
      await rentableNFTs.mint("fakeURI");
      // Set the user and expiration date of the NFT
      const futureDate = Math.round((new Date().getTime() / 1000) + 3600);
      const tx = await rentableNFTs.setUser(1, accounts[2], futureDate, {from: accounts[0]});

      // Check if the 'UpdateUser' event is emitted
      assert.exists(tx.logs.find(log => log.event === "UpdateUser"), "UpdateUser event is not emitted");

      // Check if the NFT user is set correctly
      const user = await rentableNFTs.userOf(1);
      assert.equal(user, accounts[2], "NFT user is not correct");

      // Check if the NFT expiration date is set correctly
      const expires = await rentableNFTs.userExpires(1);
      assert.equal(expires.toNumber(), futureDate, "NFT expiration date is not correct");
    });

    it("should burn the NFT and remove its user information", async () => {
      // Deploy the smart contract
      const rentableNFTs = await RentableNFTs.deployed();
  
      // Mint a new NFT
      await rentableNFTs.mint("fakeURI", { from: accounts[0] });
  
      // Set the user and expiration date of the NFT
      const futureDate = Math.round((new Date().getTime() / 1000) + 3600);
      await rentableNFTs.setUser(1, accounts[1], futureDate, { from: accounts[0] });
  
      // Check if the NFT has a user
      const user = await rentableNFTs.userOf(1);
      assert.equal(user, accounts[1], "NFT user is not correct before burn");
  
      // Burn the NFT
      await rentableNFTs.burn(1, { from: accounts[0] });
  
      // Check if the NFT user is set to address(0)
      const burnedUser = await rentableNFTs.userOf(1);
      assert.equal(burnedUser, "0x0000000000000000000000000000000000000000", "NFT user is not zero address after burn");
  
      // Check if the NFT expiration date is set to 0
      const burnedExpires = await rentableNFTs.userExpires(1);
      assert.equal(burnedExpires, 0, "NFT expiration date is not zero after burn");
  });

  it("should return the correct tokenId for a given index", async () => {
    const rentableNFTs = await RentableNFTs.deployed();
    await rentableNFTs.mint("fakeURI");
    await rentableNFTs.mint("fakeURI");
    const tokenId1 = await rentableNFTs.tokenOfOwnerByIndex(accounts[0],0);
    const tokenId2 = await rentableNFTs.tokenOfOwnerByIndex(accounts[0],1);
    assert.equal(tokenId1, 1, "TokenId1 is not correct");
    assert.equal(tokenId2, 2, "TokenId2 is not correct");
    });
    
    it("should mint a new NFT", async () => {
      const rentableNFTs = await RentableNFTs.deployed();
      const initialSupply = await rentableNFTs.balanceOf(accounts[0]); // Check the initial total supply
      await rentableNFTs.mint("fakeURI");
      const finalSupply = await rentableNFTs.balanceOf(accounts[0]); // Check the final total supply
      assert.equal(finalSupply - initialSupply, 1, "A new NFT was not minted");
  });




  



});