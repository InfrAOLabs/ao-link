"use client"

import { Button, CircularProgress, Paper, Stack, Typography } from "@mui/material"
import { Asterisk } from "@phosphor-icons/react"
import React, { useCallback, useState } from "react"

import { FormattedDataBlock } from "@/components/FormattedDataBlock"

type FetchInfoHandlerProps = {
  processId: string
}

export function FetchInfoHandler(props: FetchInfoHandlerProps) {
  const { processId } = props
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const handleFetch = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetch(`https://ur-cu.randao.net/dry-run?process-id=${processId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Anchor: "0",
          // Data: "123456789",
          // Id: "123456789",
          Owner: "123456789",
          Target: processId,
          Tags: [{ name: "Action", value: "Info" }],
        }),
      })
      const json = await result.json()

      if ("error" in json) {
        throw new Error(json.error)
      }

      if ("Messages" in json && json.Messages.length > 0 && typeof json.Messages[0] === "object") {
        setContent(JSON.stringify(json.Messages[0], null, 2))
      } else {
        setContent(JSON.stringify(json, null, 2))
      }
    } catch (error) {
      setContent(`Error fetching info: ${String(error)}`)
    }
    setTimeout(() => {
      setLoading(false)
    }, 500)
  }, [processId])

  return (
    <Stack gap={1}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2" color="text.secondary">
          Info Handler
        </Typography>
        <Button
          size="small"
          color="secondary"
          variant="contained"
          onClick={handleFetch}
          disabled={loading}
          endIcon={
            loading ? (
              <CircularProgress size={12} color="inherit" />
            ) : (
              <Asterisk width={12} height={12} weight="bold" />
            )
          }
        >
          Fetch
        </Button>
      </Stack>
      <FormattedDataBlock
        minHeight={520}
        data={content}
        placeholder={
          loading ? "Loading..." : "Click 'Fetch' to get information about this process."
        }
        component={Paper}
      />
    </Stack>
  )
}
