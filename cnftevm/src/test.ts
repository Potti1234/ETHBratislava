import {cNFTClient} from "./cNFTClient";
import {providers, Wallet} from "ethers";
import {randomBytes} from "crypto";
import * as fs from "fs";

const privateKey = "05acf48110ffce4b15251b4c0e863c1082954330057561acf956e6ce89e1359d";

const provider = new providers.JsonRpcProvider("https://alien-virulent-research.ethereum-sepolia.quiknode.pro/c7e739b4e5bbdc523f0b5b7352ae73c42bec7adc/");
const signer = new Wallet(privateKey, provider);

async function main() {
    const walletAddress = await signer.getAddress();
    console.log("Signer address: ", walletAddress);

    const client = new cNFTClient(signer, "http://localhost:4000");

    const recipients: string[] = [];
    for(let i=0;i<10000;i++) {
        recipients.push("0x"+randomBytes(20).toString("hex"));
    }
    for(let i=0;i<100;i++) {
        recipients[i] = walletAddress;
    }

    console.log("Minting nft collection...");

    const nftCollection = await client.mint("http://localhost:3000/nfts/{INDEX}.jpg", recipients, false);

    console.log("NFT collection minted: ", nftCollection.contractAddress);
}

async function main2() {
    const walletAddress = await signer.getAddress();
    console.log("Signer address: ", walletAddress);

    const client = new cNFTClient(signer, "http://localhost:4000");

    const nftCollection = await client.load("0xf1c024f29af37871e4014f585e2486f140f5ef6e");

    console.log("NFT collection loaded: ", nftCollection.contractAddress);

    const tokenData = await nftCollection.getTokenData(10);
    console.log("Token data: ", tokenData);
}

async function main3() {
    const walletAddress = await signer.getAddress();
    console.log("Signer address: ", walletAddress);

    const client = new cNFTClient(signer, "http://localhost:4000");

    const dst = "0xdfe77057d88bbd5308056da6d6361c462b61a98e";

    const nftCollection = await client.load("0xf1c024f29af37871e4014f585e2486f140f5ef6e");

    console.log("Transfer started...");
    const txId = await nftCollection.transfer(0, dst);
    console.log("NFT transferred, txId: ", txId);
}

async function main4() {

}

main().catch(e => console.error(e));
