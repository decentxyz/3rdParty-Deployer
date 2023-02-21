import { useEffect, useState } from "react";
import { NextPage } from "next";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useForm, FormProvider } from "react-hook-form";
import { ErrorMessage } from '@hookform/error-message';
import { DecentSDK, edition, ipfs } from '@decent.xyz/sdk'; //Note: not using ipfs in demo
import { useSigner, useNetwork, useAccount } from 'wagmi';
import { ethers } from "ethers";
import InfoField from "../components/InfoField";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import MediaUpload from "../components/MediaUpload/MediaUpload";
import { NFTStorage, Blob } from 'nft.storage';
import { useRouter } from "next/router";
import Form from "../components/Form";
import Modal from 'react-modal'
import Script from "next/script";

const schema = yup.object().shape({
  collectionName: yup.string()
    .required('Name your collection.'),
  symbol: yup.string()
    .required('Give your collection a symbol.'),
  tokenPrice: yup.number()
    .typeError('Must set price for token. Please set to 0 if you wish for your NFTs to be free.'),
  saleStartDate: yup.number()
    .typeError('Must set.'),
  saleEndDate: yup.number()
    .typeError('Must set.'),
  editionSize: yup.number()
    .min(1, 'Edition size must be greater than 0')
    .typeError('Please enter the number of NFTs included in this collection.'),
  maxTokenPurchase: yup.lazy((value) => {
    return value === '' || value === 'Open Edition'
      ? yup.string()
      : yup.number()
        .typeError('Cap must be a valid number. Please set to 0 if you do not wish to set a cap.')
  }),
  royalty: yup.lazy((value) => {
    return value === ''
      ? yup.string()
      : yup.number()
        .typeError('Royalty must be a valid number. Please set to 0 if you do not wish to set a royalty.')
  }),
  revPathAddress: yup.string()
    .required('Set Revenue Path Address.'),
  nftImage: yup.mixed()
    .test('file', 'Upload your NFT art.', (value) => {
      return value?.length > 0;
    }),
});

type FormData = {
  collectionName: string;
  symbol: string;
  description: string;
  nftImage: any;
  audioFile: any;
  editionSize: number | string;
  tokenPrice: string;
  saleStartDate: string;
  saleEndDate: string;
  maxTokenPurchase: number;
  royalty: number;
  revPathAddress: string;
};

const Deploy: NextPage = () => {
  const { data: signer } = useSigner();
  const { chain } = useNetwork();
  const router = useRouter()
  const { isConnected } = useAccount()

  const methods = useForm<FormData>({
    resolver: yupResolver(schema),
  });
  const { register, getValues, handleSubmit, clearErrors, reset, setValue, formState: { errors, isValid }, watch } = methods;

  const [_collectionName, _symbol] = watch(['collectionName', 'symbol'])

  const onSubmit = handleSubmit(data => console.log("FORM_DATA:::", data));

  const [nftImage, setNftImage] = useState({ preview: '/images/icon.png', raw: { type: "" } });
  const [audioFile, setAudioFile] = useState({ preview: '/images/icon.png', raw: { type: "" } });
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState('');

  const [isHovering1, setIsHovering1] = useState(false);
  const [isHovering2, setIsHovering2] = useState(false);
  const [isHovering3, setIsHovering3] = useState(false);

  const [revPathAddress, setRevPathAddress] = useState("")

  const [isDeploying, setIsDeploying] = useState(false)

  const resetForm = () => {
    clearErrors();
  }

  const success = (nft: any) => {
    console.log("NFT_RESULT:::", nft)
    setShowLink(true);
    setLink(nft.address);
  }

  const deployFunction = async () => {
    setIsDeploying(true)

    try {
      if (!signer) {
        console.error("Please connect wallet.")

        setIsDeploying(false)
      } else if (chain) {
        // send metadata file to ipfs
        const client = new NFTStorage({
          token: process.env.NEXT_PUBLIC_NFT_STORAGE_TOKEN || ''
        });

        const promise = (fileo: any) => new Promise((resolve) => {
          const fr = new FileReader()

          fr.onload = async function () {
            const b = new Blob([fr.result as ArrayBuffer])

            const ipfsImg = await client.storeBlob(b)

            resolve(ipfsImg)
          }

          fr.readAsArrayBuffer(fileo as any)
        })

        const ipfsImg = await promise(nftImage.raw)
        const ipfsAudio = (audioFile as any)?.raw?.size && (audioFile as any)?.raw?.size > 0 ? await promise(audioFile.raw) : ipfsImg

        // create metadata
        const metadata = {
          description: getValues("description"),
          image: `ipfs://${ipfsImg}?`,
          name: getValues("collectionName"),
          animation_url: `ipfs://${ipfsAudio}?`
        }

        // build metadata json file
        const data = JSON.stringify(metadata, null, 1);
        const bytes = new TextEncoder().encode(data);
        const blob = new Blob([bytes], {
          type: "application/json;charset=utf-8",
        });

        const ipfs = await client.storeBlob(blob);

        const sdk = new DecentSDK(chain.id, signer);
        let nft;

        try {
          console.log(
            "PAYLOAD:::", 
            sdk,
            getValues("collectionName"), // name
            getValues("symbol"), // symbol
            false, // hasAdjustableCap
            false, // isSoulbound
            ethers.constants.MaxUint256.sub(ethers.BigNumber.from(1)), // maxTokens
            ethers.utils.parseEther("0.005"), // tokenPrice
            10, // maxTokensPurchase
            null, //presaleMerkleRoot
            0, // presaleStart
            0, // presaleEnd
            Math.floor((new Date(2023, 2, 6)).getTime() / 1000), // saleStart
            Math.floor((new Date(2023, 2, 13)).getTime() / 1000), // saleEnd = 1 year
            getValues("royalty") * 100, // royaltyBPS
            getValues("revPathAddress"), // payoutAddress (if not owner)
            `ipfs://${ipfs}?`, // contractURI
            `ipfs://${ipfs}?`, // metadataURI
            null, // metadataRendererInit
            null, // tokenGateConfig
            (pending: any) => { console.log("Pending nonce: ", pending.nonce) },
            (receipt: any) => { console.log("Receipt block: ", receipt.blockNumber) },
        )

          nft = await edition.deploy(
            sdk,
            getValues("collectionName"), // name
            getValues("symbol"), // symbol
            false, // hasAdjustableCap
            false, // isSoulbound
            ethers.constants.MaxUint256.sub(ethers.BigNumber.from(1)), // maxTokens
            ethers.utils.parseEther("0.005"), // tokenPrice
            10, // maxTokensPurchase
            null, //presaleMerkleRoot
            0, // presaleStart
            0, // presaleEnd
            Math.floor((new Date(2023, 2, 6)).getTime() / 1000), // saleStart
            Math.floor((new Date(2023, 2, 13)).getTime() / 1000), // saleEnd = 1 year
            getValues("royalty") * 100, // royaltyBPS
            getValues("revPathAddress"), // payoutAddress (if not owner)
            `ipfs://${ipfs}?`, // contractURI
            `ipfs://${ipfs}?`, // metadataURI
            null, // metadataRendererInit
            null, // tokenGateConfig
            (pending: any) => { console.log("Pending nonce: ", pending.nonce) },
            (receipt: any) => { console.log("Receipt block: ", receipt.blockNumber) },
          )
        } catch (error) {
          console.error(error);

          setIsDeploying(false)
        } finally {
          if (nft?.address) {
            success(nft)

            // reset()
          }

          setIsDeploying(false)
        }
      } return
    } catch (error: any) {
      if (error.code === "INSUFFICIENT FUNDS") {
        console.error("get more $$, fren");
      }

      setIsDeploying(false)
    }
  }

  useEffect(() => {
    if (revPathAddress) {
      setValue("revPathAddress", revPathAddress)
    }
  }, [revPathAddress, setValue])

  useEffect(() => {
    if (typeof window !== "undefined") (window as any).meta = (address: string) => {
      setValue("revPathAddress", address)

      setRevPathAddress(address)
    }
  } , [setValue, setRevPathAddress])

  useEffect(() => {
    if (showLink) location.replace(`/collection/${link}`)
  }, [showLink, link])

  return (
    <>
    <div id="containah" className="flex flex-col gap-8 items-center justify-center background min-h-screen text-white py-12 px-16">
      <div className="flex flex-col items-center justify-between gap-8">
        <h1>Reveel Creator Grant</h1>
        <p className="font-header text-xl">Submit Your Project</p>
      </div>
      <div className="flex flex-wrap space-x-10 justify-center">
        <div className="space-y-8 pb-8 text-center">
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </div>
      </div>

      <FormProvider {...methods}>
        <div className='gap-4 lg:mx-24 sm:mx-16'>
          <div className="flex gap-20">
            <div className="flex flex-col">
              <div className="w-[500px] flex flex-col gap-3">
                <p className="font-header">Project Name</p>
                <input className="border border-black text-black h-8 px-4" {...register("collectionName", {required: "Name your collection"} )} />
                <p className="text-red-600 text-sm"><ErrorMessage errors={errors} name="collectionName" /></p>
              </div>

              <div className="w-[500px] flex flex-col gap-3">
                <p className="font-header">Symbol</p>
                <input className="border border-black text-black h-8 px-4" {...register("symbol", {required: "Give your collection a symbol"} )} />
                <p className="text-red-600 text-sm"><ErrorMessage errors={errors} name="symbol" /></p>
              </div>

              <div className="w-[500px] flex flex-col gap-3">
                <p className="font-header">Description</p>
                <textarea className="border border-black text-black h-24" {...register("description", {required: "Please enter a description."} )} />
                <p className="text-red-600 text-sm"><ErrorMessage errors={errors} name="description" /></p>
              </div>

              <MediaUpload nftImage={nftImage} setNftImage={setNftImage} audioFile={audioFile} setAudioFile={setAudioFile} />

              {/* <div className="flex justify-center my-20">
                <div className="flex flex-col max-w-[300px] gap-2 p-6 border border-white rounded-md">
                  {nftImage && <img src={nftImage.preview} className="rounded-md" />}
                  <p className="text-white font-semibold text-2xl mt-4">{_collectionName}</p>
                  <div className="flex justify-between">
                    <p className="text-white font-semibold text-base">{_symbol}</p>
                    <p className="text-white font-semibold text-base">Price: 0.005 ETH</p>
                  </div>
                </div>
              </div> */}
            </div>

            <div className="flex flex-col gap-8">
              <div className="w-[500px] flex flex-col gap-3">
                <p className="flex justify-between font-header">Reveel payout address {revPathAddress && <a rel='noreferrer' target='_blank' className="flex gap-2" href={`https://app-v2-r3vl.vercel.app/revenue-paths-v2/${revPathAddress}--${_collectionName}`}>
                  View in Reveel

                  <img style={{ width: '16px', height: '16px' }} src="/images/external-link.png" alt="external" />
                </a>}</p>
                {<input placeholder="0x000" disabled className="border border-black text-black h-8 px-4" defaultValue={revPathAddress} {...register("revPathAddress", {required: "Must set."} )} />}
                {isConnected && <Form revPathName={getValues("collectionName")} setRevPathAddress={setRevPathAddress} revPathAddress={revPathAddress} />}
                {<p className="text-red-600 text-sm"><ErrorMessage errors={errors} name="revPathAddress" /></p>}
              </div>

              {/* Decent contracts support EIP 2981 */}
              <div className="w-[500px] flex flex-col gap-3">
                <div className="pb-2 flex gap-1">
                  <p>Creator Royalty (Optional)</p>
                  <InfoField isHovering={isHovering3} setIsHovering={setIsHovering3} xDirection={'left'} yDirection={'bottom'} infoText={"Please enter a percentage that you would like to receive from the value of every sale.  We use EIP 2981 (NFT Royalty Standard)."} />
                </div>
                <div className="flex items-center text-black relative">
                  <input
                    className="border border-black h-8 w-full" {...register("royalty")} />
                  <p className="text-sm absolute right-3">%</p>
                </div>
              </div>

              <div className="w-[500px] flex flex-col gap-3">
                <p className="font-header">Minting Price</p>
                <input disabled className="border border-black text-black h-8 px-4" defaultValue={"0.005"} {...register("tokenPrice" )} />
                <p className="text-red-600 text-sm"><ErrorMessage errors={errors} name="tokenPrice" /></p>
              </div>

              <div className="w-[500px] flex flex-col gap-3">
                <div className="pb-2 flex gap-1 items-center">
                  <p className="font-header">Purchase Count (Optional)</p>
                  <InfoField isHovering={isHovering2} setIsHovering={setIsHovering2} xDirection={'right'} yDirection={'bottom'} infoText={"Enter the number of NFTs each user can mint at one time.."} />
                </div>
                <input disabled className="border border-black text-black h-8 px-4" defaultValue={"10"} {...register("maxTokenPurchase")} />
              </div>

              <div className="w-[500px] flex flex-col gap-3">
                <div className="pb-2 flex gap-1 items-center">
                  <p className="font-header">Edition Size</p>
                  <InfoField isHovering={isHovering1} setIsHovering={setIsHovering1} xDirection={'right'} yDirection={'bottom'} infoText={"Number of NFTs available in the collection."} />
                </div>
                <input disabled className="border border-black text-black h-8 px-4" defaultValue="Open Edition" {...register("editionSize")} />
                <p className="text-red-600 text-sm"><ErrorMessage errors={errors} name="editionSize" /></p>
              </div>

              <div className="w-[500px] flex flex-col gap-3">
                <p className="font-header">Sale Start Date</p>
                <input className="border border-black text-black h-8 px-4" defaultValue={"3/06"} disabled {...register("saleStartDate" )} />
                <p className="text-red-600 text-sm"><ErrorMessage errors={errors} name="saleStartDate" /></p>
              </div>

              <div className="w-[500px] flex flex-col gap-3">
                <p className="font-header">Sale End Date</p>
                <input className="border border-black text-black h-8 px-4" defaultValue={"3/13"} disabled {...register("saleEndDate" )} />
                <p className="text-red-600 text-sm"><ErrorMessage errors={errors} name="saleEndDate" /></p>
              </div>    
            </div>
          </div>

          <div className="flex flex-col justify-center items-center flex-wrap items-center gap-4">

            {/* <div className="flex justify-end">
              <button onClick={() => resetForm()}>
                <input type="reset" className="cursor-pointer" value="Reset" />
              </button>
            </div> */}

      

            <button className="pt-8 flex gap-4 items-center" type="button" onClick={() => {
              onSubmit()

              deployFunction()
            }}>
              <input disabled={isDeploying} type="submit" className="cursor-pointer bg-white text-black px-4 py-1 rounded-full" value={isDeploying ? "pending..." : "Deploy Project"} />
            </button>
            <p className="italic text-xs pt-4">{showLink ? `Edition created! Paste this into the blockscanner of your chain of choice to verify ${link}` : 'be patient, wallet confirmation can take a sec'}</p>
          </div>

        </div>
      </FormProvider>
    </div>
  </>
  )
}

export default Deploy
