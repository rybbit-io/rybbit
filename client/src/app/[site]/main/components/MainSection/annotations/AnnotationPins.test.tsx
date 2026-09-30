import type { Annotation } from "@rybbit/shared";
import { scaleLinear, scaleTime } from "d3";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AnnotationPins } from "./AnnotationPins";

afterEach(cleanup);

it("opens an annotation cluster with Enter and Space", () => {
  const onSelect = vi.fn();
  const annotation: Annotation = {
    annotationId: 1,
    siteId: 7,
    organizationId: "org",
    userId: "u",
    userName: "Visitor",
    title: "Launch",
    description: null,
    date: "2026-09-01T12:00:00Z",
    endDate: null,
    color: null,
    icon: null,
    isPublic: false,
    createdAt: "",
    updatedAt: "",
  };
  const context = {
    xScale: scaleTime()
      .domain([new Date("2026-09-01T00:00:00Z"), new Date("2026-09-02T00:00:00Z")])
      .range([0, 500]),
    yScale: scaleLinear().domain([0, 10]).range([200, 0]),
    plotLeft: 0,
    plotRight: 500,
    plotTop: 0,
    plotBottom: 200,
    pointAt: () => undefined,
    isDark: true,
  };
  render(
    <svg>
      <AnnotationPins
        context={context}
        annotations={[annotation]}
        bucket="hour"
        selectedKey={null}
        onSelect={onSelect}
        onHover={vi.fn()}
      />
    </svg>
  );
  const pin = screen.getByRole("button", { name: "Launch" });
  expect(pin.getAttribute("tabindex")).toBe("0");
  fireEvent.keyDown(pin, { key: "Enter" });
  fireEvent.keyDown(pin, { key: " " });
  fireEvent.keyDown(pin, { key: "Escape" });
  expect(onSelect).toHaveBeenCalledTimes(2);
});
