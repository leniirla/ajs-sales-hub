/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, Invoice, Product, SystemSettings, Salesman, ActivityLog, AppUser, AppUserPermissions, SuratJalan } from './types';
import { DEFAULT_SETTINGS, showToast } from './utils';
import { getAuthToken, clearAuthToken } from './api/client';
import * as authApi from './api/auth';
import * as customersApi from './api/customers';
import * as productsApi from './api/products';
import * as salesmenApi from './api/salesmen';
import * as invoicesApi from './api/invoices';
import * as suratJalansApi from './api/suratJalans';
import * as settingsApi from './api/settings';
import * as usersApi from './api/users';
import * as activityLogsApi from './api/activityLogs';
import CustomerManager from './components/CustomerManager';
import ShoeMasterManager from './components/ShoeMasterManager';
import InvoiceForm from './components/InvoiceForm';
import InvoiceViewer from './components/InvoiceViewer';
import SalesReport from './components/SalesReport';
import SystemSettingsPanel from './components/SystemSettingsPanel';
import ReturnManager from './components/ReturnManager';
import CommissionManager from './components/CommissionManager';
import Dashboard from './components/Dashboard';
import HistoryManager from './components/HistoryManager';
import LoginPage from './components/LoginPage';
import UserManager from './components/UserManager';
import SuratJalanManager from './components/SuratJalanManager';
import { CompanyLogo } from './components/Logo';
import { 
  ClipboardList, 
  Users, 
  PlusCircle, 
  HelpCircle, 
  FileSpreadsheet, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Tag, 
  Settings, 
  RefreshCw,
  LayoutDashboard,
  Menu,
  X,
  Clock,
  LogOut,
  Lock,
  ShieldCheck,
  UserCheck,
  Truck,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoice' | 'surat_jalan' | 'report' | 'returns' | 'commissions' | 'customers' | 'shoes' | 'settings' | 'history' | 'users'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [showGuidanceModal, setShowGuidanceModal] = useState(false);

  const [suratJalans, setSuratJalans] = useState<SuratJalan[]>([]);
  const [selectedSjIdForViewer, setSelectedSjIdForViewer] = useState<string | null>(null);

  // User Authentication & Management State
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Viewer state
  const [selectedInvoiceForViewer, setSelectedInvoiceForViewer] = useState<Invoice | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  // Toast Notifications State & Event Listener
  interface AppNotification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<{
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  useEffect(() => {
    const handleNotify = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; type?: 'success' | 'error' | 'info' | 'warning' }>;
      if (customEvent.detail) {
        const { message, type = 'success' } = customEvent.detail;
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 4000);
      }
    };

    const handleConfirmEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message: string; onConfirm: () => void; onCancel?: () => void }>;
      if (customEvent.detail) {
        setConfirmConfig({
          message: customEvent.detail.message,
          onConfirm: () => {
            customEvent.detail.onConfirm();
            setConfirmConfig(null);
          },
          onCancel: () => {
            if (customEvent.detail.onCancel) {
              customEvent.detail.onCancel();
            }
            setConfirmConfig(null);
          }
        });
      }
    };

    window.addEventListener('app-notify', handleNotify);
    window.addEventListener('app-confirm', handleConfirmEvent);
    return () => {
      window.removeEventListener('app-notify', handleNotify);
      window.removeEventListener('app-confirm', handleConfirmEvent);
    };
  }, []);

  // Logger helper
  const triggerLog = (
    actionType: ActivityLog['actionType'],
    category: ActivityLog['category'],
    description: string,
    details?: string
  ) => {
    activityLogsApi
      .addActivityLogEntry(actionType, category, description, details, currentUser?.username)
      .then(setActivityLogs)
      .catch(() => null);
  };

  // Permission helper
  const hasMenuAccess = (tabId: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    if (!currentUser.allowedTabs) return true; // default to true if undefined (backward compatible)
    return currentUser.allowedTabs.includes(tabId);
  };

  // Action-level permission helper
  const hasActionAccess = (actionId: keyof AppUserPermissions): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    
    if (currentUser.permissions) {
      return !!currentUser.permissions[actionId];
    }
    
    // Default fallback based on role if permissions are undefined (backward compatible)
    switch (currentUser.role) {
      case 'admin':
      case 'director':
        return true;
      case 'finance':
        return actionId === 'canPayInvoice' || actionId === 'canProcessReturn' || actionId === 'canPayCommission' || actionId === 'canEditCommissionRate';
      case 'operator':
      default:
        return actionId === 'canCreateInvoice' || actionId === 'canEditInvoice' || actionId === 'canManageMasterData' || actionId === 'canManageSalesman';
    }
  };

  // Auto redirect if active tab is unauthorized
  useEffect(() => {
    if (currentUser && currentUser.role !== 'super_admin') {
      const allowed = currentUser.allowedTabs || ['dashboard', 'invoice', 'surat_jalan', 'report', 'returns', 'commissions', 'customers', 'shoes', 'settings', 'history'];
      if (!allowed.includes(activeTab as string) && activeTab !== 'users') {
        // Find first allowed tab
        const firstAllowed = allowed[0] as any;
        if (firstAllowed) {
          setActiveTab(firstAllowed);
        }
      } else if (activeTab === 'users' && !allowed.includes('users')) {
        // If users tab is selected but not allowed for non-super_admin
        const firstAllowed = allowed[0] as any;
        if (firstAllowed) {
          setActiveTab(firstAllowed);
        }
      }
    }
  }, [currentUser, activeTab]);

  // Load public branding settings + resolve any existing login session on mount
  useEffect(() => {
    settingsApi.getSettings().then(setSettings).catch(() => null);

    if (!getAuthToken()) {
      setAuthChecked(true);
      return;
    }
    authApi
      .fetchCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => clearAuthToken())
      .finally(() => setAuthChecked(true));
  }, []);

  // Once logged in, load all application data from the API
  useEffect(() => {
    if (!currentUser) return;

    Promise.all([
      customersApi.listCustomers(),
      invoicesApi.listInvoices(),
      productsApi.listProducts(),
      salesmenApi.listSalesmen(),
      suratJalansApi.listSuratJalans(),
      usersApi.listUsers(),
      activityLogsApi.listActivityLogs(),
    ]).then(([custs, invs, prods, sm, sjs, us, logs]) => {
      setCustomers(custs);
      setInvoices(invs);
      setProducts(prods);
      setSalesmen(sm);
      setSuratJalans(sjs);
      setUsers(us);
      setActivityLogs(logs);
      setDataLoaded(true);
    }).catch(() => null);
  }, [currentUser]);

  // Sync / write changes back to store
  // Returns a Promise so callers can distinguish an actual save failure (e.g. session
  // expired, payload rejected) from success instead of assuming it always worked.
  const saveSettingsToStore = (newSettings: SystemSettings): Promise<void> => {
    return settingsApi.saveSettings(newSettings).then((saved) => {
      setSettings(saved);
      triggerLog(
        'update',
        'settings',
        'Mengubah konfigurasi aturan sistem',
        `PPN Aktif: ${saved.enablePpn ? 'Ya (' + saved.ppnPercentage + '%)' : 'Tidak'}\nBatas Surcharge: Ukuran >= ${saved.sizeSurchargeLimit} (Surcharge: Rp ${saved.sizeSurchargeAmount})\nBatas Qty T2: > ${saved.minQtyTier2} (Diskon: Rp ${saved.discountTier2})\nBatas Qty T3: > ${saved.minQtyTier3} (Diskon: Rp ${saved.discountTier3})`
      );
    });
  };

  const handleResetSettings = (): Promise<void> => {
    return settingsApi.saveSettings(DEFAULT_SETTINGS).then((saved) => {
      setSettings(saved);
      triggerLog('update', 'settings', 'Mereset konfigurasi aturan sistem ke default');
    });
  };

  // User Authentication & Management Actions
  const handleAddUser = (newUser: AppUser) => {
    usersApi.createUser(newUser).then((created) => {
      setUsers((prev) => [...prev, created]);
      triggerLog('create', 'user', `Menambahkan pengguna baru: "${created.name}" (@${created.username})`, `Akses: ${created.role.toUpperCase()}`);
    }).catch((err) => showToast(err.message || 'Gagal menambahkan pengguna.', 'error'));
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
    usersApi.updateUser(updatedUser).then((saved) => {
      setUsers((prev) => prev.map((u) => (u.id === saved.id ? saved : u)));
      triggerLog('update', 'user', `Mengubah informasi pengguna: "${saved.name}" (@${saved.username})`, `Akses: ${saved.role.toUpperCase()}`);

      if (currentUser && currentUser.id === saved.id) {
        setCurrentUser(saved);
      }
    }).catch((err) => showToast(err.message || 'Gagal memperbarui pengguna.', 'error'));
  };

  const handleDeleteUser = (id: string) => {
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) return;
    usersApi.deleteUser(id).then(() => {
      setUsers((prev) => prev.filter((u) => u.id !== id));
      triggerLog('delete', 'user', `Menghapus akun pengguna: "${userToDelete.name}" (@${userToDelete.username})`);
    }).catch((err) => showToast(err.message || 'Gagal menghapus pengguna.', 'error'));
  };

  const handleLogin = async (usernameStr: string, passwordStr: string): Promise<boolean> => {
    const found = await authApi.login(usernameStr, passwordStr);
    if (found) {
      setCurrentUser(found);
      setActiveTab('dashboard');
      activityLogsApi
        .addActivityLogEntry('other', 'user', `Pengguna @${found.username} (${found.name}) berhasil masuk`, undefined, found.username)
        .then(setActivityLogs)
        .catch(() => null);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    if (currentUser) {
      activityLogsApi
        .addActivityLogEntry('other', 'user', `Pengguna @${currentUser.username} keluar dari sistem`, undefined, currentUser.username)
        .catch(() => null);
    }
    authApi.logout().finally(() => {
      setCurrentUser(null);
      setDataLoaded(false);
    });
  };

  // Re-fetch Surat Jalan from the server (it derives/syncs them from invoices)
  const refreshSuratJalans = () => {
    suratJalansApi.listSuratJalans().then(setSuratJalans).catch(() => null);
  };

  // Bulk-reconcile invoices against the server: used by ReturnManager /
  // CommissionManager, which recompute a whole Invoice[] array locally
  // (e.g. adjusting remainingBalance after a refund) and hand it back.
  const saveInvoicesToStore = (newInvs: Invoice[]) => {
    const changed = newInvs.filter((inv) => {
      const prev = invoices.find((i) => i.id === inv.id);
      return !prev || JSON.stringify(prev) !== JSON.stringify(inv);
    });
    Promise.all(changed.map((inv) => invoicesApi.updateInvoice(inv)))
      .then(() => {
        setInvoices(newInvs);
        refreshSuratJalans();
      })
      .catch((err) => showToast(err.message || 'Gagal menyimpan perubahan faktur.', 'error'));
  };

  const handleUpdateSuratJalan = (updatedSj: SuratJalan) => {
    suratJalansApi.updateSuratJalan(updatedSj).then((saved) => {
      setSuratJalans((prev) => prev.map((sj) => (sj.id === saved.id ? saved : sj)));
      triggerLog(
        'update',
        'invoice',
        `Mengubah data Surat Jalan: ${saved.suratJalanNumber}`,
        `Status: ${saved.status.toUpperCase()}\nSopir: ${saved.driverName || '-'}\nPlat No: ${saved.vehicleNumber || '-'}`
      );
    }).catch((err) => showToast(err.message || 'Gagal memperbarui surat jalan.', 'error'));
  };

  const handleAddSalesman = (s: Salesman) => {
    salesmenApi.createSalesman(s).then((created) => {
      setSalesmen((prev) => [...prev, created]);
      triggerLog('create', 'salesman', `Menambahkan pegawai baru: ${created.name}`, `Kontak: ${created.phone}\nKomisi default: Rp ${created.commissionPerPair.toLocaleString('id-ID')}/pasang`);
    }).catch((err) => showToast(err.message || 'Gagal menambahkan pegawai.', 'error'));
  };

  const handleUpdateSalesman = (updatedSalesman: Salesman) => {
    salesmenApi.updateSalesman(updatedSalesman).then((saved) => {
      setSalesmen((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      triggerLog('update', 'salesman', `Mengubah data pegawai: ${saved.name}`, `Kontak: ${saved.phone}\nKomisi: Rp ${saved.commissionPerPair.toLocaleString('id-ID')}/pasang`);

      const oldSalesman = salesmen.find((s) => s.id === saved.id);
      if (oldSalesman && oldSalesman.name !== saved.name) {
        invoicesApi.listInvoices().then(setInvoices).catch(() => null);
        refreshSuratJalans();
      }
    }).catch((err) => showToast(err.message || 'Gagal memperbarui pegawai.', 'error'));
  };

  const handleDeleteSalesman = (id: string) => {
    const salesmanToDelete = salesmen.find((s) => s.id === id);
    salesmenApi.deleteSalesman(id).then(() => {
      setSalesmen((prev) => prev.filter((s) => s.id !== id));
      if (salesmanToDelete) {
        triggerLog('delete', 'salesman', `Menghapus pegawai: ${salesmanToDelete.name}`, `Kontak: ${salesmanToDelete.phone}`);
      }
    }).catch((err) => showToast(err.message || 'Gagal menghapus pegawai.', 'error'));
  };

  // State manipulation handlers
  const handleAddCustomer = (c: Customer) => {
    customersApi.createCustomer(c).then((created) => {
      setCustomers((prev) => [...prev, created]);
      triggerLog('create', 'customer', `Menambahkan pelanggan baru: ${created.name}`, `Tipe: ${created.type.toUpperCase()}\nKontak: ${created.phone || '-'}\nAlamat: ${created.address || '-'}`);
    }).catch((err) => showToast(err.message || 'Gagal menambahkan pelanggan.', 'error'));
  };

  const handleUpdateCustomer = (updatedCust: Customer) => {
    customersApi.updateCustomer(updatedCust).then((saved) => {
      setCustomers((prev) => prev.map((c) => (c.id === saved.id ? saved : c)));
      triggerLog('update', 'customer', `Mengubah data pelanggan: ${saved.name}`, `Tipe: ${saved.type.toUpperCase()}\nKontak: ${saved.phone || '-'}\nAlamat: ${saved.address || '-'}`);
    }).catch((err) => showToast(err.message || 'Gagal memperbarui pelanggan.', 'error'));
  };

  const handleDeleteCustomer = (id: string) => {
    // Prevent delete if linked with invoices
    const isLinked = invoices.some((inv) => inv.customerId === id);
    if (isLinked) {
      return;
    }
    const customerToDelete = customers.find((c) => c.id === id);
    customersApi.deleteCustomer(id).then(() => {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      if (customerToDelete) {
        triggerLog('delete', 'customer', `Menghapus pelanggan: ${customerToDelete.name}`, `Tipe: ${customerToDelete.type.toUpperCase()}`);
      }
    }).catch((err) => showToast(err.message || 'Gagal menghapus pelanggan.', 'error'));
  };

  const handleAddProduct = (p: Product) => {
    productsApi.createProduct(p).then((created) => {
      setProducts((prev) => [...prev, created]);
      triggerLog('create', 'product', `Menambahkan produk sepatu: ${created.name}`, `Harga default: Rp ${created.defaultPrice.toLocaleString('id-ID')}`);
    }).catch((err) => showToast(err.message || 'Gagal menambahkan produk.', 'error'));
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    const oldProd = products.find((p) => p.id === updatedProd.id);
    const oldName = oldProd ? oldProd.name : '';
    const newName = updatedProd.name;

    productsApi.updateProduct(updatedProd).then((saved) => {
      setProducts((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      triggerLog('update', 'product', `Mengubah produk sepatu: ${saved.name}`, `Harga default baru: Rp ${saved.defaultPrice.toLocaleString('id-ID')}`);

      // If product name has changed, update customer customPrices keys
      if (oldName && oldName !== newName) {
        const affected = customers.filter((c) => c.customPrices && c.customPrices[oldName] !== undefined);
        affected.forEach((c) => {
          const newCustomPrices = { ...c.customPrices };
          const priceVal = newCustomPrices[oldName];
          delete newCustomPrices[oldName];
          newCustomPrices[newName] = priceVal;
          const updatedCustomer = { ...c, customPrices: newCustomPrices };
          customersApi.updateCustomer(updatedCustomer).then((savedCust) => {
            setCustomers((prev) => prev.map((cust) => (cust.id === savedCust.id ? savedCust : cust)));
          }).catch(() => null);
        });
      }
    }).catch((err) => showToast(err.message || 'Gagal memperbarui produk.', 'error'));
  };

  const handleDeleteProduct = (id: string) => {
    const productToDelete = products.find((p) => p.id === id);
    if (!productToDelete) return;

    const isLinked = invoices.some((inv) =>
      inv.items.some((item) => item.productName === productToDelete.name)
    );
    if (isLinked) {
      showToast("Tidak dapat menghapus sepatu ini karena sudah terekam di dalam beberapa transaksi faktur.", "error");
      return;
    }

    productsApi.deleteProduct(id).then(() => {
      setProducts((prev) => prev.filter((p) => p.id !== id));
      triggerLog('delete', 'product', `Menghapus produk sepatu: ${productToDelete.name}`);

      // Clean up customer customPrices for deleted product
      const affected = customers.filter((c) => c.customPrices && c.customPrices[productToDelete.name] !== undefined);
      affected.forEach((c) => {
        const newCustomPrices = { ...c.customPrices };
        delete newCustomPrices[productToDelete.name];
        const updatedCustomer = { ...c, customPrices: newCustomPrices };
        customersApi.updateCustomer(updatedCustomer).then((savedCust) => {
          setCustomers((prev) => prev.map((cust) => (cust.id === savedCust.id ? savedCust : cust)));
        }).catch(() => null);
      });
    }).catch((err) => showToast(err.message || 'Gagal menghapus produk.', 'error'));
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    const exists = invoices.some((inv) => inv.id === invoice.id);
    const request = exists ? invoicesApi.updateInvoice(invoice) : invoicesApi.createInvoice(invoice);

    request.then((saved) => {
      setInvoices((prev) => (exists ? prev.map((inv) => (inv.id === saved.id ? saved : inv)) : [saved, ...prev]));
      refreshSuratJalans();
      triggerLog(
        exists ? 'update' : 'create',
        'invoice',
        `${exists ? 'Mengubah' : 'Membuat'} Faktur Penjualan: ${saved.invoiceNumber}`,
        `Pelanggan: ${saved.customerName}\nTotal Sepatu: ${saved.totalPairs} pasang\nTotal Nilai: Rp ${saved.totalAmount.toLocaleString('id-ID')}`
      );
      setInvoiceToEdit(null);
      // Transition automatically to the newly generated invoice preview
      setSelectedInvoiceForViewer(saved);
    }).catch((err) => showToast(err.message || 'Gagal menyimpan faktur.', 'error'));
  };

  const handleDeleteInvoice = (id: string) => {
    const invoiceToDelete = invoices.find((inv) => inv.id === id);
    invoicesApi.deleteInvoice(id).then(() => {
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
      refreshSuratJalans();
      if (invoiceToDelete) {
        triggerLog('delete', 'invoice', `Menghapus Faktur Penjualan: ${invoiceToDelete.invoiceNumber}`, `Pelanggan: ${invoiceToDelete.customerName}\nTotal Nilai: Rp ${invoiceToDelete.totalAmount.toLocaleString('id-ID')}`);
        showToast(`Faktur ${invoiceToDelete.invoiceNumber} berhasil dihapus!`, "success");
      }
    }).catch((err) => showToast(err.message || 'Gagal menghapus faktur.', 'error'));
  };

  const handleSetInvoiceStatus = (id: string, status: 'paid' | 'unpaid') => {
    const inv = invoices.find((i) => i.id === id);
    invoicesApi.setInvoiceStatus(id, status).then((saved) => {
      setInvoices((prev) => prev.map((i) => (i.id === saved.id ? saved : i)));
      if (inv) {
        triggerLog(
          'payment',
          'invoice',
          `Mengubah status pembayaran Faktur ${inv.invoiceNumber} menjadi ${status === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}`,
          `Pelanggan: ${inv.customerName}\nTotal Tagihan: Rp ${inv.totalAmount.toLocaleString('id-ID')}`
        );
      }
      showToast("Status pembayaran faktur berhasil diperbarui!", "success");
    }).catch((err) => showToast(err.message || 'Gagal memperbarui status faktur.', 'error'));
  };

  // Wait until we know whether an existing session is valid before rendering anything
  if (!authChecked) {
    return null;
  }

  // If not logged in, force showing Login Page
  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} settings={settings} />;
  }

  // Logged in but application data hasn't finished loading from the server yet
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm font-bold text-slate-400">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col lg:flex-row">
      
      {/* Toast Notifications container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none print:hidden">
        {notifications.map((notif) => {
          let bgClass = 'bg-white border-slate-200 text-slate-800 shadow-lg';
          let icon = null;

          if (notif.type === 'success') {
            bgClass = 'bg-emerald-50 border-emerald-150 text-emerald-800 shadow-emerald-100/40 shadow-lg';
            icon = <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />;
          } else if (notif.type === 'error') {
            bgClass = 'bg-red-50 border-red-150 text-red-800 shadow-red-100/40 shadow-lg';
            icon = <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />;
          } else if (notif.type === 'warning') {
            bgClass = 'bg-amber-50 border-amber-150 text-amber-800 shadow-amber-100/40 shadow-lg';
            icon = <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />;
          } else {
            bgClass = 'bg-indigo-50 border-indigo-150 text-indigo-800 shadow-indigo-100/40 shadow-lg';
            icon = <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />;
          }

          return (
            <div
              key={notif.id}
              className={`p-4 rounded-2xl border flex items-start gap-3 pointer-events-auto transition duration-300 animate-slide-in-right ${bgClass}`}
            >
              {icon}
              <div className="flex-1 text-xs font-bold leading-normal">
                {notif.message}
              </div>
              <button
                onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
                className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom Confirmation Modal */}
      {confirmConfig && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in text-left">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-scale-in space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Konfirmasi Tindakan</h4>
                <p className="text-xs font-bold text-slate-850 leading-relaxed">
                  {confirmConfig.message}
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={confirmConfig.onCancel}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer border-none"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmConfig.onConfirm}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition cursor-pointer shadow-sm border-none"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 1. SIDEBAR NAVIGATION - DESKTOP & MOBILE DRAWER */}
      <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 fixed inset-y-0 left-0 z-50 h-screen transition-transform duration-300 lg:sticky lg:top-0 lg:translate-x-0 print:hidden ${
        mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        
        {/* Sidebar Header / Brand Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CompanyLogo size={38} className="-ml-1 text-slate-850" logoUrl={settings?.companyLogoUrl} />
              <div>
                <h1 className="text-xs font-black text-slate-900 tracking-tight leading-none sm:text-sm">{settings?.companyName || 'Angkasa Jaya Shoes'}</h1>
                <span className="text-[9px] text-slate-450 uppercase tracking-widest font-extrabold block mt-1">Sistem Penjualan</span>
              </div>
            </div>

            {/* Mobile Close Button */}
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <div className="flex-1 py-6 px-4 space-y-7 overflow-y-auto scrollbar-none">
          
          {/* GROUP 1: UTAMA */}
          {hasMenuAccess('dashboard') && (
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">🏠 UTAMA</span>
              
              <button
                onClick={() => { setActiveTab('dashboard'); setSelectedInvoiceForViewer(null); setMobileMenuOpen(false); }}
                className={`w-full text-left ${
                  activeTab === 'dashboard' && !selectedInvoiceForViewer
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                Dashboard
              </button>
            </div>
          )}

          {/* GROUP 2: TRANSAKSI */}
          {(hasMenuAccess('invoice') || hasMenuAccess('returns') || hasMenuAccess('commissions')) && (
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">📝 TRANSAKSI</span>
              
              {hasMenuAccess('invoice') && (
                <button
                  onClick={() => { setActiveTab('invoice'); setSelectedInvoiceForViewer(null); setInvoiceToEdit(null); setMobileMenuOpen(false); }}
                  className={`w-full text-left ${
                    activeTab === 'invoice' && !selectedInvoiceForViewer
                      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  Buat Faktur Baru
                </button>
              )}

              {hasMenuAccess('surat_jalan') && (
                <button
                  onClick={() => { setActiveTab('surat_jalan'); setSelectedInvoiceForViewer(null); setSelectedSjIdForViewer(null); setMobileMenuOpen(false); }}
                  className={`w-full text-left ${
                    activeTab === 'surat_jalan' && !selectedInvoiceForViewer
                      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Truck className="w-4 h-4 shrink-0 text-amber-500" />
                  Surat Jalan (Kirim)
                </button>
              )}

              {hasMenuAccess('returns') && (
                <button
                  onClick={() => { setActiveTab('returns'); setSelectedInvoiceForViewer(null); setMobileMenuOpen(false); }}
                  className={`w-full text-left ${
                    activeTab === 'returns' && !selectedInvoiceForViewer
                      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 shrink-0" />
                  Retur Barang
                </button>
              )}

              {hasMenuAccess('commissions') && (
                <button
                  onClick={() => { setActiveTab('commissions'); setSelectedInvoiceForViewer(null); setMobileMenuOpen(false); }}
                  className={`w-full text-left ${
                    activeTab === 'commissions' && !selectedInvoiceForViewer
                      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <DollarSign className="w-4 h-4 shrink-0" />
                  Komisi Pegawai
                </button>
              )}
            </div>
          )}

          {/* GROUP 3: MANAJEMEN DATA */}
          {(hasMenuAccess('customers') || hasMenuAccess('shoes')) && (
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">👥 MANAJEMEN DATA</span>
              
              {hasMenuAccess('customers') && (
                <button
                  onClick={() => { setActiveTab('customers'); setSelectedInvoiceForViewer(null); setMobileMenuOpen(false); }}
                  className={`w-full text-left ${
                    activeTab === 'customers' && !selectedInvoiceForViewer
                      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  Kelola Pelanggan
                </button>
              )}

              {hasMenuAccess('shoes') && (
                <button
                  onClick={() => { setActiveTab('shoes'); setSelectedInvoiceForViewer(null); setMobileMenuOpen(false); }}
                  className={`w-full text-left ${
                    activeTab === 'shoes' && !selectedInvoiceForViewer
                      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Tag className="w-4 h-4 shrink-0" />
                  Kelola Sepatu (Master)
                </button>
              )}
            </div>
          )}

          {/* GROUP 4: LAPORAN & SISTEM */}
          {(hasMenuAccess('report') || hasMenuAccess('history') || hasMenuAccess('settings')) && (
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">📊 LAPORAN & SISTEM</span>
              
              {hasMenuAccess('report') && (
                <button
                  onClick={() => { setActiveTab('report'); setSelectedInvoiceForViewer(null); setMobileMenuOpen(false); }}
                  className={`w-full text-left ${
                    (activeTab === 'report' || selectedInvoiceForViewer) && activeTab !== 'history'
                      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  Laporan Penjualan (Excel)
                </button>
              )}

              {hasMenuAccess('history') && (
                <button
                  onClick={() => { setActiveTab('history'); setSelectedInvoiceForViewer(null); setMobileMenuOpen(false); }}
                  className={`w-full text-left ${
                    activeTab === 'history' && !selectedInvoiceForViewer
                      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  History Kegiatan User
                </button>
              )}

              {hasMenuAccess('settings') && (
                <button
                  onClick={() => { setActiveTab('settings'); setSelectedInvoiceForViewer(null); setMobileMenuOpen(false); }}
                  className={`w-full text-left ${
                    activeTab === 'settings' && !selectedInvoiceForViewer
                      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  Pengaturan Aturan
                </button>
              )}
            </div>
          )}

          {/* GROUP 5: HAK AKSES & KEAMANAN */}
          {hasMenuAccess('users') && (
            <div className="space-y-1.5">
              <span className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">🔐 KEAMANAN & PENGGUNA</span>
              
              <button
                onClick={() => { setActiveTab('users'); setSelectedInvoiceForViewer(null); setMobileMenuOpen(false); }}
                className={`w-full text-left ${
                  activeTab === 'users' && !selectedInvoiceForViewer
                    ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-indigo-700 bg-indigo-50 border border-indigo-100/50 shadow-2xs'
                    : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition cursor-pointer text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Users className="w-4 h-4 shrink-0 text-rose-500" />
                Kelola Pengguna
              </button>
            </div>
          )}

        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-center">
          <span className="text-[10px] text-slate-400 font-extrabold block">Angkasa Jaya Shoes</span>
          <span className="text-[9px] text-slate-400 font-medium block mt-0.5">Versi Prod 1.2.5</span>
        </div>

      </aside>

      {/* Mobile Drawer Overlay Backdrop */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden print:hidden"
        />
      )}

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Navigation */}
        <header className="bg-white border-b border-slate-200 h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 print:hidden shrink-0">
          {/* Left side: Hamburger on Mobile, Breadcrumbs on Desktop */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <CompanyLogo size={28} logoUrl={settings?.companyLogoUrl} />
              <span className="text-xs font-black text-slate-950">{settings?.companyName || 'Angkasa Jaya Shoes'}</span>
            </div>
            {/* Desktop breadcrumb */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-400">
              <span className="font-extrabold uppercase tracking-wider text-[10px]">Sistem Penjualan</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-black uppercase tracking-wider text-[10px] bg-slate-50 border border-slate-150 px-2 py-0.5 rounded-md">
                {activeTab === 'dashboard' && 'Dashboard'}
                {activeTab === 'invoice' && 'Buat Faktur Baru'}
                {activeTab === 'surat_jalan' && 'Surat Jalan (Kirim)'}
                {activeTab === 'returns' && 'Retur Barang'}
                {activeTab === 'commissions' && 'Komisi Pegawai'}
                {activeTab === 'customers' && 'Kelola Pelanggan'}
                {activeTab === 'shoes' && 'Kelola Sepatu (Master)'}
                {activeTab === 'report' && 'Laporan Penjualan'}
                {activeTab === 'history' && 'History Kegiatan User'}
                {activeTab === 'settings' && 'Pengaturan Aturan'}
                {activeTab === 'users' && 'Kelola Pengguna'}
              </span>
            </div>
          </div>

          {/* Right side: User Session Profile Card */}
          {currentUser && (
            <div className="flex items-center gap-3">
              {/* Minimalist Profile info */}
              <div className="flex items-center gap-2.5 p-1.5 px-3 bg-slate-50 border border-slate-100 rounded-2xl">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-[11px] shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-[11px] font-black text-slate-900 leading-none">{currentUser.name}</p>
                  <p className="text-[8px] font-black text-indigo-700 uppercase tracking-widest block mt-1 leading-none">
                    {currentUser.role === 'super_admin' ? 'Super Admin' : currentUser.role === 'director' ? 'Direktur / Bos' : currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'finance' ? 'Finance' : 'Operator'}
                  </p>
                </div>
                {/* On mobile, show first name */}
                <div className="text-left sm:hidden">
                  <p className="text-[10px] font-black text-slate-900 leading-none">{currentUser.name.split(' ')[0]}</p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                title="Keluar / Logout"
                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-xl text-slate-400 transition cursor-pointer border-none shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* Main Content Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          
          {selectedInvoiceForViewer ? (
            <InvoiceViewer
              invoice={selectedInvoiceForViewer}
              settings={settings}
              onBack={() => {
                setSelectedInvoiceForViewer(null);
                setActiveTab('report');
              }}
              onMarkPaid={(id) => handleSetInvoiceStatus(id, 'paid')}
              onViewSuratJalan={(invoiceId) => {
                setSelectedInvoiceForViewer(null);
                setSelectedSjIdForViewer(invoiceId);
                setActiveTab('surat_jalan');
              }}
              onUpdateInvoice={(updated) => {
                handleSaveInvoice(updated);
                setSelectedInvoiceForViewer(updated);
              }}
              hasActionAccess={hasActionAccess}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && hasMenuAccess('dashboard') && (
                <Dashboard
                  invoices={invoices}
                  customers={customers}
                  products={products}
                  salesmen={salesmen}
                  setActiveTab={setActiveTab}
                  onViewInvoice={(inv) => setSelectedInvoiceForViewer(inv)}
                />
              )}

              {activeTab === 'invoice' && hasMenuAccess('invoice') && (
                <InvoiceForm
                  customers={customers}
                  products={products}
                  settings={settings}
                  salesmen={salesmen}
                  invoices={invoices}
                  onSaveInvoice={handleSaveInvoice}
                  onViewInvoice={(inv) => setSelectedInvoiceForViewer(inv)}
                  onAddCustomer={handleAddCustomer}
                  invoiceToEdit={invoiceToEdit}
                  onCancelEdit={() => setInvoiceToEdit(null)}
                  hasActionAccess={hasActionAccess}
                />
              )}

              {activeTab === 'surat_jalan' && hasMenuAccess('surat_jalan') && (
                <SuratJalanManager
                  suratJalans={suratJalans}
                  settings={settings}
                  onUpdateSuratJalan={handleUpdateSuratJalan}
                  onViewInvoice={(invoiceId) => {
                    const inv = invoices.find(i => i.id === invoiceId);
                    if (inv) {
                      setSelectedInvoiceForViewer(inv);
                    } else {
                      showToast("Faktur tidak ditemukan!", "error");
                    }
                  }}
                  hasActionAccess={hasActionAccess}
                  selectedSjId={selectedSjIdForViewer}
                  onClearSelectedSjId={() => setSelectedSjIdForViewer(null)}
                />
              )}

              {activeTab === 'report' && hasMenuAccess('report') && (
                <SalesReport
                  invoices={invoices}
                  onViewInvoice={(inv) => setSelectedInvoiceForViewer(inv)}
                  onDeleteInvoice={handleDeleteInvoice}
                  onSetInvoiceStatus={handleSetInvoiceStatus}
                  onUpdateInvoices={saveInvoicesToStore}
                  onEditInvoice={(inv) => {
                    setInvoiceToEdit(inv);
                    setActiveTab('invoice');
                  }}
                  hasActionAccess={hasActionAccess}
                />
              )}

              {activeTab === 'returns' && hasMenuAccess('returns') && (
                <ReturnManager
                  customers={customers}
                  invoices={invoices}
                  onUpdateInvoices={saveInvoicesToStore}
                  settings={settings}
                  onAddActivity={triggerLog}
                  hasActionAccess={hasActionAccess}
                />
              )}

              {activeTab === 'commissions' && hasMenuAccess('commissions') && (
                <CommissionManager
                  salesmen={salesmen}
                  invoices={invoices}
                  settings={settings}
                  onAddSalesman={handleAddSalesman}
                  onUpdateSalesman={handleUpdateSalesman}
                  onDeleteSalesman={handleDeleteSalesman}
                  onUpdateInvoices={saveInvoicesToStore}
                  onViewInvoice={(inv) => setSelectedInvoiceForViewer(inv)}
                  onAddActivity={triggerLog}
                  hasActionAccess={hasActionAccess}
                />
              )}

              {activeTab === 'customers' && hasMenuAccess('customers') && (
                <CustomerManager
                  customers={customers}
                  products={products}
                  invoices={invoices}
                  onAddCustomer={handleAddCustomer}
                  onUpdateCustomer={handleUpdateCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  hasActionAccess={hasActionAccess}
                />
              )}

              {activeTab === 'shoes' && hasMenuAccess('shoes') && (
                <ShoeMasterManager
                  products={products}
                  invoices={invoices}
                  onAddProduct={handleAddProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                  hasActionAccess={hasActionAccess}
                />
              )}

              {activeTab === 'settings' && hasMenuAccess('settings') && (
                <SystemSettingsPanel
                  settings={settings}
                  onSaveSettings={saveSettingsToStore}
                  onResetSettings={handleResetSettings}
                  hasActionAccess={hasActionAccess}
                />
              )}

              {activeTab === 'history' && hasMenuAccess('history') && (
                <HistoryManager
                  logs={activityLogs}
                  onClearLogs={() => {
                    activityLogsApi.clearActivityLogsRemote().then(() => setActivityLogs([])).catch(() => null);
                  }}
                  onRefreshLogs={() => {
                    activityLogsApi.listActivityLogs().then(setActivityLogs).catch(() => null);
                  }}
                  hasActionAccess={hasActionAccess}
                />
              )}

               {activeTab === 'users' && hasMenuAccess('users') && (
                <UserManager
                  users={users}
                  currentUser={currentUser}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />
              )}
            </>
          )}

          {/* Floating Guidance FAB Button */}
          <button
            onClick={() => setShowGuidanceModal(true)}
            title="Panduan Aturan Kalkulasi Harga Otomatis"
            className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white p-3.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center cursor-pointer border-none print:hidden group"
          >
            <AlertCircle className="w-6 h-6 animate-pulse" />
            <span className="absolute right-14 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
              Panduan Kalkulasi Harga
            </span>
          </button>

          {/* Informative Guidance Modal */}
          {showGuidanceModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 print:hidden transition-all duration-300">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto flex flex-col p-6 animate-scale-up md:p-8">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <h4 className="font-bold flex items-center gap-2 text-indigo-950 text-sm md:text-base">
                    <AlertCircle className="w-5 h-5 text-indigo-600" />
                    Panduan Aturan Kalkulasi Harga Otomatis
                  </h4>
                  <button
                    onClick={() => setShowGuidanceModal(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer border-none"
                    title="Tutup"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 leading-relaxed">
                  <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <span className="font-extrabold block text-indigo-950 text-[11px] uppercase tracking-wider">1. Preferensi Harga & Tabel Kustom</span>
                    <p>Masing-masing pelanggan dapat memiliki harga khusus. Melalui mode "Kustom", Anda dapat menentukan batasan jumlah order minimal (pasang) dan harga istimewa yang berbeda-beda secara dinamis untuk setiap jenis sepatu.</p>
                  </div>
                  <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <span className="font-extrabold block text-indigo-950 text-[11px] uppercase tracking-wider">2. Surcharge Ukuran Besar (Size ≥ 44)</span>
                    <p>Sepatu dengan ukuran 44 ke atas akan otomatis dikenakan biaya tambahan Rp 5.000 per pasang, kecuali jika fitur surcharge ini dinonaktifkan untuk pelanggan tertentu di halaman Kelola Pelanggan.</p>
                  </div>
                  <div className="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <span className="font-extrabold block text-indigo-950 text-[11px] uppercase tracking-wider">3. Tingkat Diskon Volume (Lebih Dari / &gt;)</span>
                    <p>Harga otomatis berubah per jenis sepatu jika jumlah kuantitas order **jenis sepatu tersebut** di dalam faktur **melebihi (&gt;)** batas yang ditentukan. Contoh standard (PDH DOV): &gt; 100 pasang untuk Grosir, &gt; 350 pasang untuk Partai.</p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-[10px] text-slate-400 italic leading-normal">
                    * Seluruh data disimpan tersinkronisasi di komputer lokal sehingga tidak akan hilang saat halaman disegarkan. Hubungi admin TI untuk konfigurasi lanjut.
                  </p>
                  <button
                    onClick={() => setShowGuidanceModal(false)}
                    className="self-end sm:self-auto bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-5 py-2 rounded-xl text-xs transition cursor-pointer border-none shadow-xs"
                  >
                    Tutup Panduan
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>

        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 print:hidden mt-auto shrink-0">
          <div className="max-w-[100%] mx-auto px-4 lg:px-12">
            <p>© 2026 Angkasa Jaya Shoes. Hak Cipta Dilindungi Undang-Undang.</p>
            <p className="mt-1">Dibuat khusus untuk pengurusan faktur grosir dan pelaporan dinamis ekspor Excel.</p>
          </div>
        </footer>

      </div>

    </div>
  );
}
