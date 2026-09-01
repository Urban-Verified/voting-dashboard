export const ElectionRegistryAbi = [
  "function electionCount() view returns (uint256)",
  "function getElections(uint256 startElectionId, uint256 count) view returns (address[])",
  "event ElectionCreated(address indexed election, uint256 indexed electionId, address indexed keyperSet)",
] as const;

export const ElectionAbi = [
  "function getElection() view returns (tuple(uint256 electionId,uint64 votingStart,uint64 votingEnd,uint256 selfSubmitFee,uint32 numCandidates,uint32 budget,uint64 thresholdN,uint64 thresholdT,address[] keyperAddresses,bytes pkWR) config, tuple(bytes pkElection,bytes[] committeePKs) dkgResult)",
  "function getPhase() view returns (uint8)",
  "function isDKGFinalized() view returns (bool)",
  "function isResultFinalized() view returns (bool)",
  "function getNumBallots() view returns (uint256)",
  "function getBallots(uint256 startIndex,uint256 count) view returns (tuple(bytes32 pseudonym,bytes vk,tuple(bytes c1,bytes c2)[] ciphertexts,bytes32 zkProofHash,bytes voterSignature,bytes wrAttestation)[])",
  "function getAggregate() view returns (tuple(tuple(bytes c1,bytes c2)[] aggregates))",
  "function getDecryptionShares() view returns (tuple(uint8 keyperIndex,uint64 submittedAt,bytes[] shares,tuple(uint256 e,uint256 z)[] proofs)[])",
  "function getResult() view returns (tuple(uint256[] tally,uint8[] keyperIndices))",
  "event VoteSubmitted(bytes32 indexed pseudonym, uint256 indexed ballotIndex, bytes zkProof)",
  "event AggregatePublished(uint256 indexed electionId)",
  "event DecryptionSharePosted(uint8 indexed keyperIndex)",
  "event ResultPublished(uint256[] tally, uint8[] keyperIndices)",
] as const;

