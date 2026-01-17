# Test Coverage Summary

## Overview
This document describes the test coverage for the chat API service, with emphasis on tests added to prevent regression of metadata handling bugs.

## Test Files

### `test_chat_contract.py` (existing, updated)
**Purpose:** End-to-end contract tests for the v2 chat API

**Tests:**
- `test_healthz` - Basic health check endpoint
- `test_chat_rejects_invalid_request` - Request validation
- `test_chat_v2_contract_happy_path` - Full chat flow with v2 response structure
- `test_chat_v2_split_view_with_artifacts` - Split view with fitBrief and relevantExperience
- `test_background_never_in_ui_visible_experience` - Ensures background items are filtered from UI

**Updates:**
- Added metadata fields (title, company, role, period) to mock Qdrant chunks to match real data structure

---

### `test_retrieval_metadata.py` (new)
**Purpose:** Unit tests for metadata extraction and context building

**Bug Context:** 
Originally, the `RetrievedChunk` dataclass only included basic fields (type, slug, chunkId, section, text, score) but was missing metadata fields (title, company, role, period) that are stored in Qdrant. This caused the LLM to hallucinate role names instead of using the exact values from source markdown.

**Tests:**

#### `test_retrieved_chunk_includes_metadata_fields`
**What it tests:** Verifies that when Qdrant returns a chunk with metadata, the RetrievalService correctly extracts all metadata fields into the RetrievedChunk.

**Why it matters:** Prevents regression where metadata fields are dropped during retrieval.

**Example:** Ensures `role: "Technical Project Manager / ScrumMaster"` is extracted, not lost.

#### `test_retrieved_chunk_handles_missing_metadata`
**What it tests:** Verifies graceful handling when metadata fields are missing (e.g., background items don't have company/role/period).

**Why it matters:** Prevents crashes or errors when processing items without complete metadata.

#### `test_context_includes_metadata_in_labels`
**What it tests:** Verifies that metadata is formatted correctly in the context labels sent to the LLM.

**Why it matters:** The LLM needs to see exact metadata values to avoid hallucinating. This test ensures the context includes formatted labels like:
```
[experience:positium:0] title:"Technical Project Lead" company:"Positium" role:"Technical Project Lead" period:"2025 — 2025"
```

**Example verification:**
- Checks that the system prompt includes the chunk label with all metadata
- Ensures the LLM has access to exact role/title values

---

### `test_slug_validation.py` (new)
**Purpose:** Tests for slug parsing and validation in artifact generation

**Bug Context:**
The LLM was misinterpreting chunk labels like `[experience:positium:0]` and copying the entire label as the slug (`experience:positium:0`) instead of just the middle part (`positium`). This caused validation failures because Qdrant couldn't find items with malformed slugs.

**Tests:**

#### `test_malformed_slug_is_rejected`
**What it tests:** When the LLM returns a malformed slug (e.g., `experience:positium:0` instead of `positium`), validation catches it and filters it out.

**Why it matters:** Ensures bad LLM output doesn't cause the UI to show "no relevant experience" silently - the validation layer acts as a safety net.

**Example:**
- LLM generates: `{"slug": "experience:positium:0", ...}`
- Qdrant lookup: `get_item_by_slug("experience:positium:0")` returns `None`
- Result: Item is filtered out, no crash

#### `test_correct_slug_passes_validation`
**What it tests:** When the LLM correctly extracts just the slug part (`positium`), validation passes and the item appears in relevantExperience.

**Why it matters:** Confirms the happy path works - proper slug extraction leads to successful validation.

**Example:**
- LLM generates: `{"slug": "positium", ...}`
- Qdrant lookup: `get_item_by_slug("positium")` returns the item
- Result: Item passes validation and appears in UI

#### `test_role_matches_source_metadata`
**What it tests:** End-to-end verification that the role displayed in relevantExperience matches the exact value from source markdown (not a paraphrased or hallucinated version).

**Why it matters:** This is the core bug we fixed - preventing the LLM from changing "Technical Project Manager / ScrumMaster" to just "Product Manager".

**Example:**
- Source markdown: `role: "Technical Project Manager / ScrumMaster"`
- LLM receives: `role:"Technical Project Manager / ScrumMaster"` in context
- LLM returns: `role: "Technical Project Manager / ScrumMaster"` (exact match)
- Test asserts: `item["role"] != "Product Manager"` (common hallucination)

---

## Test Execution

Run all tests:
```bash
cd chat-api-service
python -m pytest tests/ -v
```

Run specific test file:
```bash
python -m pytest tests/test_retrieval_metadata.py -v
python -m pytest tests/test_slug_validation.py -v
```

Run tests with coverage:
```bash
python -m pytest tests/ --cov=app --cov-report=html
```

---

## What These Tests Prevent

1. **Metadata Loss:** Tests prevent regression where metadata fields get dropped during retrieval
2. **Role Hallucination:** Tests ensure roles match source exactly (not paraphrased/invented)
3. **Slug Parsing:** Tests catch when LLM misunderstands label format and returns malformed slugs
4. **Silent Failures:** Tests ensure validation layer properly filters invalid items

---

## Future Test Additions

Consider adding:
- **Integration test with real Qdrant:** Spin up Qdrant in Docker, ingest test content, verify end-to-end
- **LLM prompt regression tests:** Mock LLM responses with known-good vs known-bad patterns
- **Streaming tests:** Verify metadata flows correctly in streaming mode
- **Multiple roles test:** Verify behavior when one person has multiple roles at same company
