"use client"

import NFTCard from "@/components/NFTCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, {useContext, useEffect, useState} from 'react';
import { AccountContext } from "./containerContext"
import { NFTClientContext } from '@/components/containerContext';

export default function NFTGallery({contractAddress}) { 

    const nftClient = useContext(NFTClientContext);
    const [data, setData] = useState([]);
    const [contract, setContract] = useState();

    useEffect(() => {
        nftClient.load(contractAddress).then((con) => {
            setContract(con);
                con.getAllTokens(false).then((res) => {
                        setData(res);
                        console.log(res);
                })
            })
        }, [])

    return (
        <div>
            <ScrollArea className="h-screen w-full rounded-md border">
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {data.map((item, index) => (
                        <div style={{ width: "16.666%" }}>
                            <NFTCard
                                key={index}
                                title={index.toString()}
                                url={`http://localhost:3000/nfts/${index}.jpg`}
                                address={item.owner.toLowerCase()}
                                yourAddress={useContext(AccountContext)}
                                contract={contract}
                            />
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}