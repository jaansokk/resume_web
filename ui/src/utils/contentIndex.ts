export interface ContentIndexItem {
  type: 'experience' | 'project' | 'background';
  slug: string;
  title?: string;
  tags?: string[];
  summary?: string;
  company?: string;
  role?: string;
  period?: string;
}

let contentIndexMapPromise: Promise<Record<string, ContentIndexItem>> | null = null;

export async function getContentIndexMap(): Promise<Record<string, ContentIndexItem>> {
  if (!contentIndexMapPromise) {
    contentIndexMapPromise = fetch('/content-index.json')
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load content-index.json (${res.status})`);
        return (await res.json()) as { items?: ContentIndexItem[] };
      })
      .then((json) => {
        const map: Record<string, ContentIndexItem> = {};
        for (const item of json.items || []) {
          if (item?.slug) map[item.slug] = item;
        }
        return map;
      });
  }
  return contentIndexMapPromise;
}

export async function resolveExperienceItems(slugs: string[]): Promise<ContentIndexItem[]> {
  const map = await getContentIndexMap();
  return slugs
    .map((s) => map[s])
    .filter((x): x is ContentIndexItem => Boolean(x && (x.type === 'experience' || x.type === 'project')));
}

export async function getDefaultExperienceItems(limit = 3): Promise<ContentIndexItem[]> {
  const map = await getContentIndexMap();
  return Object.values(map)
    .filter((x) => x.type === 'experience' || x.type === 'project')
    .slice(0, limit);
}


