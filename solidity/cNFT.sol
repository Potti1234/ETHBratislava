import "./IcNFT.sol";

uint256 constant HASH_WIDTH = 20;
uint256 constant DOUBLE_HASH_WIDTH = 40;

uint256 constant CONCURRENCY_FACTOR = 3;
uint256 constant MAX_NFTS = (2**16)-1;

contract cNFT is IcNFT {

    string dataRootUrl;

    bytes20 public dataMerkleRoot;
    bytes32[CONCURRENCY_FACTOR] public concurrentOwnersMerkleRoots; //Stores packed data as (bytes20 - merkle root, uint16[6] - changelog)

    cNFTData public _contractData;

    function getLatestOwnerMerkleRoot() external view returns (bytes20) {
        return bytes20(concurrentOwnersMerkleRoots[_contractData.concurrentIndex]);
    }

    function getContractData() external view returns (cNFTData memory) {
        return _contractData;
    }

    function getRootDataUrl() external view returns (string memory) {
        return dataRootUrl;
    }

    function verifyData(uint16 nftIndex, bytes memory data, bytes calldata proof) external view returns (bool) {
        bytes20 dataHash = bytes20(keccak256(data));
        return verifyDataHash(nftIndex, dataHash, proof);
    }

    function verifyDataHash(uint16 nftIndex, bytes20 dataHash, bytes calldata proof) public view returns (bool) {
        cNFTData memory contractData = _contractData;
        require(nftIndex<contractData.amount, "Token index out of bounds!");
        return _computeMerkle_calldata(dataHash, nftIndex, proof, contractData.depth)==dataMerkleRoot;
    }

    function _checkCurrentRootSingle(cNFTData memory contractData, uint16 nftIndex, bytes20 expectedRoot) private view returns (bool) {
        uint8 merkleRootIndex = contractData.concurrentIndex;
        nftIndex++;

        for(uint256 i;i<CONCURRENCY_FACTOR;i++) {
            bytes32 merkleRootData = concurrentOwnersMerkleRoots[merkleRootIndex];

            //Merkle root matches!
            if(bytes20(merkleRootData)==expectedRoot) return true;

            uint96 changelog = uint96(uint256(merkleRootData));

            uint16 changelog1 = uint16(changelog & 0xFFFF);
            uint16 changelog2 = uint16(changelog>>16 & 0xFFFF);
            uint16 changelog3 = uint16(changelog>>32 & 0xFFFF);
            uint16 changelog4 = uint16(changelog>>48 & 0xFFFF);
            uint16 changelog5 = uint16(changelog>>64 & 0xFFFF);
            uint16 changelog6 = uint16(changelog>>80 & 0xFFFF);

            //Doesn't match, check if the token was transfered in current changelog
            if(
                changelog6==nftIndex ||
                changelog5==nftIndex ||
                changelog4==nftIndex ||
                changelog3==nftIndex ||
                changelog2==nftIndex ||
                changelog1==nftIndex
            ) return false;

            if(merkleRootIndex==0) {
                merkleRootIndex = uint8(CONCURRENCY_FACTOR-1);
            } else {
                merkleRootIndex--;
            }
        }

        return false;
    }

    function _checkCurrentRoot(cNFTData memory contractData, uint16[] calldata nftIndexes, bytes20 expectedRoot) private view returns (bool) {
        uint8 merkleRootIndex = contractData.concurrentIndex;
        for(uint256 i;i<CONCURRENCY_FACTOR;i++) {
            bytes32 merkleRootData = concurrentOwnersMerkleRoots[merkleRootIndex];

            //Merkle root matches!
            if(bytes20(merkleRootData)==expectedRoot) return true;

            uint96 changelog = uint96(uint256(merkleRootData));

            uint16 changelog1 = uint16(changelog & 0xFFFF);
            uint16 changelog2 = uint16(changelog>>16 & 0xFFFF);
            uint16 changelog3 = uint16(changelog>>32 & 0xFFFF);
            uint16 changelog4 = uint16(changelog>>48 & 0xFFFF);
            uint16 changelog5 = uint16(changelog>>64 & 0xFFFF);
            uint16 changelog6 = uint16(changelog>>80 & 0xFFFF);

            uint16 nftIndex = nftIndexes[i] + 1;

            for(uint256 e;e<nftIndexes.length;e++) {
                //Doesn't match, check if the token was transfered in current changelog
                if(
                    changelog1==nftIndex ||
                    changelog2==nftIndex ||
                    changelog3==nftIndex ||
                    changelog4==nftIndex ||
                    changelog5==nftIndex ||
                    changelog6==nftIndex
                ) return false;
            }


            if(merkleRootIndex==0) {
                merkleRootIndex = uint8(CONCURRENCY_FACTOR-1);
            } else {
                merkleRootIndex--;
            }
        }

        return false;
    }

    function has(uint16 nftIndex, address owner, bytes calldata proof) external view returns (bool) {
        cNFTData memory contractData = _contractData;
        require(nftIndex<contractData.amount, "Token index out of bounds!");
        bytes20 result = _computeMerkle_calldata(bytes20(owner), nftIndex, proof, contractData.depth);

        return _checkCurrentRootSingle(contractData, nftIndex, result);
    }

    function transfer(uint16 nftIndex, address recipient, bytes calldata proof) external {
        cNFTData memory contractData = _contractData;
        require(nftIndex<contractData.amount, "Token index out of bounds!");
        (bytes20 oldAccumulator, bytes20 newAccumulator) = _computeMerkle_update_calldata(bytes20(msg.sender), bytes20(recipient), nftIndex, proof, contractData.depth, 0);

        require(_checkCurrentRootSingle(contractData, nftIndex, oldAccumulator), "Merkle root doesn't match!");

        contractData.concurrentIndex = uint8((contractData.concurrentIndex+1) % CONCURRENCY_FACTOR);
        concurrentOwnersMerkleRoots[contractData.concurrentIndex] = bytes32(uint256(bytes32(newAccumulator)) | uint256(nftIndex+1));
        _contractData = contractData;

        emit Transfer(nftIndex, msg.sender, recipient);
    }

    function transferBatch(uint16[] calldata nftIndex, address[] calldata recipient, bytes calldata proof) external {
        require(nftIndex.length>0, "List cannot be empty");
        require(nftIndex.length==recipient.length, "Array lengths must match");
        require(nftIndex.length<=6, "Max 6 transfers allowed");

        cNFTData memory contractData = _contractData;
        require(nftIndex[0]<contractData.amount, "Token index out of bounds!");
        (bytes20 oldAccumulator, bytes20 newAccumulator) = _computeMerkle_update_calldata(bytes20(msg.sender), bytes20(recipient[0]), nftIndex[0], proof, contractData.depth, 0);
        require(_checkCurrentRoot(contractData, nftIndex, oldAccumulator), "Merkle root doesn't match!");
        uint256 changelog = uint256(nftIndex[0]+1);

        emit Transfer(nftIndex[0], msg.sender, recipient[0]);

        uint256 proofLength = (contractData.depth-1)*HASH_WIDTH;
        bytes20 newestRoot = newAccumulator;
        for(uint256 i=1;i<nftIndex.length;i++) {
            (oldAccumulator, newAccumulator) = _computeMerkle_update_calldata(bytes20(msg.sender), bytes20(recipient[i]), nftIndex[i], proof, contractData.depth, i*proofLength);
            require(oldAccumulator==newestRoot, "Merkle root doesn't match");
            newestRoot = newAccumulator;
            changelog |= uint256(nftIndex[i]+1) << (16*i);

            emit Transfer(nftIndex[i], msg.sender, recipient[i]);
        }

        contractData.concurrentIndex = uint8((contractData.concurrentIndex+1) % CONCURRENCY_FACTOR);
        concurrentOwnersMerkleRoots[contractData.concurrentIndex] = bytes32(uint256(bytes32(newAccumulator)) | changelog);
        _contractData = contractData;
    }

    function _mint(string calldata rootDataUrl, uint16 amount, bytes20 dataRoot, bytes20 ownersRoot, uint256 depth) private {
        require(!_contractData.minted, "Already minted!");
        require((1<<(depth-1)) >= amount, "Invalid depth specified");
        dataMerkleRoot = dataRoot;
        concurrentOwnersMerkleRoots[0] = ownersRoot;
        //Make sure we initialize all the slots
        for(uint256 i=1;i<CONCURRENCY_FACTOR;i++) {
            concurrentOwnersMerkleRoots[i] = bytes32(bytes1(0x01));
        }
        dataRootUrl = rootDataUrl;

        emit Mint(amount, dataRoot, ownersRoot, rootDataUrl);

        // uint16 originalAmount = amount;
        // uint8 depth;
        // while(amount!=0) {
        //     amount = amount >> 1;
        //     depth++;
        // }
        _contractData = cNFTData(uint16(amount),uint8(0),uint8(depth),true);
    }

    function mint(string calldata rootDataUrl, uint16 amount, bytes20 dataRoot, bytes20 ownersRoot, uint256 depth) external {
        require(amount<MAX_NFTS, "Token amount too high!");
        _mint(rootDataUrl, amount, dataRoot, ownersRoot, depth);
    }

    function mintTransparent(string calldata rootDataUrl, uint16 amount, bytes20 dataRoot, bytes calldata owners, uint256 depth) external {
        //Calldata need to be available in the clear in the transaction's calldata
        require(msg.sender == tx.origin, "Method can only be called directly by user.");
        uint256 amountU256 = owners.length/HASH_WIDTH;
        require(amountU256<(2**16)-1, "Token amount too high!");

        //TODO: Not implemented
    }

    function mintTransparentOptimistic(string calldata rootDataUrl, bytes20 dataRoot, bytes20 ownersRoot, bytes calldata owners, uint256 depth) external {
        //Calldata need to be available in the clear in the transaction's calldata
        require(msg.sender == tx.origin, "Method can only be called directly by user.");
        uint256 amountU256 = owners.length/HASH_WIDTH;
        require(amountU256<MAX_NFTS, "Token amount too high!");

        _mint(rootDataUrl, uint16(amountU256), dataRoot, ownersRoot, depth);
    }

    function _computeMerkle_update_calldata(bytes20 leafHash, bytes20 newLeafHash, uint256 index, bytes calldata merkleProof, uint256 depth, uint256 offset) private pure returns(bytes20 oldAccumulator, bytes20 newAccumulator) {
        require(merkleProof.length-offset>=(depth-1)*HASH_WIDTH, "Proof incorrect size");
        if(merkleProof.length == 0) return (leafHash, newLeafHash);

        assembly {
            let len := mul(sub(depth,2), HASH_WIDTH)
            let dataElementLocation := add(merkleProof.offset, offset)

            oldAccumulator := leafHash
            newAccumulator := newLeafHash

            for
                { let end := add(dataElementLocation, len) }
                lt(dataElementLocation, end)
                { dataElementLocation := add(dataElementLocation, HASH_WIDTH) }
            {
                let proofPosition := mul(and(not(index), 0x1), 32)
                calldatacopy(proofPosition, dataElementLocation, HASH_WIDTH)

                let accumulatorPosition := sub(32, proofPosition)
                mstore(accumulatorPosition, oldAccumulator)
                oldAccumulator := and(keccak256(0x00, 64), 0xffffffffffffffffffffffffffffffffffffffff000000000000000000000000)

                mstore(accumulatorPosition, newAccumulator)
                newAccumulator := and(keccak256(0x00, 64), 0xffffffffffffffffffffffffffffffffffffffff000000000000000000000000)

                index := shr(1, index)
            }

            let proofPosition := mul(and(not(index), 0x1), 32)
            calldatacopy(proofPosition, dataElementLocation, HASH_WIDTH)

            let accumulatorPosition := sub(32, proofPosition)
            mstore(accumulatorPosition, oldAccumulator)
            oldAccumulator := and(keccak256(0x00, 64), 0xffffffffffffffffffffffffffffffffffffffff000000000000000000000000)

            mstore(accumulatorPosition, newAccumulator)
            newAccumulator := and(keccak256(0x00, 64), 0xffffffffffffffffffffffffffffffffffffffff000000000000000000000000)
        }
    }

    function _computeMerkle_calldata(bytes20 leafHash, uint256 index, bytes calldata merkleProof, uint256 depth) private pure returns(bytes20 value) {
        require(merkleProof.length==(depth-1)*HASH_WIDTH, "Proof incorrect size");
        if(merkleProof.length == 0) return leafHash;

        value = leafHash;

        assembly {
            let len := sub(merkleProof.length, HASH_WIDTH)
            let dataElementLocation := merkleProof.offset

            for
                { let end := add(dataElementLocation, len) }
                lt(dataElementLocation, end)
                { dataElementLocation := add(dataElementLocation, HASH_WIDTH) }
            {
                let proofPosition := mul(and(not(index), 0x1), 32)
                calldatacopy(proofPosition, dataElementLocation, HASH_WIDTH)

                let accumulatorPosition := sub(32, proofPosition)
                mstore(accumulatorPosition, value)

                value := and(keccak256(0x00, 64), 0xffffffffffffffffffffffffffffffffffffffff000000000000000000000000)
                index := shr(1, index)
            }

            let proofPosition := mul(and(not(index), 0x1), 32)
            calldatacopy(proofPosition, dataElementLocation, HASH_WIDTH)

            let accumulatorPosition := sub(32, proofPosition)
            mstore(accumulatorPosition, value)

            value := and(keccak256(0x00, 64), 0xffffffffffffffffffffffffffffffffffffffff000000000000000000000000)
        }
    }

}

