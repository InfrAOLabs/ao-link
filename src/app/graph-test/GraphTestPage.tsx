import { Skeleton } from "@mui/material"
import { MessageResult } from "@permaweb/aoconnect/dist/lib/result"
import { useEffect, useState } from "react"

import { MessageTree2 } from "./Tree2"
import { fetchMessageGraph } from "@/services/messages-api"
import { AoMessage } from "@/types"

const msg = "gPWjYAZ98ND9b5RReRv7ysk2lbAigV4r7tUpvFIMBjg"

export type MessageTree = AoMessage & {
  result: MessageResult
  children: MessageTree[]
}

export interface FetchMessageGraphArgs {}

export function GraphTestPage() {
  const [treeData, setTreeData] = useState<MessageTree | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    console.log("Fetching tree...")
    setIsLoading(true)

    fetchMessageGraph({
      msgId: msg,
      actions: ["Transfer", "Credit-Notice", "Debit-Notice", "Order-Confirmation"],
      startFromPushedFor: true,
    })
      .then((t) => {
        console.log("Tree fetched:", t)
        setTreeData(t)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return (
    <div style={{ width: "100%", height: "100vh", padding: "20px" }}>
      <div style={{ width: "100%", height: "400px" }}>
        {isLoading ? (
          <Skeleton width="100%" height="100%" />
        ) : treeData ? (
          <MessageTree2
            data={treeData}
            label={(d) =>
              `${d.action ? `${d.action}:` : ""} ${d.id.slice(0, 5)}...${d.id.slice(d.id.length - 5, d.id.length)}`
            }
            r={5}
            strokeWidth={3}
            link={(d) => `https://www.ao.link/#/message/${d.id}`}
          />
        ) : (
          <div>No message tree found</div>
        )}
      </div>
    </div>
  )
}
