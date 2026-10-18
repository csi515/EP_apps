/**
 * Dynamic Schema Form Builder & Zod Validator Generator.
 *
 * CapabilitySetupSchema로부터 런타임 Zod 스키마 및 기본값 객체를 동적 생성한다.
 */

import { z, type ZodTypeAny } from 'zod';
import type { CapabilitySetupSchema, SetupFieldDefinition } from '@/core/presets/types';

/**
 * 단일 SetupFieldDefinition에 대한 Zod 필드 스키마 생성
 */
export function buildFieldZodSchema(field: SetupFieldDefinition): ZodTypeAny {
  let fieldSchema: ZodTypeAny;

  switch (field.type) {
    case 'number': {
      let numSchema = z.coerce.number();
      if (field.required) {
        numSchema = numSchema.refine((v) => !isNaN(v), {
          message: `${field.label}을(를) 입력해 주세요.`,
        });
      }
      fieldSchema = field.required ? numSchema : numSchema.optional().nullable();
      break;
    }

    case 'boolean': {
      fieldSchema = z.boolean().default(Boolean(field.defaultValue));
      break;
    }

    case 'tags': {
      const arraySchema = z.array(z.string());
      fieldSchema = field.required
        ? arraySchema.min(1, `${field.label}에 최소 1개 이상의 태그를 입력해 주세요.`)
        : arraySchema.default([]);
      break;
    }

    case 'select': {
      const validOptions = field.options?.map((opt) => String(opt.value)) ?? [];
      let selectSchema = z.string();
      if (field.required) {
        selectSchema = selectSchema.min(1, `${field.label}을(를) 선택해 주세요.`);
      }
      if (validOptions.length > 0) {
        fieldSchema = field.required
          ? z.enum(validOptions as [string, ...string[]], {
              message: `${field.label}의 선택값이 올바르지 않습니다.`,
            })
          : selectSchema.optional();
      } else {
        fieldSchema = field.required ? selectSchema : selectSchema.optional();
      }
      break;
    }

    case 'time': {
      let timeSchema = z.string();
      if (field.required) {
        timeSchema = timeSchema.min(1, `${field.label}을(를) 선택해 주세요.`);
      }
      fieldSchema = field.required ? timeSchema : timeSchema.optional();
      break;
    }

    case 'textarea':
    case 'text':
    default: {
      let strSchema = z.string();
      if (field.required) {
        strSchema = strSchema.trim().min(1, `${field.label}을(를) 입력해 주세요.`);
      }
      fieldSchema = field.required ? strSchema : strSchema.optional().default('');
      break;
    }
  }

  return fieldSchema;
}

/**
 * CapabilitySetupSchema로부터 종합 Zod Object 스키마 생성
 */
export function buildZodSchemaFromSetupSchema(schema: CapabilitySetupSchema): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const field of schema.fields) {
    shape[field.id] = buildFieldZodSchema(field);
  }

  return z.object(shape);
}

/**
 * CapabilitySetupSchema로부터 폼 기본값(Form Initial Values) 객체 추출
 */
export function extractDefaultValuesFromSetupSchema(
  schema: CapabilitySetupSchema,
  overrides?: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of schema.fields) {
    if (overrides && overrides[field.id] !== undefined && overrides[field.id] !== null) {
      result[field.id] = overrides[field.id];
      continue;
    }

    if (field.defaultValue !== undefined) {
      result[field.id] = field.defaultValue;
    } else {
      switch (field.type) {
        case 'boolean':
          result[field.id] = false;
          break;
        case 'number':
          result[field.id] = 0;
          break;
        case 'tags':
          result[field.id] = [];
          break;
        case 'select':
          result[field.id] = field.options?.[0]?.value ?? '';
          break;
        case 'text':
        case 'textarea':
        case 'time':
        default:
          result[field.id] = '';
          break;
      }
    }
  }

  return result;
}
