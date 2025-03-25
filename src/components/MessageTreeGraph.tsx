import { MessageResult } from "@permaweb/aoconnect/dist/lib/result"
import * as d3 from "d3"
import { useEffect, useRef } from "react"

import { AoMessage } from "@/types"

type MessageTree = AoMessage & {
  result: MessageResult
  leafMessages: MessageTree[]
}

interface ActorNode extends d3.SimulationNodeDatum {
  id: string
  messages: MessageTree[]
  x?: number
  y?: number
}

interface ActorLink extends d3.SimulationLinkDatum<ActorNode> {
  source: string
  target: string
  messages: MessageTree[]
}

interface MessageTreeGraphProps {
  data: MessageTree
}

export function MessageTreeGraph({ data }: MessageTreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return

    d3.select(svgRef.current).selectAll("*").remove()

    const wrapperRect = containerRef.current.getBoundingClientRect()

    const margin = { top: 20, right: 90, bottom: 30, left: 90 }
    const width = wrapperRect.width - margin.left - margin.right
    const height = wrapperRect.height - margin.top - margin.bottom

    // Create the SVG container with white background
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("background-color", "white")

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#4A5568")

    const actorNodes = new Map<string, ActorNode>()
    const actorLinks = new Map<string, ActorLink>()

    function processMessage(message: MessageTree) {
      if (!actorNodes.has(message.from)) {
        actorNodes.set(message.from, { id: message.from, messages: [] })
      }
      actorNodes.get(message.from)?.messages.push(message)

      if (!actorNodes.has(message.to)) {
        actorNodes.set(message.to, { id: message.to, messages: [] })
      }
      actorNodes.get(message.to)?.messages.push(message)

      const linkKey = `${message.from}-${message.to}`
      if (!actorLinks.has(linkKey)) {
        actorLinks.set(linkKey, {
          source: message.from,
          target: message.to,
          messages: [],
        })
      }
      actorLinks.get(linkKey)?.messages.push(message)

      message.leafMessages.forEach(processMessage)
    }

    processMessage(data)

    const nodes = Array.from(actorNodes.values())
    const links = Array.from(actorLinks.values())

    const radius = Math.min(width, height) / 2
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI
      node.x = width / 2 + radius * Math.cos(angle)
      node.y = height / 2 + radius * Math.sin(angle)
    })

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform as any)
      })

    svg.call(zoom)

    g.selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#4A5568")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)")
      .attr("x1", (d: any) => {
        const source = nodes.find((n) => n.id === d.source)
        return source?.x ?? 0
      })
      .attr("y1", (d: any) => {
        const source = nodes.find((n) => n.id === d.source)
        return source?.y ?? 0
      })
      .attr("x2", (d: any) => {
        const target = nodes.find((n) => n.id === d.target)
        return target?.x ?? 0
      })
      .attr("y2", (d: any) => {
        const target = nodes.find((n) => n.id === d.target)
        return target?.y ?? 0
      })
      .on("mouseover", function (event: MouseEvent, d: ActorLink) {
        const transferMessages = d.messages.filter((m) => m.tags["Transfer"])
        if (transferMessages.length > 0) {
          d3.select(this).attr("stroke", "#E53E3E").attr("stroke-width", 3)

          // Create tooltip with all transfer amounts
          const tooltipText = transferMessages
            .map((m) => `Transfer Amount: ${m.tags["Transfer"]}`)
            .join("\n")

          d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "white")
            .style("border", "1px solid #ccc")
            .style("padding", "5px")
            .style("border-radius", "3px")
            .style("pointer-events", "none")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`)
            .style("z-index", "1000")
            .text(tooltipText)
        }
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke", "#4A5568").attr("stroke-width", 2)
        d3.selectAll(".tooltip").remove()
      })

    // Add nodes for actors
    const node = g
      .selectAll(".node")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", (d: ActorNode) => `translate(${d.x ?? 0},${d.y ?? 0})`)

    // Add circles for nodes
    node
      .append("circle")
      .attr("r", 8)
      .style("fill", "#F6AD55")
      .style("stroke", "#C05621")
      .style("stroke-width", 2)

    // Add clickable labels for nodes (actor addresses)
    node
      .append("a")
      .attr("href", (d: ActorNode) => `/#/entity/${d.id}`)
      .attr("target", "_blank")
      .append("text")
      .attr("dy", ".35em")
      .attr("x", 15)
      .style("text-anchor", "start")
      .style("fill", "#2B6CB0")
      .style("text-decoration", "underline")
      .style("cursor", "pointer")
      .style("font-size", "12px")
      .text((d: ActorNode) => d.id)

    // Add message labels on the links
    const messageLabels = g
      .selectAll(".message-label-group")
      .data(links)
      .enter()
      .append("g")
      .attr("class", "message-label-group")
      .attr("transform", (d: any) => {
        const source = nodes.find((n) => n.id === d.source)
        const target = nodes.find((n) => n.id === d.target)
        if (
          !source ||
          !target ||
          source.x === undefined ||
          source.y === undefined ||
          target.x === undefined ||
          target.y === undefined
        )
          return ""

        // Calculate the angle of the link
        const dx = target.x - source.x
        const dy = target.y - source.y
        const angle = Math.atan2(dy, dx)

        // Calculate perpendicular offset
        const offset = 15 // Distance from the link
        const perpX = -Math.sin(angle) * offset
        const perpY = Math.cos(angle) * offset

        // Center point of the link
        const x = (source.x + target.x) / 2 + offset
        const y = (source.y + target.y) / 2 + offset

        return `translate(${x + perpX},${y + perpY})`
      })

    messageLabels.each(function (d: ActorLink) {
      const actions = d.messages
        .map((m) => ({
          action: m.tags["Action"] ?? "Message",
          level: getMessageLevel(m, data),
          messageId: m.id,
          message: m, // Store the full message object
        }))
        .sort((a, b) => a.level - b.level)

      d3.select(this)
      actions.forEach((action, i) => {
        const source = nodes.find((n) => n.id === d.source)
        const target = nodes.find((n) => n.id === d.target)
        if (
          !source ||
          !target ||
          source.x === undefined ||
          source.y === undefined ||
          target.x === undefined ||
          target.y === undefined
        )
          return ""

        // Calculate the angle of the link
        const dx = target.x - source.x
        const dy = target.y - source.y
        const angle = Math.atan2(dy, dx)

        // Calculate offset along the link
        const offset = i - (actions.length - 1) / 2 // Spread labels along the link

        // Calculate position
        const x = offset * Math.cos(angle)
        const y = offset * Math.sin(angle)

        const labelGroup = d3.select(this).append("g").attr("transform", `translate(${x},${y})`)

        // Add background rectangle
        labelGroup
          .append("rect")
          .attr("x", -35)
          .attr("y", -15)
          .attr("width", 70)
          .attr("height", 24)
          .attr("rx", 3)
          .attr("ry", 3)
          .style("fill", "white")
          .style("opacity", 0.9)

        // Add text label
        labelGroup
          .append("a")
          .attr("href", `/#/message/${action.messageId}`)
          .attr("target", "_blank")
          .append("text")
          .attr("class", "message-label")
          .attr("dy", -3)
          .attr("text-anchor", "middle")
          .style("fill", "#805AD5")
          .style("text-decoration", "underline")
          .style("cursor", "pointer")
          .style("font-size", "12px")
          .text(action.action)
          .on("mouseover", function (event: MouseEvent) {
            const message = action.message
            if (!message) {
              console.log("No message found")
              return
            }

            const tooltip = d3
              .select("body")
              .append("div")
              .attr("class", "tooltip")
              .style("position", "absolute")
              .style("background", "black")
              .style("border", "1px solid #ccc")
              .style("padding", "8px")
              .style("border-radius", "4px")
              .style("pointer-events", "none")
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY + 10}px`)
              .style("z-index", "1000")
              .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
              .style("font-size", "12px")
              .style("line-height", "1.4")
              .style("max-width", "400px")
              .style("white-space", "pre-wrap")
              .style("font-family", "monospace")

            const info = [
              `Message ID: ${message.id}`,
              `From: ${message.from}`,
              `To: ${message.to}`,
              `Action: ${message.tags["Action"] ?? "Message"}`,
              `Timestamp: ${new Date(message.ingestedAt).toLocaleString()}`,
              `Block Height: ${message.blockHeight}`,
              "Tags:",
              ...Object.entries(message.tags || {}).map(([key, value]) => `  ${key}: ${value}`),
              "Result:",
              ...Object.entries(message.result || {}).map(([key, value]) => `  ${key}: ${value}`),
            ]

            info.forEach((line) => {
              tooltip.append("div").text(line)
            })

            d3.select(this).style("fill", "#6B46C1").style("font-weight", "bold")
          })
          .on("mouseout", function () {
            d3.selectAll(".tooltip").remove()
            d3.select(this).style("fill", "#805AD5").style("font-weight", "normal")
          })
      })
    })

    function getMessageLevel(message: MessageTree, root: MessageTree): number {
      if (message.id === root.id) return 0
      let level = 1
      let current = root
      while (current.leafMessages.length > 0) {
        if (current.leafMessages.some((m) => m.id === message.id)) {
          return level
        }
        current = current.leafMessages[0]
        level++
      }
      return level
    }
  }, [data])

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "auto" }}>
      <svg ref={svgRef}></svg>
    </div>
  )
}
