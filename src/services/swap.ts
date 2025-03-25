import { fetchMessageGraph, MessageTree } from "./messages-api"

export interface Transfer {
  from: string
  to: string
  process: string
  amount: number
  symbol: string
}

export interface Swap {
  transfers: Transfer[]
  createdAt: Date | null
  createdAtBlock: number | null
  tree: MessageTree
}

export const getSwap = async (msgId: string) => {
  try {
    const tree = await fetchMessageGraph({
      msgId,
      actions: ["Transfer", "Credit-Notice", "Debit-Notice"],
      startFromPushedFor: true,
    })

    console.log(tree)

    if (!tree) {
      return null
    }

    const swap: Swap = {
      transfers: [],
      createdAt: tree.blockTimestamp,
      createdAtBlock: tree.blockHeight,
      tree,
    }

    return swap
  } catch (err) {
    return null
  }
}

function getAllTransfers(tree: MessageTree): Transfer[] {
  const transfers: Transfer[] = []

  if (tree.tags["Action"] === "Transfer") {
    transfers.push({
      from: tree.from,
      to: tree.tags["Recipient"] || tree.to,
      amount: parseTransferAmount(tree.tags["Transfer"]),
    })
  }

  // Recursively check leaf messages
  tree.leafMessages.forEach((leaf) => {
    transfers.push(...getAllTransfers(leaf))
  })

  return transfers
}