import { z } from 'zod';
import { insertWorkflowSchema, insertExecutionSchema, insertCredentialSchema, workflows, executions, credentials } from './schema';

// Define execution with name schema
const executionWithNameSchema = z.object({
  id: z.number(),
  workflowId: z.number(),
  status: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  data: z.any().nullable(), 
  error: z.string().nullable(),
  name: z.string().nullable(),
});

// SHARED ERROR SCHEMAS
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// API CONTRACT
export const api = {
  workflows: {
    list: {
      method: 'GET' as const,
      path: '/api/workflows' as const,
      responses: {
        200: z.array(z.custom<typeof workflows.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/workflows/:id' as const,
      responses: {
        200: z.custom<typeof workflows.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/workflows' as const,
      input: insertWorkflowSchema,
      responses: {
        201: z.custom<typeof workflows.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/workflows/:id' as const,
      input: insertWorkflowSchema.partial(),
      responses: {
        200: z.custom<typeof workflows.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/workflows/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    execute: {
      method: 'POST' as const,
      path: '/api/workflows/:id/execute' as const,
      responses: {
        200: z.custom<{ executionId: number }>(),
        404: errorSchemas.notFound,
      },
    }
  },
  executions: {
    list: {
      method: 'GET' as const,
      path: '/api/executions' as const,
      input: z.object({
        workflowId: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(executionWithNameSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/executions/:id' as const,
      responses: {
        200: executionWithNameSchema,
        404: errorSchemas.notFound,
      },
    }
  },
  credentials: {
    list: {
      method: 'GET' as const,
      path: '/api/credentials' as const,
      responses: {
        200: z.array(z.custom<typeof credentials.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/credentials' as const,
      input: insertCredentialSchema,
      responses: {
        201: z.custom<typeof credentials.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/credentials/:id' as const,
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    }
  }
};

// HELPER FUNCTION
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
