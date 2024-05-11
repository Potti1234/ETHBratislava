import {ContractFactory, Signer, providers, BigNumber} from "ethers";
import {cNFTCollection} from "./cNFTCollection";
import {cNFT} from "./abis/cNFT";
import {createMerkleTree, getMerkleRoot} from "./Utils";
import {ExternalProvider} from "@ethersproject/providers/src.ts/web3-provider";


export class cNFTClient {

    readonly signer: Signer;
    readonly indexerUrl: string;
    readonly factory: ContractFactory;

    constructor(metamaskOrSigner: Signer | ExternalProvider, indexerUrl: string) {
        if(metamaskOrSigner instanceof Signer) {
            this.signer = metamaskOrSigner;
        } else {
            this.signer = new providers.Web3Provider(metamaskOrSigner).getSigner();
        }
        this.indexerUrl = indexerUrl;
        this.factory = new ContractFactory(cNFT.abi, "0x"+cNFT.bytecode, this.signer);
    }

    /**
     * Mints new collection, mints recipients.length cNFTs
     */
    async mint(baseUrl: string, recipients: string[], uploadToIndexer: boolean = true): Promise<cNFTCollection> {
        const deployment = await this.factory.deploy({
            gasLimit: 3000000
        });

        return await this.mintToExisting(deployment.address, baseUrl, recipients, uploadToIndexer);
    }

    /**
     * Mints to existing contract
     */
    async mintToExisting(contractAddress: string, baseUrl: string, recipients: string[], uploadToIndexer: boolean = true): Promise<cNFTCollection> {
        //Construct merkle tree
        const amount = recipients.length;
        const depth = 1+Math.ceil(Math.log2(amount));
        const merkleRoot = getMerkleRoot(depth, recipients.map(address => Buffer.from(address.substring(2), "hex")));
        const merkleRootString = "0x"+merkleRoot.toString("hex");

        console.log("Merkle root string: ", merkleRootString);

        if(uploadToIndexer) {
            const resp = await fetch(this.indexerUrl+"/"+contractAddress+"/create", {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify(recipients)
            });

            if(!resp.ok) throw new Error("Cannot post off-chain data to indexer!");
        }

        console.log("Minting depth: ", depth);

        const contract = this.factory.attach(contractAddress);

        const transaction = await contract.mint(baseUrl, amount, merkleRootString, merkleRootString, depth, {
            gasLimit: 200000
        });

        const receipt = await transaction.wait();
        if (receipt.status === 0) throw new Error("Mint transaction failed");

        // const transaction = await contract.populateTransaction.mint(baseUrl, amount, merkleRootString, merkleRootString, depth);
        // transaction.chainId = await this.signer.getChainId();
        // transaction.gasLimit = BigNumber.from(200000);
        // transaction.gasPrice = await this.signer.getGasPrice();
        // transaction.nonce = await this.signer.getTransactionCount(await this.signer.getAddress());
        //
        // const submittedTx = await this.signer.sendTransaction(transaction);
        // const receipt = await submittedTx.wait();
        // if (receipt.status === 0) throw new Error("Mint transaction failed");

        return await this.load(contractAddress);
    }

    async load(contractAddress: string): Promise<cNFTCollection> {
        const collection = new cNFTCollection(this, contractAddress);
        await collection.init();
        return collection;
    }

}

