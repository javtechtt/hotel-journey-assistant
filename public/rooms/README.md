# Room photos (optional)

Drop a JPG per room type here, named by slug, to replace the built-in artwork:

  ocean-view-suite.jpg
  garden-king-room.jpg
  executive-business-suite.jpg
  family-villa.jpg

Then set NEXT_PUBLIC_USE_ROOM_IMAGES=1 in .env.local and restart the dev server.
Missing files fall back silently to the generated SVG scene.

Recommended: landscape ~3:2, 2400x1600 (min 1600x1067), subject centered,
optimized JPG/WebP under ~500KB. The same image is center-cropped to fill
every view (tiles, focus card, welcome, checkout, confirmation).
