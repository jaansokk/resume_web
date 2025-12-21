import { defineCollection, z } from 'astro:content';

const experience = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    company: z.string(),
    role: z.string(),
    period: z.string(),
    tags: z.array(z.string()),
    keywords: z.array(z.string()),
    summary: z.string(),
  }),
});

export const collections = {
  experience,
};

