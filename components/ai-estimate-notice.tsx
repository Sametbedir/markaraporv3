import { AlertTriangle } from 'lucide-react';

/**
 * Yapay zekâ ile üretilen raporların üstünde gösterilir. Bu raporlar canlı veri
 * (Google Trends, rakip siteleri, reklam kütüphanesi) çekmez; içerik tahmindir.
 */
export default function AiEstimateNotice({ source }: { source?: string }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-foreground">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-semibold">Yapay zekâ tahmini — ölçülmüş veri değildir</p>
        <p className="text-muted-foreground">
          Bu rapor canlı Google Trends, arama hacmi, rakip sitesi veya reklam verisi çekmez. İçerikteki öneriler genel
          uzman görüşüdür; yüzde, ciro ve sıralama ifadelerini doğrulamadan müşteriye kesin bilgi olarak sunmayın.
          {source === 'expert-engine' && ' Bu kayıt eski şablon motoruyla üretildi; içindeki rakamlar uydurmadır.'}
        </p>
      </div>
    </div>
  );
}
