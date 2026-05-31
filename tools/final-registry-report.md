# Final Registry Report

Generated: 2026-05-31T15:37:21.954Z

## Summary

- Total final apps: 17
- Live apps: 12
- GitHub-only apps: 5
- Archived apps: 0
- Used tools/vercel-projects.json: yes

## Live Apps

- ABCMYANH (live)
- Đoán Con Vật (live)
- Đoán Trái Cây (live)
- Kho Báu Ký Ức (live)
- PCCCK V8 (live)
- Tra Cứu Tài Liệu (live)
- Ước Mộng Hề Nghiệp (live)
- Vinh Crypto (live)
- Vinh Paint (live)
- Vinh QR (live)
- Vinh TikTok (live)
- Xem Video (live)

## GitHub-Only Apps

- Đoán Đồ Vật (github-only)
- Đoán Nghề Nghiệp (github-only)
- Vinh BTC (github-only)
- Vinh Ghép Ảnh (github-only)
- Vinh Tín Dụng (github-only)

## Archived Apps

- None

## Excluded Repos

- vinh.test1: obvious test repository
- vinh.test2: obvious test repository

## Possible Duplicates Removed

- None

## Next Step

Review apps.final.json. If it looks correct, replace the active registry with:

```powershell
Copy-Item apps.final.json src\data\apps.json
cmd /c npm run build
```
