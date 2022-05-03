// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "./Ownable.sol";
import "hardhat/console.sol";

/**
 * Contract for votings creation with the given list of participants
 * Properties:
 *   - Owner of the contract can create votings
 *   - Users can vote in different votings by paying 0.01 ETH per vote
 *   - Winner of the vote takes allSum - contractFee
 */
contract Voting is Ownable{

    // struct for Vote
    struct Vote {
        mapping (address => uint32) addressToVotes;
        mapping (address => bool) voted;
        address[] voters;
        address winner;
        uint balance;
        uint32 endTime;
        uint32 winnerVotes;
        bool finished;
    }

    // fees definitions
    uint voteFee = 0.01 ether;
    uint contractFeePercent = 10;

    // available balance to be withdrawn
    uint withdrawBalance;

    uint voteDuration = 3 days;

    // array of all votes
    Vote[] votes;

    /**
     * Private function for vote check
     * O(1)
     */
    function _isVote(uint _voteId) private view returns (bool) {
        return (_voteId < votes.length);
    }

    /**
     * Private function for the voter check among participants of the given vote
     * O(n)
     */
    function _isVoterInVote(address _voter, uint _voteId) private view returns (bool) {
        for (uint i = 0; i < votes[_voteId].voters.length; i++) {
            if (votes[_voteId].voters[i] == _voter) {
                return true;
            }
        }
        return false;
    }

    /**
     * Private function for the vote's end check
     * O(1)
     */
    function _isVoteFinished(uint _voteId) private view returns (bool) {
        return (votes[_voteId].endTime <= block.timestamp);
    }

    /**
     * Owner can add new vote with defined list of voters
     * O(1)
     */
    function addVoting(address[] calldata voters) public onlyOwner {
        require(voters.length > 0, "Voting: empty list of voters");

        Vote storage newVote = votes.push();
        newVote.endTime = uint32(block.timestamp + voteDuration);
        newVote.voters = voters;
    }

    /**
     * Owner can withdraw all fees from all finished votes
     * O(1)
     */
    function withdraw() public onlyOwner {
        address payable _owner = payable(owner());
        _owner.transfer(withdrawBalance);
    }

    /**
     * Any user can vote once in any of the current votings with fee for vote
     * O(n) in requires
     */
    function vote(uint _voteId, address _voter) external payable {
        require(msg.value == voteFee, "Voting: wrong amount of fee");
        require(_isVote(_voteId), "Voting: no vote with such id");
        require(!_isVoteFinished(_voteId), "Voting: vote is finished");
        require(!votes[_voteId].voted[msg.sender], "Voting: per voting must be only one vote");
        require(_isVoterInVote(_voter, _voteId), "Voting: wrong voter");

        votes[_voteId].addressToVotes[_voter]++;
        votes[_voteId].balance += voteFee;
        votes[_voteId].voted[msg.sender] = true;

        if (votes[_voteId].addressToVotes[_voter] > votes[_voteId].winnerVotes) {
            votes[_voteId].winner = _voter;
            votes[_voteId].winnerVotes = votes[_voteId].addressToVotes[_voter];
        }
    }

    /**
     * Any user can finish any vote if it's finished and the winner will be rewarded
     * O(1)
     */
    function finish(uint _voteId) external {
        require(_isVote(_voteId), "Voting: no vote with such id");
        require(_isVoteFinished(_voteId), "Voting: vote is not finished");

        if (!votes[_voteId].finished) {
            votes[_voteId].finished = true;
            withdrawBalance += votes[_voteId].balance * contractFeePercent / 100;
            payable(votes[_voteId].winner).transfer(votes[_voteId].balance * (100 - contractFeePercent) / 100);
        }
    }

    /**
     * Function returns basic info on the given vote
     * The basic info includes: winner, balance of vote, end time, amount of winner votes
     * O(1)
     */
    function votingInfo(uint _voteId) external view returns (address, uint, uint32, uint32, bool, address[] memory) {
        require(_isVote(_voteId), "Voting: no vote with such id");
        return (
            votes[_voteId].winner,
            votes[_voteId].balance,
            votes[_voteId].endTime,
            votes[_voteId].winnerVotes,
            votes[_voteId].finished,
            votes[_voteId].voters
        );
    }

}