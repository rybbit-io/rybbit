---
category: Forms
---

The react-hook-form wiring layer for every settings and create dialog. `Form` is react-hook-form's `FormProvider`: spread the object from `useForm()` into it, then put a real `<form onSubmit={form.handleSubmit(fn)}>` inside. Each field is `FormField` (`control={form.control}`, `name`, and a `render={({ field }) => ...}` that spreads `field` onto the input) → `FormItem` (a `space-y-2` stack that owns the ids) → `FormLabel` (turns red on error) → `FormControl` (a Slot that stamps `id`, `aria-describedby`, `aria-invalid` on the single child control) → `FormDescription` (muted 12.8px helper) → `FormMessage` (red 12.8px; renders the field's error message automatically, or its children, or nothing). `useFormField()` exposes the ids and error inside custom controls.

Conventions: one `FormItem` per field, `grid gap-5` (or `space-y-4`) between them, actions in a right-aligned `flex justify-end gap-2` row with a `ghost` cancel and ONE `accent` submit. Bind non-input controls via their own props: a `Select` takes `value={field.value} onValueChange={field.onChange}` with `FormControl` wrapping the `SelectTrigger`; a `Switch`/`Checkbox` takes `checked={field.value} onCheckedChange={field.onChange}`. Show errors from validation, or set them with `form.setError("domain", { message })`. Use plain `Label` + `Input` only for a single uncontrolled field outside a form.

```tsx
const form = useForm({ defaultValues: { domain: "" } });

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
    <FormField
      control={form.control}
      name="domain"
      rules={{ required: "Domain is required." }}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Domain</FormLabel>
          <FormControl><Input placeholder="example.com" {...field} /></FormControl>
          <FormDescription>The hostname the tracking script will report from.</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost">Cancel</Button>
      <Button type="submit" variant="accent">Add site</Button>
    </div>
  </form>
</Form>
```
