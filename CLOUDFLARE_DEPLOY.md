# Supabase ve Cloudflare deploy

## 1. Supabase'i bagla

1. Supabase Dashboard > Project Settings > Database > Connect ekranini ac.
2. Proje ref'i ve veritabani sifresini kullanarak `.env` icindeki `DATABASE_URL` degerini guncelle.
3. Uygulama calisirken pooler URL'sini (6543, `pgbouncer=true`) kullan.
4. Ilk kurulumda dogrudan baglanti URL'si (5432) ile asagidaki komutlari calistir:

```powershell
npx prisma generate
npx prisma db push
npx prisma db seed
```

5. `npm run dev` ile uygulamayi yeniden baslat ve admin ile giris yap.

Admin: `admin@markarapor.com` / `Admin123`

Gecerli Supabase URL'si olmadan Prisma tablolarini olusturamaz; mevcut `.env` icindeki host DNS'te cozulmuyorsa Supabase Connect ekranindan yeni URL alinmalidir.

## 2. CSV yukleme

CSV basliklari su alanlardan taninabilir: `tarih`, `platform`, `kampanya`, `harcama`, `gelir`, `siparis`, `gosterim`, `tiklama`, `donusum`.

DB baglantisi varsa yukleme su tablolara kaydeder:

- `campaigns`
- `daily_metrics`
- `orders`

DB yoksa sadece demo modunda bellekte tutulur ve process yeniden baslayinca silinir.

## 3. Cloudflare / Wrangler

Bu proje Next.js + Prisma kullandigi icin dogrudan `wrangler deploy` ile Workers'a yuklenemez. Prisma'nin Node.js PostgreSQL motoru, Workers runtime'inda dogrudan calismaz.

Cloudflare'a deploy icin iki desteklenen yol var:

- Next.js'i Node.js calistiran Cloudflare Workers/OpenNext adapter'i ile paketlemek ve Prisma isteklerini harici Supabase'e yonlendirmek.
- Next.js uygulamasini Cloudflare Pages/Node uyumlu bir runtime'da calistirip, Prisma migration ve veritabani islemlerini CI veya ayri bir Node deploy adiminda yapmak.

Deploy oncesi zorunlu secret'lar:

```text
DATABASE_URL
NEXTAUTH_SECRET
AUTH_SECRET
```

Secret'lari `wrangler.toml` dosyasina yazma; `wrangler secret put` veya Cloudflare dashboard secret ayarlarini kullan.
