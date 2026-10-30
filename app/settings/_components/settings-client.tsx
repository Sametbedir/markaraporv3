'use client';

/* eslint-disable react-hooks/static-components */

import React, { useEffect, useState, useCallback } from 'react';
import { Settings, Save, CheckCircle, User, Globe, Key, Truck, Store, Percent } from 'lucide-react';

type Tab = 'profile' | 'meta' | 'google' | 'ecommerce' | 'costs';

export default function SettingsClient() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setData(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data ?? {}),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const update = (key: string, value: any) => {
    setData((prev: any) => ({ ...(prev ?? {}), [key]: value }));
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'meta', label: 'Meta Ads', icon: Globe },
    { id: 'google', label: 'Google / TikTok', icon: Key },
    { id: 'ecommerce', label: 'E-Ticaret', icon: Store },
    { id: 'costs', label: 'Gider Yapısı', icon: Percent },
  ];

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-40 bg-muted rounded" />
        <div className="card-premium p-6"><div className="h-60 bg-muted rounded" /></div>
      </div>
    );
  }

  const InputField = ({ label, field, type = 'text', placeholder = '' }: { label: string; field: string; type?: string; placeholder?: string }) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <input type={type} value={data?.[field] ?? ''} onChange={e => update(field, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="input-field" placeholder={placeholder} />
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" /> Ayarlar
          </h1>
          <p className="text-sm text-muted-foreground">Hesap ve entegrasyon ayarlarınızı yönetin</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-1.5">
          {saved ? <><CheckCircle className="w-4 h-4" /> Kaydedildi</> : saving ? 'Kaydediliyor...' : <><Save className="w-4 h-4" /> Kaydet</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="card-premium p-6">
        {activeTab === 'profile' && (
          <div className="space-y-4 max-w-lg">
            <InputField label="Marka Adı" field="name" />
            <InputField label="Şirket Adı" field="company_name" />
            <InputField label="Web Sitesi" field="website" placeholder="https://" />
            <InputField label="Sektör" field="industry" />
          </div>
        )}

        {activeTab === 'meta' && (
          <div className="space-y-4 max-w-lg">
            <InputField label="Meta Access Token" field="meta_access_token" placeholder="EAA..." />
            <InputField label="Meta Reklam Hesabı ID" field="meta_ad_account_id" placeholder="act_..." />
          </div>
        )}

        {activeTab === 'google' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h4 className="font-medium text-foreground mb-3">Google Ads</h4>
              <div className="space-y-4">
                <InputField label="Refresh Token" field="google_ads_refresh_token" />
                <InputField label="Müşteri ID" field="google_ads_customer_id" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-foreground mb-3">TikTok Ads</h4>
              <div className="space-y-4">
                <InputField label="Access Token" field="tiktok_access_token" />
                <InputField label="Reklamveren ID" field="tiktok_advertiser_id" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ecommerce' && (
          <div className="space-y-6 max-w-lg">
            <div>
              <h4 className="font-medium text-foreground mb-3">Shopify</h4>
              <div className="space-y-4">
                <InputField label="Mağaza URL" field="shopify_shop_url" placeholder="store.myshopify.com" />
                <InputField label="Access Token" field="shopify_access_token" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-foreground mb-3">GA4</h4>
              <div className="space-y-4">
                <InputField label="Property ID" field="ga4_property_id" />
                <InputField label="Client Email" field="ga4_client_email" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-foreground mb-3">iKas</h4>
              <div className="space-y-4">
                <InputField label="Mağaza URL" field="ikas_store_url" placeholder="store.myikas.com" />
                <InputField label="Access Token" field="ikas_access_token" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-foreground mb-3">Ticimax</h4>
              <div className="space-y-4">
                <InputField label="API Key" field="ticimax_api_key" />
                <InputField label="Mağaza ID" field="ticimax_store_id" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'costs' && (
          <div className="space-y-6 max-w-lg">
            <p className="text-sm text-muted-foreground">
              Kâr hesaplaması için gider bilgilerini girin. Bu bilgiler{' '}
              <strong className="text-foreground">{data?.brand_name ?? 'aktif marka'}</strong> markasına aittir;
              diğer markaların gider yapısı ayrıdır.
            </p>
            <div>
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-1.5"><Percent className="w-4 h-4 text-primary" /> Komisyon Oranları (%)</h4>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Trendyol" field="commission_rate_trendyol" type="number" />
                <InputField label="Hepsiburada" field="commission_rate_hepsiburada" type="number" />
                <InputField label="Shopify" field="commission_rate_shopify" type="number" />
                <InputField label="iKas" field="commission_rate_ikas" type="number" />
                <InputField label="Ticimax" field="commission_rate_ticimax" type="number" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-foreground mb-3 flex items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> Kargo ve İade</h4>
              <div className="grid grid-cols-2 gap-4">
                <InputField label="Kargo Maliyeti / Sipariş (₺)" field="shipping_cost_per_order" type="number" />
                <InputField label="İade Oranı (%)" field="return_rate" type="number" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              <h4 className="font-medium text-foreground mb-3">Ürün Maliyeti</h4>
              <InputField label="COGS Oranı (% - Ciroya göre)" field="product_cogs_rate" type="number" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
