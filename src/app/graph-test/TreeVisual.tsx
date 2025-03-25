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
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

interface TreeVisualProps {
  data: MessageTree
}

export function TreeVisual({ data }: TreeVisualProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!data || !svgRef.current) return

    // Clear any existing SVG content
    d3.select(svgRef.current).selectAll("*").remove()

    // Set up the dimensions and margins
    const margin = { top: 40, right: 120, bottom: 40, left: 120 }
    const width = 1200 - margin.left - margin.right
    const height = 800 - margin.top - margin.bottom

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
          sourceX: 0,
          sourceY: 0,
          targetX: 0,
          targetY: 0,
        })
      }
      actorLinks.get(linkKey)?.messages.push(message)

      message.leafMessages.forEach(processMessage)
    }

    processMessage(data)

    // Create hierarchy and tree layout with increased spacing
    const rootHierarchy = d3.hierarchy(data, (d) => d.leafMessages)
    const treeLayout = d3.tree<MessageTree>().nodeSize([100, 300]) // Increased vertical and horizontal spacing
    treeLayout(rootHierarchy)

    // Convert hierarchy to nodes and links
    const nodes = rootHierarchy.descendants().map((d) => ({
      id: d.data.id,
      x: (d as any).y, // Swap x and y for left-to-right tree
      y: (d as any).x,
      messages: [d.data], // Keep message data
    }))

    const links = rootHierarchy.links().map((link) => ({
      source: (link.source as any).y, // Match the tree layout
      target: (link.target as any).y,
      sourceX: (link.source as any).y,
      sourceY: (link.source as any).x,
      targetX: (link.target as any).y,
      targetY: (link.target as any).x,
      messages: [link.target.data], // Keep message data
    }))

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform as any)
      })

    svg.call(zoom)

    // Draw links
    g.selectAll(".link")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", "#4A5568")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)")
      .attr("x1", (d) => d.sourceX)
      .attr("y1", (d) => d.sourceY)
      .attr("x2", (d) => d.targetX)
      .attr("y2", (d) => d.targetY)
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
      .attr("transform", (d) => `translate(${d.x},${d.y})`)

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
      .attr("href", (d) => `/#/entity/${d.id}`)
      .attr("target", "_blank")
      .append("text")
      .attr("dy", ".35em")
      .attr("x", 15) // Increased distance from node
      .style("text-anchor", "start")
      .style("fill", "#2B6CB0")
      .style("text-decoration", "underline")
      .style("cursor", "pointer")
      .style("font-size", "12px")
      .text((d) => d.id)

    // Add message labels on the links with improved positioning
    const messageLabels = g
      .selectAll(".message-label-group")
      .data(links)
      .enter()
      .append("g")
      .attr("class", "message-label-group")
      .attr("transform", (d) => {
        // Calculate the center point of the link with offset
        const x = (d.sourceX + d.targetX) / 2
        const y = (d.sourceY + d.targetY) / 2
        return `translate(${x},${y})`
      })

    messageLabels.each(function (d: ActorLink) {
      const actions = d.messages
        .map((m) => ({
          action: m.tags["Action"] ?? "Message",
          level: getMessageLevel(m, data),
          messageId: m.id,
          message: m,
        }))
        .sort((a, b) => a.level - b.level)

      d3.select(this)
      actions.forEach((action, i) => {
        // Calculate the angle of the link
        const dx = d.targetX - d.sourceX
        const dy = d.targetY - d.sourceY
        const angle = Math.atan2(dy, dx)

        // Calculate perpendicular offset for labels
        const perpAngle = angle + Math.PI / 2
        const offset = 30 // Distance from the link
        const x = Math.cos(perpAngle) * offset
        const y = Math.sin(perpAngle) * offset

        const labelGroup = d3.select(this).append("g").attr("transform", `translate(${x},${y})`)

        // Add background rectangle with increased size
        labelGroup
          .append("rect")
          .attr("x", -40)
          .attr("y", -15)
          .attr("width", 80)
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
              .style("background", "white")
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
    <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
      <svg ref={svgRef}></svg>
    </div>
  )
}
