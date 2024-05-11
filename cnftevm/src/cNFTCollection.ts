import {BigNumber, Contract, UnsignedTransaction} from "ethers";
import {Interface} from "ethers/lib/utils";
import {IcNFT} from "./abis/IcNFT";
import {cNFTClient} from "./cNFTClient";
import {getMerkleRoot} from "./Utils";

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
        if(data.data.owner!=signerAddress) throw new Error("Token not owned by signer!");

        const transaction = await this.contract.transfer(tokenIndex, recipient, "0x"+data.proof.toString("hex"));

        const receipt = await transaction.wait();
        if (receipt.status === 0) throw new Error("Transfer transaction failed");

        // transaction.chainId = await this.client.signer.getChainId();
        // transaction.gasLimit = BigNumber.from(80000);
        // transaction.gasPrice = await this.client.signer.getGasPrice();
        // transaction.nonce = await this.client.signer.getTransactionCount(signerAddress);
        //
        // const submittedTx = await this.client.signer.sendTransaction(transaction);
        // const receipt = await submittedTx.wait();

        return receipt.transactionHash;
    }

}