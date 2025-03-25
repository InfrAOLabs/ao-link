import { result } from "@permaweb/aoconnect"
import { MessageResult } from "@permaweb/aoconnect/dist/lib/result"
import { useCallback, useEffect, useState } from "react"

import { TreeVisual } from "./TreeVisual"
import { getMessageById, getResultingMessagesNodes } from "@/services/messages-api"
import { AoMessage } from "@/types"

const BATCH_SIZE = 5
const msg = "M8wxmvbHcx9UuOVd3jUQCrjLMbLDfRxflG4ClOjV7bM"

export type MessageTree = AoMessage & {
  result: MessageResult
  leafMessages: MessageTree[]
}

export interface FetchMessageGraphArgs {

}

export function GraphTestPage() {
  const [treeData, setTreeData] = useState<MessageTree | null>(null)

  const fetchMessageGraph = useCallback(
    async (msgId: string, startFromInitialMsg = false): Promise<MessageTree | null> => {
      try {
        let originalMsg = await getMessageById(msgId)

        if (!originalMsg) {
          return null
        }

        if (startFromInitialMsg) {
          const pushedFor = originalMsg.tags["Pushed-For"]

          if (pushedFor) {
            originalMsg = await getMessageById(pushedFor)
          }
        }

        if (!originalMsg) {
          return null
        }

        const res = await result({
          process: originalMsg.to,
          message: originalMsg.id,
        })

        const head: MessageTree = Object.assign({}, originalMsg, {
          leafMessages: [],
          result: res,
        })

        if (!head) {
          return null
        }

        for (const result of head.result.Messages ?? []) {
          const refTag = result.Tags.find((t: any) => ["Ref_", "Reference"].includes(t.name))

          if (!refTag) {
            head.leafMessages.push(result)
            continue
          }

          const shouldUseOldRefSymbol = refTag.name === "Ref_"

          const nodes = await getResultingMessagesNodes(
            result.Target,
            100,
            "",
            false,
            [refTag.value],
            [],
            shouldUseOldRefSymbol,
          )

          let leafs = []

          for (const node of nodes) {
            const leaf = await fetchMessageGraph(node.id)

            leafs.push(leaf)
          }

          leafs = leafs.filter((l) => l !== null)

          head.leafMessages = head.leafMessages.concat(leafs)
        }

        return head
      } catch (err) {
        console.error("Failed to fetch message graph:", err)
        return null
      }
    },
    [],
  )

  useEffect(() => {
    console.log("Fetching tree...")
    fetchMessageGraph(msg, true).then((t) => {
      console.log("Tree fetched:", t)
      setTreeData(t)
    })
  }, [fetchMessageGraph])

  return (
    <div style={{ width: "100%", height: "100vh", padding: "20px" }}>
      {treeData ? <TreeVisual data={treeData} /> : <div>Loading tree data...</div>}
    </div>
  )
}
