import { DecentSDK, edition } from "@decent.xyz/sdk";
import { ethers } from "ethers";
import { useRouter } from "next/router";
import Script from "next/script"
import { useEffect, useState } from "react";
import { useNetwork, useProvider, useSigner } from "wagmi";

const Collection = () => {
    const provider = useProvider();
    const { chain } = useNetwork();
    const router = useRouter()
    const [payoutAddress, setPayoutAddress] = useState("")
    const [collectionName, setCollectionName] = useState("")
    const collectionAddress = router.asPath.replace("/collection/", "")

    useEffect(() => {
      const callCollection = async () => {
        const sdk = new DecentSDK(chain?.id as number, provider as any)

        const collection = await edition.getContract(sdk, collectionAddress)

        setCollectionName(await collection.name())
        setPayoutAddress(await collection.payoutAddress())
      }

      if (ethers.utils.isAddress(collectionAddress)) callCollection()
    }, [chain, provider, router, collectionAddress])

    return <>
    <Script src="https://platform.twitter.com/widgets.js" />
    <div className="flex flex-col gap-8 items-center justify-center background min-h-screen text-white py-12 px-16">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex flex-col items-center justify-between gap-8 max-w-[900px]">
          <h1>Thank you for submitting your project to the Reveel Creator Grant</h1>
        </div>
        <div className="flex flex-col gap-2 my-8">
          <a target='_blank' rel='noreferrer' className="rounded-md bg-white text-black px-4" href={`https://hq.decent.xyz/admin/${chain?.id}/Editions/${collectionAddress}`}>View your NFT Project on Decent</a>
          <a target='_blank' rel='noreferrer' className="rounded-md bg-white text-black px-4" href={`https://app-v2-r3vl.vercel.app/revenue-paths-v2/${payoutAddress}--${collectionName}`}>View your Revenue Path on Reveel</a>
        </div>
        <div className="mt-22 mb-22">
          Your submission will go live for minting on March 6th with all the other submissions. You will be notified by email as the voting page goes live.
        </div>
        <div>
          <a target='_blank' rel='noreferrer' href="https://twitter.com/share?ref_src=twsrc%5Etfw" className="twitter-share-button" data-size="large" data-text="I just submitted my NFT to the @r3vl_xyz Creator Grant competition! 🚀 All creators can participate for a chance to win up to $5000 USDC in Grant money 👀 " data-url="https://grant.r3vl.xyz/" data-show-count="false">Tweet</a>
        </div>
      </div>
    </div>
    </>
  }

export default Collection