// services/geminiService.ts
export const getSmartRecommendations = async (query: string, products: any[]) => {
  // Untuk sementara, kembalikan pesan sederhana dulu
  // Nanti bisa diganti dengan koneksi ke AI
  return `Rekomendasi untuk "${query}": Fitur AI Assistant sedang dalam pengembangan. Silakan jelajahi kategori produk untuk menemukan yang Anda cari.`;
};
