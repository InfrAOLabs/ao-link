import { fetchMessageGraph, MessageTree } from "./messages-api"
import { getTokenInfo, TokenInfo } from "./token-api"
import { AoMessage } from "@/types"

export interface Transfer {
  from: string
  to: string
  process: string
  amount: string
  tokenInfo: TokenInfo | null
  timestamp: Date | null
  message: AoMessage
  repushable: boolean
}

export interface Swap {
  transfers: Transfer[]
  createdAt: Date | null
  createdAtBlock: number | null
  swapDurationMs: number | null
  tree: MessageTree
}

export const getSwap = async (msgId: string) => {
  try {
    const tree = await fetchMessageGraph({
      msgId,
      actions: ["Order-Confirmation", "Order-Error", "Transfer", "Credit-Notice", "Debit-Notice"],
      startFromPushedFor: true,
      ignoreRepeatingMessages: true,
    })

    if (!tree) {
      return null
    }

    const transfersRaw = getAllTransfers(tree)
    const transfers: Transfer[] = []

    for (const transferRaw of transfersRaw) {
      let tokenInfo

      try {
        tokenInfo = await getTokenInfo(transferRaw.process)
      } catch (err) {
        console.error("Couldn't fetch token info:", err)
        tokenInfo = null
      }

      transfers.push({
        ...transferRaw,
        tokenInfo,
      })
    }

    const swap: Swap = {
      transfers,
      createdAt: tree.blockTimestamp,
      createdAtBlock: tree.blockHeight,
      // TODO(Nikita): Replace it with actual duration (max(timestamp) - min(timestamp))
      swapDurationMs: null,
      tree,
    }

    return swap
  } catch (err) {
    return null
  }
}

function getAllTransfers(tree: MessageTree): Omit<Transfer, "tokenInfo">[] {
  const transfers: Omit<Transfer, "tokenInfo">[] = []

  if (tree.tags["Action"] === "Transfer") {
    transfers.push({
      from: tree.from ?? "",
      to: tree.tags["Recipient"] ?? "",
      amount: tree.tags["Quantity"] ?? "0",
      process: tree.to,
      timestamp: tree.blockTimestamp,
      message: tree,
      // @ts-ignore
      repushable: tree.action === "Transfer" && tree.result?.error,
    })
  }

  tree.children.forEach((leaf) => {
    const leafTransfers = getAllTransfers(leaf)
    transfers.push(...leafTransfers)
  })

  return transfers
}
