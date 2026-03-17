# Gallery Module

This document explains the current Gallery module in Scholar Blog Studio from three angles:

- product intent
- implementation design
- day-to-day usage

The current version is a lightweight but production-usable visual publishing module. It is designed for standalone image-led albums that should live beside blog posts, notes, digests, and other text-heavy content.

## 1. What the Gallery module is for

The Gallery module is intended for content that reads better as a sequence of images than as a single image embedded in an article.

Typical use cases include:

- field photography
- travel albums
- visual archives
- interface collections
- design process snapshots
- exhibition or event records

In the current product, a gallery album is not a social photo feed. It is closer to a curated entry:

- one album has one page
- one album contains an ordered image sequence
- each image can carry its own caption and optional shot timestamp
- the whole album can be drafted, scheduled, published, featured, archived, edited, or deleted by an admin

## 2. Current scope

The current implementation supports:

- public gallery index at `/gallery`
- public gallery detail pages at `/gallery/[slug]`
- admin gallery list at `/admin/gallery`
- admin create page at `/admin/gallery/new`
- admin edit page at `/admin/gallery/[id]`
- direct multi-image upload from the admin form
- external image URLs or local root-relative image paths
- per-image metadata management
- image ordering
- scheduled publishing with `publishedAt`
- featured albums
- local asset cleanup when an album is updated or deleted

The current implementation does not yet include:

- album comments
- lightbox viewer
- drag-and-drop sorting
- background EXIF extraction
- storage adapters such as OSS, S3, or R2
- direct ZIP import
- gallery revision history
- per-image edit history

## 3. Product behavior

### 3.1 Public behavior

Public users can browse:

- the gallery landing page at `/gallery`
- individual albums at `/gallery/[slug]`

The public gallery index shows:

- published album count
- featured album count
- total published image count
- album cards with cover image, summary, tags, author, and image count

The public album detail page shows:

- hero cover image
- album title
- summary
- description
- author
- published date
- tags
- image sequence in curator-defined order
- image caption or fallback text
- optional shot time per image

### 3.2 Visibility rules

An album is public only when all of the following are true:

- `status = PUBLISHED`
- `publishedAt` is not in the future
- the database is configured
- the running Prisma client supports the current gallery schema

Draft or archived albums never appear on public pages.

If an album is `PUBLISHED` and `publishedAt` is left empty, the save action automatically falls back to the current time.

### 3.3 Cover image behavior

The cover image resolves in this order:

1. `coverImageUrl`, if provided
2. the first image in the ordered image list
3. no cover

This means you can either:

- define a dedicated cover image
- let the first gallery image act as the default cover

## 4. Admin usage

### 4.1 Create a new gallery

Open `/admin/gallery/new`.

Recommended workflow:

1. Fill in album title and optional slug.
2. Add optional tags, summary, and description.
3. Upload images directly or paste image URLs manually.
4. Add per-image alt text, caption, shot time, width, and height if needed.
5. Reorder images with the `Up` and `Down` controls.
6. Optionally set a dedicated cover image URL.
7. Choose `DRAFT`, `PUBLISHED`, or `ARCHIVED`.
8. Optionally set `Published At` for scheduled release.
9. Optionally mark the album as featured.
10. Save the gallery.

### 4.2 Edit an existing gallery

Open `/admin/gallery/[id]`.

The edit screen lets you:

- replace album metadata
- change cover selection
- add more image rows
- upload more images
- reorder the full image sequence
- remove images
- change status or schedule
- delete the gallery

Important implementation detail:

- editing a gallery replaces the full ordered image set from the current form state
- the current code does not patch single image rows independently

### 4.3 Delete a gallery

Deleting a gallery removes:

- the album record
- all associated `GalleryImage` records
- local files under `/uploads/site/...` that were previously referenced by that album

External URLs are not deleted because the system does not own them.

## 5. Form rules and validation

### 5.1 What is required

The current rules intentionally keep text metadata flexible, but images are mandatory.

Required:

- at least one image row must contain a valid image URL
- every non-empty image row must include an `imageUrl`

Allowed to be empty:

- title
- summary
- description
- tags
- alt text
- caption
- thumbnail URL
- shot time
- width
- height

If title and slug are both empty, the server generates a fallback slug like `gallery-xxxxxxxx`.

### 5.2 Accepted image URL formats

`imageUrl` accepts:

- full absolute URLs such as `https://example.com/a.jpg`
- root-relative local paths such as `/uploads/site/gallery-123.jpg`

Unsupported examples:

- relative paths like `images/a.jpg`
- blank image URLs inside a partially filled row

### 5.3 Upload restrictions

Current supported direct upload formats:

- PNG
- JPG / JPEG
- WEBP

Current upload limit:

- per image, controlled by `SITE_IMAGE_MAX_UPLOAD_MB`

The admin form displays the configured limit directly in the UI.

### 5.4 Image metadata constraints

Current validation rules:

- `width` and `height` must be positive integers when provided
- max width and height are `12000`
- `shotAt` must be a valid date if provided

## 6. Data model

The Gallery module is built on two Prisma models plus the existing `User` model.

### 6.1 `GalleryAlbum`

Defined in [prisma/schema.prisma](./../prisma/schema.prisma).

Main fields:

- `id`
- `title`
- `slug`
- `summary`
- `description`
- `coverImageUrl`
- `tags`
- `status`
- `featured`
- `publishedAt`
- `createdAt`
- `updatedAt`
- `authorId`

Relationships:

- `author -> User`
- `images -> GalleryImage[]`

### 6.2 `GalleryImage`

Main fields:

- `id`
- `imageUrl`
- `thumbUrl`
- `alt`
- `caption`
- `sortOrder`
- `width`
- `height`
- `shotAt`
- `createdAt`
- `albumId`

The rendering order is determined primarily by:

1. `sortOrder`
2. `createdAt` as a secondary stable fallback

## 7. Technical architecture

### 7.1 Source files

Core implementation files:

- schema: [prisma/schema.prisma](./../prisma/schema.prisma)
- queries: [lib/gallery-queries.ts](./../lib/gallery-queries.ts)
- write actions: [lib/actions/gallery-actions.ts](./../lib/actions/gallery-actions.ts)
- validation: [lib/validators.ts](./../lib/validators.ts)
- admin form: [components/forms/gallery-form.tsx](./../components/forms/gallery-form.tsx)
- upload endpoint: [app/api/admin/gallery/assets/route.ts](./../app/api/admin/gallery/assets/route.ts)
- public index: [app/gallery/page.tsx](./../app/gallery/page.tsx)
- public detail: [app/gallery/[slug]/page.tsx](./../app/gallery/[slug]/page.tsx)
- admin list: [app/admin/gallery/page.tsx](./../app/admin/gallery/page.tsx)
- admin create: [app/admin/gallery/new/page.tsx](./../app/admin/gallery/new/page.tsx)
- admin edit: [app/admin/gallery/[id]/page.tsx](./../app/admin/gallery/[id]/page.tsx)

### 7.2 Query layer

`lib/gallery-queries.ts` handles read access for:

- public album index
- public album detail
- admin album list
- admin album detail
- gallery overview stats

Public queries apply publishing guards:

- only `PUBLISHED`
- only `publishedAt <= cutoff`

Admin queries return all statuses.

### 7.3 Write layer

`lib/actions/gallery-actions.ts` provides:

- `createGalleryAlbumAction`
- `updateGalleryAlbumAction`
- `deleteGalleryAlbumAction`

The write flow is:

1. parse `FormData`
2. normalize gallery image rows
3. validate with Zod
4. persist album and images through Prisma
5. revalidate gallery-related paths
6. redirect back to admin pages

### 7.4 Form serialization model

The admin form is a client component.

Important detail:

- image rows are managed in client state
- before submit, the full image array is serialized into the hidden `imagesJson` field
- the server action parses `imagesJson`, validates it, then stores the ordered image list

This is why the album update currently behaves as a full-sequence replacement instead of row-by-row mutation.

## 8. Direct upload pipeline

The Gallery uploader uses a dedicated HTTP route:

- `POST /api/admin/gallery/assets`

### 8.1 Request format

Request type:

- `multipart/form-data`

Expected fields:

- repeated `files` entries

### 8.2 Response shape

Success response:

```json
{
  "ok": true,
  "assets": [
    {
      "url": "/uploads/site/gallery-123.jpg",
      "originalName": "my-photo.jpg"
    }
  ]
}
```

Error response:

```json
{
  "ok": false,
  "error": "The uploaded file is too large. Please keep it under 8 MB."
}
```

### 8.3 Upload flow

The upload pipeline works like this:

1. the admin selects one or more files
2. the form sends them through `XMLHttpRequest`
3. the UI shows upload progress
4. the route validates admin access
5. each file is validated and stored under `public/uploads/site`
6. the returned URLs are appended into the in-memory draft list
7. the gallery is not persisted until the admin clicks the final save button

### 8.4 Important current limitation

Because upload and save are separate steps:

- uploaded files can exist on disk before the album itself is saved
- if an admin uploads images and then abandons the page, those files may remain unused

Current cleanup exists for:

- album update
- album deletion

Current cleanup does not yet exist for:

- abandoned unsaved draft uploads

## 9. Asset lifecycle and cleanup

Local asset cleanup is implemented for update and delete flows.

When an album is updated:

- previously referenced local image and thumbnail URLs are compared with the new set
- removed local files are deleted from disk

When an album is deleted:

- all local album assets are deleted from disk

The cleanup only applies to local site assets that begin with `/uploads/site/`.

## 10. Safeguards and failure handling

### 10.1 Database guard

If `DATABASE_URL` is not configured:

- public queries return empty results
- admin write flows throw a database configuration error

### 10.2 Prisma schema compatibility guard

The project includes a runtime check for stale Prisma clients through `hasGalleryAlbumSupport()`.

If the Next.js process is still using an older generated Prisma client after schema changes:

- admin gallery routes redirect with `?error=client`
- the admin page shows a restart hint instead of crashing

This guard exists because new Prisma delegates may not appear until the dev server restarts.

### 10.3 Client-side submit guard

The admin form disables the save button when:

- no valid image exists
- a partially filled image row is missing `imageUrl`
- an `imageUrl` uses an unsupported format

This prevents a common class of avoidable round trips.

## 11. Routing summary

Public routes:

- `/gallery`
- `/gallery/[slug]`

Admin routes:

- `/admin/gallery`
- `/admin/gallery/new`
- `/admin/gallery/[id]`

Upload endpoint:

- `POST /api/admin/gallery/assets`

## 12. Styling and UX notes

The gallery is intentionally designed as a module parallel to blog posts and notes, not as a hidden attachment area.

Current UX decisions:

- sequential album reading instead of masonry chaos
- cover-first presentation on detail pages
- caption-forward image rendering
- admin-side ordering controls
- upload progress feedback
- image requirement messaging directly in the form

## 13. Recommended operational practices

For daily use, the following practices are recommended:

- keep a meaningful title even though it is technically optional
- always write alt text for accessibility
- use captions when the image sequence tells a story
- set `Published At` explicitly when planning release timing
- prefer local uploads for assets you want fully controlled by the site
- use external URLs only when you trust long-term availability

## 14. Good next enhancements

If you continue evolving this module, the most practical next steps are:

- drag-and-drop ordering
- lightbox viewing
- object storage support
- abandoned upload cleanup jobs
- gallery revision history
- EXIF ingestion for shot time and dimensions
- image focal point / cropping presets
- collection-level analytics
- optional gallery comments

## 15. Summary

The current Gallery module is already suitable for real editorial use:

- it has a proper data model
- it has public and admin surfaces
- it supports direct upload and metadata editing
- it supports scheduling and featuring
- it cleans local assets during normal maintenance flows

Its main architectural tradeoff is simplicity:

- the form submits a full ordered image list
- uploads are decoupled from final persistence

That tradeoff keeps the system understandable and easy to extend, which is a good fit for the current project stage.
