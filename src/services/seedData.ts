import { UserAccount, SystemSettings } from '../types';

export const DEFAULT_CATEGORIES: string[] = [
  'Beras & Tepung',
  'Minyak & Margarin',
  'Gula & Pemanis',
  'Bumbu Dapur & Rempah',
  'Lauk Pauk & Bahan Mentah',
  'Mie, Pasta & Instant',
  'Susu & Olahan',
  'Minuman & Kemasan',
  'Sabun & Kebersihan Rumah',
  'Perawatan Diri',
  'Rokok & Perlengkapan',
  'Plastik & Perlengkapan Toko',
];

export const INITIAL_USERS: UserAccount[] = [
  {
    id: '7warlUHrREdfMvbLpccdrYgGBP83',
    email: 'pandir@pandirstore.com',
    username: 'pandir',
    name: 'Pemilik Toko (Admin Super)',
    role: 'admin',
    password: 'admin123',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '7warlUHrREdfMvbLpccdrYgGBP83_admin',
    email: 'admin@pandirstore.com',
    username: 'admin',
    name: 'Pemilik Toko (Admin Super)',
    role: 'admin',
    password: 'admin123',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'LFADLH8EjcOCZOqTLqBgdEKxodc2',
    email: 'kasir@pandirstore.com',
    username: 'kasir',
    name: 'Kasir Toko',
    role: 'kasir',
    password: 'kasir123',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_SETTINGS: SystemSettings = {
  storeName: 'PANDIR STORE',
  storeAddress: 'Jl. Raya Sembako No. 88, Pasar Induk',
  storePhone: '0857-1704-6895',
  receiptFooterMessage: 'Terima kasih telah berbelanja di PANDIR STORE!\nBarang yang sudah dibeli tidak dapat ditukar.',
  targetWhatsApp: '085717046895',
  initialDrawerCapital: 200000,
  gasWebhookUrl: '',
  autoSyncGoogleSheets: false,
  soundEnabled: true,
  appVersion: '1.0.8',
};
