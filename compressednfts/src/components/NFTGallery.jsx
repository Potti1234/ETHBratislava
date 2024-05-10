import NFTCard from "@/components/NFTCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from 'react';

export default function NFTGallery() {
    var img1Array = [];
      
    
    return (
        <div>
        <ScrollArea className="h-screen w-full rounded-md border">
            <div style={{ display: "flex", flexWrap: "wrap" }}>
                {img1Array.map((url, index) => (
                    <NFTCard key={index} title={index.toString()} url={url} />
                ))}
            </div>
        </ScrollArea>
        </div>
    );
}