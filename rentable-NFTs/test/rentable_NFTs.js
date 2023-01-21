require("@openzeppelin/test-helpers/configure")({ provider: web3.currentProvider, singletons: { abstraction: "truffle"}});

const {constants, expectRevert, expectEvent} = require("@openzeppelin/test-helpers");
const { inTransaction } = require("@openzeppelin/test-helpers/src/expectEvent");
const { increaseTo } = require("@openzeppelin/test-helpers/src/time");
const RentableNFTs = artifacts.require("RentableNFTs");

contract ("RentableNFTs", function (accounts) {

  it("should support the ERC721 and ERC4907 standards", async () => {
    const rentableNFTs = await RentableNFTs.deployed();
    const ERC721InterfaceId = "0x80ac58cd";
    const ERC4907InterfaceId = "0xad092b5c";
    const isERC721 = await rentableNFTs.supportsInterface(ERC721InterfaceId);
    const isERC4907 = await rentableNFTs.supportsInterface(ERC4907InterfaceId);
    assert.equal(isERC721, true, "RentableNFTs does not support the ERC721 standard");
    assert.equal(isERC4907, true, "RentableNFTs does not support the ERC4907 standard");
  });

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

  it("should check if a token exists", async () => {
    const contract = await RentableNFTs.deployed();
    // Mint a new token
    await contract.mint("tokenURI");
    const tokenId = 1; // assuming the first token minted has an id of 1
    // Check if the token exists
    const exists = await contract.tokenExists(tokenId);
    assert.isTrue(exists, "Token should exist");
    });

    it("should increment totalSupply after minting", async () => {
      const contract = await RentableNFTs.deployed();
      // Get the initial totalSupply
      let initialSupply = await contract.totalSupply();
  
      // Mint a new token
      await contract.mint("https://example.com/token1", {from: accounts[0]});
  
      // Get the updated totalSupply
      let updatedSupply = await contract.totalSupply();
  
      // Assert that the totalSupply has been incremented by 1
      assert.equal(updatedSupply.toNumber(), initialSupply.toNumber() + 1, "totalSupply did not increment correctly");
  });

  it("should not rent an NFT that is already rented by someone else", async () => {
    // Deploy the contract
    const contract = await RentableNFTs.deployed();
    // Set up test data
    const renter1 = accounts[0];
    const renter2 = accounts[1];
    const expires = Math.floor(Date.now() / 1000) + 86400; // expires in 24 hours
    // Mint a new token
    const result = await contract.mint("https://example.com/token1", { from: renter1 });
    const tokenId = result.logs[0].args.tokenId.toNumber();

    // Rent the NFT
    await contract.setUser(tokenId, renter1, expires, {from: renter1});

    // Check that the NFT is rented
    const rentedNFT = await contract.userOf(tokenId);
    expect(rentedNFT).to.equal(renter1);

    // Try to rent the NFT again by another user
    try {
        if (rentedNFT !== '0x0000000000000000000000000000000000000000') {
            throw new Error("NFT is already rented");
        }
        await contract.setUser(tokenId, renter2, expires, {from: renter2});
    } catch (error) {
        // Check that the error message is correct
        expect(error.message).to.equal("NFT is already rented");
    }

    // Check that the NFT is still rented by the first user
    const rentedNFTAfter = await contract.userOf(tokenId);
    expect(rentedNFTAfter).to.equal(renter1);
      }); 

      it("should check that the token ID is in the _tokenOfOwner mapping", async () => {
        const rentableNFTs = await RentableNFTs.deployed();
        await rentableNFTs.mint("fakeURI", {from: accounts[0]});
        const tokenId = await rentableNFTs.tokenOfOwnerByIndex(accounts[0], 0);
        assert.notEqual(tokenId, 0, "Token ID was not correctly obtained from tokenOfOwnerByIndex function");
        const tokenOfOwner = await rentableNFTs._tokenOfOwner(accounts[0], tokenId);
        assert.isTrue(tokenOfOwner.gte(0), "Token ID is not in the _tokenOfOwner mapping");
    });

    it("should not allow user to burn the NFT that is not the owner", async () => {
      // Deploy the contract
      const contract = await RentableNFTs.deployed();
      // Set up test data
      const owner = accounts[0];
      const nonOwner = accounts[1];
      // Mint a new token
      const result = await contract.mint("https://example.com/token1", { from: owner });
      const tokenId = result.logs[0].args.tokenId.toNumber();
      // Check that the non-owner cannot burn the NFT
      try {
      await contract.burn(tokenId, { from: nonOwner });
      assert.fail("Non-owner was able to burn the NFT");
      } catch (error) {
      // Check that the error message is correct
      assert.isTrue(error.message.startsWith("VM Exception"), "Error should be a VM exception");
      assert.isTrue(error.message.includes("revert Invalid token ID."), "Error should be invalid token id");
      // Check that the token still exists
      const tokenExists = await contract.tokenExists(tokenId);
      assert.isTrue(tokenExists, "Token should still exist");
      }
      });

      it("should not allow user to sell the NFT that is not the owner", async () => {
        // Deploy the contract
        const contract = await RentableNFTs.deployed();
        // Set up test data
        const owner = accounts[0];
        const nonOwner = accounts[1];
        const newOwner = accounts[2];
        const price = web3.utils.toWei("1", "ether");
        // Mint a new token
        const result = await contract.mint("https://example.com/token1", { from: owner });
        const tokenId = result.logs[0].args.tokenId.toNumber();
        // Check that the non-owner cannot sell the NFT
        try {
        await contract.sellNFT(tokenId, newOwner, price, { from: nonOwner });
        assert.fail("Non-owner was able to sell the NFT");
        } catch (error) {
        // Check that the error message is correct
        assert.isTrue(error.message.startsWith("VM Exception"), "Error should be a VM exception");
        assert.isTrue(error.message.includes("Only the owner can sell this NFT."), "Error should be 'Only the owner can sell this NFT.'");
        // Check that the token still exists
        const tokenExists = await contract.tokenExists(tokenId);
        assert.isTrue(tokenExists, "Token should still exist");
        // Check that the owner of the token is still the original owner
        const tokenOwner = await contract.ownerOf(tokenId);
        assert.equal(tokenOwner, owner, "Token should still be owned by the original owner");
        }
        });











}); 