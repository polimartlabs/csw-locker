import { useEffect, useState } from "react"

export type ContractDetails = {
	tx_id: string
	canonical: boolean
	contract_id: string
	block_height: number
	clarity_version: number
	source_code: string
	abi: string
}

export type AbiType = {
	maps: {
	  key: string
	  name: string
	  value: string
	}[]
	epoch: string
	functions: {
	  name: string
	  access: "public" | "read_only"
	  args: {
		 name: string
		 type: any // or define types like "uint128", "principal", etc.
	  }[]
	  outputs: {
		 type: any
	  }
	}[]
	variables: {
	  name: string
	  type: any
	  access: "constant"
	}[]
}

export type ContractDetailsErr = {
	statusCode: number
	error: string
	message: string
 }

export default function useContractDetails(contractAddress: string) {
	const [contractDetails, setContractDetails] = useState<ContractDetails>(null)
	const [contractDetailsErr, setContractDetailsErr] = useState<ContractDetailsErr>(null)
	const [contractAbi, setContractAbi] = useState<AbiType>()

	useEffect(() => {
		async function getContractDetails() {
			try {
				const res = await fetch(`https://api.testnet.hiro.so/extended/v1/contract/${contractAddress}`)

				if (res.ok) {
					const data = await res.json() as ContractDetails
					setContractDetails(data)
					setContractAbi(JSON.parse(data.abi))
				} else {
					setContractDetails(null)
					setContractDetailsErr({ "statusCode": 404, "error": "Not Found", "message": "cannot find contract by ID"  })
				}
			} catch (error) {
				setContractDetailsErr({ "statusCode": 404, "error": "Not Found", "message": "cannot find contract by ID"  })
				throw Error(error)
			}
		}
		getContractDetails()
	}, [contractAddress])

	return { contractDetails, contractAbi, contractDetailsErr }
}
