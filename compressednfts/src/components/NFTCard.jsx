import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "./ui/button"
import { Label } from "./ui/label"
import { Input } from "./ui/input"
import React, { useState, useContext } from 'react';
import { toast } from "sonner";

export default function NFTCard({ title, url, address, yourAddress, contract}) {

    const [transferAddress, setTransferAddress] = useState("");

    const transfer = () => {
            contract.transfer(title,transferAddress).then(() => {
                toast("NFT has been transfered to " + transferAddress, {
                    type: "success",
                    duration: 5000,
                  })
            })
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <img loading="lazy" src={url} alt={title}  />
            </CardContent>
            <CardContent>
                <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Input disabled type="address" id="address" placeholder={address} />
                </div>
            </CardContent>

            {address === yourAddress && 
            <CardContent>
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Input onChangeCapture={e => setTransferAddress(e.currentTarget.value)} type="addressTo" id="addressTo" placeholder={"Transfer to"} value={transferAddress} />
                    <Button onClick={() => transfer()}>Transfer</Button>
                </div>
                
            </CardContent>}

        </Card>
    )
}
