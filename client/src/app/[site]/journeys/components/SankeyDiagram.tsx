"use client";

import * as d3 from "d3";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

const MIN_LINK_HEIGHT = 0;
const MAX_LINK_HEIGHT = 100;
const MIN_NODE_HEIGHT = 2;

interface Journey {
  path: string[];
  count: number;
  percentage: number;
}

interface SankeyDiagramProps {
  journeys: Journey[];
  steps: number;
  maxJourneys: number;
  domain: string;
}

export function SankeyDiagram({ journeys, steps, maxJourneys, domain }: SankeyDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!journeys || !svgRef.current || !domain) return;

    // Define theme-based colors
    const isDark = theme === "dark";
    const linkColor = isDark ? "hsl(var(--neutral-500))" : "hsl(var(--neutral-400))";
    const pathTextColor = isDark ? "white" : "hsl(var(--neutral-900))";

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const containerWidth = svgRef.current.parentElement?.clientWidth || 1000;

    // Build nodes and links
    const nodes: any[] = [];
    const links: any[] = [];

    journeys.slice(0, maxJourneys).forEach(journey => {
      for (let i = 0; i < journey.path.length; i++) {
        const stepName = journey.path[i];
        const stepKey = `${i}_${stepName}`;

        if (!nodes.find(n => n.id === stepKey)) {
          nodes.push({
            id: stepKey,
            name: stepName,
            step: i,
            incomingLinks: [],
            outgoingLinks: [],
          });
        }

        if (i < journey.path.length - 1) {
          const sourceKey = stepKey;
          const targetKey = `${i + 1}_${journey.path[i + 1]}`;

          const existingLink = links.find(l => l.source === sourceKey && l.target === targetKey);

          if (existingLink) {
            existingLink.value += journey.count;
          } else {
            links.push({
              source: sourceKey,
              target: targetKey,
              value: journey.count,
            });
          }
        }
      }
    });

    // Group nodes by step
    const nodesByStep = d3.group(nodes, d => d.step);

    // Track incoming and outgoing links for each node
    links.forEach(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);

      if (sourceNode) sourceNode.outgoingLinks.push(link);
      if (targetNode) targetNode.incomingLinks.push(link);
    });

    // Calculate node heights and metadata first (before positioning)
    const maxLinkValue = d3.max(links, link => link.value) || 1;
    const linkWidthScale = d3.scaleLinear().domain([0, maxLinkValue]).range([MIN_LINK_HEIGHT, MAX_LINK_HEIGHT]);

    nodes.forEach(node => {
      const incomingValue = node.incomingLinks.reduce((sum: number, link: any) => sum + link.value, 0);
      const outgoingValue = node.outgoingLinks.reduce((sum: number, link: any) => sum + link.value, 0);
      const maxValue = Math.max(incomingValue, outgoingValue);

      // Apply minimum height to nodes (but not to links/connections)
      node.height = Math.max(linkWidthScale(maxValue), MIN_NODE_HEIGHT);
      node.count = node.step === 0 ? outgoingValue : incomingValue;

      const matchingJourney = journeys.find(journey => journey.path[node.step] === node.name);
      node.percentage = matchingJourney ? matchingJourney.percentage : 0;
    });

    // Calculate dimensions based on actual node heights
    const nodeWidth = 30;
    const width = containerWidth;
    const stepWidth = width / steps;
    const stepSpacing = stepWidth - nodeWidth;
    const nodeGap = 20; // Gap between nodes
    const minHeight = 200;
    const verticalPadding = 10;

    // Calculate the total height needed for each step column
    const stepHeights = Array.from(nodesByStep.values()).map(stepNodes => {
      return stepNodes.reduce((sum, node) => sum + node.height, 0) + (stepNodes.length - 1) * nodeGap;
    });
    const maxStepHeight = Math.max(...stepHeights);
    const height = Math.max(minHeight, maxStepHeight + verticalPadding * 2);

    const margin = { top: 0, right: 0, bottom: verticalPadding, left: 0 };

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Position nodes - align from top so first node of each step is at same height
    nodesByStep.forEach((stepNodes, step) => {
      const stepX = step * stepWidth;
      let currentY = 0;

      stepNodes.forEach(node => {
        node.x = stepX;
        // Position node center based on accumulated height
        node.y = currentY + node.height / 2;
        currentY += node.height + nodeGap;
      });
    });

    // Calculate link positions - stack links within each node, aligned to top
    nodes.forEach(node => {
      node.incomingLinks.sort((a: any, b: any) => b.value - a.value);
      node.outgoingLinks.sort((a: any, b: any) => b.value - a.value);

      // Start outgoing links from top of node
      const outStartY = node.y - node.height / 2;
      let currentOutY = outStartY;
      node.outgoingLinks.forEach((link: any) => {
        const linkHeight = linkWidthScale(link.value);
        link.sourceY = currentOutY + linkHeight / 2;
        currentOutY += linkHeight;
      });

      // Start incoming links from top of node
      const inStartY = node.y - node.height / 2;
      let currentInY = inStartY;
      node.incomingLinks.forEach((link: any) => {
        const linkHeight = linkWidthScale(link.value);
        link.targetY = currentInY + linkHeight / 2;
        currentInY += linkHeight;
      });
    });

    // Helper function to find all connected paths (all reachable nodes/edges)
    const findAllConnectedPaths = (startLink: any, direction: "forward" | "backward"): any[] => {
      const connectedLinks: any[] = [];
      const queue: any[] = [startLink];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const currentLink = queue.shift();
        const linkId = `${currentLink.source}|||${currentLink.target}`;

        if (visited.has(linkId)) continue;
        visited.add(linkId);
        connectedLinks.push(currentLink);

        if (direction === "forward") {
          const targetNode = nodes.find(n => n.id === currentLink.target);
          // Follow all outgoing links
          if (targetNode && targetNode.outgoingLinks.length > 0) {
            targetNode.outgoingLinks.forEach((link: any) => queue.push(link));
          }
        } else {
          const sourceNode = nodes.find(n => n.id === currentLink.source);
          // Follow all incoming links
          if (sourceNode && sourceNode.incomingLinks.length > 0) {
            sourceNode.incomingLinks.forEach((link: any) => queue.push(link));
          }
        }
      }

      return connectedLinks;
    };

    // Helper to generate link path
    const getLinkPath = (d: any) => {
      const source = nodes.find(n => n.id === d.source);
      const target = nodes.find(n => n.id === d.target);

      if (!source || !target) return "";

      const sourceY = d.sourceY || source.y;
      const targetY = d.targetY || target.y;
      const sourceX = source.x + nodeWidth;
      const targetX = target.x;

      const controlPoint1X = sourceX + stepSpacing / 3;
      const controlPoint2X = targetX - stepSpacing / 3;

      return `M ${sourceX},${sourceY}
              C ${controlPoint1X},${sourceY}
                ${controlPoint2X},${targetY}
                ${targetX},${targetY}`;
    };

    // Calculate node colors based on first path segment
    const getFirstSegment = (path: string) => {
      // Split path and get first non-empty segment
      const segments = path.split("/").filter(Boolean);
      return segments.length > 0 ? `/${segments[0]}` : path;
    };

    // Count occurrences of each first segment
    const segmentCounts = new Map<string, number>();
    nodes.forEach(node => {
      const segment = getFirstSegment(node.name);
      segmentCounts.set(segment, (segmentCounts.get(segment) || 0) + 1);
    });

    // Color palette for repeated segments
    const colorPalette = [
      "hsl(160, 45%, 40%)", // teal
      "hsl(220, 45%, 50%)", // blue
      "hsl(270, 40%, 50%)", // purple
      "hsl(25, 50%, 50%)", // orange
      "hsl(340, 40%, 50%)", // pink
      "hsl(190, 45%, 45%)", // cyan
      "hsl(45, 45%, 50%)", // yellow
      "hsl(0, 45%, 50%)", // red
    ];
    const defaultColor = "hsl(0, 0%, 50%)";

    // Assign colors to repeated segments
    const segmentColors = new Map<string, string>();
    let colorIndex = 0;
    segmentCounts.forEach((count, segment) => {
      if (count > 1) {
        segmentColors.set(segment, colorPalette[colorIndex % colorPalette.length]);
        colorIndex++;
      }
    });

    // Get color for a node
    const getNodeColor = (node: any) => {
      const segment = getFirstSegment(node.name);
      return segmentColors.get(segment) || defaultColor;
    };

    // Get color for a link (based on source node)
    const getLinkColor = (d: any) => {
      const sourceNode = nodes.find(n => n.id === d.source);
      return sourceNode ? getNodeColor(sourceNode) : linkColor;
    };

    // Draw links (visual only, events handled by hit areas)
    g.selectAll(".link")
      .data(links)
      .join("path")
      .attr("class", "link")
      .attr("d", getLinkPath)
      .attr("fill", "none")
      .attr("stroke", d => getLinkColor(d))
      .attr("stroke-width", d => linkWidthScale(d.value))
      .attr("opacity", 0.3)
      .attr("data-source", d => d.source)
      .attr("data-target", d => d.target)
      .style("pointer-events", "none");

    // Add tooltip for links
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "sankey-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", isDark ? "hsl(var(--neutral-800))" : "hsl(var(--neutral-100))")
      .style("border", `1px solid ${isDark ? "hsl(var(--neutral-700))" : "hsl(var(--neutral-200))"}`)
      .style("border-radius", "6px")
      .style("padding", "8px 12px")
      .style("font-size", "12px")
      .style("color", isDark ? "white" : "hsl(var(--neutral-900))")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)");

    // Draw nodes
    const nodeGroups = g
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y - d.height / 2})`);

    // Thin bar
    nodeGroups
      .append("rect")
      .attr("class", "node-rect")
      .attr("width", nodeWidth)
      .attr("height", d => d.height)
      .attr("fill", d => getNodeColor(d))
      .attr("rx", 2)
      .attr("ry", 2);

    // Path text (clickable)
    const pathLinks = nodeGroups
      .append("a")
      .attr("xlink:href", d => `https://${domain}${d.name}`)
      .attr("target", "_blank")
      .attr("rel", "noopener noreferrer");

    pathLinks
      .append("text")
      .attr("class", "node-text node-link-text")
      .attr("x", 36)
      .attr("y", d => d.height / 2 + 4)
      .text(d => d.name)
      .attr("font-size", "12px")
      .attr("fill", pathTextColor)
      .attr("text-anchor", "start")
      .style("text-decoration", "none");

    // Add hover effect to show underline on link text
    pathLinks
      .on("mouseenter", function (event, d) {
        d3.select(this).select(".node-link-text").style("text-decoration", "underline");
        // Show tooltip
        tooltip
          .style("visibility", "visible")
          .html(
            `<div style="font-weight: 500; margin-bottom: 4px;">${d.name}</div>` +
              `<div style="color: ${isDark ? "hsl(var(--neutral-300))" : "hsl(var(--neutral-600))"};">` +
              `${d.count.toLocaleString()} visits (${d.percentage.toFixed(1)}%)</div>`
          )
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px");
        // Stop event propagation to prevent nodeGroups handler from firing
        event.stopPropagation();
      })
      .on("mousemove", function (event) {
        tooltip.style("top", event.pageY - 10 + "px").style("left", event.pageX + 10 + "px");
      })
      .on("mouseleave", function () {
        d3.select(this).select(".node-link-text").style("text-decoration", "none");
        tooltip.style("visibility", "hidden");
      });

    // Node hover effects
    nodeGroups
      .on("mouseenter", function (event, d) {
        const nodeId = d.id;
        const connectedNodeIds = new Set<string>([nodeId]);

        // Show tooltip with node info
        tooltip
          .style("visibility", "visible")
          .html(
            `<div style="font-weight: 500; margin-bottom: 4px;">${d.name}</div>` +
              `<div style="color: ${isDark ? "hsl(var(--neutral-300))" : "hsl(var(--neutral-600))"};">` +
              `${d.count.toLocaleString()} visits (${d.percentage.toFixed(1)}%)</div>`
          )
          .style("top", event.pageY - 10 + "px")
          .style("left", event.pageX + 10 + "px");

        // Find all directly connected links
        const directLinks = links.filter(link => link.source === nodeId || link.target === nodeId);

        const allConnectedLinks: any[] = [];

        // For each direct link, find all connected paths
        directLinks.forEach(link => {
          allConnectedLinks.push(link);

          const forwardPaths = findAllConnectedPaths(link, "forward");
          const backwardPaths = findAllConnectedPaths(link, "backward");

          allConnectedLinks.push(...forwardPaths);
          allConnectedLinks.push(...backwardPaths);
        });

        const connectedLinkIds = new Set<string>();

        // Collect all connected link and node IDs
        allConnectedLinks.forEach(link => {
          const linkId = `${link.source}|||${link.target}`;
          connectedLinkIds.add(linkId);
          connectedNodeIds.add(link.source);
          connectedNodeIds.add(link.target);
        });

        d3.selectAll(".link").attr("opacity", function () {
          const linkSource = d3.select(this).attr("data-source");
          const linkTarget = d3.select(this).attr("data-target");
          const thisLinkId = `${linkSource}|||${linkTarget}`;
          return connectedLinkIds.has(thisLinkId) ? 0.6 : 0.1;
        });

        d3.selectAll(".node-rect").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.2;
        });

        d3.selectAll(".node-text").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.3;
        });
      })
      .on("mousemove", function (event) {
        tooltip.style("top", event.pageY - 10 + "px").style("left", event.pageX + 10 + "px");
      })
      .on("mouseleave", function () {
        d3.selectAll(".link")
          .attr("opacity", 0.3)
          .attr("stroke", function () {
            const linkSource = d3.select(this).attr("data-source");
            const link = links.find(l => l.source === linkSource);
            return link ? getLinkColor(link) : linkColor;
          });
        d3.selectAll(".node-rect").attr("opacity", 1);
        d3.selectAll(".node-text").attr("opacity", 1);
        tooltip.style("visibility", "hidden");
      });

    // Invisible wider hit area for easier hovering on thin links (drawn last to be on top)
    g.selectAll(".link-hit-area")
      .data(links)
      .join("path")
      .attr("class", "link-hit-area")
      .attr("d", getLinkPath)
      .attr("fill", "none")
      .attr("stroke", "transparent")
      .attr("stroke-width", d => Math.max(linkWidthScale(d.value), 16))
      .attr("data-source", d => d.source)
      .attr("data-target", d => d.target)
      .style("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        const sourceNode = nodes.find(n => n.id === d.source);
        const targetNode = nodes.find(n => n.id === d.target);
        const totalValue = d3.sum(links, (l: any) => l.value);
        const percentage = ((d.value / totalValue) * 100).toFixed(1);

        tooltip
          .style("visibility", "visible")
          .html(
            `<div style="font-weight: 500; margin-bottom: 4px;">${sourceNode?.name} → ${targetNode?.name}</div>` +
              `<div style="color: ${isDark ? "hsl(var(--neutral-300))" : "hsl(var(--neutral-600))"};">` +
              `${d.value.toLocaleString()} visits (${percentage}%)</div>`
          );

        const forwardPaths = findAllConnectedPaths(d, "forward");
        const backwardPaths = findAllConnectedPaths(d, "backward");
        const allConnectedLinks = [d, ...forwardPaths, ...backwardPaths];

        const connectedLinkIds = new Set<string>();
        const connectedNodeIds = new Set<string>();

        allConnectedLinks.forEach(link => {
          const linkId = `${link.source}|||${link.target}`;
          connectedLinkIds.add(linkId);
          connectedNodeIds.add(link.source);
          connectedNodeIds.add(link.target);
        });

        d3.selectAll(".link").attr("opacity", function () {
          const linkSource = d3.select(this).attr("data-source");
          const linkTarget = d3.select(this).attr("data-target");
          const thisLinkId = `${linkSource}|||${linkTarget}`;
          return connectedLinkIds.has(thisLinkId) ? 0.6 : 0.1;
        });

        d3.selectAll(".node-rect").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.2;
        });

        d3.selectAll(".node-text").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.3;
        });

        tooltip.style("top", event.pageY - 10 + "px").style("left", event.pageX + 10 + "px");
      })
      .on("mousemove", function (event) {
        tooltip.style("top", event.pageY - 10 + "px").style("left", event.pageX + 10 + "px");
      })
      .on("mouseleave", function () {
        d3.selectAll(".link")
          .attr("opacity", 0.3)
          .attr("stroke", function () {
            const linkSource = d3.select(this).attr("data-source");
            const link = links.find(l => l.source === linkSource);
            return link ? getLinkColor(link) : linkColor;
          });
        d3.selectAll(".node-rect").attr("opacity", 1);
        d3.selectAll(".node-text").attr("opacity", 1);
        tooltip.style("visibility", "hidden");
      });

    // Cleanup tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [journeys, steps, maxJourneys, domain, theme]);

  return (
    <div className="overflow-x-auto w-full">
      <svg ref={svgRef} className="min-w-full" />
    </div>
  );
}
