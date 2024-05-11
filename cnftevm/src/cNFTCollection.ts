import {BigNumber, Contract, UnsignedTransaction} from "ethers";
import {Interface} from "ethers/lib/utils";
import {IcNFT} from "./abis/IcNFT";
import {cNFTClient} from "./cNFTClient";
import {createMerkleTree, getMerkleProof, getMerkleRoot} from "./Utils";

export type cNFTData = {
    owner: string,
    index: number,
    url: string
};

export type cNFTContractData = {
    amount: number,
    concurrentIndex: number,
    depth: number,
    minted: boolean
};

export class cNFTCollection {

    readonly contractAddress: string;
    readonly contract: Contract;
    readonly contractInterface: Interface;
    readonly client: cNFTClient;

    contractData: cNFTContractData;
    baseUrl: string;

    constructor(client: cNFTClient, contractAddress: string) {
        this.client = client;
        this.contract = new Contract(contractAddress, IcNFT, client.signer);
        this.contractInterface = new Interface(IcNFT);
        this.contractAddress = contractAddress;
    }

    async init(): Promise<void> {
        this.baseUrl = await this.contract.getRootDataUrl();
        this.contractData = await this.contract.getContractData();
    }

    private getNftUrl(index: number): string {
        return this.baseUrl.replace(new RegExp("\{INDEX\}", 'g'), index.toString(10));
    }

    verifyTokenOwnership(owner: string, tokenIndex: number, proof: Buffer): Promise<boolean> {
        return this.contract.has(tokenIndex, owner, "0x"+proof.toString("hex"));
    }

    /**
     * Call indexer to fetch owned tokens
     *
     * @param tokenIndex
     */
    async getTokenData(tokenIndex: number): Promise<{
        data: cNFTData,
        proof: Buffer
    }> {
        const resp = await fetch(this.client.indexerUrl+"/"+this.contractAddress+"/token/"+tokenIndex);

        if(!resp.ok) throw new Error("Indexer error: "+await resp.text());

        const obj: {
            proof: string,
            owner: string
        } = await resp.json();

        const proofBuffer = Buffer.from(obj.proof, 'hex');

        if(!await this.verifyTokenOwnership(obj.owner, tokenIndex, proofBuffer)) throw new Error("Token ownership verification error!");

        return {
            proof: proofBuffer,
            data: {
                owner: obj.owner,
                index: tokenIndex,
                url: this.getNftUrl(tokenIndex)
            }
        }
    }

    /**
     * Call indexer to fetch owned tokens
     *
     * @param tokenIndex
     * @parma verify
     */
    async getTokensData(tokenIndex: number[], verify?: boolean): Promise<{
        data: cNFTData,
        proof: Buffer
    }[]> {
        const resp = await fetch(this.client.indexerUrl+"/"+this.contractAddress+"/tokens?indexes="+encodeURIComponent(tokenIndex.join(",")));

        if(!resp.ok) throw new Error("Indexer error: "+await resp.text());

        const obj: {
            index: number,
            proof: string,
            owner: string
        }[] = await resp.json();

        //TODO: This doesn't check the correctness of the returned token data (correct indices returned)
        for(let tokenData of obj) {
            if(!await this.verifyTokenOwnership(tokenData.owner, tokenData.index, Buffer.from(tokenData.proof, "hex"))) throw new Error("Token ownership verification error!");
        }

        return obj.map(tokenData => {
            return {
                proof: Buffer.from(tokenData.proof, "hex"),
                data: {
                    owner: tokenData.owner,
                    index: tokenData.index,
                    url: this.getNftUrl(tokenData.index)
                }
            }
        });
    }

    /**
     * Call indexer to fetch owned tokens
     *
     * @param address
     * @param verify
     */
    async getOwnedTokens(address: string, verify?: boolean): Promise<{
        data: cNFTData,
        proof: Buffer
    }[]> {
        const resp = await fetch(this.client.indexerUrl+"/"+this.contractAddress+"/tokens?owner="+address);

        if(!resp.ok) throw new Error("Indexer error: "+await resp.text());

        const obj: {
            index: number,
            proof: string,
            owner: string
        }[] = await resp.json();

        if(verify) {
            for(let tokenResponse of obj) {
                if(!await this.verifyTokenOwnership(address, tokenResponse.index, Buffer.from(tokenResponse.proof, "hex"))) throw new Error("Token ownership verification error!");
            }
        }

        return obj.map(tokenResponse => {
            return {
                proof: Buffer.from(tokenResponse.proof, "hex"),
                data: {
                    owner: address,
                    index: tokenResponse.index,
                    url: this.getNftUrl(tokenResponse.index)
                }
            };
        });
    }

    /**
     * Call indexer to get all tokens in a collection
     */
    async getAllTokens(verify?: boolean): Promise<cNFTData[]> {
        const resp = await fetch(this.client.indexerUrl+"/"+this.contractAddress+"/allTokens");

        if(!resp.ok) throw new Error("Indexer error: "+await resp.text());

        //Returns address owners of all the tokens
        const obj: string[] = await resp.json();

        if(verify) {
            const merkleRoot = getMerkleRoot(this.contractData.depth, obj.map(e => Buffer.from(e.substring(2), "hex")));

            const latestOnChainMerkleRoot: string = await this.contract.getLatestOwnerMerkleRoot();
            const latestOnChainMerkleRootBuffer: Buffer = Buffer.from(latestOnChainMerkleRoot.substring(2), "hex");

            if(!merkleRoot.equals(latestOnChainMerkleRootBuffer)) {
                console.log("Expect merkle root: ", merkleRoot.toString("hex"));
                console.log("On-chain merkle root: ", latestOnChainMerkleRootBuffer.toString("hex"));
                throw new Error("Incorrect recalculated merkle root!");
            }
        }

        return obj.map((address, index) => {
            return {
                index,
                owner: address,
                url: this.getNftUrl(index)
            }
        });
    }

    async transfer(tokenIndex: number, recipient: string): Promise<string> {
        const data = await this.getTokenData(tokenIndex);

        const signerAddress = await this.client.signer.getAddress();
        if(data.data.owner.toLowerCase()!=signerAddress.toLowerCase()) throw new Error("Token not owned by signer!");

        const transaction = await this.contract.transfer(tokenIndex, recipient, "0x"+data.proof.toString("hex"), {
            gasLimit: 100000
        });

        const receipt = await transaction.wait();
        if (receipt.status === 0) throw new Error("Transfer transaction failed");

        return receipt.transactionHash;
    }

    async transferBatch(dst: {
        index: number,
        recipient: string
    }[]) {
        if(dst.length>6) throw new Error("Max num of transfers is 6!");

        const allTokens = await this.getAllTokens(true);

        const signerAddress = await this.client.signer.getAddress();

        const indexes: number[] = [];
        const addresses: string[] = [];
        const proofs: Buffer[] = [];
        for(let destination of dst) {
            if(allTokens[destination.index].owner.toLowerCase()!==signerAddress.toLowerCase()) throw new Error("Token not owned by signer!");
            const merkleTree = createMerkleTree(this.contractData.depth, allTokens.map(token => Buffer.from(token.owner.substring(2), "hex")));
            indexes.push(destination.index);
            addresses.push(destination.recipient);
            proofs.push(Buffer.concat(getMerkleProof(merkleTree, destination.index)));
            allTokens[destination.index].owner = destination.recipient;
        }

        const transaction = await this.contract.transferBatch(indexes, addresses, "0x"+Buffer.concat(proofs).toString("hex"), {
            gasLimit: 200000
        });

        const receipt = await transaction.wait();
        if (receipt.status === 0) throw new Error("Transfer transaction failed");

        return receipt.transactionHash;
    }

}