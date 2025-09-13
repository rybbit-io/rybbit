import { HttpCheckResult, ValidationRule } from './types.js';

export function applyValidationRules(
  result: HttpCheckResult,
  rules: ValidationRule[],
  responseBody?: string
): string[] {
  const errors: string[] = [];
  
  for (const rule of rules) {
    try {
      const error = validateRule(result, rule, responseBody);
      if (error) {
        errors.push(error);
      }
    } catch (e) {
      errors.push(`Validation rule error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }
  
  return errors;
}

function validateRule(
  result: HttpCheckResult,
  rule: ValidationRule,
  responseBody?: string
): string | null {
  switch (rule.type) {
    case 'status_code':
      if (!result.statusCode) return null;
      return validateStatusCode(result.statusCode, rule);
      
    case 'response_time':
      return validateResponseTime(result.responseTimeMs, rule);
      
    case 'response_body_contains':
      if (!responseBody) return 'Response body is empty';
      return validateBodyContains(responseBody, rule, true);
      
    case 'response_body_not_contains':
      if (!responseBody) return null;
      return validateBodyContains(responseBody, rule, false);
      
    case 'header_exists':
      return validateHeaderExists(result.headers, rule);
      
    case 'header_value':
      return validateHeaderValue(result.headers, rule);
      
    case 'response_size':
      return validateResponseSize(result.bodySizeBytes, rule);
      
    default:
      return `Unknown validation rule type: ${rule.type}`;
  }
}

function validateStatusCode(statusCode: number, rule: ValidationRule): string | null {
  const value = rule.value;
  
  switch (rule.operator) {
    case 'equals':
      if (statusCode !== value) {
        return `Status code ${statusCode} does not equal ${value}`;
      }
      break;
      
    case 'not_equals':
      if (statusCode === value) {
        return `Status code ${statusCode} equals ${value}`;
      }
      break;
      
    case 'in':
      if (Array.isArray(value) && !value.includes(statusCode)) {
        return `Status code ${statusCode} is not in [${value.join(', ')}]`;
      }
      break;
      
    case 'not_in':
      if (Array.isArray(value) && value.includes(statusCode)) {
        return `Status code ${statusCode} is in [${value.join(', ')}]`;
      }
      break;
  }
  
  return null;
}

function validateResponseTime(responseTimeMs: number, rule: ValidationRule): string | null {
  const value = rule.value as number;
  
  switch (rule.operator) {
    case 'less_than':
      if (responseTimeMs >= value) {
        return `Response time ${responseTimeMs}ms is not less than ${value}ms`;
      }
      break;
      
    case 'greater_than':
      if (responseTimeMs <= value) {
        return `Response time ${responseTimeMs}ms is not greater than ${value}ms`;
      }
      break;
  }
  
  return null;
}

function validateBodyContains(
  body: string,
  rule: ValidationRule,
  shouldContain: boolean
): string | null {
  const searchValue = String(rule.value);
  const caseSensitive = rule.caseSensitive !== false;
  
  const bodyToSearch = caseSensitive ? body : body.toLowerCase();
  const valueToSearch = caseSensitive ? searchValue : searchValue.toLowerCase();
  
  const contains = bodyToSearch.includes(valueToSearch);
  
  if (shouldContain && !contains) {
    return `Response body does not contain "${searchValue}"`;
  } else if (!shouldContain && contains) {
    return `Response body contains "${searchValue}"`;
  }
  
  return null;
}

function validateHeaderExists(
  headers: Record<string, string>,
  rule: ValidationRule
): string | null {
  if (!rule.header) return 'Header name not specified';
  
  const headerKey = Object.keys(headers).find(
    key => key.toLowerCase() === rule.header!.toLowerCase()
  );
  
  if (!headerKey) {
    return `Header "${rule.header}" does not exist`;
  }
  
  return null;
}

function validateHeaderValue(
  headers: Record<string, string>,
  rule: ValidationRule
): string | null {
  if (!rule.header) return 'Header name not specified';
  
  const headerKey = Object.keys(headers).find(
    key => key.toLowerCase() === rule.header!.toLowerCase()
  );
  
  if (!headerKey) {
    return `Header "${rule.header}" does not exist`;
  }
  
  const headerValue = headers[headerKey];
  const expectedValue = String(rule.value);
  
  switch (rule.operator) {
    case 'equals':
      if (headerValue !== expectedValue) {
        return `Header "${rule.header}" value "${headerValue}" does not equal "${expectedValue}"`;
      }
      break;
      
    case 'contains':
      if (!headerValue.includes(expectedValue)) {
        return `Header "${rule.header}" value "${headerValue}" does not contain "${expectedValue}"`;
      }
      break;
  }
  
  return null;
}

function validateResponseSize(
  sizeBytes: number,
  rule: ValidationRule
): string | null {
  const value = rule.value as number;
  
  switch (rule.operator) {
    case 'less_than':
      if (sizeBytes >= value) {
        return `Response size ${sizeBytes} bytes is not less than ${value} bytes`;
      }
      break;
      
    case 'greater_than':
      if (sizeBytes <= value) {
        return `Response size ${sizeBytes} bytes is not greater than ${value} bytes`;
      }
      break;
  }
  
  return null;
}