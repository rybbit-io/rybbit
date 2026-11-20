import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "../../../../components/ui/tooltip";
import { QueryEditor } from "./QueryEditor";

vi.mock("next-intl", () => ({ useExtracted: () => (message: string) => message }));

afterEach(() => {
  cleanup();
});

function renderEditor(props: Partial<ComponentProps<typeof QueryEditor>> = {}) {
  const onRun = vi.fn();
  // The app mounts one TooltipProvider at the root; the header's copy button needs it.
  render(
    <TooltipProvider>
      <QueryEditor
        value="SELECT 1"
        disabled={false}
        isRunning={false}
        onChange={() => {}}
        onFormat={() => {}}
        onRun={onRun}
        {...props}
      />
    </TooltipProvider>
  );
  return { onRun, editor: screen.getByRole("textbox", { name: "SQL query" }) };
}

describe("QueryEditor run shortcut", () => {
  it.each([
    ["⌘Enter", { metaKey: true }],
    ["Ctrl+Enter", { ctrlKey: true }],
  ])("runs the query on %s", (_name, modifiers) => {
    const { onRun, editor } = renderEditor();

    fireEvent.keyDown(editor, { key: "Enter", ...modifiers });

    expect(onRun).toHaveBeenCalledOnce();
  });

  it("leaves a plain Enter to the textarea", () => {
    const { onRun, editor } = renderEditor();

    const notPrevented = fireEvent.keyDown(editor, { key: "Enter" });

    expect(notPrevented).toBe(true);
    expect(onRun).not.toHaveBeenCalled();
  });

  it.each([
    ["the editor is empty", { value: "  \n " }],
    ["the editor is disabled", { disabled: true }],
    ["a run is already in flight", { readOnly: true, isRunning: true }],
  ])("does nothing when %s", (_name, props) => {
    const { onRun, editor } = renderEditor(props);

    fireEvent.keyDown(editor, { key: "Enter", metaKey: true });

    expect(onRun).not.toHaveBeenCalled();
  });

  it("keeps the editor focusable while a run is in flight", () => {
    const { editor } = renderEditor({ readOnly: true, isRunning: true });

    expect(editor.hasAttribute("disabled")).toBe(false);
    expect(editor.hasAttribute("readonly")).toBe(true);
    expect(screen.getByRole("button", { name: "Run" }).hasAttribute("disabled")).toBe(true);
  });

  it("advertises the shortcut on the Run button", () => {
    renderEditor();

    expect(screen.getByRole("button", { name: "Run" }).getAttribute("aria-keyshortcuts")).toBe(
      "Meta+Enter Control+Enter"
    );
  });
});
