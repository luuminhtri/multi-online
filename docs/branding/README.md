# Logo Ma Sói — v1

Tạo bằng công cụ tích hợp `image_gen.imagegen` (skill imagegen), ngày 28/10/2026, theo yêu cầu thiết kế logo app của người dùng.

- Nguồn: [ma-soi-logo-v1.png](ma-soi-logo-v1.png), 1254×1254, nền đục.
- Icon xuất cho Xcode: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`, 1024×1024 sRGB không alpha, hệ điều hành tự bo góc.
- Ý tưởng: đầu Sói hòa vào trăng khuyết, vàng ấm trên nền xanh đen của sản phẩm, không chữ để rõ khi thu nhỏ.
- Chuẩn bị icon chỉ đổi kích thước/không gian màu bằng CoreGraphics; không thay hình vẽ đã tạo.

## Prompt đã dùng

```text
Use case: logo-brand. Asset type: finished iPhone app icon for the Vietnamese social deduction party game Ma Sói. Create one polished, minimalist, highly recognizable icon: a bold stylized wolf head silhouette integrated with a crescent moon, elegant crisp geometric curves and strong negative space. Premium restrained Apple-quality app identity, calm mysterious nocturnal mood, readable at 48 pixels. Existing product palette: very deep charcoal green #101516 background, warm muted gold #d6b67c mark, subtle depth only if it enhances the silhouette. One large central emblem filling about 70 percent of the square, generous consistent breathing room. Full bleed opaque square background extending to every edge, no rounded outer corners (iOS applies its own mask), no border, no text, no letters, no watermark, no device mockup, no multiple options, no extra stars or decorative scenery. The wolf should feel clever and composed rather than violent or cartoonish. Output a clean square icon ready for the app asset catalog.
```
