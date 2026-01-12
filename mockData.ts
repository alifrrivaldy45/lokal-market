
import { Product } from "./types";

// This structure matches your Google Spreadsheet columns
// A: Title, B: Img, C: Harga, D: HargaCoret, E: Desc, F: Status, G: Berat, H: Label
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Kopi Arabika Gayo Premium",
    imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=800&auto=format&fit=crop",
    price: 125000,
    priceOld: 150000,
    description: "Kopi Arabika dari dataran tinggi Gayo, Aceh. Memiliki cita rasa fruity dan aroma yang kuat. Cocok untuk pecinta kopi manual brew.",
    status: 'on',
    weight: 250,
    category: "Minuman"
  },
  {
    id: 2,
    title: "Madu Hutan Asli Riau",
    imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?q=80&w=800&auto=format&fit=crop",
    price: 85000,
    priceOld: 100000,
    description: "Madu murni dari hutan Riau. Dipanen secara tradisional tanpa pemanasan, menjaga nutrisi tetap utuh.",
    status: 'on',
    weight: 500,
    category: "Kesehatan"
  },
  {
    id: 3,
    title: "Keripik Tempe Renyah",
    imageUrl: "https://images.unsplash.com/photo-1621245840632-44140081df98?q=80&w=800&auto=format&fit=crop",
    price: 15000,
    priceOld: 20000,
    description: "Camilan khas Indonesia yang renyah dan gurih. Dibuat dari tempe pilihan dengan bumbu rempah asli.",
    status: 'on',
    weight: 150,
    category: "Makanan Ringan"
  },
  {
    id: 4,
    title: "Teh Hijau Melati",
    imageUrl: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?q=80&w=800&auto=format&fit=crop",
    price: 45000,
    priceOld: null,
    description: "Teh hijau berkualitas dengan sentuhan bunga melati yang menenangkan.",
    status: 'on',
    weight: 100,
    category: "Minuman"
  },
  {
    id: 5,
    title: "Gula Semut Organik",
    imageUrl: "https://images.unsplash.com/photo-1616645300529-62167da51079?q=80&w=800&auto=format&fit=crop",
    price: 35000,
    priceOld: 45000,
    description: "Gula kelapa kristal organik, indeks glikemik rendah, cocok untuk diet sehat.",
    status: 'on',
    weight: 250,
    category: "Bumbu"
  }
];
