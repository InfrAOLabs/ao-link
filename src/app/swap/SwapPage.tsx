import { Avatar, Box, Skeleton, Stack, Typography } from "@mui/material"
import { FC, Fragment } from "react"
import { useParams } from "react-router-dom"

import { EntityBlock } from "@/components/EntityBlock"
import { MessageTreeGraph } from "@/components/MessageTreeGraph"
import { useSwap } from "@/hooks/useSwap"
import { MessageTree } from "@/services/messages-api"

// const flatMessageTree = (root: MessageTree) => {
//   return [root]
// }

export function SwapPage() {
  const { messageId = "" } = useParams()
  const { swap, isLoading } = useSwap(messageId)

  return (
    <Fragment>
      <Stack component="main" gap={6} paddingY={4}>
        <Box width="100%">
          <Typography variant="h6">Swap messages tree:</Typography>
          {isLoading ? (
            <Skeleton width="100%" height={600} />
          ) : swap?.tree ? (
            <MessageTreeGraph
              data={swap?.tree}
              label={(d) => `${d.action ? `${d.action}` : ""}`}
              r={5}
              height={600}
              padding={2}
              strokeWidth={3}
              link={(d) => `https://www.ao.link/#/message/${d.id}`}
            />
          ) : (
            <Typography variant="subtitle2">Swap not found</Typography>
          )}
        </Box>
        <Box display="flex" flexDirection="column" gap={0.5}>
          <Typography variant="h6">Transfers:</Typography>
          {swap?.transfers.map((t, i) => {
            const amount = (
              Number(t.amount) /
              10 ** (t.tokenInfo?.denomination ?? 1)
            ).toLocaleString("en-US", { maximumFractionDigits: 6 })

            return (
              <Box key={`${t.from}-${t.to}-${i}`} display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1">From: </Typography>
                <EntityBlock entityId={t.from} />
                <Typography variant="subtitle1">{"->"}</Typography>
                <Typography variant="subtitle1">To: </Typography>
                <EntityBlock entityId={t.to} />
                <Typography variant="subtitle1">{amount}</Typography>
                <Avatar
                  src={`https://arweave.net/${t.tokenInfo?.logo ?? ""}`}
                  alt={t.tokenInfo?.name ?? "token-logo"}
                  sx={{ width: 20, height: 20 }}
                />
              </Box>
            )
          })}
        </Box>
      </Stack>
    </Fragment>
  )
}
