import { defineCollection, z } from 'astro:content';

const visibleInEnum = z.enum(['cv', 'artifacts', 'rag']);

const experience = defineCollection({
  type: 'content',
  schema: z.object({
    // System-level bucket (drives ingestion/RAG semantics)
    type: z.literal('experience'),
    // Optional sub-classification within a type (e.g. role, freelance)
    subtype: z.string().optional(),
    // Explicit routing control for where this item may appear
    visibleIn: z.array(visibleInEnum).nonempty(),
    company: z.string(),
    title: z.string(),
    role: z.string(),
    period: z.string(),
    tags: z.array(z.string()),
    keywords: z.array(z.string()).optional(),
    summary: z.string(),
    updatedAt: z.string().optional(),
    heroImage: z.string().optional(),
    gallery: z.array(z.string()).optional(),
  }),
});

export const collections = {
  experience,
};

