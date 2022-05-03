const { types } = require("hardhat/config");

task("withdraw", "Owner can withdraw collected commision")
  .addParam("address", "Contract address")
  .setAction(async (taskArgs) => {
      const Voting = await ethers.getContractFactory("Voting");
      const contract = Voting.attach(taskArgs.address);
      await contract.withdraw();
  });

task("vote", "Vote for a voter in given voting")
  .addParam("address", "Contract address")
  .addParam("voteid", "id of vote")
  .addParam("voter", "voter to vote for")
  .setAction(async (taskArgs) => {
      const Voting = await ethers.getContractFactory("Voting");
      const contract = Voting.attach(taskArgs.address);
      await contract.vote(taskArgs.voteid, taskArgs.voter);
  });

task("finish", "Finish the vote")
  .addParam("address", "Contract address")
  .addParam("voteid", "id of vote")
  .setAction(async (taskArgs) => {
      const Voting = await ethers.getContractFactory("Voting");
      const contract = Voting.attach(taskArgs.address);
      await contract.finish(taskArgs.voteid);
  });

task("votingInfo", "Show info on the vote")
  .addParam("address", "Contract address")
  .addParam("voteid", "id of vote")
  .setAction(async (taskArgs) => {
      const Voting = await ethers.getContractFactory("Voting");
      const contract = Voting.attach(taskArgs.address);
      res = await contract.votingInfo(taskArgs.voteid);
      console.log(res);
  });