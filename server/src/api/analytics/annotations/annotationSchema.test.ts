import { describe, expect, it } from "vitest";
import { createAnnotationSchema, listAnnotationsQuerySchema, updateAnnotationSchema } from "./annotationSchema.js";

describe("createAnnotationSchema", () => {
  it("normalizes a bare date to midnight UTC and applies defaults", () => {
    const parsed = createAnnotationSchema.parse({ title: "  Launch ", date: "2026-08-18" });
    expect(parsed.date).toBe("2026-08-18T00:00:00.000Z");
    expect(parsed.title).toBe("Launch");
    expect(parsed.scope).toBe("site");
    expect(parsed.isPublic).toBe(false);
  });

  it("keeps the instant of a full timestamp with an offset", () => {
    const parsed = createAnnotationSchema.parse({ title: "Deploy", date: "2026-08-24T16:10:00+02:00" });
    expect(parsed.date).toBe("2026-08-24T14:10:00.000Z");
  });

  it("rejects a range that ends before it starts", () => {
    const result = createAnnotationSchema.safeParse({ title: "Test", date: "2026-08-14", endDate: "2026-08-11" });
    expect(result.success).toBe(false);
  });

  it("rejects unknown colors, empty titles, and garbage dates", () => {
    expect(createAnnotationSchema.safeParse({ title: "x", date: "2026-08-18", color: "emerald" }).success).toBe(false);
    expect(createAnnotationSchema.safeParse({ title: "   ", date: "2026-08-18" }).success).toBe(false);
    expect(createAnnotationSchema.safeParse({ title: "x", date: "yesterday" }).success).toBe(false);
  });
});

describe("updateAnnotationSchema", () => {
  it("rejects an empty update and allows clearing nullable fields", () => {
    expect(updateAnnotationSchema.safeParse({}).success).toBe(false);
    const parsed = updateAnnotationSchema.parse({ endDate: null, description: null, color: null });
    expect(parsed).toEqual({ endDate: null, description: null, color: null });
  });
});

describe("date strictness", () => {
  it("rejects impossible calendar dates and offset-less timestamps", () => {
    expect(createAnnotationSchema.safeParse({ title: "x", date: "2026-02-30" }).success).toBe(false);
    expect(createAnnotationSchema.safeParse({ title: "x", date: "2026-08-18T14:10:00" }).success).toBe(false);
    expect(createAnnotationSchema.safeParse({ title: "x", date: "08/18/2026" }).success).toBe(false);
    expect(createAnnotationSchema.safeParse({ title: "x", date: "2026-08-18T14:10:00Z" }).success).toBe(true);
    expect(createAnnotationSchema.safeParse({ title: "x", date: "2026-08-18T14:10:00.5+0200" }).success).toBe(true);
  });
});

describe("listAnnotationsQuerySchema", () => {
  it("allows either bound alone and rejects reversed or invalid bounds", () => {
    expect(listAnnotationsQuerySchema.safeParse({ start_date: "2026-08-01" }).success).toBe(true);
    expect(listAnnotationsQuerySchema.safeParse({ end_date: "2026-08-31" }).success).toBe(true);
    expect(listAnnotationsQuerySchema.safeParse({ start_date: "2026-08-31", end_date: "2026-08-01" }).success).toBe(false);
    expect(listAnnotationsQuerySchema.safeParse({ start_date: "2026-13-01" }).success).toBe(false);
  });
});
