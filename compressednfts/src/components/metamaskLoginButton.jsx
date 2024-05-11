"use client";

import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from 'react';
import { Badge } from "./ui/badge";

export default function MetamaskLoginButton({setAddressCallback}) {
    const [isMetamaskConnected, setIsMetamaskConnected] = useState(false);
    const [accounts, setAccounts] = useState([]);

    async function connectToMetamask() {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts.length === 0 || accounts === null) {
                    setIsMetamaskConnected(false);
                } else {
                    setAccounts(accounts);
                    console.log(accounts[0]);
                    setAddressCallback(accounts[0]);
                    setIsMetamaskConnected(true);
                }
            } catch (error) {
                console.error(error);
            }
        } else {
            console.error('Metamask not detected');
        }
    }

    const connectWithMetamask = async () => {
        if (!isMetamaskConnected) return connectToMetamask();

        const selectedAddress = window.ethereum.selectedAddress;

        if (selectedAddress === null) {
            setIsMetamaskConnected(false);
            connectToMetamask();
        }
    };

    return (
        <div>
            {isMetamaskConnected ? (
                <Badge>{accounts[0]}</Badge>
            ) : (
                <Button onClick={() => connectWithMetamask()}>Metamask Login</Button>
            )}
        </div>
    );
}