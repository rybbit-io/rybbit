import * as React from "react";
import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rybbit/ui";
import { useForm } from "react-hook-form";

type SiteValues = { domain: string; name: string; timezone: string };

/** Canonical: Form (react-hook-form's FormProvider) wrapping FormField → FormItem → FormLabel/FormControl/FormDescription. */
export function AddSite() {
  const form = useForm<SiteValues>({ defaultValues: { domain: "tomato.gg", name: "", timezone: "UTC" } });
  return (
    <div className="p-4 w-full max-w-md">
      <Form {...form}>
        <form className="grid gap-5" onSubmit={form.handleSubmit(() => {})}>
          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domain</FormLabel>
                <FormControl>
                  <Input placeholder="example.com" {...field} />
                </FormControl>
                <FormDescription>The hostname the tracking script will report from.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display name</FormLabel>
                <FormControl>
                  <Input placeholder="Optional" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a timezone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>Daily reports roll over at midnight in this zone.</FormDescription>
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
    </div>
  );
}

/** Validation error state: FormLabel and FormMessage turn red; FormControl sets aria-invalid. */
export function WithErrors() {
  const form = useForm<SiteValues>({ defaultValues: { domain: "not a domain", name: "", timezone: "" } });
  React.useEffect(() => {
    form.setError("domain", { type: "pattern", message: "Enter a bare hostname like tomato.gg (no protocol or path)." });
    form.setError("timezone", { type: "required", message: "Timezone is required." });
  }, [form]);
  return (
    <div className="p-4 w-full max-w-md">
      <Form {...form}>
        <form className="grid gap-5" onSubmit={form.handleSubmit(() => {})}>
          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domain</FormLabel>
                <FormControl>
                  <Input placeholder="example.com" {...field} />
                </FormControl>
                <FormDescription>The hostname the tracking script will report from.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Timezone</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a timezone" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                  </SelectContent>
                </Select>
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
    </div>
  );
}
