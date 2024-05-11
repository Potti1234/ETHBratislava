"use client"

import Header from '@/components/header'
import React, {useState} from 'react';
import { AccountContext } from "./containerContext"
import { NFTClientContext } from "./containerContext"
import { cNFTClient } from 'cnftevm';

export default function Container({ children}) {
    const [account, setAccount] = useState("Not Logged In");
    const [nftClient, setNftClient] = useState(new cNFTClient(window.ethereum, "http://161.97.73.23:4000"))

    return (
        <div>
            <NFTClientContext.Provider value={nftClient}>
            <AccountContext.Provider value={account}>
            <Header setAddressCallback={() => setAccount}></Header>
            {children}
            </AccountContext.Provider>
            </NFTClientContext.Provider>
        </div>
    )
}
