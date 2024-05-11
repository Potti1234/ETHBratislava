import NFTGallery from "@/components/NFTGallery"

export default function Page({ params }) {
    return <div><NFTGallery contractAddress={params.contract}></NFTGallery></div>
  }