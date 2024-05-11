"use client"

import React, {useState, useContext} from 'react'
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NFTClientContext } from '@/components/containerContext';

export default function Page() {

  const [indexUrl, setIndexUrl] = useState("http://localhost:3000/nfts/{}.jpg")
  const [nftUrl, setNftURL] = useState("http://localhost:3000/nfts/{}.jpg")
  const [nftAmount, setNftAmount] = useState(10000)
  const [address, setAddress] = useState("")
  const [contractAddress, setContractAddress] = useState("")
  const nftClient = useContext(NFTClientContext);

  const mintNFT = () => {
    console.log(nftClient);
    const addressList = Array(nftAmount).fill(address);
    console.log("Minting NFTs: ", nftUrl, addressList);

    nftClient.mint(nftUrl, addressList).then((res) => {
      console.log("Minted NFTs: ", res);
    })
  }

  const loadContract = () => { 
    nftClient.load(contractAddress).then((res) => {
      console.log("Loaded Contract: ", res);
    })
  }

  return (
    <div>
      <Input type="text" onChangeCapture={e => setIndexUrl(e.currentTarget.value)} placeholder="Enter Index URL" value="http://localhost:3000/nfts/{}.jpg" />
      {nftClient === null ? (
        <Button onClick={() => createNFTClient()}>Create NFT Client</Button>
      ) : (
        <Label>Client Created</Label>
      )}
      <Input type="text" onChangeCapture={e => setNftURL(e.currentTarget.value)} placeholder="Enter NFT URL" value="http://localhost:3000/nfts/{}.jpg" />
      <Input type="number" onChangeCapture={e => setNftAmount(e.currentTarget.value)} placeholder="Enter Amount of NFTS" value="10000" />
      <Input type="text" onChangeCapture={e => setAddress(e.currentTarget.value)} placeholder="Address to mint to"/>
      <Button onClick={() => mintNFT()}>Mint NFT</Button>
      <Input type="text" onChangeCapture={e => setContractAddress(e.currentTarget.value)} placeholder="Address of deployed contract"/>
      <Button onClick={() => loadContract()}>Load Contract</Button>
    </div>
  )
}
