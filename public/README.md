# public/

Static files for the PWA. In Sprint 1, the Builder places the following here:

- `favicon.ico` (16x16, 32x32 multi-size)
- `favicon.svg` (vector)
- `favicon.png` (32x32 fallback)
- `apple-touch-icon.png` (180x180, iOS home screen icon)
- `pwa-192x192.png`
- `pwa-512x512.png`
- `pwa-maskable-512x512.png` (Android safe area)
- `masked-icon.svg` (Safari pinned tab)

The real design is done in Sprint 6. For Sprint 1, a placeholder is enough:
- Solid color background (#3b82f6) + a large "A" letter (for PWA shell testing)

To generate them (example bash):

```bash
# Convert SVG → PNG with Inkscape or an online tool.
# Or use the pwa-asset-generator npm package:
npx pwa-asset-generator logo.svg public/ --background "#3b82f6" --opaque true
```
