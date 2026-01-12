
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, AppStatus } from './types';
import { MOCK_PRODUCTS } from './mockData';
import { getSmartRecommendations } from './services/geminiService';

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [status, setStatus] = useState<AppStatus>(AppStatus.LOADING);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Auth State
  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin UI State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI State
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  useEffect(() => {
    const loadData = () => {
      try {
        const savedProducts = localStorage.getItem('lokal_market_products');
        if (savedProducts) {
          setProducts(JSON.parse(savedProducts));
        } else {
          setProducts(MOCK_PRODUCTS);
          localStorage.setItem('lokal_market_products', JSON.stringify(MOCK_PRODUCTS));
        }
        setStatus(AppStatus.READY);
      } catch (err) {
        setStatus(AppStatus.ERROR);
      }
    };
    setTimeout(loadData, 800);
  }, []);

  const saveProductsToStorage = (updatedList: Product[]) => {
    setProducts(updatedList);
    localStorage.setItem('lokal_market_products', JSON.stringify(updatedList));
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
      return matchesSearch && matchesCategory && p.status === 'on';
    });
  }, [products, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category)));
    return ['Semua', ...cats.sort()];
  }, [products]);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin123') {
      setIsAdminLoggedIn(true);
      setLoginError('');
      setAdminPassword('');
    } else {
      setLoginError('Password salah!');
    }
  };

  // Parser CSV Tangguh (Menangani Koma & Rp)
  const parseCsvLine = (text: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newProducts: Product[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const cols = parseCsvLine(line).map(c => c.replace(/^"|"$/g, ''));
        if (cols.length < 8) continue;

        const cleanNumber = (val: string) => parseInt(val.replace(/[^\d]/g, '')) || 0;

        newProducts.push({
          id: Date.now() + i + Math.floor(Math.random() * 1000),
          title: cols[0],
          imageUrl: cols[1],
          price: cleanNumber(cols[2]),
          priceOld: cols[3] ? cleanNumber(cols[3]) : null,
          description: cols[4],
          status: 'on',
          weight: cleanNumber(cols[6]),
          category: cols[7] || "Umum"
        });
      }

      if (newProducts.length > 0) {
        saveProductsToStorage([...products, ...newProducts]);
        alert(`Berhasil: ${newProducts.length} Produk diunggah.`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const headers = "Judul Produk,Link Gambar,Harga,Harga Coret,Deskripsi,Status,Berat,Label\n";
    const example = "Mastering Ebook,https://via.placeholder.com/500x500.png,Rp3.500,Rp15.000,\"Contoh deskripsi produk.\",on,500,EBOOK\n";
    const blob = new Blob([headers + example], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_lokal_market.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteProduct = (id: number) => {
    if (window.confirm('Hapus produk ini secara permanen?')) {
      saveProductsToStorage(products.filter(p => p.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  const bulkUpdateStatus = (newStatus: 'on' | 'off') => {
    if (selectedIds.length === 0) return;
    const updated = products.map(p => 
      selectedIds.includes(p.id) ? { ...p, status: newStatus } : p
    );
    saveProductsToStorage(updated);
    setSelectedIds([]);
  };

  const bulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Hapus ${selectedIds.length} produk terpilih?`)) {
      const updated = products.filter(p => !selectedIds.includes(p.id));
      saveProductsToStorage(updated);
      setSelectedIds([]);
    }
  };

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantMessage.trim()) return;
    setAssistantLoading(true);
    setAiResponse(null);
    const response = await getSmartRecommendations(assistantMessage, products);
    setAiResponse(response);
    setAssistantLoading(false);
  };

  const openWhatsApp = (product: Product) => {
    const message = `Halo Admin,\n\nSaya mau pesan: *${product.title}*\nHarga: Rp ${product.price.toLocaleString('id-ID')}\n\nTerima kasih!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/6289618885066?text=${encoded}`, '_blank');
  };

  if (status === AppStatus.LOADING) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-6">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-8 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-6 text-gray-400 font-black tracking-widest text-xs uppercase animate-pulse text-center">Menghubungkan ke Lokal Market...</p>
        </div>
      </div>
    );
  }

  // --- VIEW ADMIN ---
  if (view === 'admin') {
    if (!isAdminLoggedIn) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4 sm:p-6">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-pink-500"></div>
            <button onClick={() => setView('customer')} className="mb-8 text-gray-400 hover:text-pink-500 flex items-center gap-2 text-[10px] font-black tracking-widest transition-all">
              <i className="fas fa-arrow-left"></i> KEMBALI KE TOKO
            </button>
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-pink-50 text-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <i className="fas fa-lock text-3xl"></i>
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">Admin Login</h2>
              <p className="text-gray-400 font-bold mt-2 text-sm">Gunakan password admin123</p>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <input 
                type="password" 
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:bg-white focus:border-pink-200 transition-all text-center text-lg font-black"
                placeholder="••••••"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              {loginError && <p className="text-rose-500 text-xs font-black text-center">{loginError}</p>}
              <button type="submit" className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-400 uppercase text-xs">
                Masuk Dashboard
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
        {/* Admin Sidebar - Responsive */}
        <aside className="w-full lg:w-72 bg-gray-900 text-white p-6 sm:p-8 flex flex-col shrink-0">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-pink-500 p-3 rounded-2xl shadow-lg">
              <i className="fas fa-shield-halved text-xl text-white"></i>
            </div>
            <h1 className="font-black text-xl tracking-tighter uppercase leading-none">ADMIN</h1>
          </div>
          <nav className="space-y-2 flex-1">
            <button className="w-full flex items-center gap-4 px-5 py-4 bg-pink-500 rounded-2xl font-black text-xs shadow-xl transition-all">
              <i className="fas fa-grid-2 text-lg"></i> Dashboard Produk
            </button>
            <button onClick={() => setView('customer')} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 rounded-2xl font-bold text-xs text-gray-400 hover:text-white transition-all">
              <i className="fas fa-shop text-lg"></i> Lihat Toko
            </button>
            <button onClick={downloadTemplate} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-green-500/10 rounded-2xl font-bold text-xs text-green-400 transition-all">
              <i className="fas fa-file-csv text-lg"></i> Unduh Template
            </button>
          </nav>
          <button onClick={() => setIsAdminLoggedIn(false)} className="mt-8 flex items-center justify-center gap-4 px-5 py-4 text-rose-400 font-black text-xs hover:bg-rose-500/10 rounded-2xl transition-all border border-rose-500/20">
            <i className="fas fa-power-off"></i> LOGOUT SESI
          </button>
        </aside>

        {/* Admin Main Content */}
        <main className="flex-1 p-4 sm:p-8 lg:p-12 overflow-y-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">Manajemen Produk</h2>
              <p className="text-gray-400 font-bold mt-2 text-sm">Kelola stok etalase Anda secara real-time.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleCsvUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="bg-gray-900 text-white px-6 py-4 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-3 hover:bg-black transition-all active:scale-95 shadow-xl">
                <i className="fas fa-plus"></i> IMPORT CSV
              </button>
            </div>
          </header>

          {/* Quick Stats Grid - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10">
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Total Item</p>
              <p className="text-5xl font-black text-gray-900 tracking-tighter">{products.length}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Produk Ready</p>
              <p className="text-5xl font-black text-green-500 tracking-tighter">{products.filter(p => p.status === 'on').length}</p>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm sm:col-span-2 lg:col-span-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Kategori</p>
              <p className="text-5xl font-black text-blue-500 tracking-tighter">{categories.length - 1}</p>
            </div>
          </div>

          {/* Bulk Actions - Responsive */}
          {selectedIds.length > 0 && (
            <div className="mb-8 p-6 bg-gray-900 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-6 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="bg-pink-500 w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl">
                  <i className="fas fa-check-double"></i>
                </div>
                <div>
                  <p className="text-white text-xl font-black leading-none">{selectedIds.length}</p>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Dipilih</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <button onClick={() => bulkUpdateStatus('on')} className="bg-green-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-600 transition-all">Ready</button>
                <button onClick={() => bulkUpdateStatus('off')} className="bg-gray-700 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-600 transition-all">Off</button>
                <button onClick={bulkDelete} className="bg-rose-500 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all">Hapus</button>
                <button onClick={() => setSelectedIds([])} className="bg-white/10 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Batal</button>
              </div>
            </div>
          )}

          {/* Admin Table Responsive Container */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden mb-20">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-400">
                  <tr>
                    <th className="px-6 py-6 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 accent-pink-500 rounded-lg cursor-pointer"
                        checked={selectedIds.length === products.length && products.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest">Produk</th>
                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest">Harga</th>
                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-widest text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map(p => (
                    <tr key={p.id} className="group hover:bg-gray-50/80 transition-all">
                      <td className="px-6 py-6 text-center">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 accent-pink-500 rounded-lg cursor-pointer"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => toggleSelect(p.id)}
                        />
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-4">
                          <img src={p.imageUrl} className="w-12 h-12 rounded-xl object-cover bg-gray-100" alt="" />
                          <div>
                            <p className="text-sm font-black text-gray-900 line-clamp-1 leading-none mb-1.5">{p.title}</p>
                            <span className="text-[10px] bg-pink-100 text-pink-600 font-black px-2 py-0.5 rounded-lg uppercase tracking-tighter">{p.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <p className="text-sm font-black text-gray-900 tracking-tight leading-none">Rp {p.price.toLocaleString('id-ID')}</p>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${p.status === 'on' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${p.status === 'on' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                          {p.status === 'on' ? 'LIVE' : 'OFF'}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-right">
                        {/* Tombol Hapus: Hanya muncul saat baris (group) di-hover, dengan Tooltip native */}
                        <button 
                          onClick={() => deleteProduct(p.id)} 
                          title="Hapus Produk"
                          className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm flex items-center justify-center ml-auto opacity-0 group-hover:opacity-100 active:scale-90"
                        >
                          <i className="fas fa-trash-can text-sm"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-32 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6 text-gray-200 text-5xl">
                            <i className="fas fa-box-open"></i>
                          </div>
                          <h3 className="text-xl font-black text-gray-900 uppercase">Katalog Kosong</h3>
                          <p className="text-gray-400 font-bold text-sm mt-2">Gunakan tombol Import CSV untuk mengisi data.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- VIEW CUSTOMER (RESPONSIVE) ---
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 sm:h-24 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white p-2.5 sm:p-3.5 rounded-2xl shadow-xl shadow-pink-500/20">
              <i className="fas fa-shopping-bag text-lg sm:text-2xl"></i>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tighter uppercase leading-none">LOKAL <span className="text-pink-500">MARKET</span></h1>
          </div>
          
          <div className="flex-1 max-w-2xl hidden md:block">
            <div className="relative group">
              <input
                type="text"
                placeholder="Cari produk pilihan..."
                className="w-full pl-14 pr-6 py-4 bg-gray-100 rounded-full text-sm font-bold focus:outline-none focus:ring-4 focus:ring-pink-500/5 focus:bg-white transition-all border-2 border-transparent focus:border-pink-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="fas fa-search absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 text-lg transition-colors"></i>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Search icon for mobile only */}
            <button className="md:hidden w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <i className="fas fa-search"></i>
            </button>
            <button onClick={() => setView('admin')} className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-all flex items-center justify-center active:scale-90" title="Admin">
              <i className="fas fa-user-shield text-xl sm:text-2xl"></i>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
        {/* Banner Hero - Responsive */}
        <div className="mb-12 rounded-[2.5rem] sm:rounded-[4rem] overflow-hidden relative h-56 sm:h-[28rem] bg-gray-900 flex items-center shadow-2xl">
          <img 
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop" 
            className="absolute inset-0 w-full h-full object-cover opacity-50 scale-105"
            alt="Hero"
          />
          <div className="relative z-10 px-8 sm:px-20 text-white max-w-3xl">
            <span className="bg-pink-500 text-[8px] sm:text-[10px] font-black px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl uppercase tracking-[0.3em] mb-4 sm:mb-6 inline-block">Premium Collection</span>
            <h2 className="text-3xl sm:text-7xl font-black mb-4 sm:mb-6 uppercase tracking-tighter leading-none">Cintai Produk<br/><span className="text-pink-500">Lokal Kita.</span></h2>
            <p className="text-white/70 text-xs sm:text-xl font-bold max-w-lg leading-relaxed hidden sm:block">Koleksi terkurasi dari produsen lokal terbaik Indonesia. Kualitas dunia, harga bersahabat.</p>
          </div>
        </div>

        {/* Categories Scrollable */}
        <div className="flex gap-3 overflow-x-auto pb-8 no-scrollbar scroll-smooth">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap px-6 sm:px-10 py-3 sm:py-4 rounded-2xl text-[10px] sm:text-xs font-black tracking-widest uppercase transition-all border-2 sm:border-4 ${
                selectedCategory === cat 
                ? 'bg-gray-900 text-white border-gray-900 shadow-xl' 
                : 'bg-white text-gray-400 border-gray-50 hover:border-pink-300 shadow-sm'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid - Fluid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-10">
          {filteredProducts.map(product => (
            <div 
              key={product.id} 
              onClick={() => setSelectedProduct(product)}
              className="bg-white rounded-[1.75rem] sm:rounded-[3rem] shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 flex flex-col group border border-gray-50 overflow-hidden cursor-pointer"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
                <img 
                  src={product.imageUrl} 
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]"
                />
                {product.priceOld && (
                  <div className="absolute top-3 sm:top-6 left-3 sm:left-6 bg-rose-600 text-white text-[8px] sm:text-[10px] font-black px-2 sm:px-4 py-1 sm:py-2 rounded-xl">
                    DISC
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-8 flex flex-col flex-1">
                <p className="text-[8px] sm:text-[10px] text-pink-500 font-black uppercase tracking-[0.2em] mb-1 sm:mb-2">{product.category}</p>
                <h3 className="font-black text-gray-900 text-sm sm:text-lg line-clamp-2 min-h-[40px] sm:min-h-[56px] mb-4 sm:mb-6 leading-tight uppercase tracking-tight">
                  {product.title}
                </h3>
                <div className="mt-auto">
                  <div className="flex flex-col mb-4 sm:mb-6">
                    <span className="text-base sm:text-2xl font-black text-gray-900 tracking-tighter">Rp {product.price.toLocaleString('id-ID')}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); openWhatsApp(product); }}
                    className="w-full bg-green-500 text-white py-3 sm:py-5 rounded-2xl sm:rounded-[1.5rem] font-black text-[9px] sm:text-[10px] uppercase tracking-widest hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3"
                  >
                    <i className="fab fa-whatsapp text-lg"></i> PESAN
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-32 sm:py-48 bg-white rounded-[3rem] sm:rounded-[5rem] border-4 border-dashed border-gray-100">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-200 text-4xl sm:text-6xl">
              <i className="fas fa-search"></i>
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-gray-900 uppercase">Tidak Ditemukan</h3>
            <p className="text-gray-400 font-bold text-sm sm:text-xl mt-2 px-6">Gunakan kata kunci atau kategori lainnya.</p>
          </div>
        )}
      </main>

      {/* Modal Detail - Responsive */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedProduct(null)}></div>
          <div className="relative bg-white w-full max-w-6xl rounded-[2.5rem] sm:rounded-[4rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-500 max-h-[95vh]">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-6 right-6 z-10 bg-white/90 backdrop-blur-3xl w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-xl text-gray-900 hover:bg-pink-500 hover:text-white transition-all active:scale-90"><i className="fas fa-times text-xl"></i></button>
            <div className="md:w-1/2 aspect-square md:aspect-auto h-64 sm:h-auto bg-gray-100"><img src={selectedProduct.imageUrl} className="w-full h-full object-cover" /></div>
            <div className="md:w-1/2 p-8 sm:p-16 flex flex-col overflow-y-auto">
              <span className="text-pink-500 font-black text-[10px] sm:text-xs uppercase tracking-[0.4em] mb-4 inline-block">{selectedProduct.category}</span>
              <h2 className="text-2xl sm:text-5xl font-black text-gray-900 mb-6 leading-tight uppercase tracking-tighter">{selectedProduct.title}</h2>
              <div className="flex items-baseline gap-4 mb-8 sm:mb-12">
                <span className="text-3xl sm:text-6xl font-black text-gray-900 tracking-tighter">Rp {selectedProduct.price.toLocaleString('id-ID')}</span>
                {selectedProduct.priceOld && <span className="text-lg sm:text-2xl text-gray-300 line-through font-black">Rp {selectedProduct.priceOld.toLocaleString('id-ID')}</span>}
              </div>
              <div className="mb-10 sm:mb-16">
                <h4 className="font-black text-[10px] sm:text-xs uppercase tracking-[0.3em] mb-4 text-gray-400">Deskripsi</h4>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-xl font-medium whitespace-pre-line border-l-4 sm:border-l-8 border-pink-50 pl-4 sm:pl-8">{selectedProduct.description}</p>
              </div>
              <button onClick={() => openWhatsApp(selectedProduct)} className="w-full bg-green-500 text-white py-5 sm:py-8 rounded-[1.5rem] sm:rounded-[2.5rem] font-black text-base sm:text-2xl tracking-widest hover:bg-green-600 active:scale-95 transition-all uppercase flex items-center justify-center gap-4">
                <i className="fab fa-whatsapp text-3xl sm:text-5xl"></i> Pesan via WA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating AI Orb */}
      <button onClick={() => setIsAssistantOpen(true)} className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 bg-gray-900 text-white w-16 h-16 sm:w-20 sm:h-20 rounded-[1.75rem] sm:rounded-[2.5rem] shadow-2xl flex items-center justify-center hover:bg-pink-600 transition-all z-50 group border-4 border-white/5 backdrop-blur-xl">
        <i className="fas fa-wand-sparkles text-2xl sm:text-3xl group-hover:scale-110 transition-transform"></i>
      </button>

      {/* AI Drawer Premium Responsive */}
      {isAssistantOpen && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsAssistantOpen(false)}></div>
          <div className="relative bg-white w-full max-w-lg shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-500 overflow-hidden">
            <div className="bg-gray-900 p-8 sm:p-10 flex items-center justify-between text-white relative shrink-0">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="bg-pink-500 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-2xl">
                  <i className="fas fa-robot text-2xl sm:text-3xl"></i>
                </div>
                <div>
                  <h3 className="font-black text-xl sm:text-2xl uppercase tracking-tighter leading-none">Smart AI</h3>
                  <p className="text-[9px] sm:text-[10px] text-pink-400 font-black uppercase tracking-widest mt-1 sm:mt-2">Lokal Assistant</p>
                </div>
              </div>
              <button onClick={() => setIsAssistantOpen(false)} className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/5 flex items-center justify-center active:scale-75"><i className="fas fa-times text-xl"></i></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 sm:space-y-10 bg-gray-50/50">
              <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] rounded-tl-none shadow-xl border-l-4 sm:border-l-8 border-pink-500 font-bold text-sm sm:text-lg leading-relaxed text-gray-800">
                Halo! Apa yang bisa saya bantu cari di Lokal Market hari ini?
              </div>
              {aiResponse && (
                <div className="bg-pink-50 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] rounded-tl-none shadow-xl border border-pink-100 font-bold text-sm sm:text-base leading-relaxed text-gray-800 whitespace-pre-wrap">
                  {aiResponse}
                </div>
              )}
              {assistantLoading && (
                <div className="flex gap-2 p-4 items-center bg-white rounded-full w-fit shadow-md">
                  <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce"></div>
                  <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.1s]"></div>
                  <div className="w-2.5 h-2.5 bg-pink-400 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                </div>
              )}
            </div>
            <form onSubmit={handleAiAsk} className="p-6 sm:p-10 border-t-2 border-gray-50 flex gap-3 sm:gap-4 bg-white relative shrink-0">
              <input type="text" placeholder="Tanya rekomendasi..." className="flex-1 px-6 sm:px-8 py-4 sm:py-6 bg-gray-100 rounded-[1.5rem] sm:rounded-[2rem] text-sm sm:text-lg font-black focus:outline-none focus:ring-4 focus:ring-pink-500/10 focus:bg-white transition-all shadow-inner" value={assistantMessage} onChange={(e) => setAssistantMessage(e.target.value)} disabled={assistantLoading} />
              <button type="submit" disabled={assistantLoading} className="bg-pink-500 text-white w-14 h-14 sm:w-20 sm:h-20 rounded-[1.25rem] sm:rounded-[2rem] flex items-center justify-center shadow-xl shadow-pink-500/30 active:scale-90 transition-all">
                <i className="fas fa-paper-plane text-xl sm:text-2xl"></i>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
