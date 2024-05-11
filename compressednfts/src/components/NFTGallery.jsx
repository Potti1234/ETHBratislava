"use client"

import NFTCard from "@/components/NFTCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, {useContext} from 'react';
import { AccountContext } from "./containerContext"

export default function NFTGallery() { 
    return (
        <div>
            <ScrollArea className="h-screen w-full rounded-md border">
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                    {Array.from({ length: 100 }, (_, index) => (
                        <div style={{ width: "16.666%" }}>
                            <NFTCard
                                key={index}
                                title={index.toString()}
                                url={`http://localhost:3000/nfts/${index}.jpg`}
                                address={"0x1234567890"}
                                yourAddress={useContext(AccountContext)}
                            />
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}