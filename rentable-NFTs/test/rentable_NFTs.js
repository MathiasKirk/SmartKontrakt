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
});