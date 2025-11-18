"use client";

import * as d3 from "d3";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

const MAX_LINK_HEIGHT = 100;

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
    const nodeBubbleBg = isDark ? "hsl(var(--neutral-850))" : "hsl(var(--neutral-100))";
    const nodeBubbleBorder = isDark ? "hsl(var(--neutral-700))" : "hsl(var(--neutral-200))";
    const pathTextColor = isDark ? "white" : "hsl(var(--neutral-900))";
    const countTextColor = isDark ? "hsl(var(--neutral-300))" : "hsl(var(--neutral-600))";

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

    // Calculate dimensions
    const nodesByStep = d3.group(nodes, d => d.step);
    const maxNodesInAnyStep = Math.max(...Array.from(nodesByStep.values()).map(stepNodes => stepNodes.length));

    const nodeWidth = 30;
    const width = containerWidth;
    const stepWidth = width / steps;
    const stepSpacing = stepWidth - nodeWidth;
    const minHeight = 500;
    const baseNodeHeight = 60;
    const nodeSpacing = 20;
    const height = Math.max(minHeight, (baseNodeHeight + nodeSpacing) * maxNodesInAnyStep + 100);

    const margin = { top: 30, right: 0, bottom: 30, left: 0 };
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Track incoming and outgoing links for each node
    links.forEach(link => {
      const sourceNode = nodes.find(n => n.id === link.source);
      const targetNode = nodes.find(n => n.id === link.target);

      if (sourceNode) sourceNode.outgoingLinks.push(link);
      if (targetNode) targetNode.incomingLinks.push(link);
    });

    // Position nodes
    nodesByStep.forEach((stepNodes, step) => {
      const stepX = step * stepWidth;
      const stepHeight = innerHeight / stepNodes.length;

      stepNodes.forEach((node, i) => {
        node.x = stepX;
        node.y = i * stepHeight + stepHeight / 2;
      });
    });

    // Calculate node heights and metadata
    const maxLinkValue = d3.max(links, link => link.value) || 1;
    const linkWidthScale = d3.scaleLinear().domain([0, maxLinkValue]).range([1, MAX_LINK_HEIGHT]);

    nodes.forEach(node => {
      const incomingValue = node.incomingLinks.reduce((sum: number, link: any) => sum + link.value, 0);
      const outgoingValue = node.outgoingLinks.reduce((sum: number, link: any) => sum + link.value, 0);
      const maxValue = Math.max(incomingValue, outgoingValue);

      node.height = linkWidthScale(maxValue);
      node.count = node.step === 0 ? outgoingValue : incomingValue;

      const matchingJourney = journeys.find(journey => journey.path[node.step] === node.name);
      node.percentage = matchingJourney ? matchingJourney.percentage : 0;
    });

    // Calculate link positions
    nodes.forEach(node => {
      node.incomingLinks.sort((a: any, b: any) => b.value - a.value);
      node.outgoingLinks.sort((a: any, b: any) => b.value - a.value);

      let currentOutY = 0;
      node.outgoingLinks.forEach((link: any) => {
        const linkHeight = linkWidthScale(link.value);
        link.sourceY = currentOutY + linkHeight / 2;
        currentOutY += linkHeight;
      });

      if (currentOutY > 0 && node.outgoingLinks.length > 0) {
        node.outgoingLinks.forEach((link: any) => {
          link.sourceY = (link.sourceY / currentOutY) * node.height - node.height / 2;
          link.sourceY += node.y;
        });
      }

      let currentInY = 0;
      node.incomingLinks.forEach((link: any) => {
        const linkHeight = linkWidthScale(link.value);
        link.targetY = currentInY + linkHeight / 2;
        currentInY += linkHeight;
      });

      if (currentInY > 0 && node.incomingLinks.length > 0) {
        node.incomingLinks.forEach((link: any) => {
          link.targetY = (link.targetY / currentInY) * node.height - node.height / 2;
          link.targetY += node.y;
        });
      }
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

    // Draw links
    const linkElements = g
      .selectAll(".link")
      .data(links)
      .join("path")
      .attr("class", "link")
      .attr("d", d => {
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
      })
      .attr("fill", "none")
      .attr("stroke", linkColor)
      .attr("stroke-width", d => linkWidthScale(d.value))
      .attr("opacity", 0.2)
      .attr("data-source", d => d.source)
      .attr("data-target", d => d.target)
      .style("cursor", "pointer")
      .style("pointer-events", "visibleStroke")
      .on("mouseenter", function (event, d) {
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

        d3.selectAll(".link")
          .attr("opacity", function () {
            const linkSource = d3.select(this).attr("data-source");
            const linkTarget = d3.select(this).attr("data-target");
            const thisLinkId = `${linkSource}|||${linkTarget}`;
            return connectedLinkIds.has(thisLinkId) ? 0.5 : 0.1;
          })
          .attr("stroke", function () {
            const linkSource = d3.select(this).attr("data-source");
            const linkTarget = d3.select(this).attr("data-target");
            const thisLinkId = `${linkSource}|||${linkTarget}`;
            return connectedLinkIds.has(thisLinkId) ? "hsl(var(--emerald-600))" : linkColor;
          });

        d3.selectAll(".node-rect").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.2;
        });

        d3.selectAll(".node-bubble").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.2;
        });

        d3.selectAll(".node-text").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.3;
        });
      })
      .on("mouseleave", function () {
        d3.selectAll(".link").attr("opacity", 0.2).attr("stroke", linkColor);
        d3.selectAll(".node-rect").attr("opacity", 1);
        d3.selectAll(".node-bubble").attr("opacity", 1);
        d3.selectAll(".node-text").attr("opacity", 1);
      })
      .append("title")
      .text(d => `Count: ${d.value}`);

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
      .attr("fill", "hsl(var(--emerald-600))")
      .attr("rx", 2)
      .attr("ry", 2);

    // Bubble background
    nodeGroups
      .append("rect")
      .attr("class", "node-bubble")
      .attr("x", 12)
      .attr("y", 4)
      .attr("width", d => {
        const pathText = d.name;
        const statsText = `${d.count.toLocaleString()} (${d.percentage.toFixed(1)}%)`;
        const maxLength = Math.max(pathText.length, statsText.length);
        const textWidth = maxLength * 6.5;
        return textWidth + 10;
      })
      .attr("height", 41)
      .attr("fill", nodeBubbleBg)
      .attr("stroke", nodeBubbleBorder)
      .attr("stroke-width", 1)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("opacity", 1);

    // Path text (clickable)
    const pathLinks = nodeGroups
      .append("a")
      .attr("xlink:href", d => `https://${domain}${d.name}`)
      .attr("target", "_blank")
      .attr("rel", "noopener noreferrer");

    pathLinks
      .append("text")
      .attr("class", "node-text node-link-text")
      .attr("x", 19)
      .attr("y", 21)
      .text(d => d.name)
      .attr("font-size", "12px")
      .attr("fill", pathTextColor)
      .attr("text-anchor", "start")
      .style("text-decoration", "none");

    // Add hover effect to show underline on link text
    pathLinks
      .on("mouseenter", function () {
        d3.select(this).select(".node-link-text").style("text-decoration", "underline");
      })
      .on("mouseleave", function () {
        d3.select(this).select(".node-link-text").style("text-decoration", "none");
      });

    // Count text
    nodeGroups
      .append("text")
      .attr("class", "node-text")
      .attr("x", 19)
      .attr("y", 37)
      .text(d => `${d.count.toLocaleString()} (${d.percentage.toFixed(1)}%)`)
      .attr("font-size", "11px")
      .attr("fill", countTextColor)
      .attr("text-anchor", "start");

    // Node hover effects
    nodeGroups
      .on("mouseenter", function (event, d) {
        const nodeId = d.id;
        const connectedNodeIds = new Set<string>([nodeId]);

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

        d3.selectAll(".link")
          .attr("opacity", function () {
            const linkSource = d3.select(this).attr("data-source");
            const linkTarget = d3.select(this).attr("data-target");
            const thisLinkId = `${linkSource}|||${linkTarget}`;
            return connectedLinkIds.has(thisLinkId) ? 0.5 : 0.1;
          })
          .attr("stroke", function () {
            const linkSource = d3.select(this).attr("data-source");
            const linkTarget = d3.select(this).attr("data-target");
            const thisLinkId = `${linkSource}|||${linkTarget}`;
            return connectedLinkIds.has(thisLinkId) ? "hsl(var(--emerald-600))" : linkColor;
          });

        d3.selectAll(".node-rect").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.2;
        });

        d3.selectAll(".node-bubble").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.2;
        });

        d3.selectAll(".node-text").attr("opacity", function (nodeData: any) {
          return connectedNodeIds.has(nodeData.id) ? 1 : 0.3;
        });
      })
      .on("mouseleave", function () {
        d3.selectAll(".link").attr("opacity", 0.2).attr("stroke", linkColor);
        d3.selectAll(".node-rect").attr("opacity", 1);
        d3.selectAll(".node-bubble").attr("opacity", 1);
        d3.selectAll(".node-text").attr("opacity", 1);
      });
  }, [journeys, steps, maxJourneys, domain, theme]);

  return (
    <div className="overflow-x-auto w-full">
      <svg ref={svgRef} className="min-w-full" />
    </div>
  );
}
