const RentableNFTs = artifacts.require("RentableNFTs");

module.exports = function (deployer) {
  deployer.deploy(RentableNFTs);
}