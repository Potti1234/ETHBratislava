"use client"

import React, {useState, useContext} from 'react'
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NFTClientContext } from '@/components/containerContext';
import { randomBytes } from 'crypto';

export default function Page() {

  const [nftUrl, setNftURL] = useState("http://localhost:3000/nfts/{}.jpg")
  const [nftAmount, setNftAmount] = useState(10000)
  const [address, setAddress] = useState("0xdfe77057d88bbd5308056da6d6361c462b61a98e")
  const [nftAddressAmount, setNftAddressAmount] = useState(10)
  const nftClient = useContext(NFTClientContext);

  const mintNFT = () => {
    console.log(nftClient);

    const addressList = Array();
    for (let i = 0; i < nftAmount; i++) {
      addressList.push('0x'+randomBytes(20).toString('hex'));
    }

    addressList.fill(address, 0, nftAddressAmount);

    console.log("Minting NFTs: ", nftUrl, addressList);

    nftClient.mint(nftUrl, addressList).then((res) => {
      console.log("Minted NFTs: ", res);
      window.location.href = "http://localhost:3000/ShowNFTs/" + res.contractAddress;
    })
  }

  return (
    <div>
      <Input type="text" onChangeCapture={e => setNftURL(e.currentTarget.value)} placeholder="Enter NFT URL" defaultValue="http://localhost:3000/nfts/{}.jpg" />
      <Input type="number" onChangeCapture={e => setNftAmount(e.currentTarget.value)} placeholder="Enter Amount of NFTS" defaultValue="10000"/>
      <Input type="text" onChangeCapture={e => setAddress(e.currentTarget.value)} placeholder="Address to mint to" defaultValue="0xdfe77057d88bbd5308056da6d6361c462b61a98e"/>
      <Input type="number" onChangeCapture={e => setNftAddressAmount(e.currentTarget.value)} placeholder="Enter Amount of NFTS for address" defaultValue="10"/>
      <Button onClick={() => mintNFT()}>Mint NFT</Button>
    </div>
  )
}
