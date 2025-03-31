import * as d3 from "d3"
import { useEffect, useRef, useState } from "react"

import { MessageTree } from "@/services/messages-api"

interface MessageTreeProps {
  data: MessageTree
  path?: (d: any) => string // as an alternative to id and parentId, returns a path string
  id?: ((d: any) => string) | null // if tabular data, given a d in data, returns a unique identifier (string)
  parentId?: ((d: any) => string) | null // if tabular data, given a node d, returns its parent's identifier
  children?: (d: any) => any[] // if hierarchical data, given a d in data, returns its children
  tree?: typeof d3.tree // layout algorithm (typically d3.tree or d3.cluster)
  sort?: (a: d3.HierarchyNode<unknown>, b: d3.HierarchyNode<unknown>) => number // how to sort nodes prior to layout
  label?: (data: any, node: d3.HierarchyNode<unknown>) => string // given a node d, returns the display name
  link?: (data: any, node: d3.HierarchyNode<unknown>) => string // given a node d, its link (if any)
  linkTarget?: string // the target attribute for links (if any)
  width?: number | string // outer width, in pixels
  height?: number | string // outer height, in pixels
  r?: number // radius of nodes
  padding?: number // horizontal padding for first and last column
  fill?: string // fill for nodes
  fillOpacity?: number // fill opacity for nodes
  stroke?: string // stroke for links
  strokeWidth?: number // stroke width for links
  strokeOpacity?: number // stroke opacity for links
  strokeLinejoin?: string // stroke line join for links
  strokeLinecap?: string // stroke line cap for links
  halo?: string // color of label halo
  haloWidth?: number // padding around the labels
  curve?: d3.CurveFactory // curve for the link,
  highlightPath?: string[]
  highlightPathColor?: string
}

const ERROR_COLOR = "#9e1111"
const SUCCESS_COLOR = "#22bb33"
const USUAL_COLOR = "#555"
const USUAL_COLOR_2 = "#888"

export function MessageTreeGraph({
  data,
  path,
  id = Array.isArray(data) ? (d: any) => d.id : null,
  parentId = Array.isArray(data) ? (d: any) => d.parentId : null,
  children,
  tree = d3.tree,
  sort,
  label,
  link,
  linkTarget = "_blank",
  width = "100%",
  height = "400px",
  r = 3,
  padding = 1,
  fill = "#999",
  fillOpacity,
  stroke = "#555",
  strokeWidth = 1.5,
  strokeOpacity = 0.4,
  strokeLinejoin,
  strokeLinecap,
  halo = "#fff",
  haloWidth = 3,
  curve = d3.curveBumpX,
  highlightPath = [],
  highlightPathColor = SUCCESS_COLOR,
}: MessageTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltips, setTooltips] = useState<{ [id: string]: { x: number; y: number; data: any } }>(
    {},
  )

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = ""

    const wrapperRect = containerRef.current.getBoundingClientRect()

    const width = wrapperRect.width
    const height = wrapperRect.height

    const root: d3.HierarchyNode<unknown> =
      path != null
        ? d3.stratify().path(path as any)(data as any)
        : id != null || parentId != null
          ? d3
              .stratify()
              .id(id as any)
              //   @ts-ignore
              .parentId(parentId as any)(data as any[])
          : d3.hierarchy(data as object, children)

    if (sort != null) root.sort(sort)

    const descendants = root.descendants()
    const L = label == null ? null : descendants.map((d) => label(d.data, d))

    const dx = 10
    const dy = width / (root.height + padding)
    tree().nodeSize([dx + 40, dy])(root as any)

    let x0 = Infinity
    let x1 = -x0
    root.each((d: any) => {
      if (d.x > x1) x1 = d.x
      if (d.x < x0) x0 = d.x
    })

    let actualHeight = height
    if (actualHeight === undefined) actualHeight = x1 - x0 + dx * 2

    if (typeof curve !== "function") throw new Error(`Unsupported curve`)

    const svg = d3
      .create("svg")
      .attr("viewBox", [(-dy * padding) / 2, x0 - dx, width, actualHeight])
      .attr("width", width)
      .attr("height", actualHeight)
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .attr("font-family", "sans-serif")
      .attr("font-size", 12)

    svg
      .append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", strokeOpacity || null)
      .attr("stroke-linecap", strokeLinecap || null)
      .attr("stroke-linejoin", strokeLinejoin || null)
      .attr("stroke-width", strokeWidth)
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr("stroke", (d) => {
        const childrenErrors = d.target.children?.reduce(
          (acc: number, c: any) => acc + (c.data.result?.error ? 1 : 0),
          0,
        )

        if (
          childrenErrors === (d.target.children?.length ?? -1) ||
          (d.target.data as any).result?.error
        ) {
          return ERROR_COLOR
        }

        if (highlightPath[d.target.depth]) {
          // @ts-ignore
          if (highlightPath[d.target.depth] === d.target.data?.tags["Action"]) {
            return highlightPathColor
          }
        }

        return USUAL_COLOR_2
      })
      .attr(
        "d",
        d3
          .link(curve)
          .x((d: any) => d.y)
          .y((d: any) => d.x) as any,
      )

    // TODO(Nikita): Refactor all nodes and links with labels to be under common
    //               g element and apply zoom only to that g
    // const zoom = d3
    //   .zoom<SVGSVGElement, unknown>()
    //   .scaleExtent([1, 1])
    //   .on("zoom", (event) => {
    //     svg.attr("transform", event.transform as any)
    //   })

    // // @ts-ignore
    // svg.call(zoom)

    const node = svg
      .append("g")
      .selectAll("a")
      .data(root.descendants())
      .join("g")
      .attr("class", "node")
      .attr("data-id", (d: any) => d.data.id)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`)

    node
      .append("circle")
      .attr("fill", (d: any) => {
        const message = d.data

        if (d.children) {
          const childrenErrors = d.children.reduce(
            (acc: number, c: any) => acc + (c.data.result?.error ? 1 : 0),
            0,
          )

          if (childrenErrors === d.children.length) {
            return ERROR_COLOR
          }
        }

        if (highlightPath[d.depth]) {
          if (highlightPath[d.depth] === message.tags["Action"]) {
            return highlightPathColor
          }
        }

        if (message.result?.error) {
          return ERROR_COLOR
        } else {
          return d.children ? USUAL_COLOR_2 : USUAL_COLOR
        }
      })
      .attr("r", r)
      .style("cursor", "pointer")

    node.on("click", function (event: MouseEvent, d) {
      event.preventDefault()
      event.stopPropagation()

      const message = d.data as MessageTree | null
      if (!message) {
        console.log("No message found")
        return
      }

      const tooltipWidth = 400
      const tooltipHeight = 300

      const viewportWidth = width
      const viewportHeight = height

      let tooltipX = event.pageX - tooltipWidth / 2
      let tooltipY = event.pageY - tooltipHeight / 2

      if (tooltipX < 0) {
        tooltipX = 10
      }
      if (tooltipX + tooltipWidth > viewportWidth) {
        tooltipX = viewportWidth - tooltipWidth - 10
      }
      if (tooltipY < 0) {
        tooltipY = 10
      }
      if (tooltipY + tooltipHeight > viewportHeight) {
        tooltipY = viewportHeight - tooltipHeight - 10
      }

      setTooltips((prev) => ({
        ...prev,
        [message.id]: {
          x: tooltipX,
          y: tooltipY,
          data: message,
        },
      }))
    })

    if (L)
      node
        .append("text")
        .attr("dy", "0.35em")
        .attr("x", (d: any) => (d.children ? -9 : 9))
        .attr("text-anchor", (d: any) => (d.children ? "end" : "start"))
        .attr("paint-order", "stroke")
        .style("user-select", "none")
        .style("cursor", "pointer")
        .attr("stroke", halo)
        .attr("stroke-width", haloWidth)
        .text((d, i) => L[i])

    containerRef.current.appendChild(svg.node()!)
  }, [
    data,
    path,
    id,
    parentId,
    children,
    tree,
    sort,
    label,
    link,
    linkTarget,
    width,
    height,
    r,
    padding,
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    strokeOpacity,
    strokeLinejoin,
    strokeLinecap,
    halo,
    haloWidth,
    curve,
    highlightPath,
    highlightPathColor,
  ])

  const startDrag = (e: React.MouseEvent, tooltipId: string, width: number, height: number) => {
    e.preventDefault()

    const initialX = e.clientX
    const initialY = e.clientY
    const tooltip = tooltips[tooltipId]
    const initialTooltipX = tooltip.x
    const initialTooltipY = tooltip.y

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - initialX
      const deltaY = moveEvent.clientY - initialY

      let newX = initialTooltipX + deltaX
      let newY = initialTooltipY + deltaY

      const viewportWidth = width
      const viewportHeight = height

      const tooltipWidth = 400
      const tooltipHeight = 300

      if (newX < 0) {
        newX = 0
      }
      if (newX + tooltipWidth > viewportWidth) {
        newX = viewportWidth - tooltipWidth
      }
      if (newY < 0) {
        newY = 0
      }
      if (newY + tooltipHeight > viewportHeight) {
        newY = viewportHeight - tooltipHeight
      }

      setTooltips((prev) => ({
        ...prev,
        [tooltipId]: {
          ...prev[tooltipId],
          x: newX,
          y: newY,
        },
      }))
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const closeTooltip = (tooltipId: string) => {
    setTooltips((prev) => {
      const newTooltips = { ...prev }
      delete newTooltips[tooltipId]
      return newTooltips
    })
  }

  return (
    <div style={{ width, height, position: "relative" }} ref={containerRef}>
      {Object.entries(tooltips).map(([id, tooltip]) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            background: "white",
            border: "1px solid #ccc",
            padding: "8px",
            borderRadius: "4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            zIndex: 1000,
            width: "400px",
            maxHeight: "80vh",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "12px",
            lineHeight: "1.4",
            whiteSpace: "pre-wrap",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "8px",
              cursor: "move",
              padding: "4px",
              background: "#f5f5f5",
              borderBottom: "1px solid #ddd",
            }}
            onMouseDown={(e) => startDrag(e, id, Number(width), Number(height))}
          >
            <span>
              Message Details {tooltip.data.id.slice(0, 5)}...
              {tooltip.data.id.slice(tooltip.data.id.length - 5, tooltip.data.id.length)}
            </span>
            <button
              onClick={() => closeTooltip(id)}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              ×
            </button>
          </div>
          <div>
            <div>
              <span>Message ID:</span>
              <a
                href={`https://www.ao.link/#/message/${tooltip.data.id}`}
                target="_blank"
                referrerPolicy="no-referrer"
              >
                {tooltip.data.id}
              </a>
            </div>
            <div>
              <span>From:</span>
              <a
                href={`https://www.ao.link/#/entity/${tooltip.data.from}`}
                target="_blank"
                referrerPolicy="no-referrer"
              >
                {tooltip.data.from}
              </a>
            </div>
            <div>
              <span>To:</span>
              <a
                href={`https://www.ao.link/#/entity/${tooltip.data.to}`}
                target="_blank"
                referrerPolicy="no-referrer"
              >
                {tooltip.data.to}
              </a>
            </div>
            {tooltip.data.result?.error && <div>Error: {tooltip.data.result.error}</div>}
            <div>Action: {tooltip.data.tags["Action"] ?? ""}</div>
            <div>Timestamp: {new Date(tooltip.data.ingestedAt).toLocaleString()}</div>
            <div>Block Height: {tooltip.data.blockHeight}</div>
            <div>Tags:</div>
            {Object.entries(tooltip.data.tags || {}).map(([key, value]) => (
              <div key={key} style={{ paddingLeft: "12px" }}>
                {key}: {String(value)}
              </div>
            ))}
            <div>
              Produced results: {Object.entries(tooltip.data.result || {}).length.toString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
