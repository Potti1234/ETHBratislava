import {cNFTClient} from "./cNFTClient";
import {providers, Wallet} from "ethers";
import {randomBytes} from "crypto";
import * as fs from "fs";

const privateKey = "05acf48110ffce4b15251b4c0e863c1082954330057561acf956e6ce89e1359d";

const provider = new providers.JsonRpcProvider("https://sepolia.infura.io/v3/dcc43582332146c8b223e180181247c7");
const signer = new Wallet(privateKey, provider);

async function main() {
    const walletAddress = await signer.getAddress();
    console.log("Signer address: ", walletAddress);

    const client = new cNFTClient(signer, "http://localhost:4000");

    const recipients: string[] = [];
    for(let i=0;i<10000;i++) {
        recipients.push("0x"+randomBytes(20).toString("hex"));
    }
    recipients[0] = walletAddress;

    console.log("Minting nft collection...");

    const nftCollection = await client.mintToExisting("0xf1c024f29af37871e4014f585e2486f140f5ef6e", "https://example.com/{INDEX}.jpg", recipients, false);

    console.log("NFT collection minted: ", nftCollection.contractAddress);

    fs.writeFileSync(nftCollection.contractAddress+".json", JSON.stringify(recipients));
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

main2().catch(e => console.error(e));
