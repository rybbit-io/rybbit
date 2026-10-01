import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SankeyDiagram } from "./SankeyDiagram";

const mocks = vi.hoisted(() => ({ push: vi.fn(), width: 1104 as number | null }));

vi.mock("next-intl", () => ({
  useExtracted:
    () =>
    (message: string, values: Record<string, string> = {}) =>
      message.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? ""),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
// jsdom lays nothing out: hand the diagram its width, and the overlay a height.
vi.mock("@uidotdev/usehooks", () => ({ useMeasure: () => [() => {}, { width: mocks.width, height: 200 }] }));

// 1,000 multi-page sessions; these paths cover 600.
const journey = (path: string[], count: number) => ({ path, count, percentage: count / 10 });
const JOURNEYS = [
  journey(["/", "/pricing"], 300),
  journey(["/", "/pricing", "/signup"], 150),
  journey(["/", "/demo", "/pricing", "/signup"], 100),
  journey(["/docs", "/pricing"], 50),
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.width = 1104;
});

const tooltip = () => screen.getByRole("tooltip").textContent;
const label = (text: string) => screen.getAllByText(text)[0];

describe("SankeyDiagram", () => {
  it("renders with the props the user profile passes, and nothing clickable", () => {
    const { container } = render(<SankeyDiagram journeys={JOURNEYS} steps={4} maxJourneys={50} domain="example.com" />);

    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(
      "Sankey diagram of the top 4 paths from session start, 4 steps deep"
    );
    expect(screen.getAllByText("/pricing")).toHaveLength(2);
    expect(container.querySelector(".cursor-pointer")).toBeNull();
    // A page name opens the page itself, as before.
    const link = label("/demo").closest("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/demo");
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("labels each page with its sessions and the share that ended there", () => {
    render(<SankeyDiagram journeys={JOURNEYS} steps={4} maxJourneys={50} domain="example.com" />);

    expect(screen.getByText("550 sessions")).toBeTruthy();
    expect(screen.getByText("500 · 70% end here")).toBeTruthy();
    // /demo at step 2 and /pricing at step 3: everyone on the shown paths went on.
    expect(screen.getAllByText("100 · all continue")).toHaveLength(2);
    // The last step may have been cut short: a count, no exit share.
    expect(screen.getByText("100")).toBeTruthy();
  });

  it("leaves exit shares out when paths are cut at an end page", () => {
    render(<SankeyDiagram journeys={JOURNEYS} steps={4} maxJourneys={50} domain="example.com" exitsKnown={false} />);

    expect(screen.queryByText(/end here/)).toBeNull();
    expect(screen.queryByText(/all continue/)).toBeNull();
  });

  it("draws only the first maxJourneys paths", () => {
    render(<SankeyDiagram journeys={JOURNEYS} steps={4} maxJourneys={1} domain="example.com" />);

    expect(screen.getByText("300 sessions")).toBeTruthy();
    expect(screen.queryByText("/demo")).toBeNull();
  });

  it("shows a page's own share in its tooltip, not that of the first path through it", () => {
    render(<SankeyDiagram journeys={JOURNEYS} steps={4} maxJourneys={50} domain="example.com" />);

    fireEvent.mouseEnter(label("/pricing").closest("g")!);
    expect(tooltip()).toContain("500 sessions · 50.0% of sessions with 2+ pages");
    expect(tooltip()).toContain("350 ended the session here (70%)");
  });

  it("shows a band's share of the page it leaves, not of all bands", () => {
    const { container } = render(<SankeyDiagram journeys={JOURNEYS} steps={4} maxJourneys={50} domain="example.com" />);

    // "/" → "/pricing" is the first band: 450 of the 550 sessions on "/".
    fireEvent.mouseEnter(container.querySelector('path[stroke="transparent"]')!);
    expect(tooltip()).toContain("450 sessions · 81.8% of those on / at step 1");
  });

  it("fades everything off the hovered path", () => {
    const { container } = render(<SankeyDiagram journeys={JOURNEYS} steps={4} maxJourneys={50} domain="example.com" />);
    const bands = () =>
      [...container.querySelectorAll('path:not([stroke="transparent"])')].map(band => band.getAttribute("opacity"));

    expect(new Set(bands())).toEqual(new Set(["0.2"]));
    fireEvent.mouseEnter(label("/demo").closest("g")!);
    // / → /demo → /pricing → /signup stays; the three other bands fade.
    expect(bands().filter(opacity => opacity === "0.45")).toHaveLength(3);
    expect(bands().filter(opacity => opacity === "0.07")).toHaveLength(3);
  });

  it("pins the largest path through a clicked bar or band", () => {
    const onPinPath = vi.fn();
    const { container } = render(
      <SankeyDiagram journeys={JOURNEYS} steps={4} maxJourneys={50} domain="example.com" onPinPath={onPinPath} />
    );

    fireEvent.click(container.querySelector('path[stroke="transparent"]')!);
    expect(onPinPath).toHaveBeenLastCalledWith(["/", "/pricing"]);

    fireEvent.click(label("/demo").closest("g")!.querySelector("rect")!);
    expect(onPinPath).toHaveBeenLastCalledWith(["/", "/demo", "/pricing", "/signup"]);
  });

  it("draws the pinned path at full strength over faded bands", () => {
    const { container } = render(
      <SankeyDiagram
        journeys={JOURNEYS}
        steps={4}
        maxJourneys={50}
        domain="example.com"
        pinnedPath={["/", "/demo", "/pricing", "/signup"]}
      />
    );
    const opacities = [...container.querySelectorAll('path:not([stroke="transparent"])')].map(band =>
      band.getAttribute("opacity")
    );

    expect(opacities.filter(opacity => opacity === "0.9")).toHaveLength(3);
    expect(opacities.filter(opacity => opacity === "0.14")).toHaveLength(6);
  });

  it("sends page names to the app page it is given, and leaves non-pages unlinked", () => {
    render(
      <SankeyDiagram
        journeys={[journey(["/", "/docs/**"], 10)]}
        steps={2}
        maxJourneys={50}
        domain="example.com"
        pageHref={page => (page.includes("*") ? undefined : `/1/pages?page=${page}`)}
      />
    );

    expect(label("/docs/**").closest("a")).toBeNull();
    const link = label("/").closest("a")!;
    expect(link.getAttribute("href")).toBe("/1/pages?page=/");
    fireEvent.click(link);
    expect(mocks.push).toHaveBeenCalledWith("/1/pages?page=/");
  });

  it("draws a header over each step and docks the overlay when there is room", () => {
    render(
      <SankeyDiagram
        journeys={JOURNEYS}
        steps={4}
        maxJourneys={50}
        domain="example.com"
        renderStepHeader={({ index, sessions, previousSessions }) => (
          <span>{`step ${index + 1}: ${sessions} after ${previousSessions}`}</span>
        )}
        overlay={<div>pinned details</div>}
      />
    );

    expect(screen.getByText("step 1: 600 after null")).toBeTruthy();
    expect(screen.getByText("step 3: 250 after 600")).toBeTruthy();
    expect(screen.getByText("pinned details").parentElement?.className).toContain("absolute");
  });

  it("puts the overlay below a diagram too narrow to dock it", () => {
    mocks.width = 360;
    render(
      <SankeyDiagram
        journeys={JOURNEYS}
        steps={4}
        maxJourneys={50}
        domain="example.com"
        overlay={<div>pinned details</div>}
      />
    );

    expect(screen.getByText("pinned details").parentElement?.className).not.toContain("absolute");
  });

  it("draws nothing until it knows its width", () => {
    mocks.width = null;
    render(<SankeyDiagram journeys={JOURNEYS} steps={4} maxJourneys={50} domain="example.com" />);

    expect(screen.queryByRole("img")).toBeNull();
  });
});
