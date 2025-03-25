import { Stack } from "@mui/material"
import { Fragment } from "react"
import { useParams } from "react-router-dom"

import { MessageTreeGraph } from "@/components/MessageTreeGraph"
import { useSwap } from "@/hooks/useSwap"

export function SwapPage() {
  const { messageId = "" } = useParams()
  const { swap } = useSwap(messageId)

  console.log("SWOP TREE:", swap?.tree);

  return (
    <Fragment>
      <Stack component="main" gap={6} paddingY={4}>
        {swap?.tree && <MessageTreeGraph data={swap?.tree} />}
      </Stack>
    </Fragment>
  )
}
