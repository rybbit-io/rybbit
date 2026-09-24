import * as React from "react";
import { Label, MultiSelect } from "@rybbit/ui";

const countries = [
  { value: "US", label: "United States" },
  { value: "DE", label: "Germany" },
  { value: "GB", label: "United Kingdom" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "BR", label: "Brazil" },
  { value: "AQ", label: "Antarctica", disabled: true },
];

/**
 * Canonical: controlled value with three chips, list OPEN. MultiSelect has no `open` prop (the
 * popover is internal state), so the preview clicks the combobox trigger once after mount.
 */
export function CountriesOpen() {
  const [value, setValue] = React.useState(["US", "DE", "GB"]);
  const root = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const btn = root.current?.querySelector<HTMLButtonElement>('button[role="combobox"]');
    btn?.click();
  }, []);
  return (
    <div ref={root} className="p-4 w-96">
      <Label className="mb-1.5 block">Countries</Label>
      <MultiSelect
        options={countries}
        value={value}
        onValueChange={setValue}
        placeholder="Filter by country"
        searchPlaceholder="Search countries"
        emptyText="No country matches."
      />
    </div>
  );
}

/** Closed trigger states: empty placeholder, chips wrapping to two rows, disabled. */
export function TriggerStates() {
  const [a, setA] = React.useState<string[]>([]);
  const [b, setB] = React.useState(["US", "DE", "GB", "FR", "JP"]);
  return (
    <div className="p-4 w-96 flex flex-col gap-3">
      <MultiSelect options={countries} value={a} onValueChange={setA} placeholder="Filter by country" />
      <MultiSelect options={countries} value={b} onValueChange={setB} />
      <MultiSelect options={countries} value={["US"]} disabled />
    </div>
  );
}
