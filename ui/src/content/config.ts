import { defineCollection, z } from 'astro:content';

const visibleInEnum = z.enum(['cv', 'artifacts', 'rag']);
const mediaTreatmentEnum = z.enum(['gallery', 'scrollSequence']);
const mediaSequenceItem = z.object({
  label: z.string(),
  src: z.string(),
  // Optional second video source (e.g. H.264 .mp4) for browsers that cannot play `src`.
  fallbackSrc: z.string().optional(),
  alt: z.string(),
  poster: z.string().optional(),
});

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

const background = defineCollection({
  type: 'content',
  schema: z.object({
    // System-level bucket (drives ingestion/RAG semantics)
    type: z.literal('background'),
    // Explicit routing control for where this item may appear
    visibleIn: z.array(visibleInEnum).nonempty(),
    title: z.string(),
    tags: z.array(z.string()).optional(),
    summary: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
});

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    type: z.literal('project'),
    subtype: z.string().optional(),
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
    mediaTreatment: mediaTreatmentEnum.optional(),
    mediaSequence: z.array(mediaSequenceItem).optional(),
    // Alpha mask image applied to the whole sequence stage (makes the media background transparent).
    mediaMask: z.string().optional(),
    // Alpha mask of the device screen; limits the between-clips dip to black to the screen area.
    mediaScreenMask: z.string().optional(),
    featuredInRecentProjects: z.boolean().optional(),
    recentProjectsOrder: z.number().int().optional(),
  }),
});

export const collections = {
  experience,
  background,
  projects,
};
