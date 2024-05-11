"use client"

import Header from '@/components/header'
import React, {useState} from 'react';
import { AccountContext } from "./containerContext"

export default function Container({ children}) {
    const [account, setAccount] = useState("Not Logged In");

    return (
        <div>
            <AccountContext.Provider value={account}>
            <Header setAddressCallback={() => setAccount}></Header>
            {children}
            </AccountContext.Provider>
        </div>
    )
}
