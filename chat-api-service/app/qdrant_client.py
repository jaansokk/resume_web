from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx


@dataclass(frozen=True)
class QdrantConfig:
    url: str
    collection_items: str
    collection_chunks: str


class QdrantClient:
    """
    Minimal Qdrant REST client for:
    - vector search in content_chunks_v1
    - payload lookup in content_items_v1
    """

    def __init__(self, cfg: QdrantConfig):
        self.cfg = cfg
        self._http = httpx.Client(base_url=cfg.url.rstrip("/"), timeout=20.0)

    def close(self) -> None:
        self._http.close()

    def search_chunks(self, *, vector: list[float], limit: int) -> list[dict[str, Any]]:
        """
        Returns raw Qdrant points (with payload + score).
        """
        body = {
            "vector": {"name": "embedding", "vector": vector},
            "limit": limit,
            "with_payload": True,
            "with_vectors": False,
        }
        res = self._http.post(f"/collections/{self.cfg.collection_chunks}/points/search", json=body)
        res.raise_for_status()
        data = res.json()
        return list(data.get("result") or [])

    def get_item_by_slug(self, slug: str) -> dict[str, Any] | None:
        """
        Looks up an item in content_items_v1 by filtering payload.slug.
        This avoids having to know the deterministic point ID at runtime.
        """
        body = {
            "filter": {"must": [{"key": "slug", "match": {"value": slug}}]},
            "limit": 1,
            "with_payload": True,
            "with_vectors": False,
        }
        res = self._http.post(f"/collections/{self.cfg.collection_items}/points/scroll", json=body)
        res.raise_for_status()
        data = res.json()
        points = data.get("result", {}).get("points") or []
        if not points:
            return None
        return points[0].get("payload") or None


