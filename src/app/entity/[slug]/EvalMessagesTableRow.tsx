import { Box, Collapse, IconButton, Paper, TableCell, TableRow, Tooltip } from "@mui/material"

import { result } from "@permaweb/aoconnect"
import { CaretDown, CaretRight, CheckCircle, MinusCircle, Question } from "@phosphor-icons/react"
import { useEffect, useState } from "react"

import { EntityBlock } from "@/components/EntityBlock"
import { FormattedDataBlock } from "@/components/FormattedDataBlock"
import { IdBlock } from "@/components/IdBlock"
import { TypeBadge } from "@/components/TypeBadge"
import { AoMessage } from "@/types"
import { truncateId } from "@/utils/data-utils"
import { formatFullDate, formatRelative } from "@/utils/date-utils"
import { formatNumber, formatSize } from "@/utils/number-utils"
import { GATEWAY_DATA } from "@/config/gateway"

type EvalMessagesTableRowProps = {
  item: AoMessage
  expandedByDefault?: boolean
}

export function EvalMessagesTableRow(props: EvalMessagesTableRowProps) {
  const { item: message, expandedByDefault } = props

  const [expanded, setExpanded] = useState(false)
  const [data, setData] = useState<string>("Loading...")

  useEffect(() => {
    if (expandedByDefault) {
      setTimeout(() => {
        setExpanded(true)
      }, 300)
    }
  }, [expandedByDefault])

  useEffect(() => {
    if (!message || !expanded) return

    if (message.type === "Checkpoint") {
      setData("Message too long")
    } else {
      fetch(`${GATEWAY_DATA}/${message.id}`)
        .then((res) => res.text())
        .then(setData)
    }
  }, [message, expanded])

  const [success, setSuccess] = useState<boolean | null | undefined>(undefined)

  useEffect(() => {
    if (!message) return

    result({ message: message.id, process: message.to })
      .then((res) => {
        setSuccess(typeof res?.Output?.data === "object")
      })
      .catch(() => {
        setSuccess(null)
      })
  }, [message])

  return (
    <>
      <TableRow
        hover={false}
        onClick={() => setExpanded(!expanded)}
        sx={{
          cursor: "pointer",
        }}
      >
        <TableCell>
          <TypeBadge type={message.type} />
        </TableCell>
        <TableCell>
          <IdBlock
            label={truncateId(message.id)}
            value={message.id}
            href={`/message/${message.id}`}
          />
        </TableCell>
        <TableCell>{message.action}</TableCell>
        <TableCell>
          {success === undefined ? null : success === null ? (
            <Tooltip title="Compute Result could not be fetched from the process.">
              <Question
                style={{ color: "var(--mui-palette-text-secondary)" }}
                width={16}
                height={16}
              />
            </Tooltip>
          ) : success ? (
            <CheckCircle
              style={{ color: "var(--mui-palette-success-main)" }}
              width={16}
              height={16}
            />
          ) : (
            <MinusCircle
              style={{ color: "var(--mui-palette-error-main)" }}
              width={16}
              height={16}
            />
          )}
        </TableCell>
        <TableCell>
          <EntityBlock entityId={message.from} fullId />
        </TableCell>
        <TableCell align="right">
          {message.dataSize === undefined ? "Unknown" : formatSize(message.dataSize)}
        </TableCell>
        <TableCell align="right">
          {message.blockHeight === null ? (
            "Processing"
          ) : (
            <IdBlock
              label={formatNumber(message.blockHeight)}
              value={String(message.blockHeight)}
              href={`/block/${message.blockHeight}`}
            />
          )}
        </TableCell>
        <TableCell align="right">
          {message.ingestedAt === null ? (
            "Processing"
          ) : (
            <Tooltip title={formatFullDate(message.ingestedAt)}>
              <span>{formatRelative(message.ingestedAt)}</span>
            </Tooltip>
          )}
        </TableCell>
        <TableCell>
          <IconButton size="small">{expanded ? <CaretDown /> : <CaretRight />}</IconButton>
        </TableCell>
      </TableRow>
      <TableRow hover={false}>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
          <Box
            sx={{
              marginX: -2,
            }}
          >
            <Collapse in={expanded} unmountOnExit>
              <FormattedDataBlock
                data={data}
                isEvalMessage
                component={Paper}
                placeholder=" "
                minHeight="unset"
              />
            </Collapse>
          </Box>
        </TableCell>
      </TableRow>
    </>
  )
}
