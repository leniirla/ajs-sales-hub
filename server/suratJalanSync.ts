import { prisma } from './db';
import { toJson } from './jsonFields';

interface InvoiceLike {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  koliCount: number;
  notes: string | null;
  itemsJson: string;
}

export async function syncSuratJalanForInvoice(inv: InvoiceLike): Promise<void> {
  const items = JSON.parse(inv.itemsJson) as { id: string; productName: string; size: number; quantity: number }[];
  const sjItems = items.map((it) => ({ id: it.id, productName: it.productName, size: it.size, quantity: it.quantity }));
  const cleanNum = inv.invoiceNumber.replace(/^INV\/|^FK\//, '');

  const existing = await prisma.suratJalan.findUnique({ where: { invoiceId: inv.id } });
  if (!existing) {
    await prisma.suratJalan.create({
      data: {
        suratJalanNumber: `SJ/${cleanNum}`,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        customerId: inv.customerId,
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        customerAddress: inv.customerAddress,
        itemsJson: toJson(sjItems)!,
        koliCount: inv.koliCount,
        driverName: '',
        vehicleNumber: '',
        status: 'draft',
        notes: inv.notes || '',
      },
    });
    return;
  }

  await prisma.suratJalan.update({
    where: { invoiceId: inv.id },
    data: {
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      customerAddress: inv.customerAddress,
      itemsJson: toJson(sjItems)!,
      koliCount: inv.koliCount,
    },
  });
}

export async function deleteSuratJalanForInvoice(invoiceId: string): Promise<void> {
  await prisma.suratJalan.deleteMany({ where: { invoiceId } });
}
