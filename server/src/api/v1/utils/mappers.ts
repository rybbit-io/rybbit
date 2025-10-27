/**
 * Response transformation utilities
 * Standardizes camelCase -> snake_case conversions
 */

/**
 * Maps funnel steps from database format to API format
 * Replaces duplicate mapping in funnels.ts (lines 78-83 and 132-137)
 */
export function mapFunnelSteps(steps: any[]): any[] {
  return steps.map(step => ({
    id: step.id,
    key: step.key,
    name: step.name,
    order: step.order,
    step_type: step.stepType,
    page_pattern: step.pagePattern,
    event_name: step.eventName,
    event_property_key: step.eventPropertyKey,
    event_property_value: step.eventPropertyValue,
  }));
}

/**
 * Normalizes funnel step input from API format to service format
 * Used in POST and PATCH endpoints
 * Supports both camelCase and snake_case input for flexibility
 * Note: Prioritizes page_pattern (snake_case) as it's the validated Zod field
 */
export function normalizeStepInput(steps: any[]): any[] {
  return steps.map(step => ({
    key: step.key,
    name: step.name,
    order: step.order ?? undefined,
    stepType: step.step_type ?? step.stepType ?? 'page',
    pagePattern: step.page_pattern ?? step.pagePattern ?? undefined,
    eventName: step.event_name ?? step.eventName ?? undefined,
    eventPropertyKey: step.event_property_key ?? step.eventPropertyKey ?? undefined,
    eventPropertyValue: step.event_property_value ?? step.eventPropertyValue ?? undefined,
  }));
}

/**
 * Maps complete funnel record to API response format
 */
export function mapFunnelToResponse(funnel: any): any {
  return {
    id: funnel.id,
    name: funnel.name,
    description: funnel.description,
    is_active: funnel.isActive,
    created_at: funnel.createdAt,
    updated_at: funnel.updatedAt,
    steps: mapFunnelSteps(funnel.steps || []),
  };
}

/**
 * Builds partial update object from validated input
 * Replaces verbose if-checks in PATCH handlers
 */
export function buildPartialUpdate<T extends Record<string, any>>(
  input: Record<string, any>,
  fieldMap: Record<string, string>
): Partial<T> {
  const result: Partial<T> = {};

  for (const [apiField, dbField] of Object.entries(fieldMap)) {
    if (input[apiField] !== undefined) {
      (result as any)[dbField] = input[apiField];
    }
  }

  return result;
}
