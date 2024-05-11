import {utils} from "ethers";


export function createMerkleTree(depth: number, leafs: Buffer[]): Buffer[][] {

    const tree: Buffer[][] = Array(depth);
    tree[0] = leafs;
    const leafInitialLength = leafs.length;
    for(let i=0;i<Math.pow(2,depth-1)-leafInitialLength;i++) {
        leafs.push(Buffer.alloc(20, 0));
    }

    //Initialize arrays
    for(let i= 1; i<depth; i++) {
        tree[i] = Array(tree[i-1].length/2);
    }

    //Hash leafs
    for(let layer=0;layer<depth-1;layer++) {
        for(let leaf = 0;leaf<tree[layer].length;leaf+=2) {
            //Concat the siblings
            const concatenatedBuffer = Buffer.concat([
                tree[layer][leaf],
                Buffer.alloc(12, 0),
                tree[layer][leaf+1],
                Buffer.alloc(12, 0)
            ]);
            // console.log("Keccak input: ", concatenatedBuffer.toString("hex"));
            //Apply hash function & save to the layer above
            tree[layer+1][leaf/2] = Buffer.from(utils.solidityKeccak256(
                ["bytes"],
                [
                    "0x"+concatenatedBuffer.toString("hex")
                ]
            ).substring(2), 'hex').slice(0, 20);
        }
    }

    return tree;

}

export function getMerkleProof(merkleTree: Buffer[][], proofIndex: number): Buffer[] {

    const proof: Buffer[] = Array(merkleTree.length-1);

    for(let layerIndex = 0; layerIndex<merkleTree.length-1; layerIndex++) {
        const position = proofIndex & 0b1; //0 - left, 1 - right
        const layer = merkleTree[layerIndex];

        proof[layerIndex] = position===0 ? layer[proofIndex+1] : layer[proofIndex-1];

        proofIndex = proofIndex >> 1;
    }

    return proof;

}

export function getMerkleRoot(depth: number, leafs: Buffer[]): Buffer {
    const merkleTree = createMerkleTree(depth, leafs);
    return merkleTree[merkleTree.length-1][0];
}
