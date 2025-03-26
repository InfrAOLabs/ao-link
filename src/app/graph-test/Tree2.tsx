import * as d3 from "d3"
import { useEffect, useRef } from "react"

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
  curve?: d3.CurveFactory // curve for the link
}

export function MessageTree2({
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
}: MessageTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)

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
      .attr("stroke", stroke)
      .attr("stroke-opacity", strokeOpacity || null)
      .attr("stroke-linecap", strokeLinecap || null)
      .attr("stroke-linejoin", strokeLinejoin || null)
      .attr("stroke-width", strokeWidth)
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr(
        "d",
        d3
          .link(curve)
          .x((d: any) => d.y)
          .y((d: any) => d.x) as any,
      )

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 1])
      .on("zoom", (event) => {
        svg.attr("transform", event.transform as any)
      })

    // @ts-ignore
    svg.call(zoom)

    const node = svg
      .append("g")
      .selectAll("a")
      .data(root.descendants())
      .join("a")
      .attr("xlink:href", link == null ? null : (d) => link(d.data, d))
      .attr("target", link == null ? null : linkTarget)
      .attr("transform", (d: any) => `translate(${d.y},${d.x})`)

    node
      .append("circle")
      .attr("fill", (d: any) => (d.children ? stroke : fill))
      .attr("r", r)

    node
      .on("mouseover", function (event: MouseEvent, d) {
        const message = d.data as MessageTree | null
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
          `Action: ${message.tags["Action"] ?? ""}`,
          `Timestamp: ${new Date(message.ingestedAt).toLocaleString()}`,
          `Block Height: ${message.blockHeight}`,
          "Tags:",
          ...Object.entries(message.tags || {}).map(([key, value]) => `  ${key}: ${value}`),
          "Produced results:",
          Object.entries(message.result || {}).length.toString(),
        ]

        info.forEach((line) => {
          tooltip.append("div").text(line)
        })

        d3.select(this).style("fill", "#6B46C1")
      })
      .on("mouseout", function () {
        d3.selectAll(".tooltip").remove()
        d3.select(this).style("fill", stroke)
      })

    if (L)
      node
        .append("text")
        .attr("dy", "0.35em")
        .attr("x", (d: any) => (d.children ? -9 : 9))
        .attr("text-anchor", (d: any) => (d.children ? "end" : "start"))
        .attr("paint-order", "stroke")
        .style("user-select", "none")
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
  ])

  return <div style={{ width, height }} ref={containerRef} />
}
