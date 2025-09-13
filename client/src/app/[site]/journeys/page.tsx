"use client";

import { useJourneys } from "@/api/analytics/useJourneys";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import * as d3 from "d3";
import { AlertCircle } from "lucide-react";
import { DateTime } from "luxon";
import { useEffect, useRef, useState } from "react";
import { useGetSite } from "../../../api/admin/sites";
import { DateSelector } from "../../../components/DateSelector/DateSelector";
import { DateRangeMode, Time } from "../../../components/DateSelector/types";
import { DisabledOverlay } from "../../../components/DisabledOverlay";
import { useSetPageTitle } from "../../../hooks/useSetPageTitle";
import { timeZone } from "../../../lib/dateTimeUtils";
import { MobileSidebar } from "../components/Sidebar/MobileSidebar";

const MAX_LINK_HEIGHT = 100;

export default function JourneysPage() {
  useSetPageTitle("Rybbit · Journeys");

  const [steps, setSteps] = useState<number>(3);
  const [maxJourneys, setMaxJourneys] = useState<number>(25);

  const { data: siteMetadata } = useGetSite();

  const [time, setTime] = useState<Time>({
    mode: "range",
    startDate: DateTime.now().minus({ days: 7 }).toISODate(),
    endDate: DateTime.now().toISODate(),
    wellKnown: "Last 7 days",
    timeZone: timeZone,
  } as DateRangeMode);

  const { data, isLoading, error } = useJourneys({
    siteId: siteMetadata?.siteId,
    steps,
    timeZone: timeZone,
    time,
    limit: maxJourneys,
  });

  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data?.journeys || !svgRef.current || !siteMetadata?.domain) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Get container width for responsive sizing
    const containerWidth = svgRef.current.parentElement?.clientWidth || 1000;

    // Build nodes first to calculate dimensions properly
    const nodes: any[] = [];
    const links: any[] = [];

    data?.journeys?.slice(0, maxJourneys).forEach((journey) => {
      for (let i = 0; i < journey.path.length; i++) {
        const stepName = journey.path[i];
        const stepKey = `${i}_${stepName}`;

        if (!nodes.find((n) => n.id === stepKey)) {
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

          const existingLink = links.find((l) => l.source === sourceKey && l.target === targetKey);

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

    // Calculate dimensions based on node distribution
    const nodesByStep = d3.group(nodes, (d) => d.step);

    // Calculate max nodes per step for height calculation
    const maxNodesInAnyStep = Math.max(...Array.from(nodesByStep.values()).map((stepNodes) => stepNodes.length));

    // Width calculation that fills available space but doesn't shrink below minimum
    const minStepWidth = 300; // Minimum width per step
    const minTotalWidth = minStepWidth * steps; // Minimum total width

    // Calculate step width based on available space
    const stepWidth = Math.max(
      minStepWidth,
      containerWidth / steps // Use full container width if it's large enough
    );

    // Calculate total width based on step width
    const width = stepWidth * steps;

    const minHeight = 500;

    // Calculate height based on maximum node cardinality in any step
    const baseNodeHeight = 60; // Height per node
    const nodeSpacing = 20; // Spacing between nodes
    const height = Math.max(
      minHeight,
      (baseNodeHeight + nodeSpacing) * maxNodesInAnyStep + 100 // 100px for margins
    );

    const margin = { top: 30, right: 30, bottom: 30, left: 30 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create the main group element
    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Track incoming and outgoing links for each node
    links.forEach((link) => {
      const sourceNode = nodes.find((n) => n.id === link.source);
      const targetNode = nodes.find((n) => n.id === link.target);

      if (sourceNode) sourceNode.outgoingLinks.push(link);
      if (targetNode) targetNode.incomingLinks.push(link);
    });

    // Position nodes vertically within each step
    nodesByStep.forEach((stepNodes, step) => {
      const stepX = step * stepWidth;
      const stepHeight = innerHeight / stepNodes.length;

      stepNodes.forEach((node, i) => {
        node.x = stepX;
        node.y = i * stepHeight + stepHeight / 2;
      });
    });

    // Find the maximum link value for scaling
    const maxLinkValue = d3.max(links, (link) => link.value) || 1;
    const linkWidthScale = d3.scaleLinear().domain([0, maxLinkValue]).range([1, MAX_LINK_HEIGHT]);

    // Calculate node heights based on connected links
    nodes.forEach((node) => {
      // Sum the values of incoming and outgoing links
      const incomingValue = node.incomingLinks.reduce((sum: number, link: any) => sum + link.value, 0);
      const outgoingValue = node.outgoingLinks.reduce((sum: number, link: any) => sum + link.value, 0);

      // Use the larger value to determine height
      const maxValue = Math.max(incomingValue, outgoingValue);
      node.height = linkWidthScale(maxValue);

      // Minimum height for visibility
      node.height = Math.max(node.height, 3);

      // Store count for this node (use incoming for all except first step)
      node.count = node.step === 0 ? outgoingValue : incomingValue;

      // Store percentage - find the corresponding journey data
      const matchingJourney = data?.journeys?.find((journey) => {
        // Compare path at this step with node name
        return journey.path[node.step] === node.name;
      });

      // Use the percentage from journey data if available
      node.percentage = matchingJourney ? matchingJourney.percentage : 0;
    });

    // Calculate link positions along each node
    nodes.forEach((node) => {
      // Sort links by value (descending) for consistent ordering
      node.incomingLinks.sort((a: any, b: any) => b.value - a.value);
      node.outgoingLinks.sort((a: any, b: any) => b.value - a.value);

      // Calculate positions for outgoing links
      let currentOutY = 0;
      const totalOutgoing = node.outgoingLinks.reduce((sum: number, link: any) => sum + link.value, 0);

      node.outgoingLinks.forEach((link: any) => {
        const linkHeight = linkWidthScale(link.value);
        // Position at the middle of the allocated segment
        link.sourceY = currentOutY + linkHeight / 2;
        // Update for next link
        currentOutY += linkHeight;
      });

      // Normalize positions to fit within node height
      if (totalOutgoing > 0 && node.outgoingLinks.length > 0) {
        node.outgoingLinks.forEach((link: any) => {
          link.sourceY = (link.sourceY / currentOutY) * node.height - node.height / 2;
          link.sourceY += node.y; // Adjust to node position
        });
      }

      // Calculate positions for incoming links
      let currentInY = 0;
      const totalIncoming = node.incomingLinks.reduce((sum: number, link: any) => sum + link.value, 0);

      node.incomingLinks.forEach((link: any) => {
        const linkHeight = linkWidthScale(link.value);
        // Position at the middle of the allocated segment
        link.targetY = currentInY + linkHeight / 2;
        // Update for next link
        currentInY += linkHeight;
      });

      // Normalize positions to fit within node height
      if (totalIncoming > 0 && node.incomingLinks.length > 0) {
        node.incomingLinks.forEach((link: any) => {
          link.targetY = (link.targetY / currentInY) * node.height - node.height / 2;
          link.targetY += node.y; // Adjust to node position
        });
      }
    });

    // Create links as bezier curves
    g.selectAll(".link")
      .data(links)
      .join("path")
      .attr("class", "link")
      .attr("d", (d) => {
        const source = nodes.find((n) => n.id === d.source);
        const target = nodes.find((n) => n.id === d.target);

        if (!source || !target) return "";

        // Get the specific Y positions for this link
        const sourceY = d.sourceY || source.y;
        const targetY = d.targetY || target.y;

        // Make links connect exactly to the bars (no gap)
        const sourceX = source.x + 10; // End of source bar (x + width)
        const targetX = target.x; // Start of target bar

        // Control points at 1/3 and 2/3 of the distance between nodes
        const controlPoint1X = sourceX + stepWidth / 3;
        const controlPoint2X = targetX - stepWidth / 3;

        return `M ${sourceX},${sourceY} 
                C ${controlPoint1X},${sourceY} 
                  ${controlPoint2X},${targetY} 
                  ${targetX},${targetY}`;
      })
      .attr("fill", "none")
      .attr("stroke", "hsl(var(--accent-500))")
      .attr("stroke-width", (d) => linkWidthScale(d.value))
      .attr("opacity", 0.6)
      .attr("data-id", (d, i) => `link-${i}`) // Add unique identifier for each link
      // Add hover effects
      .on("mouseover", function (event, d) {
        const hoveredLink = d3.select(this);
        const hoveredLinkId = hoveredLink.attr("data-id");

        // Find source and target nodes for this link
        const source = nodes.find((n) => n.id === d.source);
        const target = nodes.find((n) => n.id === d.target);

        // Make all other links more transparent
        d3.selectAll(".link")
          .transition()
          .duration(200)
          .attr("opacity", function () {
            return d3.select(this).attr("data-id") === hoveredLinkId ? 0.9 : 0.1;
          });

        // Make all node bars more transparent except the connected ones
        d3.selectAll(".node-bar")
          .transition()
          .duration(200)
          .attr("opacity", function (nodeData: any) {
            return nodeData.id === source?.id || nodeData.id === target?.id ? 1 : 0.2;
          });

        // Make all node cards more transparent except the connected ones
        d3.selectAll(".node-card")
          .transition()
          .duration(200)
          .attr("opacity", function (nodeData: any) {
            return nodeData.id === source?.id || nodeData.id === target?.id ? 0.9 : 0.2;
          });

        // Highlight connected node text
        d3.selectAll(".node-text")
          .transition()
          .duration(200)
          .attr("opacity", function (nodeData: any) {
            return nodeData.id === source?.id || nodeData.id === target?.id ? 1 : 0.3;
          });
      })
      .on("mouseout", function () {
        // Reset all opacities
        d3.selectAll(".link").transition().duration(200).attr("opacity", 0.6);

        d3.selectAll(".node-bar").transition().duration(200).attr("opacity", 1);

        d3.selectAll(".node-card").transition().duration(200).attr("opacity", 0.8);

        d3.selectAll(".node-text").transition().duration(200).attr("opacity", 1);
      })
      // Add tooltips showing the exact count
      .append("title")
      .text((d) => `Count: ${d.value}`);

    const nodeGroups = g
      .selectAll(".node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.x},${d.y - d.height / 2})`);

    nodeGroups
      .append("rect")
      .attr("class", "node-bar")
      .attr("width", 10)
      .attr("height", (d) => d.height)
      .attr("fill", "hsl(var(--neutral-500))")
      .attr("rx", 2) // Rounded corners
      .attr("ry", 2);

    // Add a card background for text
    const textBackgrounds = nodeGroups
      .append("rect")
      .attr("class", "node-card")
      .attr("x", 18)
      .attr("y", (d) => d.height / 2 - 17) // Position above the vertical center, taller card
      .attr("width", (d) => {
        // Find the width needed for both lines
        const pathText = d.name;
        const statsText = `${d.count} (${d.percentage.toFixed(1)}%)`;
        // Use whichever is longer
        const maxLength = Math.max(pathText.length, statsText.length);
        const textWidth = maxLength * 6.5;
        return textWidth + 10; // Add padding
      })
      .attr("height", 35) // Taller for two lines of text
      .attr("fill", "hsl(var(--neutral-800))")
      .attr("stroke", "hsl(var(--neutral-700))")
      .attr("stroke-width", 1)
      .attr("rx", 2) // Rounded corners
      .attr("ry", 2)
      .attr("opacity", 0.8);

    // Path text (first line) - Now wrapped in a link
    const pathLinks = nodeGroups
      .append("a") // Append 'a' element for the link
      // Construct the URL using the domain from siteMetadata and the path from the node name
      .attr("xlink:href", (d) => `https://${siteMetadata.domain}${d.name}`)
      .attr("target", "_blank") // Open link in a new tab
      .attr("rel", "noopener noreferrer"); // Security best practice for target="_blank"

    pathLinks // Append text inside the link element
      .append("text")
      .attr("class", "node-text node-link-text")
      .attr("x", 23)
      .attr("y", (d) => d.height / 2 - 2)
      .text((d) => d.name)
      .attr("font-size", "12px")
      .attr("fill", "white")
      .attr("text-anchor", "start")
      .style("text-decoration", "none");

    // Count text (second line) - Remains unchanged
    nodeGroups
      .append("text")
      .attr("class", "node-text node-count-text")
      .attr("x", 23) // Same left padding
      .attr("y", (d) => d.height / 2 + 12) // Position for second line
      .text((d) => `${d.count.toLocaleString()}`)
      .attr("font-size", "11px") // Slightly smaller font
      .attr("fill", "hsl(var(--neutral-300))")
      .attr("text-anchor", "start");

    // Note: The percentage text is commented out in the original code, kept it that way.
    //   .text((d) => `${d.count.toLocaleString()} (${d.percentage.toFixed(1)}%)`)
  }, [data, steps, maxJourneys, siteMetadata]);

  return (
    <DisabledOverlay message="User Journeys" featurePath="journeys">
      <div className="container mx-auto p-2 md:p-4">
        <div className="md:hidden mb-2">
          <MobileSidebar />
        </div>
        <div className="flex justify-end items-center gap-2 mb-2">
          <DateSelector time={time} setTime={setTime} pastMinutesEnabled={false} />
          <Select value={steps.toString()} onValueChange={(value) => setSteps(Number(value))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Number of steps" />
            </SelectTrigger>
            <SelectContent>
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => (
                <SelectItem key={step} value={step.toString()}>
                  {step} steps
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={maxJourneys.toString()} onValueChange={(value) => setMaxJourneys(Number(value))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Max journeys" />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100, 150, 200].map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} journeys
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Card className="w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>User Journeys</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex flex-col space-y-4">
                <Skeleton className="h-[1000px] w-full rounded-md" />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Failed to load journey data. Please try again.</AlertDescription>
              </Alert>
            )}

            {data?.journeys?.length === 0 && !isLoading && !error && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Data</AlertTitle>
                <AlertDescription>No journey data found for the selected criteria.</AlertDescription>
              </Alert>
            )}

            {data?.journeys?.length && data?.journeys?.length > 0 ? (
              <div className="overflow-x-auto w-full">
                <svg ref={svgRef} className="min-w-full" />
                {/* <svg ref={svgRef} className="w-full h-[1000px]" /> */}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DisabledOverlay>
  );
}
