import * as express from "express";
import * as cors from "cors";
import * as fs from "fs/promises";
import {createMerkleTree, getMerkleProof} from "./Utils";
import {Contract, ContractFactory, providers} from "ethers";
import {IcNFT} from "./abis/IcNFT";
import {Interface} from "ethers/lib/utils";

const app = express();
app.use(cors());
app.use(express.json({limit: "50mb"}));

const rpcUrl = "https://sepolia.drpc.org";
const provider = new providers.JsonRpcProvider(rpcUrl);

type StoredData = {
    addresses: string[],
    depth: number,
    lastSyncBlockheight: number
};

async function syncToLatest(contractId: string, contractData: StoredData) {

    const contract = new Contract(contractId, IcNFT, provider);
    const iface = new Interface(IcNFT);

    const latestBlockheight = await provider.getBlockNumber();

    if(contractData.lastSyncBlockheight==null) {
        contractData.lastSyncBlockheight = latestBlockheight;
        await fs.writeFile(contractId+".json", JSON.stringify(contractData));
        return;
    }
    if(contractData.lastSyncBlockheight===latestBlockheight) {
        console.log("Blockheights match, not syncing!");
        return;
    }

    const filterBase: any = contract.filters.Transfer();
    filterBase.fromBlock = contractData.lastSyncBlockheight;
    filterBase.toBlock = latestBlockheight;

    const resp = await provider.getLogs(filterBase);

    console.log("["+contractId+"] Fetched logs: ", resp);

    resp.forEach(log => {
        const event = iface.parseLog(log);
        console.log("["+contractId+"] Process event: ", event);
        const nftIndex = event.args.nftIndex;
        const recipient = event.args.recipient;
        console.log("["+contractId+"] Process event new owner for NFT id: "+nftIndex+": ", recipient);
        contractData.addresses[nftIndex] = recipient;
    });

    contractData.lastSyncBlockheight = latestBlockheight;

    await fs.writeFile(contractId+".json", JSON.stringify(contractData));

}

function setupExpress() {
    app.post("/:contractId/create", async (req, res) => {
        const contractId = req.params.contractId;
        const data: StoredData = req.body as any;

        data.lastSyncBlockheight = await provider.getBlockNumber();

        await fs.writeFile(contractId+".json", JSON.stringify(data));

        res.send("Success");
    });

    app.get("/:contractId/allTokens", async (req, res) => {
        const contractId = req.params.contractId;
        let data: StoredData;
        try {
            data = JSON.parse((await fs.readFile(contractId+".json")).toString());
        } catch (e) {
            console.error(e);
            res.status(400).send("Contract data not found");
            return;
        }
        await syncToLatest(contractId, data);
        res.json(data.addresses);
    });

    app.get("/:contractId/token/:index", async (req, res) => {
        const contractId = req.params.contractId;
        const tokenIndex = parseInt(req.params.index);
        let data: StoredData;
        try {
            data = JSON.parse((await fs.readFile(contractId+".json")).toString());
        } catch (e) {
            console.error(e);
            res.status(400).send("Contract data not found");
            return;
        }
        await syncToLatest(contractId, data);

        const merkleTree = createMerkleTree(data.depth, data.addresses.map(address => Buffer.from(address.substring(2), "hex")));
        const merkleProof = getMerkleProof(merkleTree, tokenIndex);

        res.json({
            proof: Buffer.concat(merkleProof).toString("hex"),
            owner: data.addresses[tokenIndex]
        });
    });

    app.get("/:contractId/token", async (req, res) => {
        const indexesStr: string = req.query.indexes as any;
        const contractId = req.params.contractId;

        const indexesArr = indexesStr.split(",");
        const indexes = indexesArr.map(index => parseInt(index));

        let data: StoredData;
        try {
            data = JSON.parse((await fs.readFile(contractId+".json")).toString());
        } catch (e) {
            console.error(e);
            res.status(400).send("Contract data not found");
            return;
        }
        await syncToLatest(contractId, data);

        const merkleTree = createMerkleTree(data.depth, data.addresses.map(address => Buffer.from(address.substring(2), "hex")));
        const tokens: {
            owner: string,
            proof: string,
            index: number
        }[] = indexes.map(index => {
            return {
                index,
                owner: data.addresses[index],
                proof: Buffer.concat(getMerkleProof(merkleTree, index)).toString("hex")
            }
        });

        res.json(tokens);
    });

    app.listen(4000);
}

async function main() {
    setupExpress();
}

main().catch(e => console.error(e));