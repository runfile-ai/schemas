import { z } from 'zod';

const semver = z.string().regex(/^\d+\.\d+\.\d+$/);

/**
 * Control mapping — authored as signed YAML in the Control Mapping repo, but
 * validated against this JSON Schema. Maps regulatory framework controls to the
 * event-level predicates the Query API evaluates.
 */
export const ControlMappingSchema = z
  .object({
    mapping_version: semver,
    framework: z.string(),
    framework_version: z.string(),
    published_at: z.string().datetime(),
    controls: z.array(
      z
        .object({
          control_id: z.string(),
          title: z.string(),
          description: z.string(),
          regulatory_tags: z.array(z.string().regex(/^[a-z0-9_]+$/)),
          predicates: z.array(
            z
              .object({
                kind: z.enum(['event_count', 'event_exists', 'event_absent', 'aggregate']),
                expression: z.string(),
                threshold: z.number().optional(),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
  })
  .strict();
export type ControlMapping = z.infer<typeof ControlMappingSchema>;
