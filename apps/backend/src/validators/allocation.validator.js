import { z } from "zod";

export const createAllocationSchema = z.object({
  faculty_id: z.coerce.number().int().positive("Faculty ID must be positive"),
  subject_id: z.coerce.number().int().positive("Subject ID must be positive"),
});

export const listAllocationsQuerySchema = z.object({
  faculty_id: z.coerce.number().int().positive().optional(),
  subject_id: z.coerce.number().int().positive().optional(),
  dept_id: z.coerce.number().int().positive().optional(),
});
