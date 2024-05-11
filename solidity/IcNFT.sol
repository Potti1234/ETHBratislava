
struct cNFTData {
    uint16 amount;
    uint8 concurrentIndex;
    uint8 depth;
    bool minted;
}

interface IcNFT {

    event Transfer(uint16 indexed nftIndex, address sender, address recipient);
    event Mint(uint16 amount, bytes20 dataRoot, bytes20 ownersRoot, string rootUrl);

    function getLatestOwnerMerkleRoot() external view returns (bytes20);

    function getContractData() external view returns (cNFTData memory);

    function getRootDataUrl() external view returns (string memory);

    function verifyData(uint16 nftIndex, bytes memory data, bytes calldata proof) external view returns (bool);

    function verifyDataHash(uint16 nftIndex, bytes20 dataHash, bytes calldata proof) external view returns (bool);

    function has(uint16 nftIndex, address owner, bytes calldata proof) external view returns (bool);

    function transfer(uint16 nftIndex, address recipient, bytes calldata proof) external;

    function transferBatch(uint16[] calldata nftIndex, address[] calldata recipient, bytes calldata proof) external;

    function mint(string calldata rootDataUrl, uint16 amount, bytes20 dataRoot, bytes20 ownersRoot, uint256 depth) external;

    function mintTransparent(string calldata rootDataUrl, uint16 amount, bytes20 dataRoot, bytes calldata owners, uint256 depth) external;

    function mintTransparentOptimistic(string calldata rootDataUrl, bytes20 dataRoot, bytes20 ownersRoot, bytes calldata owners, uint256 depth) external;

}

