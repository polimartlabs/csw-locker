import type { AddressEntry, ContractIdString } from "@stacks/connect/dist/types/methods"
import type { StacksNetworkName } from "@stacks/network"
import type { Dispatch, SetStateAction } from "react"

export type SmartWallet = { address: `${string}.${string}` }
export type ContractAddress = `${string}.${string}`
export type presetType = {
    id: string
    name: string
    function_name: string
    description: string
    signers: number
    threshold: number
    features: string[]
    recommended: boolean
    state: string
    extension: boolean
    deployable: boolean
    contractName: string
    contractSrc: string
    customConfig: boolean
}

export type Accounts = {
    stx: Omit<AddressEntry, "publicKey">[]
    btc: Omit<AddressEntry, "publicKey">[]
} | undefined

export interface Token {
    symbol: string;
    name: string;
    balance: number;
    decimal: number
    [key: string]: any;
}

export type Balance = {
    stxBalance: any
    ftBalance: any
    sbtcBalance: any
    nftBalance: any
    all: Token[]
}

export type Cs = {
    found: boolean
    result?: Record<string, unknown>
    tx_info: any
}

export type UsersData = {
    addresses: Accounts | undefined
    bnsnames: any
}

export type ExecuteValues = {
    action?: string
    amount?: number
    id?: number
    sip?: number
    symbol?: string
    name?: string
    cycles?: number
    asset_address?: ContractIdString
    asset_name?: string
    poxAddress?: {
        version?: string,
        hashbytes?: string
    }
    decimal?: number
    sender: string
    recipient?: string
    memo?: string
    extension_address?: ContractIdString
} | undefined

export type ExecuteValuesProps = {
    dc_exists: boolean
    setValues: Dispatch<SetStateAction<ExecuteValues | undefined>>
}

export type ExecuteTxPayload = {
    action: string
    values: ExecuteValues
}

export type ExecuteTxProps = {
    props: ExecuteTxPayload;
};

export type Info = {
    name: string
    tx: string
    type: string
    deployer: string
    owner: string
    creation: string
    sponsored: string
    version: number
    status: string
    found: boolean
    address: string
}

export type TxAssetInfo = {
    amount: string
    name: string
    asset: string
    symbol: string
}

export type TxInfo = {
    action: string
    sender: string
    stamp: string
    time: string
    assets: TxAssetInfo[]
    tx: string
    tx_status: string
}

export type ClientConfig = {
    network: StacksNetworkName
    api: string
    explorer: string
    chain: string
}

export type nftResponseBalanceValues = {
    asset_identifier: string
    block_height: number
    value: { repr: string }
    tx: {
        block_time_iso: string
        tx_status: string
        tx_id: string
    }
}

export type nftBalanceValues = {
    asset_name: string
    asset_address: string
    contract_name: string
    id: number,
    tx: string
    status: string
    time: string
    image: string
}