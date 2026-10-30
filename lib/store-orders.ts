/**
 * Eski reklam dosyası yüklemeleri, reklam satırlarındaki sipariş sayısı kadar yapay `Order` kaydı
 * üretiyordu (source = 'upload'). Bunlar gerçek mağaza siparişi değildir; tüm sipariş sorgularında
 * hariç tutulur. Kalıcı temizlik için: scripts/cleanup-synthetic-orders.ts
 */
export const LEGACY_SYNTHETIC_ORDER_SOURCE = 'upload';

export const storeOrderWhere = { source: { not: LEGACY_SYNTHETIC_ORDER_SOURCE } };
