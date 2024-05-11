import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import React, { useState } from 'react';
import { toast } from "sonner";

export default function NFTCard({ title, url, address, yourAddress}) {

    const [transferAddress, setTransferAddress] = useState("");

    const transfer = () => {
        console.log("Transfering to: ", transferAddress);
        toast("NFT has been transfered to " + transferAddress, {
            description: "Gas cost: 0.0001 ETH",
            type: "success",
            duration: 5000,
          })
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <img src={url} alt={title}  />
            </CardContent>
            <CardContent>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Input disabled type="address" id="address" placeholder={address} />
                </div>
            </CardContent>

            {address === address && 
            <CardContent>
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Input onChangeCapture={e => setTransferAddress(e.currentTarget.value)} type="addressTo" id="addressTo" placeholder={"Transfer to"} value={transferAddress} />
                    <Button onClick={() => transfer()}>Transfer</Button>
                </div>
                
            </CardContent>}

        </Card>
    )
}
