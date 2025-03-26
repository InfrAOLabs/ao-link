import { Avatar, Box, Skeleton, Stack, Typography } from "@mui/material"
import { Fragment } from "react"
import { useParams } from "react-router-dom"

import { MessageTreeGraph } from "@/components/MessageTreeGraph"
import { useSwap } from "@/hooks/useSwap"

export function SwapPage() {
  const { messageId = "" } = useParams()
  const { swap, isLoading } = useSwap(messageId)

  return (
    <Fragment>
      <Stack component="main" gap={6} paddingY={4}>
        <Box width="100%">
          <Typography variant="h6">Swap messages tree:</Typography>
          {isLoading ? (
            <Skeleton width="100%" height={400} />
          ) : swap?.tree ? (
            <MessageTreeGraph
              data={swap?.tree}
              label={(d) =>
                `${d.action ? `${d.action}:` : ""} ${d.id.slice(0, 5)}...${d.id.slice(d.id.length - 5, d.id.length)}`
              }
              r={5}
              height={400}
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
            const amount = (Number(t.amount) / 10 ** (t.tokenInfo?.denomination ?? 1)).toFixed(6)

            return (
              <Box key={`${t.from}-${t.to}-${i}`} display="flex" alignItems="center" gap={1}>
                <Typography variant="body2">
                  From:{" "}
                  <a
                    target="_blank"
                    referrerPolicy="no-referrer"
                    href={`https://www.ao.link/#/entity/${t.from}`}
                  >
                    {t.from}
                  </a>
                </Typography>
                <Typography variant="body2">{"->"}</Typography>
                <Typography variant="body2">
                  To:{" "}
                  <a
                    target="_blank"
                    referrerPolicy="no-referrer"
                    href={`https://www.ao.link/#/entity/${t.to}`}
                  >
                    {t.to}
                  </a>
                </Typography>
                <Typography variant="body2">{amount}</Typography>
                <Avatar
                  src={`https://arweave.net/${t.tokenInfo?.logo ?? ""}`}
                  alt={t.tokenInfo?.name ?? "token-logo"}
                  sx={{ width: 14, height: 14 }}
                />
              </Box>
            )
          })}
        </Box>
      </Stack>
    </Fragment>
  )
}
