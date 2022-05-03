const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Voting contract", () => {

    let factoryVoting;
    let Voting;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    const provider = ethers.provider;

    const voteDuration = 3 * 24 * 60 * 60;
    const voteFee = ethers.utils.parseEther("0.01");
    const contractFee = 0.1;

    beforeEach(async () => {
        factoryVoting = await ethers.getContractFactory("Voting");
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
        Voting = await factoryVoting.deploy();
    });

    describe("Deployment", () => {
        it("Should set the right owner", async () => {
            expect(await Voting.owner()).to.equal(owner.address);
        });
    });

    describe("Add Voting", () => {
        it("Owner can create new voting", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);
            [_, balance, _, winnerVotes, finished, voters] = await Voting.votingInfo(0);
            expect(balance).to.equal(0);
            expect(winnerVotes).equal(0);
            expect(finished).equal(false);
            expect(voters).to.be.an("array").eql([addr1.address, addr2.address]);
        });

        it("Others than owner cannot create new votings", async () => {
            await expect(
                Voting.connect(addr1).addVoting([owner.address, addr2.address])
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(
                Voting.connect(addr2).addVoting([addr1.address, owner.address])
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(Voting.votingInfo(0)).to.be.revertedWith("Voting: no vote with such id");
        });

        it("Empty list of voters", async () => {
            await expect(
                Voting.addVoting([])
            ).to.be.revertedWith("Voting: empty list of voters");

            await expect(Voting.votingInfo(0)).to.be.revertedWith("Voting: no vote with such id");
        });
    });

    describe("Vote function", () => {
        it("Vote functionality works", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await Voting.connect(addrs[0]).vote(
                0,
                addr1.address,
                {value: voteFee}
            );

            [winner, balance, _, winnerVotes, finished, _] = await Voting.votingInfo(0);
            expect(winner).to.equal(addr1.address);
            expect(balance.toString()).to.equal(voteFee.toString());
            expect(winnerVotes).to.equal(1);
            expect(finished).equal(false);

            await Voting.connect(addrs[1]).vote(
                0,
                addr2.address,
                {value: voteFee}
            );

            [winner, balance, _, winnerVotes, finished, _] = await Voting.votingInfo(0);
            expect(winner).to.equal(addr1.address);
            expect(balance.toString()).to.equal((2 * voteFee).toString());
            expect(winnerVotes).to.equal(1);
            expect(finished).equal(false);

            await Voting.connect(addrs[2]).vote(
                0,
                addr2.address,
                {value: voteFee}
            );

            [winner, balance, _, winnerVotes, finished, _] = await Voting.votingInfo(0);
            expect(winner).to.equal(addr2.address);
            expect(balance.toString()).to.equal((3 * voteFee).toString());
            expect(winnerVotes).to.equal(2);
            expect(finished).equal(false);
        });

        it("Wrong fee for vote", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await expect(Voting.vote(
                0,
                addr2.address,
                {value: ethers.utils.parseEther("1")}
            )).to.be.revertedWith("Voting: wrong amount of fee");

            await expect(Voting.vote(
                0,
                addr2.address,
                {value: ethers.utils.parseEther("0.001")}
            )).to.be.revertedWith("Voting: wrong amount of fee");
        });

        it("Wrong vote", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await expect(Voting.vote(
                1,
                addr2.address,
                {value: voteFee}
            )).to.be.revertedWith("Voting: no vote with such id");
        });

        it("Vote is finished", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await provider.send('evm_increaseTime', [voteDuration]);
            await provider.send('evm_mine');

            await expect(Voting.vote(
                0,
                addr2.address,
                {value: voteFee}
            )).to.be.revertedWith("Voting: vote is finished");
        });

        it("Vote in voting only once", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await Voting.vote(
                0,
                addr2.address,
                {value: voteFee}
            );

            await expect(Voting.vote(
                0,
                addr2.address,
                {value: voteFee}
            )).to.be.revertedWith("Voting: per voting must be only one vote");
        });

        it("Wrong voter", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await expect(Voting.vote(
                0,
                owner.address,
                {value: voteFee}
            )).to.be.revertedWith("Voting: wrong voter");
        });

        it("Few votings", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);
            await Voting.addVoting([owner.address, addrs[0].address]);

            await Voting.connect(addr1).vote(
                0,
                addr1.address,
                {value: voteFee}
            );

            await Voting.connect(addr1).vote(
                1,
                owner.address,
                {value: voteFee}
            );

            [winner1, balance1, _, winnerVotes1, finished1, _] = await Voting.votingInfo(0);
            [winner2, balance2, _, winnerVotes2, finished2, _] = await Voting.votingInfo(1);

            expect(winner1).to.equal(addr1.address);
            expect(balance1.toString()).to.equal(voteFee.toString());
            expect(winnerVotes1).to.equal(1);
            expect(finished1).equal(false);

            expect(winner2).to.equal(owner.address);
            expect(balance2.toString()).to.equal(voteFee.toString());
            expect(winnerVotes2).to.equal(1);
            expect(finished2).equal(false);
        });
    });

    describe("Finish function", () => {
        it("Wrong vote", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await provider.send('evm_increaseTime', [voteDuration]);
            await provider.send('evm_mine');

            await expect(
                Voting.connect(addr1).finish(1)
            ).to.be.revertedWith("Voting: no vote with such id");

            [_, _, _, _, finished, _] = await Voting.votingInfo(0);
            expect(finished).equal(false);
        });

        it("Not finished vote", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await expect(
                Voting.connect(addr1).finish(0)
            ).to.be.revertedWith("Voting: vote is not finished");

            [_, _, _, _, finished, _] = await Voting.votingInfo(0);
            expect(finished).equal(false);
        });

        it("Winner is rewarded", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await Voting.vote(0, addr1.address, {value: voteFee});

            await provider.send('evm_increaseTime', [voteDuration]);
            await provider.send('evm_mine');

            const beforeBalance = await addr1.getBalance();
            await Voting.finish(0);
            const afterBalance = await addr1.getBalance();
            const reward = afterBalance.sub(beforeBalance).toString();
            const rewardExpected = (voteFee * 0.9).toString();

            expect(reward).to.equal(rewardExpected);

            [_, _, _, _, finished, _] = await Voting.votingInfo(0);
            expect(finished).equal(true);
        });

        it("No double reward", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);

            await Voting.vote(0, addr1.address, {value: voteFee});

            await provider.send('evm_increaseTime', [voteDuration]);
            await provider.send('evm_mine');

            const beforeBalance = await addr1.getBalance();
            await Voting.finish(0);
            const afterBalance = await addr1.getBalance();
            const reward = afterBalance.sub(beforeBalance).toString();
            const rewardExpected = (voteFee * (1 - contractFee)).toString();

            expect(reward).to.equal(rewardExpected);

            await Voting.finish(0);
            const afterSecondFinish = await addr1.getBalance();

            expect(afterBalance.toString()).to.equal(afterSecondFinish.toString());
        });
    });

    describe("Withdraw function", () => {
        it("Only owner can withdraw", async () => {
            await Voting.addVoting([addr1.address, addr2.address]);
            await Voting.addVoting([addr1.address, addr2.address]);

            await Voting.connect(addr1).vote(0, addr1.address, {value: voteFee});
            await Voting.connect(addr2).vote(1, addr2.address, {value: voteFee});

            await Voting.withdraw();

            await expect(
                Voting.connect(addrs[0]).withdraw()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

});