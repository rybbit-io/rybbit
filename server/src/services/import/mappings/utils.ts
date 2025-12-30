import { z } from "zod";

export function deriveKeyOnlySchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.ZodObject<{
  [K in keyof T]: z.ZodString;
}> {
  const shape = schema.shape;
  const keyOnlyShape = Object.keys(shape).reduce(
    (acc, key) => {
      acc[key as keyof T] = z.string();
      return acc;
    },
    {} as { [K in keyof T]: z.ZodString }
  );

  return z.object(keyOnlyShape);
}
