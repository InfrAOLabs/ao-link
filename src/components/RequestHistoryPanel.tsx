import React, { useEffect, useState } from "react"
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import Grid2 from "@mui/material/Unstable_Grid2/Grid2"
import { CodeEditor } from "@/components/CodeEditor"
import { FormattedDataBlock } from "@/components/FormattedDataBlock"

const ChevronDownIcon = () => (
  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" style={{ display: "block" }}>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      d="M15.25 10.75L12 14.25L8.75 10.75"
    />
  </svg>
)

const truncateMiddle = (str: string, front = 8, back = 8) => {
  if (!str || str.length <= front + back) return str
  return `${str.slice(0, front)}...${str.slice(-back)}`
}

export function RequestHistoryPanel({ onSelect }: { onSelect: (payload: string) => void }) {
  const [history, setHistory] = useState<any[]>([])
  const [expanded, setExpanded] = useState<string | false>(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const stored = JSON.parse(localStorage.getItem("dryRunHistory") || "[]").reverse()
      if (JSON.stringify(stored) !== JSON.stringify(history)) {
        setHistory(stored)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [history])

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
            <Typography variant="caption" color="text.secondary">Balance: {balance}</Typography>
          </>
        )
      }
      case "Info": {
        const name = resultTags.Name || resultTags.Ticker || "-"
        return (
          <>
            <Typography variant="body2" fontWeight={500}>Info → {name}</Typography>
          </>
        )
      }
      default:
        return (
          <>
            <Typography variant="body2" fontWeight={500}>{action}</Typography>
            <Typography variant="caption" color="text.secondary">
              No parsed data available
            </Typography>
          </>
        )
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log("Copied to clipboard!")
    })
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
        <Typography variant="body2" color="text.secondary">No history yet.</Typography>
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
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="caption" gutterBottom>Query</Typography>
                      <Tooltip title="Copy to clipboard" arrow>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(JSON.stringify(item.request, null, 2))}
                        >
                          <ContentCopyIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
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
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="caption" gutterBottom>Result</Typography>
                      <Tooltip title="Copy to clipboard" arrow>
                        <IconButton
                          size="small"
                          onClick={() => copyToClipboard(JSON.stringify(item.response, null, 2))}
                        >
                          <ContentCopyIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
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
