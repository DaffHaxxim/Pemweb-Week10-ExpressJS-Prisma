import { prisma } from '../src/lib/prisma.js';

// Data awal sama dengan array Week 9. Seed dilewati bila tabel sudah berisi data,
// sehingga aman dijalankan berulang kali.
const initialProducts = [
  { name: 'Buku', price: 15000 },
  { name: 'Pulpen', price: 5000 },
];

const count = await prisma.product.count();

if (count === 0) {
  await prisma.product.createMany({ data: initialProducts });
  console.log(`Seed selesai: ${initialProducts.length} produk ditambahkan`);
} else {
  console.log(`Seed dilewati: tabel Product sudah berisi ${count} data`);
}

await prisma.$disconnect();
