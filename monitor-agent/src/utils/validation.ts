import { HttpCheckResult, ValidationRule } from '../types.js';

export function applyValidationRules(
  result: HttpCheckResult,
  rules: ValidationRule[]
): string[] {
  const errors: string[] = [];
  
  for (const rule of rules) {
    switch (rule.type) {
      case 'status_code':
        if (!validateStatusCode(result.statusCode, rule)) {
          errors.push(
            `Status code validation failed: expected ${rule.operator} ${rule.value}, got ${result.statusCode}`
          );
        }
        break;
        
      case 'response_time':
        if (!validateResponseTime(result.responseTimeMs, rule)) {
          errors.push(
            `Response time validation failed: expected ${rule.operator} ${rule.value}ms, got ${result.responseTimeMs}ms`
          );
        }
        break;
        
      case 'header_exists':
        if (!result.headers[rule.header!]) {
          errors.push(`Required header missing: ${rule.header}`);
        }
        break;
        
      case 'header_value':
        const headerValue = result.headers[rule.header!];
        if (!validateHeaderValue(headerValue, rule)) {
          errors.push(
            `Header ${rule.header} validation failed: expected ${rule.operator} "${rule.value}", got "${headerValue}"`
          );
        }
        break;
        
      case 'response_size':
        if (!validateSize(result.bodySizeBytes, rule)) {
          errors.push(
            `Response size validation failed: expected ${rule.operator} ${rule.value} bytes, got ${result.bodySizeBytes} bytes`
          );
        }
        break;
        
      // Note: response_body_contains validation would require storing the body
      // which we're avoiding for performance reasons
    }
  }
  
  return errors;
}

function validateStatusCode(statusCode: number | undefined, rule: ValidationRule): boolean {
  if (statusCode === undefined) return false;
  
  switch (rule.operator) {
    case 'equals':
      return statusCode === rule.value;
    case 'not_equals':
      return statusCode !== rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(statusCode);
    case 'not_in':
      return Array.isArray(rule.value) && !rule.value.includes(statusCode);
    default:
      return true;
  }
}

function validateResponseTime(responseTime: number, rule: ValidationRule): boolean {
  switch (rule.operator) {
    case 'less_than':
      return responseTime < rule.value;
    case 'greater_than':
      return responseTime > rule.value;
    default:
      return true;
  }
}

function validateHeaderValue(headerValue: string | undefined, rule: ValidationRule): boolean {
  if (!headerValue) return false;
  
  switch (rule.operator) {
    case 'equals':
      return headerValue === rule.value;
    case 'contains':
      return headerValue.includes(rule.value);
    default:
      return true;
  }
}

function validateSize(size: number, rule: ValidationRule): boolean {
  switch (rule.operator) {
    case 'less_than':
      return size < rule.value;
    case 'greater_than':
      return size > rule.value;
    default:
      return true;
  }
}