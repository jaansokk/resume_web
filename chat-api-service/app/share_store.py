from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.exceptions import ClientError


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class ShareStore:
    """
    DynamoDB-backed share snapshot storage.

    Table schema (per `_specs/runtime-architecture.md`):
    - partition key: shareId (string)
    - attributes:
      - createdAt (ISO string)
      - createdByContact (string)
      - snapshot (map)
    """

    def __init__(self) -> None:
        self.table_name = (os.environ.get("DDB_TABLE_SHARE_SNAPSHOTS") or "conversation_share_snapshots_v1").strip()
        self.aws_region = (os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "").strip()
        if not self.aws_region:
            raise RuntimeError("AWS_REGION is required for DynamoDB share storage")

        ddb = boto3.resource("dynamodb", region_name=self.aws_region)
        self.table = ddb.Table(self.table_name)

    def create_share(self, *, created_by_contact: str, snapshot: dict[str, Any]) -> dict[str, str]:
        # Guess-resistant opaque ID
        share_id = secrets.token_urlsafe(16)
        created_at = _utc_now_iso()

        item = {
            "shareId": share_id,
            "createdAt": created_at,
            "createdByContact": created_by_contact,
            "snapshot": snapshot,
        }

        try:
            self.table.put_item(Item=item, ConditionExpression="attribute_not_exists(shareId)")
        except ClientError as e:
            # Rare collision; just retry once.
            if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
                share_id = secrets.token_urlsafe(18)
                item["shareId"] = share_id
                self.table.put_item(Item=item, ConditionExpression="attribute_not_exists(shareId)")
            else:
                raise

        return {"shareId": share_id, "createdAt": created_at}

    def get_share(self, *, share_id: str) -> dict[str, Any] | None:
        res = self.table.get_item(Key={"shareId": share_id})
        item = res.get("Item")
        if not item:
            return None
        if item.get("revokedAt"):
            return None
        return item


