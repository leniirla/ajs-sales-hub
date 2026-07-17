import { Router } from 'express';
import { prisma } from '../db';
import { requirePermission } from '../auth';
import { toJson, fromJson } from '../jsonFields';
import { DEFAULT_SETTINGS } from '../../src/utils';
import { validateBody, settingsSchema } from '../validation';
import { asyncHandler } from '../asyncHandler';

export const settingsRouter = Router();

const serialize = (s: any) => ({
  minQtyTier2: s.minQtyTier2,
  discountTier2: s.discountTier2,
  minQtyTier3: s.minQtyTier3,
  discountTier3: s.discountTier3,
  sizeSurchargeLimit: s.sizeSurchargeLimit,
  sizeSurchargeAmount: s.sizeSurchargeAmount,
  packingFeePerKoli: s.packingFeePerKoli,
  ppnPercentage: s.ppnPercentage,
  enablePpn: s.enablePpn,
  warehouseTerms: fromJson(s.warehouseTermsJson, [] as string[]),
  deliveryTerms: fromJson(s.deliveryTermsJson, [] as string[]),
  companyName: s.companyName ?? undefined,
  companyAddress: s.companyAddress ?? undefined,
  companyPhone: s.companyPhone ?? undefined,
  companyLogoUrl: s.companyLogoUrl ?? undefined,
});

settingsRouter.get('/', asyncHandler(async (_req, res) => {
  const row = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  res.json(row ? serialize(row) : DEFAULT_SETTINGS);
}));

settingsRouter.put('/', requirePermission('canEditSettings'), validateBody(settingsSchema), asyncHandler(async (req, res) => {
  const body = req.body;
  const data = {
    minQtyTier2: body.minQtyTier2,
    discountTier2: body.discountTier2,
    minQtyTier3: body.minQtyTier3,
    discountTier3: body.discountTier3,
    sizeSurchargeLimit: body.sizeSurchargeLimit,
    sizeSurchargeAmount: body.sizeSurchargeAmount,
    packingFeePerKoli: body.packingFeePerKoli,
    ppnPercentage: body.ppnPercentage,
    enablePpn: body.enablePpn,
    warehouseTermsJson: toJson(body.warehouseTerms),
    deliveryTermsJson: toJson(body.deliveryTerms),
    companyName: body.companyName ?? null,
    companyAddress: body.companyAddress ?? null,
    companyPhone: body.companyPhone ?? null,
    companyLogoUrl: body.companyLogoUrl ?? null,
  };
  const row = await prisma.systemSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  res.json(serialize(row));
}));
