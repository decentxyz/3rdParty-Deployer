import { useEffect, useMemo, useRef, useState } from 'react'

import { useAccount, useEnsName, useNetwork, useProvider, useSigner } from 'wagmi'
import { useR3vlClient, useCreateRevenuePath, R3vlProvider, createClient, useBalances, useRevenuePathTiers, useUpdateRevenuePath, useWithdraw } from '@r3vl/sdk'
import { useRouter } from 'next/router'
import { ethers } from 'ethers'

// const revPathAddress = "0x3920620177D55DA7849237bb932E5112005d4A04"

const Form = ({ revPathAddress, setRevPathAddress }: any) => {
  const [localAddress, setLocalAddress] = useState("")
  const { chain } = useNetwork()
  const { address } = useAccount()
  const provider = useProvider()
  const { data: signer } = useSigner()
  const { data: ens } = useEnsName({ address })
  const [pathName, setPathName] = useState("")
  const [collabs, setCollabs] = useState<{ address?: string; share: number }[]>(revPathAddress ? [] : [{ address, share: 100 }])
  const [error, setError] = useState("")
  const ensRef = useRef({})
  const collabsMemo = useMemo(() => {
    return collabs
  }, [collabs.reduce((prev, curr) => {
    return prev + curr.share
  }, collabs.length), collabs])

  useR3vlClient({
    chainId: chain?.id as any,
    provider,
    signer: signer as any
  })

  useR3vlClient({
    chainId: chain?.id as any,
    provider,
    signer: signer as any,
    revPathAddress
  })
    
  const { mutate, data: tx, isFetched: createRevPathIsFetched } = useCreateRevenuePath()
  const { data } = useBalances(revPathAddress)
  const { data: tiers, isFetched: tiersFetched } = useRevenuePathTiers(revPathAddress, { enabled: !!revPathAddress })
  const update = useUpdateRevenuePath(revPathAddress)
  const mutation = useWithdraw(revPathAddress)

  useEffect(() => {
    const tier = tiers?.[0]

    if (!tiersFetched) return
    if (!tier) return

    const newCollabs = Object.keys(tier.proportions as any).reduce((prev: any, curr) => {
      return [...prev, { address: curr, share: tier.proportions[curr] * 10000000000000 }]
    }, [])

    setCollabs(newCollabs as any)
  }, [tiers, tiersFetched, setCollabs, address])

  useEffect(() => {
    if (tx) {
      (tx as any).wait().then((r: any) => {
        console.log(r.logs[0].address)

        setRevPathAddress(r.logs[0].address)
        setLocalAddress(r.logs[0].address)
      })
    }
  }, [tx, setRevPathAddress])

  const submitPath = () => {
    const sum = collabs.reduce((prev, curr) => {
      return prev + curr.share
    }, 0)

    if (sum > 100 || sum < 100) {
      setError("Total share must be equal to 100%")

      return
    }

    mutate({
      name: pathName,
      walletList: [
        collabs.map(collab => {
          if (/^[\dA-Za-z][\dA-Za-z-]{1,61}[\dA-Za-z]\.eth$/.test(collab.address || ""))
            return ensRef.current[collab.address as keyof typeof ensRef.current]

          return collab.address
        }) as any
      ],
      distribution: [
        collabs.map(collab => collab.share) as any
      ],
      mutabilityDisabled: false
    })
  }

  const updatePath = () => {
    const sum = collabs.reduce((prev, curr) => {
      return prev + curr.share
    }, 0)
  
    if (sum > 100 || sum < 100) {
      setError("Total share must be equal to 0")
  
      return
    }

    update?.updateRevenueTiers.mutate({
      walletList: [collabs.map(collab => collab.address) as any],
      distribution: [collabs.map(collab => collab.share)],
      tierNumbers: [0],
    })
  }

  return <>
    <div className='flex flex-col gap-4'>
      <input onChange={(e) => setPathName(e.target.value)} className='border rounded-full w-3/4 px-3 py-2 text-sm' placeholder='Revenue Path Name' />

      {collabsMemo.map((collab, i) => {
        return <div key={i} className='flex gap-2'>
          <div className='flex relative items-center w-1/4'>
            <input
              onChange={(e) => {
                const newCollabs = collabs.map((_, index) => {
                  if (index === i) return { address: collab.address, share: parseFloat(e.target.value || "0") }

                  return _
                })

                setCollabs(newCollabs)
                setError("")
              }}
              className='border rounded-full w-full px-3 py-2 text-sm'
              value={collab.share}
              placeholder="%"
            />
            <p className="text-sm absolute right-3">%</p>
          </div>
          <input
            onChange={async (e) => {
              const newCollabs = collabs.map((_, index) => {
                if (index === i) return { address: e.target.value, share: collab.share }

                  return _
              })

              setCollabs(newCollabs)

              if (!ethers.utils.isAddress(e.target.value) && /^[\dA-Za-z][\dA-Za-z-]{1,61}[\dA-Za-z]\.eth$/.test(e.target.value)) {
                const ensAddress = await provider.resolveName(e.target.value) || ""
                    
                ensRef.current = { ...ensRef.current, [e.target.value]: ensAddress }
              }
            }}
            placeholder='0x1234...56aB'
            className='border rounded-full w-3/4 px-3 py-2 text-sm'
            value={collab.address}
          />
          <button className='text-red-600 text-xs' onClick={() => {  
            const newCollabs = collabs.filter((_, index) => index !== i)

            setCollabs([])

            setCollabs([...newCollabs])
          }}>
            Delete
          </button>
        </div>
      })}

      <p className='text-red-600'>{error}</p>

      <div className='flex gap-4 w-1/3 mt-4'>
        <button
          className='flex items-center justify-center gap-4 py-1 px-3 text-sm border rounded-full border-black max-h-[40px]'
          onClick={() => setCollabs([ ...collabs, { address: '', share: 0 } ])}
        >
          Add
        </button>

        {!revPathAddress && <button
          disabled={createRevPathIsFetched && !localAddress}
          className='cursor-pointer py-2 px-3 bg-black text-white rounded-full flex justify-center max-h-[40px]'
          onClick={submitPath}
        >
          {createRevPathIsFetched && !localAddress ? "Pending..." : "Create"}
        </button>}
        {tiersFetched && tiers?.[0] && <button
          className='cursor-pointer py-2 px-3 bg-black text-white rounded-full flex justify-center max-h-[40px]'
          onClick={() => {
            updatePath()
          }}
        >
          Update
        </button>}
      </div>
      {data && <div className='flex gap-4 w-2/3 mt-4 items-center justify-start'>
        <div>
          <p className="font-medium">Balance</p>
          <p className="font-header">{data?.withdrawable + data?.pendingDistribution} ETH</p>
        </div>

        <button
          disabled={mutation?.isLoading}
          className='cursor-pointer py-2 px-3 bg-black text-white rounded-full flex justify-center max-h-[40px]'
          onClick={() => {
            mutation?.mutate({
              walletAddress: address || "",
            })
          }}
        >
          {mutation?.isLoading ? "Pending..." : "Withdraw"}
        </button>
      </div>}
    </div>
  </>
}

export default Form
