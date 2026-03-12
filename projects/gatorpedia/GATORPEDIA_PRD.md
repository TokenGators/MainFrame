# Gatorpedia PRD — Media Repository & Discovery System

**Version:** 1.0  
**Status:** In Review  
**Last Updated:** 2026-03-12  
**Owner:** Kthings  
**Project Lead:** TokenGators Team

---

## 1. Problem Statement

TokenGators publishes media across multiple platforms (X, YouTube, Tenor, Giphy, etc.), but there is no centralized way to:
- Discover what content we've created
- Track where a specific piece of media has been published
- View engagement metrics (likes, reposts, views) across platforms
- Search by content, date, or metadata
- Manage and enrich asset information

Currently, media is scattered across platforms and the only source of truth is unstructured asset files.

---

## 2. Vision & Goals

**Vision:** A unified, searchable repository of all TokenGators media with rich metadata, engagement tracking, and team collaboration features.

**Goals:**
1. ✅ Ingest all historical X posts from @TokenGators and extract media + metadata
2. ✅ Build a queryable database for media and social metrics
3. ✅ Create an internal dashboard to browse, search, and manage assets
4. ✅ Establish API foundation for future platform expansion
5. 🚀 (Future) Expand to YouTube, Tenor, Giphy, and other platforms
6. 🚀 (Future) Enrich metadata (e.g., which TokenGator collection items are featured)
7. 🚀 (Future) Public-facing media library and API

---

## 3. User Stories

### Phase 1: Internal Team Use

**As a** team member  
**I want to** search all media we've created  
**So that** I can find assets for reuse or reference

**As a** content creator  
**I want to** see how many times a piece of media was reposted or liked  
**So that** I understand what resonates with our audience

**As a** team member  
**I want to** filter media by date, type (image/video), or platform  
**So that** I can organize and plan content strategy

**As a** team member  
**I want to** view metadata for each post (caption, date posted, engagement metrics)  
**So that** I can make data-driven decisions about future content

---

## 4. Requirements

### 4.1 Phase 1 — X.com Integration & Dashboard (MVP)

#### 4.1.1 Data Ingestion
- [ ] Fetch all posts from @TokenGators X account via X.com API
- [ ] Extract media files (images, videos) from posts
- [ ] Extract metadata:
  - Post ID, date posted, caption/text
  - Engagement: likes, retweets, replies, views
  - Media type (image, video, gif)
  - X post URL
- [ ] Store in database with deduplication (no duplicates if same media posted multiple times)
- [ ] One-time historical ingestion; future: scheduled updates

#### 4.1.2 Database Schema
- **Posts Table:** id, x_post_id, caption, date_posted, url, views, likes, retweets, replies
- **Media Table:** id, post_id, media_url, file_path, media_type (image/video), width, height, created_at
- **PostMedia Relation:** post_id, media_id (many-to-many; one post can have multiple media)
- Indexes on: date_posted, media_type, views, likes

#### 4.1.3 Dashboard (Internal Web UI)
- **Home/Browse View:**
  - Grid of media (images/videos) with thumbnails
  - Hover: show post date, caption, engagement metrics
  - Click: open detail view

- **Detail View:**
  - Full media display
  - Post metadata: caption, date, link to X post
  - Engagement: likes, retweets, replies, views
  - Platform: X only (for now)
  - Upload/edit metadata (for Phase 2 enrichment)

- **Search & Filter:**
  - Full-text search on captions
  - Filter by date range (from/to)
  - Filter by media type (image/video)
  - Filter by engagement (e.g., top 100 liked posts)
  - Sort by: date (asc/desc), engagement (likes/views)

- **Admin Panel:**
  - Trigger re-ingestion of X posts
  - View ingestion logs
  - Manage raw media files

#### 4.1.4 Backend Requirements
- [ ] API endpoints (JSON REST, v1):
  - `GET /api/v1/media` — List media with filters/search
  - `GET /api/v1/media/:id` — Detail view
  - `GET /api/v1/posts` — List posts (maybe redundant)
  - `POST /api/v1/admin/ingest` — Trigger ingestion (internal only)
  - `GET /api/v1/admin/logs` — View ingestion logs (internal only)

- [ ] X.com API client:
  - Authenticate with API key
  - Paginate through posts
  - Handle rate limits
  - Error handling & retry

- [ ] Scheduled ingestion (optional for Phase 1):
  - Daily/weekly check for new posts
  - Store deltas

- [ ] Error handling:
  - Log failed ingestions
  - Alert on API failures
  - Resume capability

#### 4.1.5 Auth & Access Control
- Internal team only (no public access)
- Simple auth: API key or session-based login
- Admin role: can trigger ingestion & view logs
- Viewer role: can browse & search

---

## 5. Technical Architecture

### 5.1 Stack (Recommended)

- **Frontend:** React or Vue (dashboard UI)
- **Backend:** Node.js (Express) or Python (FastAPI/Django)
- **Database:** PostgreSQL (structured, supports full-text search)
- **Media Storage:** Local filesystem (git LFS) or S3
- **X.com Integration:** Official X API v2 (Bearer token auth)
- **Deployment:** Docker + your existing infra

### 5.2 Architecture Diagram

```
┌─────────────────┐
│  X.com API      │
│  (@TokenGators) │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  Backend Service        │
│  - Ingest & Parse       │
│  - Store Media & Posts  │
│  - Serve API            │
└────────┬────────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│Database│ │Media Store
│(Posts) │ │(files)
└────────┘ └──────────┘
    ▲
    │
┌───┴───────────┐
│  Dashboard UI │
│  (React/Vue)  │
└───────────────┘
```

### 5.3 Data Flow

1. **Ingestion:**
   - Admin triggers: `POST /api/v1/admin/ingest`
   - Backend fetches posts from X API (paginated)
   - For each post: extract media URLs, metadata, engagement
   - Download media files to storage
   - Insert/update DB records
   - Log results

2. **Search/Browse:**
   - User searches dashboard
   - Frontend calls: `GET /api/v1/media?q=search&type=image&date_from=...`
   - Backend queries DB, returns paginated results
   - Frontend displays media grid with metadata

3. **Detail View:**
   - User clicks media
   - Frontend calls: `GET /api/v1/media/:id`
   - Backend returns full metadata + X post details
   - Frontend renders detail page

---

## 6. Database Schema (Initial)

```sql
-- Posts Table
CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  x_post_id BIGINT UNIQUE NOT NULL,
  caption TEXT,
  date_posted TIMESTAMP NOT NULL,
  x_url VARCHAR(255),
  views BIGINT DEFAULT 0,
  likes BIGINT DEFAULT 0,
  retweets BIGINT DEFAULT 0,
  replies BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_posts_date ON posts(date_posted DESC);
CREATE INDEX idx_posts_x_id ON posts(x_post_id);

-- Media Table
CREATE TABLE media (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url VARCHAR(255),
  file_path VARCHAR(255),
  media_type VARCHAR(20) CHECK (media_type IN ('image', 'video', 'gif')),
  width INT,
  height INT,
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, media_url)
);

CREATE INDEX idx_media_post_id ON media(post_id);
CREATE INDEX idx_media_type ON media(media_type);

-- Optional: Tags/Categories (Phase 2)
-- CREATE TABLE media_tags (...)
```

---

## 7. API Design (v1)

### Authentication
- Bearer token (for now)
- Future: OAuth2 / session-based

### Core Endpoints

#### List Media (with filtering & search)
```
GET /api/v1/media?q=search&type=image&date_from=2026-01-01&date_to=2026-03-31&sort=likes&limit=50&offset=0

Response:
{
  "total": 150,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": 1,
      "media_url": "https://x.com/...",
      "file_path": "/assets/images/...",
      "media_type": "image",
      "type": "image/jpeg",
      "thumbnail_url": "/thumbnails/...",
      "post": {
        "id": 100,
        "x_post_id": 1234567890,
        "caption": "Check out our latest art!",
        "date_posted": "2026-03-10T15:30:00Z",
        "x_url": "https://x.com/TokenGators/status/...",
        "engagement": {
          "views": 5000,
          "likes": 250,
          "retweets": 120,
          "replies": 45
        }
      }
    }
    // ...
  ]
}
```

#### Get Media Detail
```
GET /api/v1/media/1

Response:
{
  "id": 1,
  "media_url": "https://...",
  "file_path": "/assets/images/...",
  "media_type": "image",
  "width": 1200,
  "height": 800,
  "post": { /* full post data */ }
}
```

#### Trigger Ingestion (Admin)
```
POST /api/v1/admin/ingest
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "force": false  // re-ingest all (true) or only new (false)
}

Response:
{
  "job_id": "ingest-20260312-001",
  "status": "queued",
  "started_at": "2026-03-12T12:15:00Z"
}
```

#### Get Ingestion Logs
```
GET /api/v1/admin/logs?limit=20

Response:
{
  "logs": [
    {
      "job_id": "ingest-20260312-001",
      "status": "success",
      "started_at": "2026-03-12T12:15:00Z",
      "completed_at": "2026-03-12T12:22:30Z",
      "posts_processed": 350,
      "new_media_count": 87,
      "errors": []
    }
  ]
}
```

---

## 8. Success Metrics

**Phase 1 (MVP):**
- [ ] All X posts from @TokenGators ingested into database
- [ ] Dashboard responsive and searchable (< 500ms query time)
- [ ] 100% of media files stored locally
- [ ] Full-text search working on captions
- [ ] Engagement metrics accurate within 1 day

**Future:**
- [ ] Public API usage (track calls, latency)
- [ ] Content enrichment (% of media with TokenGator metadata)
- [ ] Multi-platform coverage (YouTube, Tenor, etc.)

---

## 9. Out of Scope (Phase 2+)

- [ ] Platform expansion (YouTube, Tenor, Giphy, TikTok, etc.)
- [ ] Media enrichment (tagging TokenGator collection items)
- [ ] Public-facing dashboard
- [ ] Public API with rate limiting & auth
- [ ] Advanced analytics (engagement trends, content performance)
- [ ] Content recommendations
- [ ] Integration with other games (Gatorrr, Space-n-Gators)
- [ ] CDN / image optimization
- [ ] OCR / AI-based tagging

---

## 10. Timeline & Milestones

### Phase 1 (MVP) — 2–3 weeks
- **Week 1:** Database schema, X API client, backend scaffolding
- **Week 2:** Ingestion pipeline, API endpoints, basic error handling
- **Week 3:** Frontend dashboard, testing, documentation

### Phase 2 (Enrichment) — TBD
- Multi-platform support
- Metadata enrichment
- Advanced search & analytics

---

## 11. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| X API rate limits | Ingestion blocked | Implement exponential backoff, cache, queue system |
| Large media files | Storage/performance | Use S3 or compress; CDN for public phase |
| Missing/incomplete posts | Data gaps | Track ingestion state; manual backfill capability |
| Search performance | Slow UI | Index captions; pagination; consider full-text search (PG) |
| Auth/security | Unauthorized access | Use secure tokens; HTTPS; audit logs |

---

## 12. Next Steps

1. **Design Review:** Feedback on requirements, tech stack, timeline
2. **Database Setup:** Create PostgreSQL schema, prepare X API client
3. **Backend Implementation:** API endpoints, ingestion logic
4. **Frontend Development:** Dashboard UI, search/filter interface
5. **Testing:** Unit, integration, end-to-end
6. **Deployment:** Docker, documentation

---

## Appendix A: Example X Post Data

```json
{
  "data": {
    "id": "1234567890",
    "text": "Check out this amazing TokenGator art! 🐊",
    "created_at": "2026-03-10T15:30:00.000Z",
    "public_metrics": {
      "retweet_count": 120,
      "reply_count": 45,
      "like_count": 250,
      "view_count": 5000
    },
    "attachments": {
      "media_keys": ["16_1234567890", "16_0987654321"]
    }
  },
  "includes": {
    "media": [
      {
        "media_key": "16_1234567890",
        "type": "photo",
        "url": "https://pbs.twimg.com/media/..."
      }
    ]
  }
}
```

---

**Document Approval:**
- [ ] Kthings (Product Owner)
- [ ] Tech Lead (TBD)
- [ ] Team Review
