import { ALL_CLIENT_BOT_SIGNAL_BITS, MAX_CLIENT_BOT_SCORE } from "@rybbit/shared";
import { z } from "zod";

// Shared fields for all event types
const baseEventFields = {
  site_id: z.string().min(1),
  hostname: z.string().max(253).optional(),
  pathname: z.string().max(2048).optional(),
  querystring: z.string().max(2048).optional(),
  screenWidth: z.number().int().nonnegative().optional(),
  screenHeight: z.number().int().nonnegative().optional(),
  language: z.string().max(35).optional(),
  page_title: z.string().max(512).optional(),
  referrer: z.string().max(2048).optional(),
  anonymous_id: z.string().min(1).max(255).optional(),
  user_id: z.string().max(255).optional(),
  tag: z.string().max(256).optional(),
  feature_flags: z.record(z.string().max(100), z.string().max(2048)).optional(),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().max(512).optional(),
  // Bounds come from the Bot Signal contract, so appending a signal bit widens
  // the accepted mask with it. Hard-coding the bound is how the 12th bit
  // (squareScreen = 2048) came to fail validation and drop the whole event.
  _bs: z.number().int().min(0).max(MAX_CLIENT_BOT_SCORE).optional(),
  _bsm: z.number().int().min(0).max(ALL_CLIENT_BOT_SIGNAL_BITS).optional(),
  // Sent by native SDKs (rybbit-flutter and friends); browsers never set these.
  app_version: z.string().max(50).optional(),
  device_model: z.string().max(200).optional(),
};

// Default event_name and properties used by pageview and performance
const defaultEventProps = {
  event_name: z.string().max(256).optional(),
  properties: z.string().max(2048).optional(),
};

// Reusable JSON validation refine
const jsonStringRefine = (message: string) =>
  z
    .string()
    .max(2048)
    .refine(
      val => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      },
      { message }
    )
    .optional();

// Define Zod schema for validation
export const trackingPayloadSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("pageview"),
      ...baseEventFields,
      ...defaultEventProps,
    })
    .strict(),
  z
    .object({
      type: z.literal("custom_event"),
      ...baseEventFields,
      event_name: z.string().min(1).max(256),
      properties: jsonStringRefine("Properties must be a valid JSON string"),
    })
    .strict(),
  z
    .object({
      type: z.literal("performance"),
      ...baseEventFields,
      ...defaultEventProps,
      // Performance metrics (can be null if not collected)
      lcp: z.number().min(0).nullable().optional(),
      cls: z.number().min(0).nullable().optional(),
      inp: z.number().min(0).nullable().optional(),
      fcp: z.number().min(0).nullable().optional(),
      ttfb: z.number().min(0).nullable().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("outbound"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: z
        .string()
        .max(2048)
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.url !== "string" || parsed.url.length === 0) return false;
              if (parsed.text && typeof parsed.text !== "string") return false;
              if (parsed.target && typeof parsed.target !== "string") return false;
              try {
                new URL(parsed.url);
              } catch {
                return false;
              }
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Properties must be valid JSON with outbound link fields (url required, text and target optional)",
          }
        ),
    })
    .strict(),
  z
    .object({
      type: z.literal("error"),
      ...baseEventFields,
      event_name: z.string().min(1).max(256), // Error type (TypeError, ReferenceError, etc.)
      properties: z
        .string()
        .max(4096) // Larger limit for error details
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.message !== "string") return false;
              if (parsed.stack && typeof parsed.stack !== "string") return false;
              if (parsed.fileName && typeof parsed.fileName !== "string") return false;
              if (parsed.lineNumber && typeof parsed.lineNumber !== "number") return false;
              if (parsed.columnNumber && typeof parsed.columnNumber !== "number") return false;
              // Apply truncation limits
              if (parsed.message && parsed.message.length > 500) {
                parsed.message = parsed.message.substring(0, 500);
              }
              if (parsed.stack && parsed.stack.length > 2000) {
                parsed.stack = parsed.stack.substring(0, 2000);
              }
              return true;
            } catch {
              return false;
            }
          },
          {
            message:
              "Properties must be valid JSON with error fields (message, stack, fileName, lineNumber, columnNumber)",
          }
        ),
    })
    .strict(),
  z
    .object({
      type: z.literal("button_click"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: jsonStringRefine("Properties must be valid JSON"),
    })
    .strict(),
  z
    .object({
      type: z.literal("copy"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: z
        .string()
        .max(2048)
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.sourceElement !== "string") return false;
              if (parsed.text !== undefined && typeof parsed.text !== "string") return false;
              if (parsed.textLength !== undefined && (typeof parsed.textLength !== "number" || parsed.textLength < 0))
                return false;
              return true;
            } catch {
              return false;
            }
          },
          {
            message:
              "Properties must be valid JSON with copy fields (sourceElement required, text and textLength optional)",
          }
        ),
    })
    .strict(),
  z
    .object({
      type: z.literal("form_submit"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: z
        .string()
        .max(2048)
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.formId !== "string") return false;
              if (typeof parsed.formName !== "string") return false;
              if (typeof parsed.formAction !== "string") return false;
              if (typeof parsed.method !== "string") return false;
              if (typeof parsed.fieldCount !== "number" || parsed.fieldCount < 0) return false;
              return true;
            } catch {
              return false;
            }
          },
          {
            message:
              "Properties must be valid JSON with form_submit fields (formId, formName, formAction, method, fieldCount required)",
          }
        ),
    })
    .strict(),
  z
    .object({
      type: z.literal("input_change"),
      ...baseEventFields,
      event_name: z.string().max(256).optional(),
      properties: z
        .string()
        .max(2048)
        .refine(
          val => {
            try {
              const parsed = JSON.parse(val);
              if (typeof parsed.element !== "string") return false;
              if (typeof parsed.inputName !== "string") return false;
              return true;
            } catch {
              return false;
            }
          },
          {
            message: "Properties must be valid JSON with input_change fields (element, inputName required)",
          }
        ),
    })
    .strict(),
]);

/** The event body after validation — the only shape ingestion ever sees. */
export type ValidatedTrackingPayload = z.infer<typeof trackingPayloadSchema>;
