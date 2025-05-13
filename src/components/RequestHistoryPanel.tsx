import React, { useEffect, useState } from "react"
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material"
import Grid2 from "@mui/material/Unstable_Grid2/Grid2"

import { CodeEditor } from "@/components/CodeEditor"
import { useActiveAddress } from "@arweave-wallet-kit/react"

// SVG dropdown icon
const ChevronDownIcon = () => (
  <svg
    width="24"
    height="24"
    fill="none"
    viewBox="0 0 24 24"
    style={{ display: "block" }}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M15.25 10.75L12 14.25L8.75 10.75"
    />
  </svg>
)

// Helper to truncate long strings
const truncateMiddle = (str: string, front = 8, back = 8) => {
  if (!str || str.length <= front + back) return str
  return `${str.slice(0, front)}...${str.slice(-back)}`
}

interface RequestHistoryPanelProps {
  onSelect: (payload: string) => void
}

export function RequestHistoryPanel({ onSelect }: RequestHistoryPanelProps) {
  const address = useActiveAddress()
  const isWalletConnected = Boolean(address)

  const [history, setHistory] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | false>(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Load history from localStorage
  const loadHistory = () => {
    const raw = localStorage.getItem("dryRunHistory") || "[]"
    try {
      const data = JSON.parse(raw)
      setHistory(Array.isArray(data) ? data.slice().reverse() : [])
    } catch {
      setHistory([])
    }
  }

  useEffect(() => {
    if (!isWalletConnected) return

    // Initial load when wallet connects
    loadHistory()

    // Listen for localStorage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "dryRunHistory") {
        loadHistory()
      }
    }
    window.addEventListener("storage", handleStorage)

    // Poll same-tab changes every 5 seconds
    const interval = setInterval(loadHistory, 5000)

    return () => {
      window.removeEventListener("storage", handleStorage)
      clearInterval(interval)
    }
  }, [isWalletConnected])

  const clearHistory = () => {
    localStorage.removeItem("dryRunHistory")
    setHistory([])
  }

  const handleChange = (id: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? id : false)
  }

  const renderSummary = (item: any) => {
    const tags: Record<string, string> = {}
    ;(item.request.tags || []).forEach((t: any) => (tags[t.name] = t.value))

    const msg = item.response?.Messages?.[0] || {}
    const resultTags: Record<string, any> = {}
    if (Array.isArray(msg.Tags)) msg.Tags.forEach((t: any) => (resultTags[t.name] = t.value))

    const action = tags.Action || "Unknown"
    switch (action) {
      case "Balance": {
        const recipient = tags.Recipient || resultTags.Account || "-"
        const token = resultTags.Ticker || "-"
        const balance = resultTags.Balance ?? msg.Data ?? "-"
        return (
          <>
            <Typography variant="body2" fontWeight={500}>
              {token} Balance → {truncateMiddle(recipient)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Balance: {balance}
            </Typography>
          </>
        )
      }
      case "Info": {
        const name = resultTags.Name || resultTags.Ticker || "-"
        return (
          <>
            <Typography variant="body2" fontWeight={500}>
              Info → {name}
            </Typography>
          </>
        )
      }
      default:
        return (
          <>
            <Typography variant="body2" fontWeight={500}>
              {action}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              No parsed data available
            </Typography>
          </>
        )
    }
  }

  // Don't render if wallet isn't connected
  if (!isWalletConnected) {
    return null
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">History</Typography>
        <Button size="small" color="error" onClick={clearHistory}>
          CLEAR
        </Button>
      </Stack>
      <Divider sx={{ my: 1 }} />

      {history.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No history yet.
        </Typography>
      ) : (
        history.map((item) => {
          const isDimmed = hoveredId !== null && hoveredId !== item.id
          return (
            <Accordion
              key={item.id}
              expanded={expanded === item.id}
              onChange={handleChange(item.id)}
              disableGutters
              elevation={0}
              sx={{ mb: 1, opacity: isDimmed ? 0.3 : 1, transition: "opacity 0.2s" }}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <AccordionSummary expandIcon={<ChevronDownIcon />}>
                <Stack spacing={0.5} sx={{ width: "100%" }}>
                  {renderSummary(item)}
                  <Typography variant="caption" color="text.secondary">
                    {new Date(item.timestamp).toLocaleString()}
                  </Typography>
                </Stack>
              </AccordionSummary>

              <AccordionDetails sx={{ height: 400 }}>
                <Grid2 container spacing={2} sx={{ height: "100%" }}>
                  <Grid2 xs={12} md={6} sx={{ height: "100%" }}>
                    <Typography variant="caption" gutterBottom>
                      Query
                    </Typography>
                    <Paper sx={{ height: "100%", overflow: "auto" }}>
                      <CodeEditor
                        height="100%"
                        defaultLanguage="json"
                        defaultValue={JSON.stringify(item.request, null, 2)}
                        options={{ readOnly: true }}
                      />
                    </Paper>
                  </Grid2>
                  <Grid2 xs={12} md={6} sx={{ height: "100%" }}>
                    <Typography variant="caption" gutterBottom>
                      Result
                    </Typography>
                    <Paper sx={{ height: "100%", overflow: "auto" }}>
                      <CodeEditor
                        height="100%"
                        defaultLanguage="json"
                        defaultValue={JSON.stringify(item.response, null, 2)}
                        options={{ readOnly: true }}
                      />
                    </Paper>
                  </Grid2>
                </Grid2>
              </AccordionDetails>
            </Accordion>
          )
        })
      )}
    </Paper>
  )
}
