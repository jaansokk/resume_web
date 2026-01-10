import { defineCollection, z } from 'astro:content';

const experience = defineCollection({
  type: 'content',
  schema: z.object({
    type: z.string(),
    company: z.string(),
    title: z.string(),
    role: z.string(),
    period: z.string(),
    tags: z.array(z.string()),
    keywords: z.array(z.string()).optional(),
    summary: z.string(),
  }),
});

export const collections = {
  experience,
};

