// server/app.ts
import "dotenv/config";
import path2 from "node:path";
import express from "express";
import helmet from "helmet";

// server/seed.ts
import bcrypt from "bcryptjs";

// server/db.ts
import { PrismaPg } from "@prisma/adapter-pg";

// src/generated/prisma/client.ts
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// src/generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.8.0",
  "engineVersion": "3c6e192761c0362d496ed980de936e2f3cebcd3a",
  "activeProvider": "postgresql",
  "inlineSchema": '// This is your Prisma schema file,\n// learn more about it in the docs: https://pris.ly/d/prisma-schema\n\ngenerator client {\n  provider = "prisma-client"\n  output   = "../src/generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\nmodel User {\n  id              String  @id @default(cuid())\n  username        String  @unique\n  passwordHash    String\n  name            String\n  role            String\n  createdAt       String\n  allowedTabsJson String?\n  permissionsJson String?\n\n  sessions Session[]\n}\n\nmodel Session {\n  token     String   @id @default(cuid())\n  userId    String\n  createdAt DateTime @default(now())\n  expiresAt DateTime\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n}\n\nmodel Customer {\n  id                       String   @id @default(cuid())\n  name                     String\n  type                     String\n  hasFlatPriceSizeLarge    Boolean\n  enableVolumeDiscount     Boolean?\n  volumeMode               String?\n  customBasePrice          Float\n  customPricesJson         String?\n  customTier2PricesJson    String?\n  customTier3PricesJson    String?\n  customTier2MinQtyJson    String?\n  customTier3MinQtyJson    String?\n  customSizeSurchargesJson String?\n  phone                    String?\n  address                  String?\n  commissionRate           Float?\n}\n\nmodel Product {\n  id                    String  @id @default(cuid())\n  name                  String\n  defaultPrice          Float\n  priceTier2            Float?\n  priceTier3            Float?\n  customSurchargeLimit  Float?\n  customSurchargeAmount Float?\n  customSurchargesJson  String?\n}\n\nmodel Salesman {\n  id                String  @id @default(cuid())\n  name              String\n  phone             String?\n  commissionPerPair Float\n}\n\nmodel Invoice {\n  id                    String   @id @default(cuid())\n  invoiceNumber         String\n  date                  String\n  customerId            String\n  customerName          String\n  customerType          String\n  customerPhone         String?\n  customerAddress       String?\n  hasFlatPriceSizeLarge Boolean\n  itemsJson             String\n  wantsPacking          Boolean\n  koliCount             Int\n  packingFee            Float\n  hasOngkir             Boolean?\n  ongkirAmount          Float?\n  totalPairs            Int\n  subtotal              Float\n  taxRate               Float?\n  ppnAmount             Float?\n  totalAmount           Float\n  dpAmount              Float?\n  remainingBalance      Float?\n  notes                 String?\n  status                String\n  salesmanId            String?\n  salesmanName          String?\n  commissionPerPair     Float?\n  commissionStatus      String?\n  paymentProofUrl       String?\n  paymentProofUrlsJson  String?\n  paymentsJson          String?\n  createdAt             DateTime @default(now())\n}\n\nmodel ProductReturn {\n  id                String  @id @default(cuid())\n  returnNumber      String\n  date              String\n  invoiceId         String\n  invoiceNumber     String\n  customerId        String\n  customerName      String\n  itemsJson         String\n  totalRefundAmount Float\n  refundType        String\n  notes             String?\n  status            String\n}\n\nmodel SuratJalan {\n  id               String  @id @default(cuid())\n  suratJalanNumber String\n  invoiceId        String  @unique\n  invoiceNumber    String\n  date             String\n  customerId       String\n  customerName     String\n  customerPhone    String?\n  customerAddress  String?\n  itemsJson        String\n  koliCount        Int\n  driverName       String?\n  vehicleNumber    String?\n  status           String\n  notes            String?\n}\n\nmodel SystemSettings {\n  id                  Int     @id @default(1)\n  minQtyTier2         Int\n  discountTier2       Float\n  minQtyTier3         Int\n  discountTier3       Float\n  sizeSurchargeLimit  Int\n  sizeSurchargeAmount Float\n  packingFeePerKoli   Float\n  ppnPercentage       Float\n  enablePpn           Boolean\n  warehouseTermsJson  String?\n  deliveryTermsJson   String?\n  companyName         String?\n  companyAddress      String?\n  companyPhone        String?\n  companyLogoUrl      String?\n}\n\nmodel ActivityLog {\n  id          String  @id @default(cuid())\n  timestamp   String\n  actionType  String\n  category    String\n  description String\n  details     String?\n  username    String?\n}\n\nmodel CommissionMonthlyRate {\n  key   String @id\n  value Float\n}\n\nmodel CommissionMonthlyPayment {\n  key   String @id\n  value String\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"username","kind":"scalar","type":"String"},{"name":"passwordHash","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"role","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"String"},{"name":"allowedTabsJson","kind":"scalar","type":"String"},{"name":"permissionsJson","kind":"scalar","type":"String"},{"name":"sessions","kind":"object","type":"Session","relationName":"SessionToUser"}],"dbName":null},"Session":{"fields":[{"name":"token","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"user","kind":"object","type":"User","relationName":"SessionToUser"}],"dbName":null},"Customer":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"type","kind":"scalar","type":"String"},{"name":"hasFlatPriceSizeLarge","kind":"scalar","type":"Boolean"},{"name":"enableVolumeDiscount","kind":"scalar","type":"Boolean"},{"name":"volumeMode","kind":"scalar","type":"String"},{"name":"customBasePrice","kind":"scalar","type":"Float"},{"name":"customPricesJson","kind":"scalar","type":"String"},{"name":"customTier2PricesJson","kind":"scalar","type":"String"},{"name":"customTier3PricesJson","kind":"scalar","type":"String"},{"name":"customTier2MinQtyJson","kind":"scalar","type":"String"},{"name":"customTier3MinQtyJson","kind":"scalar","type":"String"},{"name":"customSizeSurchargesJson","kind":"scalar","type":"String"},{"name":"phone","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"commissionRate","kind":"scalar","type":"Float"}],"dbName":null},"Product":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"defaultPrice","kind":"scalar","type":"Float"},{"name":"priceTier2","kind":"scalar","type":"Float"},{"name":"priceTier3","kind":"scalar","type":"Float"},{"name":"customSurchargeLimit","kind":"scalar","type":"Float"},{"name":"customSurchargeAmount","kind":"scalar","type":"Float"},{"name":"customSurchargesJson","kind":"scalar","type":"String"}],"dbName":null},"Salesman":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"phone","kind":"scalar","type":"String"},{"name":"commissionPerPair","kind":"scalar","type":"Float"}],"dbName":null},"Invoice":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"invoiceNumber","kind":"scalar","type":"String"},{"name":"date","kind":"scalar","type":"String"},{"name":"customerId","kind":"scalar","type":"String"},{"name":"customerName","kind":"scalar","type":"String"},{"name":"customerType","kind":"scalar","type":"String"},{"name":"customerPhone","kind":"scalar","type":"String"},{"name":"customerAddress","kind":"scalar","type":"String"},{"name":"hasFlatPriceSizeLarge","kind":"scalar","type":"Boolean"},{"name":"itemsJson","kind":"scalar","type":"String"},{"name":"wantsPacking","kind":"scalar","type":"Boolean"},{"name":"koliCount","kind":"scalar","type":"Int"},{"name":"packingFee","kind":"scalar","type":"Float"},{"name":"hasOngkir","kind":"scalar","type":"Boolean"},{"name":"ongkirAmount","kind":"scalar","type":"Float"},{"name":"totalPairs","kind":"scalar","type":"Int"},{"name":"subtotal","kind":"scalar","type":"Float"},{"name":"taxRate","kind":"scalar","type":"Float"},{"name":"ppnAmount","kind":"scalar","type":"Float"},{"name":"totalAmount","kind":"scalar","type":"Float"},{"name":"dpAmount","kind":"scalar","type":"Float"},{"name":"remainingBalance","kind":"scalar","type":"Float"},{"name":"notes","kind":"scalar","type":"String"},{"name":"status","kind":"scalar","type":"String"},{"name":"salesmanId","kind":"scalar","type":"String"},{"name":"salesmanName","kind":"scalar","type":"String"},{"name":"commissionPerPair","kind":"scalar","type":"Float"},{"name":"commissionStatus","kind":"scalar","type":"String"},{"name":"paymentProofUrl","kind":"scalar","type":"String"},{"name":"paymentProofUrlsJson","kind":"scalar","type":"String"},{"name":"paymentsJson","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":null},"ProductReturn":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"returnNumber","kind":"scalar","type":"String"},{"name":"date","kind":"scalar","type":"String"},{"name":"invoiceId","kind":"scalar","type":"String"},{"name":"invoiceNumber","kind":"scalar","type":"String"},{"name":"customerId","kind":"scalar","type":"String"},{"name":"customerName","kind":"scalar","type":"String"},{"name":"itemsJson","kind":"scalar","type":"String"},{"name":"totalRefundAmount","kind":"scalar","type":"Float"},{"name":"refundType","kind":"scalar","type":"String"},{"name":"notes","kind":"scalar","type":"String"},{"name":"status","kind":"scalar","type":"String"}],"dbName":null},"SuratJalan":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"suratJalanNumber","kind":"scalar","type":"String"},{"name":"invoiceId","kind":"scalar","type":"String"},{"name":"invoiceNumber","kind":"scalar","type":"String"},{"name":"date","kind":"scalar","type":"String"},{"name":"customerId","kind":"scalar","type":"String"},{"name":"customerName","kind":"scalar","type":"String"},{"name":"customerPhone","kind":"scalar","type":"String"},{"name":"customerAddress","kind":"scalar","type":"String"},{"name":"itemsJson","kind":"scalar","type":"String"},{"name":"koliCount","kind":"scalar","type":"Int"},{"name":"driverName","kind":"scalar","type":"String"},{"name":"vehicleNumber","kind":"scalar","type":"String"},{"name":"status","kind":"scalar","type":"String"},{"name":"notes","kind":"scalar","type":"String"}],"dbName":null},"SystemSettings":{"fields":[{"name":"id","kind":"scalar","type":"Int"},{"name":"minQtyTier2","kind":"scalar","type":"Int"},{"name":"discountTier2","kind":"scalar","type":"Float"},{"name":"minQtyTier3","kind":"scalar","type":"Int"},{"name":"discountTier3","kind":"scalar","type":"Float"},{"name":"sizeSurchargeLimit","kind":"scalar","type":"Int"},{"name":"sizeSurchargeAmount","kind":"scalar","type":"Float"},{"name":"packingFeePerKoli","kind":"scalar","type":"Float"},{"name":"ppnPercentage","kind":"scalar","type":"Float"},{"name":"enablePpn","kind":"scalar","type":"Boolean"},{"name":"warehouseTermsJson","kind":"scalar","type":"String"},{"name":"deliveryTermsJson","kind":"scalar","type":"String"},{"name":"companyName","kind":"scalar","type":"String"},{"name":"companyAddress","kind":"scalar","type":"String"},{"name":"companyPhone","kind":"scalar","type":"String"},{"name":"companyLogoUrl","kind":"scalar","type":"String"}],"dbName":null},"ActivityLog":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"timestamp","kind":"scalar","type":"String"},{"name":"actionType","kind":"scalar","type":"String"},{"name":"category","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"details","kind":"scalar","type":"String"},{"name":"username","kind":"scalar","type":"String"}],"dbName":null},"CommissionMonthlyRate":{"fields":[{"name":"key","kind":"scalar","type":"String"},{"name":"value","kind":"scalar","type":"Float"}],"dbName":null},"CommissionMonthlyPayment":{"fields":[{"name":"key","kind":"scalar","type":"String"},{"name":"value","kind":"scalar","type":"String"}],"dbName":null}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","user","sessions","_count","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_min","_max","User.groupBy","User.aggregate","Session.findUnique","Session.findUniqueOrThrow","Session.findFirst","Session.findFirstOrThrow","Session.findMany","Session.createOne","Session.createMany","Session.createManyAndReturn","Session.updateOne","Session.updateMany","Session.updateManyAndReturn","Session.upsertOne","Session.deleteOne","Session.deleteMany","Session.groupBy","Session.aggregate","Customer.findUnique","Customer.findUniqueOrThrow","Customer.findFirst","Customer.findFirstOrThrow","Customer.findMany","Customer.createOne","Customer.createMany","Customer.createManyAndReturn","Customer.updateOne","Customer.updateMany","Customer.updateManyAndReturn","Customer.upsertOne","Customer.deleteOne","Customer.deleteMany","_avg","_sum","Customer.groupBy","Customer.aggregate","Product.findUnique","Product.findUniqueOrThrow","Product.findFirst","Product.findFirstOrThrow","Product.findMany","Product.createOne","Product.createMany","Product.createManyAndReturn","Product.updateOne","Product.updateMany","Product.updateManyAndReturn","Product.upsertOne","Product.deleteOne","Product.deleteMany","Product.groupBy","Product.aggregate","Salesman.findUnique","Salesman.findUniqueOrThrow","Salesman.findFirst","Salesman.findFirstOrThrow","Salesman.findMany","Salesman.createOne","Salesman.createMany","Salesman.createManyAndReturn","Salesman.updateOne","Salesman.updateMany","Salesman.updateManyAndReturn","Salesman.upsertOne","Salesman.deleteOne","Salesman.deleteMany","Salesman.groupBy","Salesman.aggregate","Invoice.findUnique","Invoice.findUniqueOrThrow","Invoice.findFirst","Invoice.findFirstOrThrow","Invoice.findMany","Invoice.createOne","Invoice.createMany","Invoice.createManyAndReturn","Invoice.updateOne","Invoice.updateMany","Invoice.updateManyAndReturn","Invoice.upsertOne","Invoice.deleteOne","Invoice.deleteMany","Invoice.groupBy","Invoice.aggregate","ProductReturn.findUnique","ProductReturn.findUniqueOrThrow","ProductReturn.findFirst","ProductReturn.findFirstOrThrow","ProductReturn.findMany","ProductReturn.createOne","ProductReturn.createMany","ProductReturn.createManyAndReturn","ProductReturn.updateOne","ProductReturn.updateMany","ProductReturn.updateManyAndReturn","ProductReturn.upsertOne","ProductReturn.deleteOne","ProductReturn.deleteMany","ProductReturn.groupBy","ProductReturn.aggregate","SuratJalan.findUnique","SuratJalan.findUniqueOrThrow","SuratJalan.findFirst","SuratJalan.findFirstOrThrow","SuratJalan.findMany","SuratJalan.createOne","SuratJalan.createMany","SuratJalan.createManyAndReturn","SuratJalan.updateOne","SuratJalan.updateMany","SuratJalan.updateManyAndReturn","SuratJalan.upsertOne","SuratJalan.deleteOne","SuratJalan.deleteMany","SuratJalan.groupBy","SuratJalan.aggregate","SystemSettings.findUnique","SystemSettings.findUniqueOrThrow","SystemSettings.findFirst","SystemSettings.findFirstOrThrow","SystemSettings.findMany","SystemSettings.createOne","SystemSettings.createMany","SystemSettings.createManyAndReturn","SystemSettings.updateOne","SystemSettings.updateMany","SystemSettings.updateManyAndReturn","SystemSettings.upsertOne","SystemSettings.deleteOne","SystemSettings.deleteMany","SystemSettings.groupBy","SystemSettings.aggregate","ActivityLog.findUnique","ActivityLog.findUniqueOrThrow","ActivityLog.findFirst","ActivityLog.findFirstOrThrow","ActivityLog.findMany","ActivityLog.createOne","ActivityLog.createMany","ActivityLog.createManyAndReturn","ActivityLog.updateOne","ActivityLog.updateMany","ActivityLog.updateManyAndReturn","ActivityLog.upsertOne","ActivityLog.deleteOne","ActivityLog.deleteMany","ActivityLog.groupBy","ActivityLog.aggregate","CommissionMonthlyRate.findUnique","CommissionMonthlyRate.findUniqueOrThrow","CommissionMonthlyRate.findFirst","CommissionMonthlyRate.findFirstOrThrow","CommissionMonthlyRate.findMany","CommissionMonthlyRate.createOne","CommissionMonthlyRate.createMany","CommissionMonthlyRate.createManyAndReturn","CommissionMonthlyRate.updateOne","CommissionMonthlyRate.updateMany","CommissionMonthlyRate.updateManyAndReturn","CommissionMonthlyRate.upsertOne","CommissionMonthlyRate.deleteOne","CommissionMonthlyRate.deleteMany","CommissionMonthlyRate.groupBy","CommissionMonthlyRate.aggregate","CommissionMonthlyPayment.findUnique","CommissionMonthlyPayment.findUniqueOrThrow","CommissionMonthlyPayment.findFirst","CommissionMonthlyPayment.findFirstOrThrow","CommissionMonthlyPayment.findMany","CommissionMonthlyPayment.createOne","CommissionMonthlyPayment.createMany","CommissionMonthlyPayment.createManyAndReturn","CommissionMonthlyPayment.updateOne","CommissionMonthlyPayment.updateMany","CommissionMonthlyPayment.updateManyAndReturn","CommissionMonthlyPayment.upsertOne","CommissionMonthlyPayment.deleteOne","CommissionMonthlyPayment.deleteMany","CommissionMonthlyPayment.groupBy","CommissionMonthlyPayment.aggregate","AND","OR","NOT","key","value","equals","in","notIn","lt","lte","gt","gte","contains","startsWith","endsWith","not","id","timestamp","actionType","category","description","details","username","minQtyTier2","discountTier2","minQtyTier3","discountTier3","sizeSurchargeLimit","sizeSurchargeAmount","packingFeePerKoli","ppnPercentage","enablePpn","warehouseTermsJson","deliveryTermsJson","companyName","companyAddress","companyPhone","companyLogoUrl","suratJalanNumber","invoiceId","invoiceNumber","date","customerId","customerName","customerPhone","customerAddress","itemsJson","koliCount","driverName","vehicleNumber","status","notes","returnNumber","totalRefundAmount","refundType","customerType","hasFlatPriceSizeLarge","wantsPacking","packingFee","hasOngkir","ongkirAmount","totalPairs","subtotal","taxRate","ppnAmount","totalAmount","dpAmount","remainingBalance","salesmanId","salesmanName","commissionPerPair","commissionStatus","paymentProofUrl","paymentProofUrlsJson","paymentsJson","createdAt","name","phone","defaultPrice","priceTier2","priceTier3","customSurchargeLimit","customSurchargeAmount","customSurchargesJson","type","enableVolumeDiscount","volumeMode","customBasePrice","customPricesJson","customTier2PricesJson","customTier3PricesJson","customTier2MinQtyJson","customTier3MinQtyJson","customSizeSurchargesJson","address","commissionRate","token","userId","expiresAt","passwordHash","role","allowedTabsJson","permissionsJson","every","some","none","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","increment","decrement","multiply","divide"]'),
  graph: "vgNywAEMBAAA5wIAIM4BAADmAgAwzwEAAAkAENABAADmAgAw3gEBAAAAAeQBAQAAAAGZAgEAtQIAIZoCAQC1AgAhsQIBALUCACGyAgEAtQIAIbMCAQDCAgAhtAIBAMICACEBAAAAAQAgCAMAAOkCACDOAQAA6AIAMM8BAAADABDQAQAA6AIAMJkCQADdAgAhrgIBALUCACGvAgEAtQIAIbACQADdAgAhAQMAALgDACAIAwAA6QIAIM4BAADoAgAwzwEAAAMAENABAADoAgAwmQJAAN0CACGuAgEAAAABrwIBALUCACGwAkAA3QIAIQMAAAADACABAAAEADACAAAFACABAAAAAwAgAQAAAAEAIAwEAADnAgAgzgEAAOYCADDPAQAACQAQ0AEAAOYCADDeAQEAtQIAIeQBAQC1AgAhmQIBALUCACGaAgEAtQIAIbECAQC1AgAhsgIBALUCACGzAgEAwgIAIbQCAQDCAgAhAwQAALcDACCzAgAA9AIAILQCAAD0AgAgAwAAAAkAIAEAAAoAMAIAAAEAIAMAAAAJACABAAAKADACAAABACADAAAACQAgAQAACgAwAgAAAQAgCQQAALYDACDeAQEAAAAB5AEBAAAAAZkCAQAAAAGaAgEAAAABsQIBAAAAAbICAQAAAAGzAgEAAAABtAIBAAAAAQELAAAOACAI3gEBAAAAAeQBAQAAAAGZAgEAAAABmgIBAAAAAbECAQAAAAGyAgEAAAABswIBAAAAAbQCAQAAAAEBCwAAEAAwAQsAABAAMAkEAACpAwAg3gEBAO0CACHkAQEA7QIAIZkCAQDtAgAhmgIBAO0CACGxAgEA7QIAIbICAQDtAgAhswIBAPgCACG0AgEA-AIAIQIAAAABACALAAATACAI3gEBAO0CACHkAQEA7QIAIZkCAQDtAgAhmgIBAO0CACGxAgEA7QIAIbICAQDtAgAhswIBAPgCACG0AgEA-AIAIQIAAAAJACALAAAVACACAAAACQAgCwAAFQAgAwAAAAEAIBIAAA4AIBMAABMAIAEAAAABACABAAAACQAgBQUAAKYDACAYAACoAwAgGQAApwMAILMCAAD0AgAgtAIAAPQCACALzgEAAOUCADDPAQAAHAAQ0AEAAOUCADDeAQEAsAIAIeQBAQCwAgAhmQIBALACACGaAgEAsAIAIbECAQCwAgAhsgIBALACACGzAgEAvQIAIbQCAQC9AgAhAwAAAAkAIAEAABsAMBcAABwAIAMAAAAJACABAAAKADACAAABACABAAAABQAgAQAAAAUAIAMAAAADACABAAAEADACAAAFACADAAAAAwAgAQAABAAwAgAABQAgAwAAAAMAIAEAAAQAMAIAAAUAIAUDAAClAwAgmQJAAAAAAa4CAQAAAAGvAgEAAAABsAJAAAAAAQELAAAkACAEmQJAAAAAAa4CAQAAAAGvAgEAAAABsAJAAAAAAQELAAAmADABCwAAJgAwBQMAAKQDACCZAkAAkQMAIa4CAQDtAgAhrwIBAO0CACGwAkAAkQMAIQIAAAAFACALAAApACAEmQJAAJEDACGuAgEA7QIAIa8CAQDtAgAhsAJAAJEDACECAAAAAwAgCwAAKwAgAgAAAAMAIAsAACsAIAMAAAAFACASAAAkACATAAApACABAAAABQAgAQAAAAMAIAMFAAChAwAgGAAAowMAIBkAAKIDACAHzgEAAOQCADDPAQAAMgAQ0AEAAOQCADCZAkAA0wIAIa4CAQCwAgAhrwIBALACACGwAkAA0wIAIQMAAAADACABAAAxADAXAAAyACADAAAAAwAgAQAABAAwAgAABQAgE84BAADjAgAwzwEAADgAENABAADjAgAw3gEBAAAAAYYCIADLAgAhmgIBALUCACGbAgEAwgIAIaICAQC1AgAhowIgANsCACGkAgEAwgIAIaUCCAC7AgAhpgIBAMICACGnAgEAwgIAIagCAQDCAgAhqQIBAMICACGqAgEAwgIAIasCAQDCAgAhrAIBAMICACGtAggA3AIAIQEAAAA1ACABAAAANQAgE84BAADjAgAwzwEAADgAENABAADjAgAw3gEBALUCACGGAiAAywIAIZoCAQC1AgAhmwIBAMICACGiAgEAtQIAIaMCIADbAgAhpAIBAMICACGlAggAuwIAIaYCAQDCAgAhpwIBAMICACGoAgEAwgIAIakCAQDCAgAhqgIBAMICACGrAgEAwgIAIawCAQDCAgAhrQIIANwCACELmwIAAPQCACCjAgAA9AIAIKQCAAD0AgAgpgIAAPQCACCnAgAA9AIAIKgCAAD0AgAgqQIAAPQCACCqAgAA9AIAIKsCAAD0AgAgrAIAAPQCACCtAgAA9AIAIAMAAAA4ACABAAA5ADACAAA1ACADAAAAOAAgAQAAOQAwAgAANQAgAwAAADgAIAEAADkAMAIAADUAIBDeAQEAAAABhgIgAAAAAZoCAQAAAAGbAgEAAAABogIBAAAAAaMCIAAAAAGkAgEAAAABpQIIAAAAAaYCAQAAAAGnAgEAAAABqAIBAAAAAakCAQAAAAGqAgEAAAABqwIBAAAAAawCAQAAAAGtAggAAAABAQsAAD0AIBDeAQEAAAABhgIgAAAAAZoCAQAAAAGbAgEAAAABogIBAAAAAaMCIAAAAAGkAgEAAAABpQIIAAAAAaYCAQAAAAGnAgEAAAABqAIBAAAAAakCAQAAAAGqAgEAAAABqwIBAAAAAawCAQAAAAGtAggAAAABAQsAAD8AMAELAAA_ADAQ3gEBAO0CACGGAiAA_wIAIZoCAQDtAgAhmwIBAPgCACGiAgEA7QIAIaMCIACPAwAhpAIBAPgCACGlAggA8wIAIaYCAQD4AgAhpwIBAPgCACGoAgEA-AIAIakCAQD4AgAhqgIBAPgCACGrAgEA-AIAIawCAQD4AgAhrQIIAJADACECAAAANQAgCwAAQgAgEN4BAQDtAgAhhgIgAP8CACGaAgEA7QIAIZsCAQD4AgAhogIBAO0CACGjAiAAjwMAIaQCAQD4AgAhpQIIAPMCACGmAgEA-AIAIacCAQD4AgAhqAIBAPgCACGpAgEA-AIAIaoCAQD4AgAhqwIBAPgCACGsAgEA-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-gEBAMICACH7AQEAwgIAIfwBAQC1AgAh_QECAMoCACGAAgEAtQIAIYECAQDCAgAhhQIBALUCACGGAiAAywIAIYcCIADLAgAhiAIIALsCACGJAiAA2wIAIYoCCADcAgAhiwICAMoCACGMAggAuwIAIY0CCADcAgAhjgIIANwCACGPAggAuwIAIZACCADcAgAhkQIIANwCACGSAgEAwgIAIZMCAQDCAgAhlAIIANwCACGVAgEAwgIAIZYCAQDCAgAhlwIBAMICACGYAgEAwgIAIZkCQADdAgAhAQAAAIABACABAAAAgAEAICPOAQAA2gIAMM8BAACDAQAQ0AEAANoCADDeAQEAtQIAIfYBAQC1AgAh9wEBALUCACH4AQEAtQIAIfkBAQC1AgAh-gEBAMICACH7AQEAwgIAIfwBAQC1AgAh_QECAMoCACGAAgEAtQIAIYECAQDCAgAhhQIBALUCACGGAiAAywIAIYcCIADLAgAhiAIIALsCACGJAiAA2wIAIYoCCADcAgAhiwICAMoCACGMAggAuwIAIY0CCADcAgAhjgIIANwCACGPAggAuwIAIZACCADcAgAhkQIIANwCACGSAgEAwgIAIZMCAQDCAgAhlAIIANwCACGVAgEAwgIAIZYCAQDCAgAhlwIBAMICACGYAgEAwgIAIZkCQADdAgAhEPoBAAD0AgAg-wEAAPQCACCBAgAA9AIAIIkCAAD0AgAgigIAAPQCACCNAgAA9AIAII4CAAD0AgAgkAIAAPQCACCRAgAA9AIAIJICAAD0AgAgkwIAAPQCACCUAgAA9AIAIJUCAAD0AgAglgIAAPQCACCXAgAA9AIAIJgCAAD0AgAgAwAAAIMBACABAACEAQAwAgAAgAEAIAMAAACDAQAgAQAAhAEAMAIAAIABACADAAAAgwEAIAEAAIQBADACAACAAQAgIN4BAQAAAAH2AQEAAAAB9wEBAAAAAfgBAQAAAAH5AQEAAAAB-gEBAAAAAfsBAQAAAAH8AQEAAAAB_QECAAAAAYACAQAAAAGBAgEAAAABhQIBAAAAAYYCIAAAAAGHAiAAAAABiAIIAAAAAYkCIAAAAAGKAggAAAABiwICAAAAAYwCCAAAAAGNAggAAAABjgIIAAAAAY8CCAAAAAGQAggAAAABkQIIAAAAAZICAQAAAAGTAgEAAAABlAIIAAAAAZUCAQAAAAGWAgEAAAABlwIBAAAAAZgCAQAAAAGZAkAAAAABAQsAAIgBACAg3gEBAAAAAfYBAQAAAAH3AQEAAAAB-AEBAAAAAfkBAQAAAAH6AQEAAAAB-wEBAAAAAfwBAQAAAAH9AQIAAAABgAIBAAAAAYECAQAAAAGFAgEAAAABhgIgAAAAAYcCIAAAAAGIAggAAAABiQIgAAAAAYoCCAAAAAGLAgIAAAABjAIIAAAAAY0CCAAAAAGOAggAAAABjwIIAAAAAZACCAAAAAGRAggAAAABkgIBAAAAAZMCAQAAAAGUAggAAAABlQIBAAAAAZYCAQAAAAGXAgEAAAABmAIBAAAAAZkCQAAAAAEBCwAAigEAMAELAACKAQAwIN4BAQDtAgAh9gEBAO0CACH3AQEA7QIAIfgBAQDtAgAh-QEBAO0CACH6AQEA-AIAIfsBAQD4AgAh_AEBAO0CACH9AQIA_gIAIYACAQDtAgAhgQIBAPgCACGFAgEA7QIAIYYCIAD_AgAhhwIgAP8CACGIAggA8wIAIYkCIACPAwAhigIIAJADACGLAgIA_gIAIYwCCADzAgAhjQIIAJADACGOAggAkAMAIY8CCADzAgAhkAIIAJADACGRAggAkAMAIZICAQD4AgAhkwIBAPgCACGUAggAkAMAIZUCAQD4AgAhlgIBAPgCACGXAgEA-AIAIZgCAQD4AgAhmQJAAJEDACECAAAAgAEAIAsAAI0BACAg3gEBAO0CACH2AQEA7QIAIfcBAQDtAgAh-AEBAO0CACH5AQEA7QIAIfoBAQD4AgAh-wEBAPgCACH8AQEA7QIAIf0BAgD-AgAhgAIBAO0CACGBAgEA-AIAIYUCAQDtAgAhhgIgAP8CACGHAiAA_wIAIYgCCADzAgAhiQIgAI8DACGKAggAkAMAIYsCAgD-AgAhjAIIAPMCACGNAggAkAMAIY4CCACQAwAhjwIIAPMCACGQAggAkAMAIZECCACQAwAhkgIBAPgCACGTAgEA-AIAIZQCCACQAwAhlQIBAPgCACGWAgEA-AIAIZcCAQD4AgAhmAIBAPgCACGZAkAAkQMAIQIAAACDAQAgCwAAjwEAIAIAAACDAQAgCwAAjwEAIAMAAACAAQAgEgAAiAEAIBMAAI0BACABAAAAgAEAIAEAAACDAQAgFQUAAIoDACAYAACNAwAgGQAAjAMAIDoAAIsDACA7AACOAwAg-gEAAPQCACD7AQAA9AIAIIECAAD0AgAgiQIAAPQCACCKAgAA9AIAII0CAAD0AgAgjgIAAPQCACCQAgAA9AIAIJECAAD0AgAgkgIAAPQCACCTAgAA9AIAIJQCAAD0AgAglQIAAPQCACCWAgAA9AIAIJcCAAD0AgAgmAIAAPQCACAjzgEAANACADDPAQAAlgEAENABAADQAgAw3gEBALACACH2AQEAsAIAIfcBAQCwAgAh-AEBALACACH5AQEAsAIAIfoBAQC9AgAh-wEBAL0CACH8AQEAsAIAIf0BAgDEAgAhgAIBALACACGBAgEAvQIAIYUCAQCwAgAhhgIgAMUCACGHAiAAxQIAIYgCCAC3AgAhiQIgANECACGKAggA0gIAIYsCAgDEAgAhjAIIALcCACGNAggA0gIAIY4CCADSAgAhjwIIALcCACGQAggA0gIAIZECCADSAgAhkgIBAL0CACGTAgEAvQIAIZQCCADSAgAhlQIBAL0CACGWAgEAvQIAIZcCAQC9AgAhmAIBAL0CACGZAkAA0wIAIQMAAACDAQAgAQAAlQEAMBcAAJYBACADAAAAgwEAIAEAAIQBADACAACAAQAgD84BAADPAgAwzwEAAJwBABDQAQAAzwIAMN4BAQAAAAH1AQEAtQIAIfYBAQC1AgAh9wEBALUCACH4AQEAtQIAIfkBAQC1AgAh_AEBALUCACGAAgEAtQIAIYECAQDCAgAhggIBALUCACGDAggAuwIAIYQCAQC1AgAhAQAAAJkBACABAAAAmQEAIA_OAQAAzwIAMM8BAACcAQAQ0AEAAM8CADDeAQEAtQIAIfUBAQC1AgAh9gEBALUCACH3AQEAtQIAIfgBAQC1AgAh-QEBALUCACH8AQEAtQIAIYACAQC1AgAhgQIBAMICACGCAgEAtQIAIYMCCAC7AgAhhAIBALUCACEBgQIAAPQCACADAAAAnAEAIAEAAJ0BADACAACZAQAgAwAAAJwBACABAACdAQAwAgAAmQEAIAMAAACcAQAgAQAAnQEAMAIAAJkBACAM3gEBAAAAAfUBAQAAAAH2AQEAAAAB9wEBAAAAAfgBAQAAAAH5AQEAAAAB_AEBAAAAAYACAQAAAAGBAgEAAAABggIBAAAAAYMCCAAAAAGEAgEAAAABAQsAAKEBACAM3gEBAAAAAfUBAQAAAAH2AQEAAAAB9wEBAAAAAfgBAQAAAAH5AQEAAAAB_AEBAAAAAYACAQAAAAGBAgEAAAABggIBAAAAAYMCCAAAAAGEAgEAAAABAQsAAKMBADABCwAAowEAMAzeAQEA7QIAIfUBAQDtAgAh9gEBAO0CACH3AQEA7QIAIfgBAQDtAgAh-QEBAO0CACH8AQEA7QIAIYACAQDtAgAhgQIBAPgCACGCAgEA7QIAIYMCCADzAgAhhAIBAO0CACECAAAAmQEAIAsAAKYBACAM3gEBAO0CACH1AQEA7QIAIfYBAQDtAgAh9wEBAO0CACH4AQEA7QIAIfkBAQDtAgAh_AEBAO0CACGAAgEA7QIAIYECAQD4AgAhggIBAO0CACGDAggA8wIAIYQCAQDtAgAhAgAAAJwBACALAACoAQAgAgAAAJwBACALAACoAQAgAwAAAJkBACASAAChAQAgEwAApgEAIAEAAACZAQAgAQAAAJwBACAGBQAAhQMAIBgAAIgDACAZAACHAwAgOgAAhgMAIDsAAIkDACCBAgAA9AIAIA_OAQAAzgIAMM8BAACvAQAQ0AEAAM4CADDeAQEAsAIAIfUBAQCwAgAh9gEBALACACH3AQEAsAIAIfgBAQCwAgAh-QEBALACACH8AQEAsAIAIYACAQCwAgAhgQIBAL0CACGCAgEAsAIAIYMCCAC3AgAhhAIBALACACEDAAAAnAEAIAEAAK4BADAXAACvAQAgAwAAAJwBACABAACdAQAwAgAAmQEAIBLOAQAAzQIAMM8BAAC1AQAQ0AEAAM0CADDeAQEAAAAB9AEBALUCACH1AQEAAAAB9gEBALUCACH3AQEAtQIAIfgBAQC1AgAh-QEBALUCACH6AQEAwgIAIfsBAQDCAgAh_AEBALUCACH9AQIAygIAIf4BAQDCAgAh_wEBAMICACGAAgEAtQIAIYECAQDCAgAhAQAAALIBACABAAAAsgEAIBLOAQAAzQIAMM8BAAC1AQAQ0AEAAM0CADDeAQEAtQIAIfQBAQC1AgAh9QEBALUCACH2AQEAtQIAIfcBAQC1AgAh-AEBALUCACH5AQEAtQIAIfoBAQDCAgAh-wEBAMICACH8AQEAtQIAIf0BAgDKAgAh_gEBAMICACH_AQEAwgIAIYACAQC1AgAhgQIBAMICACEF-gEAAPQCACD7AQAA9AIAIP4BAAD0AgAg_wEAAPQCACCBAgAA9AIAIAMAAAC1AQAgAQAAtgEAMAIAALIBACADAAAAtQEAIAEAALYBADACAACyAQAgAwAAALUBACABAAC2AQAwAgAAsgEAIA_eAQEAAAAB9AEBAAAAAfUBAQAAAAH2AQEAAAAB9wEBAAAAAfgBAQAAAAH5AQEAAAAB-gEBAAAAAfsBAQAAAAH8AQEAAAAB_QECAAAAAf4BAQAAAAH_AQEAAAABgAIBAAAAAYECAQAAAAEBCwAAugEAIA_eAQEAAAAB9AEBAAAAAfUBAQAAAAH2AQEAAAAB9wEBAAAAAfgBAQAAAAH5AQEAAAAB-gEBAAAAAfsBAQAAAAH8AQEAAAAB_QECAAAAAf4BAQAAAAH_AQEAAAABgAIBAAAAAYECAQAAAAEBCwAAvAEAMAELAAC8AQAwD94BAQDtAgAh9AEBAO0CACH1AQEA7QIAIfYBAQDtAgAh9wEBAO0CACH4AQEA7QIAIfkBAQDtAgAh-gEBAPgCACH7AQEA-AIAIfwBAQDtAgAh_QECAP4CACH-AQEA-AIAIf8BAQD4AgAhgAIBAO0CACGBAgEA-AIAIQIAAACyAQAgCwAAvwEAIA_eAQEA7QIAIfQBAQDtAgAh9QEBAO0CACH2AQEA7QIAIfcBAQDtAgAh-AEBAO0CACH5AQEA7QIAIfoBAQD4AgAh-wEBAPgCACH8AQEA7QIAIf0BAgD-AgAh_gEBAPgCACH_AQEA-AIAIYACAQDtAgAhgQIBAPgCACECAAAAtQEAIAsAAMEBACACAAAAtQEAIAsAAMEBACADAAAAsgEAIBIAALoBACATAAC_AQAgAQAAALIBACABAAAAtQEAIAoFAACAAwAgGAAAgwMAIBkAAIIDACA6AACBAwAgOwAAhAMAIPoBAAD0AgAg-wEAAPQCACD-AQAA9AIAIP8BAAD0AgAggQIAAPQCACASzgEAAMwCADDPAQAAyAEAENABAADMAgAw3gEBALACACH0AQEAsAIAIfUBAQCwAgAh9gEBALACACH3AQEAsAIAIfgBAQCwAgAh-QEBALACACH6AQEAvQIAIfsBAQC9AgAh_AEBALACACH9AQIAxAIAIf4BAQC9AgAh_wEBAL0CACGAAgEAsAIAIYECAQC9AgAhAwAAALUBACABAADHAQAwFwAAyAEAIAMAAAC1AQAgAQAAtgEAMAIAALIBACATzgEAAMkCADDPAQAAzgEAENABAADJAgAw3gECAAAAAeUBAgDKAgAh5gEIALsCACHnAQIAygIAIegBCAC7AgAh6QECAMoCACHqAQgAuwIAIesBCAC7AgAh7AEIALsCACHtASAAywIAIe4BAQDCAgAh7wEBAMICACHwAQEAwgIAIfEBAQDCAgAh8gEBAMICACHzAQEAwgIAIQEAAADLAQAgAQAAAMsBACATzgEAAMkCADDPAQAAzgEAENABAADJAgAw3gECAMoCACHlAQIAygIAIeYBCAC7AgAh5wECAMoCACHoAQgAuwIAIekBAgDKAgAh6gEIALsCACHrAQgAuwIAIewBCAC7AgAh7QEgAMsCACHuAQEAwgIAIe8BAQDCAgAh8AEBAMICACHxAQEAwgIAIfIBAQDCAgAh8wEBAMICACEG7gEAAPQCACDvAQAA9AIAIPABAAD0AgAg8QEAAPQCACDyAQAA9AIAIPMBAAD0AgAgAwAAAM4BACABAADPAQAwAgAAywEAIAMAAADOAQAgAQAAzwEAMAIAAMsBACADAAAAzgEAIAEAAM8BADACAADLAQAgEN4BAgAAAAHlAQIAAAAB5gEIAAAAAecBAgAAAAHoAQgAAAAB6QECAAAAAeoBCAAAAAHrAQgAAAAB7AEIAAAAAe0BIAAAAAHuAQEAAAAB7wEBAAAAAfABAQAAAAHxAQEAAAAB8gEBAAAAAfMBAQAAAAEBCwAA0wEAIBDeAQIAAAAB5QECAAAAAeYBCAAAAAHnAQIAAAAB6AEIAAAAAekBAgAAAAHqAQgAAAAB6wEIAAAAAewBCAAAAAHtASAAAAAB7gEBAAAAAe8BAQAAAAHwAQEAAAAB8QEBAAAAAfIBAQAAAAHzAQEAAAABAQsAANUBADABCwAA1QEAMBDeAQIA_gIAIeUBAgD-AgAh5gEIAPMCACHnAQIA_gIAIegBCADzAgAh6QECAP4CACHqAQgA8wIAIesBCADzAgAh7AEIAPMCACHtASAA_wIAIe4BAQD4AgAh7wEBAPgCACHwAQEA-AIAIfEBAQD4AgAh8gEBAPgCACHzAQEA-AIAIQIAAADLAQAgCwAA2AEAIBDeAQIA_gIAIeUBAgD-AgAh5gEIAPMCACHnAQIA_gIAIegBCADzAgAh6QECAP4CACHqAQgA8wIAIesBCADzAgAh7AEIAPMCACHtASAA_wIAIe4BAQD4AgAh7wEBAPgCACHwAQEA-AIAIfEBAQD4AgAh8gEBAPgCACHzAQEA-AIAIQIAAADOAQAgCwAA2gEAIAIAAADOAQAgCwAA2gEAIAMAAADLAQAgEgAA0wEAIBMAANgBACABAAAAywEAIAEAAADOAQAgCwUAAPkCACAYAAD8AgAgGQAA-wIAIDoAAPoCACA7AAD9AgAg7gEAAPQCACDvAQAA9AIAIPABAAD0AgAg8QEAAPQCACDyAQAA9AIAIPMBAAD0AgAgE84BAADDAgAwzwEAAOEBABDQAQAAwwIAMN4BAgDEAgAh5QECAMQCACHmAQgAtwIAIecBAgDEAgAh6AEIALcCACHpAQIAxAIAIeoBCAC3AgAh6wEIALcCACHsAQgAtwIAIe0BIADFAgAh7gEBAL0CACHvAQEAvQIAIfABAQC9AgAh8QEBAL0CACHyAQEAvQIAIfMBAQC9AgAhAwAAAM4BACABAADgAQAwFwAA4QEAIAMAAADOAQAgAQAAzwEAMAIAAMsBACAKzgEAAMECADDPAQAA5wEAENABAADBAgAw3gEBAAAAAd8BAQC1AgAh4AEBALUCACHhAQEAtQIAIeIBAQC1AgAh4wEBAMICACHkAQEAwgIAIQEAAADkAQAgAQAAAOQBACAKzgEAAMECADDPAQAA5wEAENABAADBAgAw3gEBALUCACHfAQEAtQIAIeABAQC1AgAh4QEBALUCACHiAQEAtQIAIeMBAQDCAgAh5AEBAMICACEC4wEAAPQCACDkAQAA9AIAIAMAAADnAQAgAQAA6AEAMAIAAOQBACADAAAA5wEAIAEAAOgBADACAADkAQAgAwAAAOcBACABAADoAQAwAgAA5AEAIAfeAQEAAAAB3wEBAAAAAeABAQAAAAHhAQEAAAAB4gEBAAAAAeMBAQAAAAHkAQEAAAABAQsAAOwBACAH3gEBAAAAAd8BAQAAAAHgAQEAAAAB4QEBAAAAAeIBAQAAAAHjAQEAAAAB5AEBAAAAAQELAADuAQAwAQsAAO4BADAH3gEBAO0CACHfAQEA7QIAIeABAQDtAgAh4QEBAO0CACHiAQEA7QIAIeMBAQD4AgAh5AEBAPgCACECAAAA5AEAIAsAAPEBACAH3gEBAO0CACHfAQEA7QIAIeABAQDtAgAh4QEBAO0CACHiAQEA7QIAIeMBAQD4AgAh5AEBAPgCACECAAAA5wEAIAsAAPMBACACAAAA5wEAIAsAAPMBACADAAAA5AEAIBIAAOwBACATAADxAQAgAQAAAOQBACABAAAA5wEAIAUFAAD1AgAgGAAA9wIAIBkAAPYCACDjAQAA9AIAIOQBAAD0AgAgCs4BAAC8AgAwzwEAAPoBABDQAQAAvAIAMN4BAQCwAgAh3wEBALACACHgAQEAsAIAIeEBAQCwAgAh4gEBALACACHjAQEAvQIAIeQBAQC9AgAhAwAAAOcBACABAAD5AQAwFwAA-gEAIAMAAADnAQAgAQAA6AEAMAIAAOQBACAFzgEAALoCADDPAQAAgAIAENABAAC6AgAw0QEBAAAAAdIBCAC7AgAhAQAAAP0BACABAAAA_QEAIAXOAQAAugIAMM8BAACAAgAQ0AEAALoCADDRAQEAtQIAIdIBCAC7AgAhAAMAAACAAgAgAQAAgQIAMAIAAP0BACADAAAAgAIAIAEAAIECADACAAD9AQAgAwAAAIACACABAACBAgAwAgAA_QEAIALRAQEAAAAB0gEIAAAAAQELAACFAgAgAtEBAQAAAAHSAQgAAAABAQsAAIcCADABCwAAhwIAMALRAQEA7QIAIdIBCADzAgAhAgAAAP0BACALAACKAgAgAtEBAQDtAgAh0gEIAPMCACECAAAAgAIAIAsAAIwCACACAAAAgAIAIAsAAIwCACADAAAA_QEAIBIAAIUCACATAACKAgAgAQAAAP0BACABAAAAgAIAIAUFAADuAgAgGAAA8QIAIBkAAPACACA6AADvAgAgOwAA8gIAIAXOAQAAtgIAMM8BAACTAgAQ0AEAALYCADDRAQEAsAIAIdIBCAC3AgAhAwAAAIACACABAACSAgAwFwAAkwIAIAMAAACAAgAgAQAAgQIAMAIAAP0BACAFzgEAALQCADDPAQAAmQIAENABAAC0AgAw0QEBAAAAAdIBAQC1AgAhAQAAAJYCACABAAAAlgIAIAXOAQAAtAIAMM8BAACZAgAQ0AEAALQCADDRAQEAtQIAIdIBAQC1AgAhAAMAAACZAgAgAQAAmgIAMAIAAJYCACADAAAAmQIAIAEAAJoCADACAACWAgAgAwAAAJkCACABAACaAgAwAgAAlgIAIALRAQEAAAAB0gEBAAAAAQELAACeAgAgAtEBAQAAAAHSAQEAAAABAQsAAKACADABCwAAoAIAMALRAQEA7QIAIdIBAQDtAgAhAgAAAJYCACALAACjAgAgAtEBAQDtAgAh0gEBAO0CACECAAAAmQIAIAsAAKUCACACAAAAmQIAIAsAAKUCACADAAAAlgIAIBIAAJ4CACATAACjAgAgAQAAAJYCACABAAAAmQIAIAMFAADqAgAgGAAA7AIAIBkAAOsCACAFzgEAAK8CADDPAQAArAIAENABAACvAgAw0QEBALACACHSAQEAsAIAIQMAAACZAgAgAQAAqwIAMBcAAKwCACADAAAAmQIAIAEAAJoCADACAACWAgAgBc4BAACvAgAwzwEAAKwCABDQAQAArwIAMNEBAQCwAgAh0gEBALACACEOBQAAsgIAIBgAALMCACAZAACzAgAg0wEBAAAAAdQBAQAAAATVAQEAAAAE1gEBAAAAAdcBAQAAAAHYAQEAAAAB2QEBAAAAAdoBAQAAAAHbAQEAAAAB3AEBAAAAAd0BAQCxAgAhDgUAALICACAYAACzAgAgGQAAswIAINMBAQAAAAHUAQEAAAAE1QEBAAAABNYBAQAAAAHXAQEAAAAB2AEBAAAAAdkBAQAAAAHaAQEAAAAB2wEBAAAAAdwBAQAAAAHdAQEAsQIAIQjTAQIAAAAB1AECAAAABNUBAgAAAATWAQIAAAAB1wECAAAAAdgBAgAAAAHZAQIAAAAB3QECALICACEL0wEBAAAAAdQBAQAAAATVAQEAAAAE1gEBAAAAAdcBAQAAAAHYAQEAAAAB2QEBAAAAAdoBAQAAAAHbAQEAAAAB3AEBAAAAAd0BAQCzAgAhBc4BAAC0AgAwzwEAAJkCABDQAQAAtAIAMNEBAQC1AgAh0gEBALUCACEL0wEBAAAAAdQBAQAAAATVAQEAAAAE1gEBAAAAAdcBAQAAAAHYAQEAAAAB2QEBAAAAAdoBAQAAAAHbAQEAAAAB3AEBAAAAAd0BAQCzAgAhBc4BAAC2AgAwzwEAAJMCABDQAQAAtgIAMNEBAQCwAgAh0gEIALcCACENBQAAsgIAIBgAALkCACAZAAC5AgAgOgAAuQIAIDsAALkCACDTAQgAAAAB1AEIAAAABNUBCAAAAATWAQgAAAAB1wEIAAAAAdgBCAAAAAHZAQgAAAAB3QEIALgCACENBQAAsgIAIBgAALkCACAZAAC5AgAgOgAAuQIAIDsAALkCACDTAQgAAAAB1AEIAAAABNUBCAAAAATWAQgAAAAB1wEIAAAAAdgBCAAAAAHZAQgAAAAB3QEIALgCACEI0wEIAAAAAdQBCAAAAATVAQgAAAAE1gEIAAAAAdcBCAAAAAHYAQgAAAAB2QEIAAAAAd0BCAC5AgAhBc4BAAC6AgAwzwEAAIACABDQAQAAugIAMNEBAQC1AgAh0gEIALsCACEI0wEIAAAAAdQBCAAAAATVAQgAAAAE1gEIAAAAAdcBCAAAAAHYAQgAAAAB2QEIAAAAAd0BCAC5AgAhCs4BAAC8AgAwzwEAAPoBABDQAQAAvAIAMN4BAQCwAgAh3wEBALACACHgAQEAsAIAIeEBAQCwAgAh4gEBALACACHjAQEAvQIAIeQBAQC9AgAhDgUAAL8CACAYAADAAgAgGQAAwAIAINMBAQAAAAHUAQEAAAAF1QEBAAAABdYBAQAAAAHXAQEAAAAB2AEBAAAAAdkBAQAAAAHaAQEAAAAB2wEBAAAAAdwBAQAAAAHdAQEAvgIAIQ4FAAC_AgAgGAAAwAIAIBkAAMACACDTAQEAAAAB1AEBAAAABdUBAQAAAAXWAQEAAAAB1wEBAAAAAdgBAQAAAAHZAQEAAAAB2gEBAAAAAdsBAQAAAAHcAQEAAAAB3QEBAL4CACEI0wECAAAAAdQBAgAAAAXVAQIAAAAF1gECAAAAAdcBAgAAAAHYAQIAAAAB2QECAAAAAd0BAgC_AgAhC9MBAQAAAAHUAQEAAAAF1QEBAAAABdYBAQAAAAHXAQEAAAAB2AEBAAAAAdkBAQAAAAHaAQEAAAAB2wEBAAAAAdwBAQAAAAHdAQEAwAIAIQrOAQAAwQIAMM8BAADnAQAQ0AEAAMECADDeAQEAtQIAId8BAQC1AgAh4AEBALUCACHhAQEAtQIAIeIBAQC1AgAh4wEBAMICACHkAQEAwgIAIQvTAQEAAAAB1AEBAAAABdUBAQAAAAXWAQEAAAAB1wEBAAAAAdgBAQAAAAHZAQEAAAAB2gEBAAAAAdsBAQAAAAHcAQEAAAAB3QEBAMACACETzgEAAMMCADDPAQAA4QEAENABAADDAgAw3gECAMQCACHlAQIAxAIAIeYBCAC3AgAh5wECAMQCACHoAQgAtwIAIekBAgDEAgAh6gEIALcCACHrAQgAtwIAIewBCAC3AgAh7QEgAMUCACHuAQEAvQIAIe8BAQC9AgAh8AEBAL0CACHxAQEAvQIAIfIBAQC9AgAh8wEBAL0CACENBQAAsgIAIBgAALICACAZAACyAgAgOgAAuQIAIDsAALICACDTAQIAAAAB1AECAAAABNUBAgAAAATWAQIAAAAB1wECAAAAAdgBAgAAAAHZAQIAAAAB3QECAMgCACEFBQAAsgIAIBgAAMcCACAZAADHAgAg0wEgAAAAAd0BIADGAgAhBQUAALICACAYAADHAgAgGQAAxwIAINMBIAAAAAHdASAAxgIAIQLTASAAAAAB3QEgAMcCACENBQAAsgIAIBgAALICACAZAACyAgAgOgAAuQIAIDsAALICACDTAQIAAAAB1AECAAAABNUBAgAAAATWAQIAAAAB1wECAAAAAdgBAgAAAAHZAQIAAAAB3QECAMgCACETzgEAAMkCADDPAQAAzgEAENABAADJAgAw3gECAMoCACHlAQIAygIAIeYBCAC7AgAh5wECAMoCACHoAQgAuwIAIekBAgDKAgAh6gEIALsCACHrAQgAuwIAIewBCAC7AgAh7QEgAMsCACHuAQEAwgIAIe8BAQDCAgAh8AEBAMICACHxAQEAwgIAIfIBAQDCAgAh8wEBAMICACEI0wECAAAAAdQBAgAAAATVAQIAAAAE1gECAAAAAdcBAgAAAAHYAQIAAAAB2QECAAAAAd0BAgCyAgAhAtMBIAAAAAHdASAAxwIAIRLOAQAAzAIAMM8BAADIAQAQ0AEAAMwCADDeAQEAsAIAIfQBAQCwAgAh9QEBALACACH2AQEAsAIAIfcBAQCwAgAh-AEBALACACH5AQEAsAIAIfoBAQC9AgAh-wEBAL0CACH8AQEAsAIAIf0BAgDEAgAh_gEBAL0CACH_AQEAvQIAIYACAQCwAgAhgQIBAL0CACESzgEAAM0CADDPAQAAtQEAENABAADNAgAw3gEBALUCACH0AQEAtQIAIfUBAQC1AgAh9gEBALUCACH3AQEAtQIAIfgBAQC1AgAh-QEBALUCACH6AQEAwgIAIfsBAQDCAgAh_AEBALUCACH9AQIAygIAIf4BAQDCAgAh_wEBAMICACGAAgEAtQIAIYECAQDCAgAhD84BAADOAgAwzwEAAK8BABDQAQAAzgIAMN4BAQCwAgAh9QEBALACACH2AQEAsAIAIfcBAQCwAgAh-AEBALACACH5AQEAsAIAIfwBAQCwAgAhgAIBALACACGBAgEAvQIAIYICAQCwAgAhgwIIALcCACGEAgEAsAIAIQ_OAQAAzwIAMM8BAACcAQAQ0AEAAM8CADDeAQEAtQIAIfUBAQC1AgAh9gEBALUCACH3AQEAtQIAIfgBAQC1AgAh-QEBALUCACH8AQEAtQIAIYACAQC1AgAhgQIBAMICACGCAgEAtQIAIYMCCAC7AgAhhAIBALUCACEjzgEAANACADDPAQAAlgEAENABAADQAgAw3gEBALACACH2AQEAsAIAIfcBAQCwAgAh-AEBALACACH5AQEAsAIAIfoBAQC9AgAh-wEBAL0CACH8AQEAsAIAIf0BAgDEAgAhgAIBALACACGBAgEAvQIAIYUCAQCwAgAhhgIgAMUCACGHAiAAxQIAIYgCCAC3AgAhiQIgANECACGKAggA0gIAIYsCAgDEAgAhjAIIALcCACGNAggA0gIAIY4CCADSAgAhjwIIALcCACGQAggA0gIAIZECCADSAgAhkgIBAL0CACGTAgEAvQIAIZQCCADSAgAhlQIBAL0CACGWAgEAvQIAIZcCAQC9AgAhmAIBAL0CACGZAkAA0wIAIQUFAAC_AgAgGAAA2QIAIBkAANkCACDTASAAAAAB3QEgANgCACENBQAAvwIAIBgAANcCACAZAADXAgAgOgAA1wIAIDsAANcCACDTAQgAAAAB1AEIAAAABdUBCAAAAAXWAQgAAAAB1wEIAAAAAdgBCAAAAAHZAQgAAAAB3QEIANYCACELBQAAsgIAIBgAANUCACAZAADVAgAg0wFAAAAAAdQBQAAAAATVAUAAAAAE1gFAAAAAAdcBQAAAAAHYAUAAAAAB2QFAAAAAAd0BQADUAgAhCwUAALICACAYAADVAgAgGQAA1QIAINMBQAAAAAHUAUAAAAAE1QFAAAAABNYBQAAAAAHXAUAAAAAB2AFAAAAAAdkBQAAAAAHdAUAA1AIAIQjTAUAAAAAB1AFAAAAABNUBQAAAAATWAUAAAAAB1wFAAAAAAdgBQAAAAAHZAUAAAAAB3QFAANUCACENBQAAvwIAIBgAANcCACAZAADXAgAgOgAA1wIAIDsAANcCACDTAQgAAAAB1AEIAAAABdUBCAAAAAXWAQgAAAAB1wEIAAAAAdgBCAAAAAHZAQgAAAAB3QEIANYCACEI0wEIAAAAAdQBCAAAAAXVAQgAAAAF1gEIAAAAAdcBCAAAAAHYAQgAAAAB2QEIAAAAAd0BCADXAgAhBQUAAL8CACAYAADZAgAgGQAA2QIAINMBIAAAAAHdASAA2AIAIQLTASAAAAAB3QEgANkCACEjzgEAANoCADDPAQAAgwEAENABAADaAgAw3gEBALUCACH2AQEAtQIAIfcBAQC1AgAh-AEBALUCACH5AQEAtQIAIfoBAQDCAgAh-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_AgAArgMAMMACAACuAwAwwQIAALADADDCAgAAsQMAMAOZAkAAAAABrgIBAAAAAbACQAAAAAECAAAABQAgEgAAtQMAIAMAAAAFACASAAC1AwAgEwAAtAMAIAELAAC5AwAwCAMAAOkCACDOAQAA6AIAMM8BAAADABDQAQAA6AIAMJkCQADdAgAhrgIBAAAAAa8CAQC1AgAhsAJAAN0CACECAAAABQAgCwAAtAMAIAIAAACyAwAgCwAAswMAIAfOAQAAsQMAMM8BAACyAwAQ0AEAALEDADCZAkAA3QIAIa4CAQC1AgAhrwIBALUCACGwAkAA3QIAIQfOAQAAsQMAMM8BAACyAwAQ0AEAALEDADCZAkAA3QIAIa4CAQC1AgAhrwIBALUCACGwAkAA3QIAIQOZAkAAkQMAIa4CAQDtAgAhsAJAAJEDACEDmQJAAJEDACGuAgEA7QIAIbACQACRAwAhA5kCQAAAAAGuAgEAAAABsAJAAAAAAQQSAACqAwAwugIAAKsDADC8AgAArQMAIMACAACuAwAwAAMEAAC3AwAgswIAAPQCACC0AgAA9AIAIAOZAkAAAAABrgIBAAAAAbACQAAAAAEI3gEBAAAAAeQBAQAAAAGZAgEAAAABmgIBAAAAAbECAQAAAAGyAgEAAAABswIBAAAAAbQCAQAAAAECAAAAAQAgEgAAugMAIAMAAAAJACASAAC6AwAgEwAAvgMAIAoAAAAJACALAAC-AwAg3gEBAO0CACHkAQEA7QIAIZkCAQDtAgAhmgIBAO0CACGxAgEA7QIAIbICAQDtAgAhswIBAPgCACG0AgEA-AIAIQjeAQEA7QIAIeQBAQDtAgAhmQIBAO0CACGaAgEA7QIAIbECAQDtAgAhsgIBAO0CACGzAgEA-AIAIbQCAQD4AgAhAgQGAgUAAwEDAAEBBAcAAAAAAwUACBgACRkACgAAAAMFAAgYAAkZAAoBAwABAQMAAQMFAA8YABAZABEAAAADBQAPGAAQGQARAAAABQUAFxgAGhkAGzoAGDsAGQAAAAAABQUAFxgAGhkAGzoAGDsAGQAAAAUFACEYACQZACU6ACI7ACMAAAAAAAUFACEYACQZACU6ACI7ACMAAAAFBQArGAAuGQAvOgAsOwAtAAAAAAAFBQArGAAuGQAvOgAsOwAtAAAABQUANRgAOBkAOToANjsANwAAAAAABQUANRgAOBkAOToANjsANwAAAAUFAD8YAEIZAEM6AEA7AEEAAAAAAAUFAD8YAEIZAEM6AEA7AEEAAAAFBQBJGABMGQBNOgBKOwBLAAAAAAAFBQBJGABMGQBNOgBKOwBLAAAABQUAUxgAVhkAVzoAVDsAVQAAAAAABQUAUxgAVhkAVzoAVDsAVQAAAAMFAF0YAF4ZAF8AAAADBQBdGABeGQBfAAAABQUAZRgAaBkAaToAZjsAZwAAAAAABQUAZRgAaBkAaToAZjsAZwAAAAMFAG8YAHAZAHEAAAADBQBvGABwGQBxBgIBBwgBCAsBCQwBCg0BDA8BDREEDhIFDxQBEBYEERcGFBgBFRkBFhoEGh0HGx4LHB8CHSACHiECHyICICMCISUCIicEIygMJCoCJSwEJi0NJy4CKC8CKTAEKjMOKzQSLDYTLTcTLjoTLzsTMDwTMT4TMkAEM0EUNEMTNUUENkYVN0cTOEgTOUkEPEwWPU0cPk8dP1AdQFMdQVQdQlUdQ1cdRFkERVoeRlwdR14ESF8fSWAdSmEdS2IETGUgTWYmTmgnT2knUGwnUW0nUm4nU3AnVHIEVXMoVnUnV3cEWHgpWXknWnonW3sEXH4qXX8wXoEBMV-CATFghQExYYYBMWKHATFjiQExZIsBBGWMATJmjgExZ5ABBGiRATNpkgExapMBMWuUAQRslwE0bZgBOm6aATtvmwE7cJ4BO3GfATtyoAE7c6IBO3SkAQR1pQE8dqcBO3epAQR4qgE9easBO3qsATt7rQEEfLABPn2xAUR-swFFf7QBRYABtwFFgQG4AUWCAbkBRYMBuwFFhAG9AQSFAb4BRoYBwAFFhwHCAQSIAcMBR4kBxAFFigHFAUWLAcYBBIwByQFIjQHKAU6OAcwBT48BzQFPkAHQAU-RAdEBT5IB0gFPkwHUAU-UAdYBBJUB1wFQlgHZAU-XAdsBBJgB3AFRmQHdAU-aAd4BT5sB3wEEnAHiAVKdAeMBWJ4B5QFZnwHmAVmgAekBWaEB6gFZogHrAVmjAe0BWaQB7wEEpQHwAVqmAfIBWacB9AEEqAH1AVupAfYBWaoB9wFZqwH4AQSsAfsBXK0B_AFgrgH-AWGvAf8BYbABggJhsQGDAmGyAYQCYbMBhgJhtAGIAgS1AYkCYrYBiwJhtwGNAgS4AY4CY7kBjwJhugGQAmG7AZECBLwBlAJkvQGVAmq-AZcCa78BmAJrwAGbAmvBAZwCa8IBnQJrwwGfAmvEAaECBMUBogJsxgGkAmvHAaYCBMgBpwJtyQGoAmvKAakCa8sBqgIEzAGtAm7NAa4Ccg"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer } = await import("node:buffer");
  const wasmArray = Buffer.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// src/generated/prisma/internal/prismaNamespace.ts
import * as runtime2 from "@prisma/client/runtime/client";
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var defineExtension = runtime2.Extensions.defineExtension;

// src/generated/prisma/client.ts
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// server/db.ts
var adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
var prisma = new PrismaClient({ adapter });

// server/jsonFields.ts
var toJson = (value) => value === void 0 || value === null ? null : JSON.stringify(value);
var fromJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// server/suratJalanSync.ts
async function syncSuratJalanForInvoice(inv) {
  const items = JSON.parse(inv.itemsJson);
  const sjItems = items.map((it) => ({ id: it.id, productName: it.productName, size: it.size, quantity: it.quantity }));
  const cleanNum = inv.invoiceNumber.replace(/^INV\/|^FK\//, "");
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
        itemsJson: toJson(sjItems),
        koliCount: inv.koliCount,
        driverName: "",
        vehicleNumber: "",
        status: "draft",
        notes: inv.notes || ""
      }
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
      itemsJson: toJson(sjItems),
      koliCount: inv.koliCount
    }
  });
}
async function deleteSuratJalanForInvoice(invoiceId) {
  await prisma.suratJalan.deleteMany({ where: { invoiceId } });
}

// src/utils.ts
var DEFAULT_SETTINGS = {
  minQtyTier2: 100,
  discountTier2: 2500,
  minQtyTier3: 300,
  discountTier3: 5e3,
  sizeSurchargeLimit: 44,
  sizeSurchargeAmount: 5e3,
  packingFeePerKoli: 2e4,
  ppnPercentage: 11,
  enablePpn: false,
  warehouseTerms: [
    "Barang yang sudah dibeli dengan invoice ini tidak dapat ditukar kecuali ada reject produksi dalam 7 hari.",
    "Pembayaran transfer resmi ditujukan ke Rek. Mandiri: 131-00-1122-3344 a.n PT Sentra Angkasa Jaya."
  ],
  deliveryTerms: [
    "Periksa kecocokan fisik barang dengan Surat Jalan ini sebelum menandatangani.",
    "Komplain kekurangan barang harus dilampirkan bukti unboxing kiriman video."
  ],
  companyName: "ANGKASA JAYA SHOES",
  companyAddress: "Jl. Angkasa Mekar I No.59, Cangkuang Kulon, Kec. Dayeuhkolot, Kabupaten Bandung, Jawa Barat 40239",
  companyPhone: "Telp: (022) 540-39423 | WA: 0812-1122-3344",
  companyLogoUrl: ""
};
var PRODUCT_PRESETS = [
  { name: "Sepatu Sneaker Sport Alpha", defaultPrice: 135e3 },
  { name: "Casual Loafers Leather Premium", defaultPrice: 15e4 },
  { name: "Sandal Kulit Slide Adventure", defaultPrice: 110050 },
  { name: "Flat Shoes Suede Belle", defaultPrice: 125e3 },
  { name: "Classic High Top Canvas", defaultPrice: 13e4 },
  { name: "Slip-on Breathable Comfort", defaultPrice: 12e4 }
];
var getCustomerProductPrice = (customer, productName, products) => {
  if (customer.customPrices && customer.customPrices[productName] !== void 0) {
    return customer.customPrices[productName];
  }
  const mainList = products && products.length > 0 ? products : PRODUCT_PRESETS;
  const preset = mainList.find((p) => p.name === productName);
  if (preset) {
    return preset.defaultPrice;
  }
  return customer.customBasePrice || 135e3;
};
var getCustomerVolumeMode = (customer) => {
  if (customer.volumeMode) return customer.volumeMode;
  if (customer.enableVolumeDiscount) return "umum";
  return "tanpa_volume";
};
var calculateInvoiceItem = (item, totalPairsInInvoice, customer, products, settings) => {
  const s = settings || DEFAULT_SETTINGS;
  const mainList = products && products.length > 0 ? products : PRODUCT_PRESETS;
  const product = mainList.find((p) => p.name === item.productName);
  const basePrice = getCustomerProductPrice(customer, item.productName, products);
  const mode = getCustomerVolumeMode(customer);
  let negotiatedBasePrice = basePrice;
  if (mode === "umum") {
    if (totalPairsInInvoice > s.minQtyTier3) {
      const stdPrice = product?.defaultPrice ?? 135e3;
      const stdTier3 = product?.priceTier3 ?? stdPrice - s.discountTier3;
      const discountAmount = Math.max(0, stdPrice - stdTier3);
      negotiatedBasePrice = Math.max(0, basePrice - discountAmount);
    } else if (totalPairsInInvoice > s.minQtyTier2) {
      const stdPrice = product?.defaultPrice ?? 135005;
      const stdTier2 = product?.priceTier2 ?? stdPrice - s.discountTier2;
      const discountAmount = Math.max(0, stdPrice - stdTier2);
      negotiatedBasePrice = Math.max(0, basePrice - discountAmount);
    } else {
      negotiatedBasePrice = basePrice;
    }
  } else if (mode === "kustom") {
    const t2Threshold = customer.customTier2MinQty?.[item.productName] !== void 0 ? customer.customTier2MinQty[item.productName] : s.minQtyTier2;
    const t3Threshold = customer.customTier3MinQty?.[item.productName] !== void 0 ? customer.customTier3MinQty[item.productName] : s.minQtyTier3;
    if (totalPairsInInvoice > t3Threshold) {
      const fallbackTier3 = product?.priceTier3 ?? (product?.defaultPrice ?? 135e3) - s.discountTier3;
      negotiatedBasePrice = customer.customTier3Prices && customer.customTier3Prices[item.productName] !== void 0 ? customer.customTier3Prices[item.productName] : fallbackTier3;
    } else if (totalPairsInInvoice > t2Threshold) {
      const fallbackTier2 = product?.priceTier2 ?? (product?.defaultPrice ?? 135e3) - s.discountTier2;
      negotiatedBasePrice = customer.customTier2Prices && customer.customTier2Prices[item.productName] !== void 0 ? customer.customTier2Prices[item.productName] : fallbackTier2;
    } else {
      negotiatedBasePrice = basePrice;
    }
  } else {
    negotiatedBasePrice = basePrice;
  }
  let sizeSurcharge = 0;
  if (!customer.hasFlatPriceSizeLarge) {
    const limit = product && product.customSurchargeLimit !== void 0 && product.customSurchargeLimit > 0 ? product.customSurchargeLimit : s.sizeSurchargeLimit;
    if (item.size >= limit) {
      if (customer.customSizeSurcharges && customer.customSizeSurcharges[item.productName] !== void 0) {
        sizeSurcharge = customer.customSizeSurcharges[item.productName];
      } else if (product && product.customSurcharges && product.customSurcharges.length > 0) {
        const matchingRules = product.customSurcharges.filter((r) => item.size >= r.size);
        if (matchingRules.length > 0) {
          sizeSurcharge = Math.max(...matchingRules.map((r) => r.amount));
        }
      } else if (product && product.customSurchargeLimit !== void 0 && product.customSurchargeLimit > 0) {
        sizeSurcharge = product.customSurchargeAmount ?? s.sizeSurchargeAmount;
      } else {
        sizeSurcharge = s.sizeSurchargeAmount;
      }
    }
  }
  const unitPrice = negotiatedBasePrice + sizeSurcharge;
  const totalPrice = unitPrice * item.quantity;
  return {
    ...item,
    basePrice,
    sizeSurcharge,
    negotiatedBasePrice,
    unitPrice,
    totalPrice
  };
};
var calculateFullInvoice = (draft, draftItems, customer, products, settings) => {
  const s = settings || DEFAULT_SETTINGS;
  const totalPairs = draftItems.reduce((sum, item) => sum + item.quantity, 0);
  const computedItems = draftItems.map((item) => {
    const productTotalPairs = draftItems.filter((i) => i.productName === item.productName).reduce((sum, i) => sum + i.quantity, 0);
    return calculateInvoiceItem(item, productTotalPairs, customer, products, s);
  });
  const subtotal = computedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const packingFee = draft.wantsPacking ? draft.koliCount * 2e4 : 0;
  const taxRate = s.enablePpn ? s.ppnPercentage : 0;
  const ppnAmount = s.enablePpn ? Math.round((subtotal + packingFee) * (taxRate / 100)) : 0;
  const ongkirAmount = draft.hasOngkir ? draft.ongkirAmount || 0 : 0;
  const totalAmount = subtotal + packingFee + ppnAmount + ongkirAmount;
  const dpAmount = draft.dpAmount || 0;
  const remainingBalance = draft.status === "paid" ? 0 : totalAmount - dpAmount;
  return {
    ...draft,
    items: computedItems,
    customerName: customer.name,
    customerType: customer.type,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    hasFlatPriceSizeLarge: customer.hasFlatPriceSizeLarge,
    totalPairs,
    subtotal,
    packingFee,
    hasOngkir: draft.hasOngkir,
    ongkirAmount,
    taxRate,
    ppnAmount,
    totalAmount,
    dpAmount,
    remainingBalance
  };
};
var INITIAL_CUSTOMERS = [
  {
    id: "cust-1",
    name: "Toko Sahabat Sepatu",
    type: "khusus",
    // Pelanggan khusus (diskon grosir otomatis)
    hasFlatPriceSizeLarge: false,
    // Bayar tambahan Rp 5,000 untuk size >= 44
    enableVolumeDiscount: true,
    customBasePrice: 135e3,
    phone: "0812-3456-7890",
    address: "Jl. Raya Cibaduyut No. 45, Bandung",
    commissionRate: 2e3
  },
  {
    id: "cust-2",
    name: "Bapak Ahmad Jaelani",
    type: "umum",
    // Pelanggan normal (harga normal fixed)
    hasFlatPriceSizeLarge: true,
    // Harga tetap sama walau size besar (gratis tambahan size)
    enableVolumeDiscount: false,
    customBasePrice: 135e3,
    phone: "0857-9876-5432",
    address: "Pasar Grosir Tanah Abang Blok B, Jakarta",
    commissionRate: 2e3
  },
  {
    id: "cust-3",
    name: "Grosir Sinar Jaya",
    type: "khusus",
    // Pelanggan khusus
    hasFlatPriceSizeLarge: true,
    // Bebas biaya tambahan size besar dan dapat grosir volume
    enableVolumeDiscount: true,
    customBasePrice: 135e3,
    phone: "0899-2233-4455",
    address: "Jl. Malioboro No. 12, Yogyakarta",
    commissionRate: 2e3
  },
  {
    id: "cust-4",
    name: "Toko Langkah Pratama",
    type: "umum",
    // Pelanggan normal
    hasFlatPriceSizeLarge: false,
    // Bayar sisa size >= 44
    enableVolumeDiscount: false,
    customBasePrice: 135e3,
    phone: "0813-4455-6677",
    address: "Kawasan ITC Mangga Dua Lt. 2, Jakarta",
    commissionRate: 2e3
  }
];
var INITIAL_INVOICES = [
  {
    id: "inv-1",
    invoiceNumber: "INV/20260601/01",
    date: "2026-06-01",
    customerId: "cust-1",
    customerName: "Toko Sahabat Sepatu",
    customerType: "khusus",
    customerPhone: "0812-3456-7890",
    customerAddress: "Jl. Raya Cibaduyut No. 45, Bandung",
    hasFlatPriceSizeLarge: false,
    wantsPacking: true,
    koliCount: 3,
    packingFee: 6e4,
    totalPairs: 120,
    // > 100 pasang -> base price becomes 132500
    items: [
      {
        id: "item-1",
        productName: "Sepatu Sneaker Sport Alpha",
        size: 42,
        quantity: 80,
        basePrice: 135e3,
        negotiatedBasePrice: 132500,
        sizeSurcharge: 0,
        unitPrice: 132500,
        totalPrice: 106e5
      },
      {
        id: "item-2",
        productName: "Sepatu Sneaker Sport Alpha",
        size: 45,
        // Size >= 44 -> surcharge active (since guest hasFlatPriceSizeLarge = false)
        quantity: 40,
        basePrice: 135e3,
        negotiatedBasePrice: 132500,
        sizeSurcharge: 5e3,
        unitPrice: 137500,
        totalPrice: 55e5
      }
    ],
    subtotal: 161e5,
    totalAmount: 1616e4,
    notes: "Kirim via Ekspedisi Dakota. Packing kayu aman.",
    status: "paid"
  },
  {
    id: "inv-2",
    invoiceNumber: "INV/20260605/02",
    date: "2026-06-05",
    customerId: "cust-2",
    customerName: "Bapak Ahmad Jaelani",
    customerType: "umum",
    customerPhone: "0857-9876-5432",
    customerAddress: "Pasar Grosir Tanah Abang Blok B, Jakarta",
    hasFlatPriceSizeLarge: true,
    // Fixed price regardless of size
    wantsPacking: false,
    koliCount: 0,
    packingFee: 0,
    totalPairs: 40,
    items: [
      {
        id: "item-3",
        productName: "Casual Loafers Leather Premium",
        size: 46,
        // 46 is >= 44, but surcharge is 0 because customer.hasFlatPriceSizeLarge is true
        quantity: 40,
        basePrice: 135e3,
        negotiatedBasePrice: 135e3,
        sizeSurcharge: 0,
        unitPrice: 135e3,
        totalPrice: 54e5
      }
    ],
    subtotal: 54e5,
    totalAmount: 54e5,
    notes: "Ambil di gudang sendiri.",
    status: "paid"
  },
  {
    id: "inv-3",
    invoiceNumber: "INV/20260610/03",
    date: "2026-06-10",
    customerId: "cust-3",
    customerName: "Grosir Sinar Jaya",
    customerType: "khusus",
    customerPhone: "0899-2233-4455",
    customerAddress: "Jl. Malioboro No. 12, Yogyakarta",
    hasFlatPriceSizeLarge: true,
    // Flat size price & volume eligible
    wantsPacking: true,
    koliCount: 10,
    packingFee: 2e5,
    totalPairs: 400,
    // > 350 pasang -> base price becomes 130000
    items: [
      {
        id: "item-4",
        productName: "Sandal Kulit Slide Adventure",
        size: 43,
        quantity: 200,
        basePrice: 135e3,
        negotiatedBasePrice: 13e4,
        sizeSurcharge: 0,
        unitPrice: 13e4,
        totalPrice: 26e6
      },
      {
        id: "item-5",
        productName: "Sandal Kulit Slide Adventure",
        size: 45,
        // size >= 44, but guest doesn't pay extra (hasFlatPriceSizeLarge = true)
        quantity: 200,
        basePrice: 135e3,
        negotiatedBasePrice: 13e4,
        sizeSurcharge: 0,
        unitPrice: 13e4,
        totalPrice: 26e6
      }
    ],
    subtotal: 52e6,
    totalAmount: 522e5,
    notes: "Dapatkan diskon term 30 hari.",
    status: "unpaid"
  }
];
var INITIAL_SALESMEN = [
  { id: "sales-1", name: "Budi Santoso", phone: "0811-2222-3333", commissionPerPair: 2e3 },
  { id: "sales-2", name: "Siti Rahma", phone: "0812-4444-5555", commissionPerPair: 2500 }
];

// server/seed.ts
async function ensureSeeded() {
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    const passwordHash = await bcrypt.hash("admin", 10);
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash,
        name: "Super Admin Utama",
        role: "super_admin",
        createdAt: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19)
      }
    });
  }
  const settingsCount = await prisma.systemSettings.count();
  if (settingsCount === 0) {
    await prisma.systemSettings.create({
      data: {
        id: 1,
        minQtyTier2: DEFAULT_SETTINGS.minQtyTier2,
        discountTier2: DEFAULT_SETTINGS.discountTier2,
        minQtyTier3: DEFAULT_SETTINGS.minQtyTier3,
        discountTier3: DEFAULT_SETTINGS.discountTier3,
        sizeSurchargeLimit: DEFAULT_SETTINGS.sizeSurchargeLimit,
        sizeSurchargeAmount: DEFAULT_SETTINGS.sizeSurchargeAmount,
        packingFeePerKoli: DEFAULT_SETTINGS.packingFeePerKoli,
        ppnPercentage: DEFAULT_SETTINGS.ppnPercentage,
        enablePpn: DEFAULT_SETTINGS.enablePpn,
        warehouseTermsJson: JSON.stringify(DEFAULT_SETTINGS.warehouseTerms ?? []),
        deliveryTermsJson: JSON.stringify(DEFAULT_SETTINGS.deliveryTerms ?? []),
        companyName: DEFAULT_SETTINGS.companyName,
        companyAddress: DEFAULT_SETTINGS.companyAddress,
        companyPhone: DEFAULT_SETTINGS.companyPhone,
        companyLogoUrl: DEFAULT_SETTINGS.companyLogoUrl
      }
    });
  }
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.createMany({
      data: PRODUCT_PRESETS.map((p) => ({
        name: p.name,
        defaultPrice: p.defaultPrice
      }))
    });
  }
  const customerCount = await prisma.customer.count();
  if (customerCount === 0) {
    await prisma.customer.createMany({
      data: INITIAL_CUSTOMERS.map((c) => ({
        name: c.name,
        type: c.type,
        hasFlatPriceSizeLarge: c.hasFlatPriceSizeLarge,
        enableVolumeDiscount: c.enableVolumeDiscount ?? null,
        volumeMode: c.volumeMode ?? null,
        customBasePrice: c.customBasePrice,
        phone: c.phone,
        address: c.address,
        commissionRate: c.commissionRate
      }))
    });
  }
  const salesmanCount = await prisma.salesman.count();
  if (salesmanCount === 0) {
    await prisma.salesman.createMany({
      data: INITIAL_SALESMEN.map((s) => ({
        name: s.name,
        phone: s.phone,
        commissionPerPair: s.commissionPerPair
      }))
    });
  }
  const invoiceCount = await prisma.invoice.count();
  if (invoiceCount === 0) {
    const seededCustomers = await prisma.customer.findMany();
    for (const inv of INITIAL_INVOICES) {
      const matchedCustomer = seededCustomers.find((c) => c.name === inv.customerName);
      const created = await prisma.invoice.create({
        data: {
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customerId: matchedCustomer?.id ?? inv.customerId,
          customerName: inv.customerName,
          customerType: inv.customerType,
          customerPhone: inv.customerPhone,
          customerAddress: inv.customerAddress,
          hasFlatPriceSizeLarge: inv.hasFlatPriceSizeLarge,
          itemsJson: JSON.stringify(inv.items),
          wantsPacking: inv.wantsPacking,
          koliCount: inv.koliCount,
          packingFee: inv.packingFee,
          hasOngkir: inv.hasOngkir ?? null,
          ongkirAmount: inv.ongkirAmount ?? null,
          totalPairs: inv.totalPairs,
          subtotal: inv.subtotal,
          taxRate: inv.taxRate ?? null,
          ppnAmount: inv.ppnAmount ?? null,
          totalAmount: inv.totalAmount,
          dpAmount: inv.dpAmount ?? null,
          remainingBalance: inv.remainingBalance ?? null,
          notes: inv.notes,
          status: inv.status
        }
      });
      await syncSuratJalanForInvoice(created);
      if (inv.invoiceNumber === "INV/20260610/03") {
        const sampleItem = inv.items[0];
        const refundValue = 10 * sampleItem.unitPrice;
        await prisma.productReturn.create({
          data: {
            returnNumber: "RET/20260615/01",
            date: "2026-06-15",
            invoiceId: created.id,
            invoiceNumber: created.invoiceNumber,
            customerId: created.customerId,
            customerName: created.customerName,
            itemsJson: JSON.stringify([
              {
                id: "retitem-1",
                productName: sampleItem.productName,
                size: sampleItem.size,
                returnedQuantity: 10,
                originalQuantity: sampleItem.quantity,
                unitRefundPrice: sampleItem.unitPrice,
                reason: "rusak_defect",
                totalRefundValue: refundValue
              }
            ]),
            totalRefundAmount: refundValue,
            refundType: "potong_tagihan",
            notes: "Daftar retur: 10 pasang jahitan sol luar retak. Dikurangkan langsung dari pinjaman faktur #03.",
            status: "completed"
          }
        });
        await prisma.invoice.update({
          where: { id: created.id },
          data: { remainingBalance: created.totalAmount - refundValue }
        });
      }
    }
  }
}

// server/auth.ts
import bcrypt2 from "bcryptjs";
var hashPassword = (password) => bcrypt2.hash(password, 10);
var verifyPassword = (password, hash) => bcrypt2.compare(password, hash);
var SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var MIN_PASSWORD_LENGTH = 8;
function validatePasswordStrength(password, username) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (username && password.toLowerCase() === username.toLowerCase()) {
    return "Password tidak boleh sama dengan username.";
  }
  return null;
}
async function requireAuth(req, res, next) {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "Tidak ada sesi login." });
    return;
  }
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session) {
    res.status(401).json({ error: "Sesi login tidak valid atau sudah berakhir." });
    return;
  }
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => null);
    res.status(401).json({ error: "Sesi login sudah kedaluwarsa, silakan login kembali." });
    return;
  }
  req.authUser = {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
    permissions: fromJson(session.user.permissionsJson, {}) || {}
  };
  next();
}
function requirePermission(permissionKey) {
  return (req, res, next) => {
    const authUser = req.authUser;
    if (!authUser) {
      res.status(401).json({ error: "Tidak ada sesi login." });
      return;
    }
    if (authUser.role === "super_admin") {
      next();
      return;
    }
    if (!authUser.permissions?.[permissionKey]) {
      res.status(403).json({ error: "Anda tidak memiliki izin untuk melakukan aksi ini." });
      return;
    }
    next();
  };
}
function requireSuperAdmin(req, res, next) {
  if (!req.authUser) {
    res.status(401).json({ error: "Tidak ada sesi login." });
    return;
  }
  if (req.authUser.role !== "super_admin") {
    res.status(403).json({ error: "Hanya Super Admin yang dapat melakukan aksi ini." });
    return;
  }
  next();
}

// server/routes/auth.ts
import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

// server/serializers.ts
var serializeUser = (u) => ({
  id: u.id,
  username: u.username,
  name: u.name,
  role: u.role,
  createdAt: u.createdAt,
  allowedTabs: fromJson(u.allowedTabsJson, void 0),
  permissions: fromJson(u.permissionsJson, void 0)
});

// server/asyncHandler.ts
var asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// server/routes/auth.ts
var authRouter = Router();
var loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 menit
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Terlalu banyak percobaan login. Coba lagi dalam beberapa menit." },
  keyGenerator: (req) => {
    const username = (req.body?.username || "").toString().toLowerCase();
    return `${ipKeyGenerator(req.ip || "")}:${username}`;
  }
});
authRouter.post("/login", loginRateLimiter, asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username dan password wajib diisi." });
    return;
  }
  const user = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Username atau password yang Anda masukkan salah." });
    return;
  }
  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) }
  });
  res.json({ token: session.token, user: serializeUser(user) });
}));
authRouter.post("/logout", requireAuth, asyncHandler(async (req, res) => {
  const header = req.header("authorization") || "";
  const token = header.slice(7);
  await prisma.session.deleteMany({ where: { token } });
  res.json({ ok: true });
}));
authRouter.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.authUser.id } });
  if (!user) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }
  res.json(serializeUser(user));
}));

// server/routes/users.ts
import { Router as Router2 } from "express";

// server/validation.ts
import { z } from "zod";
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: "Data yang dikirim tidak valid.", details: result.error.flatten() });
      return;
    }
    req.body = result.data;
    next();
  };
}
var optionalString = z.string().optional();
var optionalNumber = z.number().optional();
var customerSchema = z.object({
  name: z.string().min(1, "Nama pelanggan wajib diisi."),
  type: z.string().min(1),
  hasFlatPriceSizeLarge: z.boolean(),
  enableVolumeDiscount: z.boolean().optional(),
  volumeMode: optionalString,
  customBasePrice: z.number(),
  customPrices: z.any().optional(),
  customTier2Prices: z.any().optional(),
  customTier3Prices: z.any().optional(),
  customTier2MinQty: z.any().optional(),
  customTier3MinQty: z.any().optional(),
  customSizeSurcharges: z.any().optional(),
  phone: optionalString,
  address: optionalString,
  commissionRate: optionalNumber
});
var productSchema = z.object({
  name: z.string().min(1, "Nama produk wajib diisi."),
  defaultPrice: z.number(),
  priceTier2: optionalNumber,
  priceTier3: optionalNumber,
  customSurchargeLimit: optionalNumber,
  customSurchargeAmount: optionalNumber,
  customSurcharges: z.any().optional()
});
var salesmanSchema = z.object({
  name: z.string().min(1, "Nama salesman wajib diisi."),
  phone: optionalString,
  commissionPerPair: z.number()
});
var invoiceItemSchema = z.object({
  id: z.string(),
  productName: z.string().min(1),
  size: z.number(),
  quantity: z.number(),
  basePrice: z.number(),
  sizeSurcharge: z.number(),
  negotiatedBasePrice: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number()
});
var invoicePaymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  date: z.string(),
  note: optionalString,
  method: optionalString,
  type: z.enum(["installment", "settlement"]).optional()
});
var paymentProofSchema = z.union([
  z.string(),
  z.object({
    url: z.string(),
    description: optionalString,
    createdAt: optionalString
  })
]);
var invoiceSchema = z.object({
  invoiceNumber: z.string().min(1),
  date: z.string().min(1),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  customerType: z.string().min(1),
  customerPhone: optionalString,
  customerAddress: optionalString,
  hasFlatPriceSizeLarge: z.boolean(),
  items: z.array(invoiceItemSchema).min(1, "Faktur harus memiliki minimal 1 item barang."),
  wantsPacking: z.boolean(),
  koliCount: z.number(),
  packingFee: z.number(),
  hasOngkir: z.boolean().optional(),
  ongkirAmount: optionalNumber,
  totalPairs: z.number(),
  subtotal: z.number(),
  taxRate: optionalNumber,
  ppnAmount: optionalNumber,
  totalAmount: z.number(),
  dpAmount: optionalNumber,
  remainingBalance: optionalNumber,
  notes: optionalString,
  status: z.enum(["paid", "unpaid"]),
  salesmanId: optionalString,
  salesmanName: optionalString,
  commissionPerPair: optionalNumber,
  commissionStatus: z.enum(["paid", "unpaid"]).optional(),
  paymentProofUrl: optionalString,
  paymentProofUrls: z.array(paymentProofSchema).optional(),
  payments: z.array(invoicePaymentSchema).optional()
});
var invoiceStatusSchema = z.object({
  status: z.enum(["paid", "unpaid"])
});
var returnItemSchema = z.object({
  id: z.string(),
  productName: z.string().min(1),
  size: z.number(),
  returnedQuantity: z.number(),
  originalQuantity: z.number(),
  unitRefundPrice: z.number(),
  reason: z.enum(["rusak_defect", "salah_ukuran", "salah_model", "kelebihan_kirim", "lainnya"]),
  customReasonText: optionalString,
  totalRefundValue: z.number()
});
var returnSchema = z.object({
  returnNumber: z.string().min(1),
  date: z.string().min(1),
  invoiceId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  items: z.array(returnItemSchema).min(1, "Retur harus memiliki minimal 1 item barang."),
  totalRefundAmount: z.number(),
  refundType: z.enum(["potong_tagihan", "tunai_kredit"]),
  notes: optionalString,
  status: z.enum(["completed", "pending"])
});
var settingsSchema = z.object({
  minQtyTier2: z.number(),
  discountTier2: z.number(),
  minQtyTier3: z.number(),
  discountTier3: z.number(),
  sizeSurchargeLimit: z.number(),
  sizeSurchargeAmount: z.number(),
  packingFeePerKoli: z.number(),
  ppnPercentage: z.number(),
  enablePpn: z.boolean(),
  warehouseTerms: z.array(z.string()).optional(),
  deliveryTerms: z.array(z.string()).optional(),
  companyName: optionalString,
  companyAddress: optionalString,
  companyPhone: optionalString,
  companyLogoUrl: optionalString
});
var suratJalanUpdateSchema = z.object({
  driverName: optionalString,
  vehicleNumber: optionalString,
  status: z.string().min(1),
  notes: optionalString
});
var activityLogSchema = z.object({
  actionType: z.enum(["create", "update", "delete", "payment", "other"]),
  category: z.string().min(1),
  description: z.string().min(1),
  details: optionalString
  // Note: no `username` field — identity is always taken from the verified
  // session server-side (see activityLogs.ts), never trusted from the client.
});
var commissionRateSchema = z.object({
  value: z.number()
});
var commissionPaymentSchema = z.object({
  value: z.string()
});
var userRoleSchema = z.enum(["super_admin", "director", "admin", "operator", "finance"]);
var userCreateSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  name: z.string().min(1),
  role: userRoleSchema,
  allowedTabs: z.array(z.string()).optional(),
  permissions: z.record(z.string(), z.boolean()).optional(),
  createdAt: optionalString
});
var userUpdateSchema = z.object({
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  role: userRoleSchema.optional(),
  allowedTabs: z.array(z.string()).optional(),
  permissions: z.record(z.string(), z.boolean()).optional()
});
var legacyEntitySchema = z.object({ id: z.string() }).passthrough();
var legacyUserSchema = z.object({ username: z.string().min(1), name: z.string().min(1), role: z.string().min(1) }).passthrough();
var legacyImportSchema = z.object({
  customers: z.array(legacyEntitySchema).optional(),
  products: z.array(legacyEntitySchema).optional(),
  salesmen: z.array(legacyEntitySchema).optional(),
  invoices: z.array(legacyEntitySchema).optional(),
  suratJalans: z.array(legacyEntitySchema).optional(),
  returns: z.array(legacyEntitySchema).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  users: z.array(legacyUserSchema).optional(),
  activityLogs: z.array(legacyEntitySchema).optional(),
  monthlyPayments: z.record(z.string(), z.any()).optional(),
  monthlyRates: z.record(z.string(), z.any()).optional()
});

// server/prismaErrors.ts
async function deleteOrError(res, action, notFoundMsg = "Data tidak ditemukan (mungkin sudah terhapus sebelumnya).", conflictMsg = "Data tidak dapat dihapus karena masih terkait dengan data lain.") {
  try {
    await action();
    res.json({ ok: true });
  } catch (err) {
    if (err?.code === "P2025") {
      res.status(404).json({ error: notFoundMsg });
      return;
    }
    if (err?.code === "P2003") {
      res.status(409).json({ error: conflictMsg });
      return;
    }
    console.error("Gagal menghapus data:", err);
    res.status(500).json({ error: "Terjadi kesalahan pada server saat menghapus data." });
  }
}

// server/routes/users.ts
var usersRouter = Router2();
usersRouter.get("/", asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany();
  res.json(users.map(serializeUser));
}));
usersRouter.post("/", requireSuperAdmin, validateBody(userCreateSchema), asyncHandler(async (req, res) => {
  const { username, password, name, role, allowedTabs, permissions, createdAt } = req.body;
  if (!username || !password || !name || !role) {
    res.status(400).json({ error: "Data pengguna tidak lengkap." });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: "Username sudah digunakan oleh akun lain." });
    return;
  }
  const passwordError = validatePasswordStrength(password, username);
  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username: username.toLowerCase(),
      passwordHash,
      name,
      role,
      allowedTabsJson: toJson(allowedTabs),
      permissionsJson: toJson(permissions),
      createdAt: createdAt || (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19)
    }
  });
  res.status(201).json(serializeUser(user));
}));
usersRouter.put("/:id", validateBody(userUpdateSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  let { username, password, name, role, allowedTabs, permissions } = req.body;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: "Pengguna tidak ditemukan." });
    return;
  }
  const isSuperAdmin = req.authUser?.role === "super_admin";
  const isSelf = req.authUser?.id === id;
  if (!isSuperAdmin) {
    if (!isSelf) {
      res.status(403).json({ error: "Anda tidak memiliki izin untuk mengubah pengguna lain." });
      return;
    }
    username = void 0;
    name = void 0;
    role = void 0;
    allowedTabs = void 0;
    permissions = void 0;
  }
  if (username && username.toLowerCase() !== existing.username) {
    const dup = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (dup) {
      res.status(409).json({ error: "Username sudah digunakan oleh akun lain." });
      return;
    }
  }
  if (password) {
    const passwordError = validatePasswordStrength(password, username || existing.username);
    if (passwordError) {
      res.status(400).json({ error: passwordError });
      return;
    }
  }
  const user = await prisma.user.update({
    where: { id },
    data: {
      username: username ? username.toLowerCase() : void 0,
      name,
      role,
      allowedTabsJson: allowedTabs !== void 0 ? toJson(allowedTabs) : void 0,
      permissionsJson: permissions !== void 0 ? toJson(permissions) : void 0,
      passwordHash: password ? await hashPassword(password) : void 0
    }
  });
  res.json(serializeUser(user));
}));
usersRouter.delete("/:id", requireSuperAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (user?.username === "admin") {
    res.status(403).json({ error: "Super Admin utama tidak dapat dihapus." });
    return;
  }
  await prisma.session.deleteMany({ where: { userId: id } });
  await deleteOrError(
    res,
    () => prisma.user.delete({ where: { id } }),
    "Pengguna tidak ditemukan (mungkin sudah terhapus sebelumnya)."
  );
}));

// server/routes/customers.ts
import { Router as Router3 } from "express";
var customersRouter = Router3();
var serialize = (c) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  hasFlatPriceSizeLarge: c.hasFlatPriceSizeLarge,
  enableVolumeDiscount: c.enableVolumeDiscount ?? void 0,
  volumeMode: c.volumeMode ?? void 0,
  customBasePrice: c.customBasePrice,
  customPrices: fromJson(c.customPricesJson, void 0),
  customTier2Prices: fromJson(c.customTier2PricesJson, void 0),
  customTier3Prices: fromJson(c.customTier3PricesJson, void 0),
  customTier2MinQty: fromJson(c.customTier2MinQtyJson, void 0),
  customTier3MinQty: fromJson(c.customTier3MinQtyJson, void 0),
  customSizeSurcharges: fromJson(c.customSizeSurchargesJson, void 0),
  phone: c.phone ?? void 0,
  address: c.address ?? void 0,
  commissionRate: c.commissionRate ?? void 0
});
var toData = (body) => ({
  name: body.name,
  type: body.type,
  hasFlatPriceSizeLarge: body.hasFlatPriceSizeLarge,
  enableVolumeDiscount: body.enableVolumeDiscount ?? null,
  volumeMode: body.volumeMode ?? null,
  customBasePrice: body.customBasePrice,
  customPricesJson: toJson(body.customPrices),
  customTier2PricesJson: toJson(body.customTier2Prices),
  customTier3PricesJson: toJson(body.customTier3Prices),
  customTier2MinQtyJson: toJson(body.customTier2MinQty),
  customTier3MinQtyJson: toJson(body.customTier3MinQty),
  customSizeSurchargesJson: toJson(body.customSizeSurcharges),
  phone: body.phone ?? null,
  address: body.address ?? null,
  commissionRate: body.commissionRate ?? null
});
customersRouter.get("/", asyncHandler(async (_req, res) => {
  const rows = await prisma.customer.findMany();
  res.json(rows.map(serialize));
}));
customersRouter.post("/", requirePermission("canManageMasterData"), validateBody(customerSchema), asyncHandler(async (req, res) => {
  const row = await prisma.customer.create({ data: toData(req.body) });
  res.status(201).json(serialize(row));
}));
customersRouter.put("/:id", requirePermission("canManageMasterData"), validateBody(customerSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Pelanggan tidak ditemukan (mungkin sudah terhapus)." });
    return;
  }
  const row = await prisma.customer.update({ where: { id: req.params.id }, data: toData(req.body) });
  res.json(serialize(row));
}));
customersRouter.delete("/:id", requirePermission("canManageMasterData"), asyncHandler(async (req, res) => {
  await deleteOrError(
    res,
    () => prisma.customer.delete({ where: { id: req.params.id } }),
    "Pelanggan tidak ditemukan (mungkin sudah terhapus sebelumnya).",
    "Pelanggan tidak dapat dihapus karena masih memiliki faktur terkait."
  );
}));

// server/routes/products.ts
import { Router as Router4 } from "express";
var productsRouter = Router4();
var serialize2 = (p) => ({
  id: p.id,
  name: p.name,
  defaultPrice: p.defaultPrice,
  priceTier2: p.priceTier2 ?? void 0,
  priceTier3: p.priceTier3 ?? void 0,
  customSurchargeLimit: p.customSurchargeLimit ?? void 0,
  customSurchargeAmount: p.customSurchargeAmount ?? void 0,
  customSurcharges: fromJson(p.customSurchargesJson, void 0)
});
var toData2 = (body) => ({
  name: body.name,
  defaultPrice: body.defaultPrice,
  priceTier2: body.priceTier2 ?? null,
  priceTier3: body.priceTier3 ?? null,
  customSurchargeLimit: body.customSurchargeLimit ?? null,
  customSurchargeAmount: body.customSurchargeAmount ?? null,
  customSurchargesJson: toJson(body.customSurcharges)
});
productsRouter.get("/", asyncHandler(async (_req, res) => {
  const rows = await prisma.product.findMany();
  res.json(rows.map(serialize2));
}));
productsRouter.post("/", requirePermission("canManageMasterData"), validateBody(productSchema), asyncHandler(async (req, res) => {
  const row = await prisma.product.create({ data: toData2(req.body) });
  res.status(201).json(serialize2(row));
}));
productsRouter.put("/:id", requirePermission("canManageMasterData"), validateBody(productSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Produk tidak ditemukan (mungkin sudah terhapus)." });
    return;
  }
  const row = await prisma.product.update({ where: { id: req.params.id }, data: toData2(req.body) });
  res.json(serialize2(row));
}));
productsRouter.delete("/:id", requirePermission("canManageMasterData"), asyncHandler(async (req, res) => {
  await deleteOrError(
    res,
    () => prisma.product.delete({ where: { id: req.params.id } }),
    "Produk tidak ditemukan (mungkin sudah terhapus sebelumnya).",
    "Produk tidak dapat dihapus karena masih dipakai di faktur terkait."
  );
}));

// server/routes/salesmen.ts
import { Router as Router5 } from "express";
var salesmenRouter = Router5();
var serialize3 = (s) => ({
  id: s.id,
  name: s.name,
  phone: s.phone ?? void 0,
  commissionPerPair: s.commissionPerPair
});
salesmenRouter.get("/", asyncHandler(async (_req, res) => {
  const rows = await prisma.salesman.findMany();
  res.json(rows.map(serialize3));
}));
salesmenRouter.post("/", requirePermission("canManageSalesman"), validateBody(salesmanSchema), asyncHandler(async (req, res) => {
  const { name, phone, commissionPerPair } = req.body;
  const row = await prisma.salesman.create({ data: { name, phone: phone ?? null, commissionPerPair } });
  res.status(201).json(serialize3(row));
}));
salesmenRouter.put("/:id", requirePermission("canManageSalesman"), validateBody(salesmanSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.salesman.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Salesman tidak ditemukan (mungkin sudah terhapus)." });
    return;
  }
  const { name, phone, commissionPerPair } = req.body;
  const row = await prisma.salesman.update({
    where: { id: req.params.id },
    data: { name, phone: phone ?? null, commissionPerPair }
  });
  if (name) {
    const invoices = await prisma.invoice.findMany({ where: { salesmanId: req.params.id } });
    for (const inv of invoices) {
      if (inv.salesmanName !== name) {
        await prisma.invoice.update({ where: { id: inv.id }, data: { salesmanName: name } });
      }
    }
  }
  res.json(serialize3(row));
}));
salesmenRouter.delete("/:id", requirePermission("canManageSalesman"), asyncHandler(async (req, res) => {
  await deleteOrError(
    res,
    () => prisma.salesman.delete({ where: { id: req.params.id } }),
    "Salesman tidak ditemukan (mungkin sudah terhapus sebelumnya).",
    "Salesman tidak dapat dihapus karena masih terkait dengan faktur lain."
  );
}));

// server/routes/invoices.ts
import { Router as Router6 } from "express";

// server/pricing.ts
var deserializeCustomer = (c) => ({
  id: c.id,
  name: c.name,
  type: c.type,
  hasFlatPriceSizeLarge: c.hasFlatPriceSizeLarge,
  enableVolumeDiscount: c.enableVolumeDiscount ?? void 0,
  volumeMode: c.volumeMode ?? void 0,
  customBasePrice: c.customBasePrice,
  customPrices: fromJson(c.customPricesJson, void 0),
  customTier2Prices: fromJson(c.customTier2PricesJson, void 0),
  customTier3Prices: fromJson(c.customTier3PricesJson, void 0),
  customTier2MinQty: fromJson(c.customTier2MinQtyJson, void 0),
  customTier3MinQty: fromJson(c.customTier3MinQtyJson, void 0),
  customSizeSurcharges: fromJson(c.customSizeSurchargesJson, void 0),
  phone: c.phone ?? void 0,
  address: c.address ?? void 0,
  commissionRate: c.commissionRate ?? void 0
});
var deserializeProduct = (p) => ({
  id: p.id,
  name: p.name,
  defaultPrice: p.defaultPrice,
  priceTier2: p.priceTier2 ?? void 0,
  priceTier3: p.priceTier3 ?? void 0,
  customSurchargeLimit: p.customSurchargeLimit ?? void 0,
  customSurchargeAmount: p.customSurchargeAmount ?? void 0,
  customSurcharges: fromJson(p.customSurchargesJson, void 0)
});
var deserializeSettings = (s) => ({
  minQtyTier2: s.minQtyTier2,
  discountTier2: s.discountTier2,
  minQtyTier3: s.minQtyTier3,
  discountTier3: s.discountTier3,
  sizeSurchargeLimit: s.sizeSurchargeLimit,
  sizeSurchargeAmount: s.sizeSurchargeAmount,
  packingFeePerKoli: s.packingFeePerKoli,
  ppnPercentage: s.ppnPercentage,
  enablePpn: s.enablePpn,
  warehouseTerms: fromJson(s.warehouseTermsJson, []),
  deliveryTerms: fromJson(s.deliveryTermsJson, []),
  companyName: s.companyName ?? void 0,
  companyAddress: s.companyAddress ?? void 0,
  companyPhone: s.companyPhone ?? void 0,
  companyLogoUrl: s.companyLogoUrl ?? void 0
});
async function recomputeInvoiceTotals(body) {
  const customerRow = await prisma.customer.findUnique({ where: { id: body.customerId } });
  if (!customerRow) {
    return { ok: false, error: "Pelanggan tidak ditemukan." };
  }
  const customer = deserializeCustomer(customerRow);
  const productRows = await prisma.product.findMany();
  const products = productRows.map(deserializeProduct);
  const settingsRow = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  const settings = settingsRow ? deserializeSettings(settingsRow) : DEFAULT_SETTINGS;
  const draftItems = (body.items || []).map((it) => ({
    id: it.id,
    productName: it.productName,
    size: it.size,
    quantity: it.quantity,
    basePrice: it.basePrice
  }));
  const draft = {
    id: body.id,
    invoiceNumber: body.invoiceNumber,
    date: body.date,
    customerId: customer.id,
    customerName: customer.name,
    customerType: customer.type,
    hasFlatPriceSizeLarge: customer.hasFlatPriceSizeLarge,
    wantsPacking: body.wantsPacking,
    koliCount: body.wantsPacking ? body.koliCount : 0,
    dpAmount: body.dpAmount || 0,
    hasOngkir: body.hasOngkir,
    ongkirAmount: body.hasOngkir ? body.ongkirAmount : 0,
    paymentProofUrl: body.paymentProofUrl,
    paymentProofUrls: body.paymentProofUrls,
    payments: body.payments,
    notes: body.notes,
    status: body.status,
    salesmanId: body.salesmanId,
    salesmanName: body.salesmanName,
    commissionPerPair: body.commissionPerPair,
    commissionStatus: body.commissionStatus
  };
  const computed = calculateFullInvoice(draft, draftItems, customer, products, settings);
  const totalPaidFromPayments = (computed.payments || []).reduce((sum, p) => sum + p.amount, 0);
  const totalPaid = computed.status === "paid" ? computed.totalAmount : (computed.dpAmount || 0) + totalPaidFromPayments;
  computed.remainingBalance = computed.status === "paid" ? 0 : Math.max(0, computed.totalAmount - totalPaid);
  return { ok: true, data: computed };
}

// server/routes/invoices.ts
var invoicesRouter = Router6();
var serialize4 = (inv) => ({
  id: inv.id,
  invoiceNumber: inv.invoiceNumber,
  date: inv.date,
  customerId: inv.customerId,
  customerName: inv.customerName,
  customerType: inv.customerType,
  customerPhone: inv.customerPhone ?? void 0,
  customerAddress: inv.customerAddress ?? void 0,
  hasFlatPriceSizeLarge: inv.hasFlatPriceSizeLarge,
  items: fromJson(inv.itemsJson, []),
  wantsPacking: inv.wantsPacking,
  koliCount: inv.koliCount,
  packingFee: inv.packingFee,
  hasOngkir: inv.hasOngkir ?? void 0,
  ongkirAmount: inv.ongkirAmount ?? void 0,
  totalPairs: inv.totalPairs,
  subtotal: inv.subtotal,
  taxRate: inv.taxRate ?? void 0,
  ppnAmount: inv.ppnAmount ?? void 0,
  totalAmount: inv.totalAmount,
  dpAmount: inv.dpAmount ?? void 0,
  remainingBalance: inv.remainingBalance ?? void 0,
  notes: inv.notes ?? void 0,
  status: inv.status,
  salesmanId: inv.salesmanId ?? void 0,
  salesmanName: inv.salesmanName ?? void 0,
  commissionPerPair: inv.commissionPerPair ?? void 0,
  commissionStatus: inv.commissionStatus ?? void 0,
  paymentProofUrl: inv.paymentProofUrl ?? void 0,
  paymentProofUrls: fromJson(inv.paymentProofUrlsJson, void 0),
  payments: fromJson(inv.paymentsJson, void 0)
});
var toData3 = (body) => ({
  invoiceNumber: body.invoiceNumber,
  date: body.date,
  customerId: body.customerId,
  customerName: body.customerName,
  customerType: body.customerType,
  customerPhone: body.customerPhone ?? null,
  customerAddress: body.customerAddress ?? null,
  hasFlatPriceSizeLarge: body.hasFlatPriceSizeLarge,
  itemsJson: toJson(body.items),
  wantsPacking: body.wantsPacking,
  koliCount: body.koliCount,
  packingFee: body.packingFee,
  hasOngkir: body.hasOngkir ?? null,
  ongkirAmount: body.ongkirAmount ?? null,
  totalPairs: body.totalPairs,
  subtotal: body.subtotal,
  taxRate: body.taxRate ?? null,
  ppnAmount: body.ppnAmount ?? null,
  totalAmount: body.totalAmount,
  dpAmount: body.dpAmount ?? null,
  remainingBalance: body.remainingBalance ?? null,
  notes: body.notes ?? null,
  status: body.status,
  salesmanId: body.salesmanId ?? null,
  salesmanName: body.salesmanName ?? null,
  commissionPerPair: body.commissionPerPair ?? null,
  commissionStatus: body.commissionStatus ?? null,
  paymentProofUrl: body.paymentProofUrl ?? null,
  paymentProofUrlsJson: toJson(body.paymentProofUrls),
  paymentsJson: toJson(body.payments)
});
invoicesRouter.get("/", asyncHandler(async (_req, res) => {
  const rows = await prisma.invoice.findMany({ orderBy: { createdAt: "desc" } });
  res.json(rows.map(serialize4));
}));
invoicesRouter.post("/", requirePermission("canCreateInvoice"), validateBody(invoiceSchema), asyncHandler(async (req, res) => {
  const recomputed = await recomputeInvoiceTotals(req.body);
  if (recomputed.ok === false) {
    res.status(400).json({ error: recomputed.error });
    return;
  }
  const row = await prisma.invoice.create({ data: toData3(recomputed.data) });
  await syncSuratJalanForInvoice(row);
  res.status(201).json(serialize4(row));
}));
invoicesRouter.put("/:id", requirePermission("canEditInvoice"), validateBody(invoiceSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Faktur tidak ditemukan (mungkin sudah terhapus)." });
    return;
  }
  const recomputed = await recomputeInvoiceTotals(req.body);
  if (recomputed.ok === false) {
    res.status(400).json({ error: recomputed.error });
    return;
  }
  const row = await prisma.invoice.update({ where: { id: req.params.id }, data: toData3(recomputed.data) });
  await syncSuratJalanForInvoice(row);
  res.json(serialize4(row));
}));
invoicesRouter.patch("/:id/status", requirePermission("canPayInvoice"), validateBody(invoiceStatusSchema), asyncHandler(async (req, res) => {
  const { status } = req.body;
  const existing = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Faktur tidak ditemukan." });
    return;
  }
  const existingPayments = fromJson(existing.paymentsJson, []);
  const totalPaid = (existing.dpAmount || 0) + existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const row = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      status,
      remainingBalance: status === "paid" ? 0 : Math.max(0, existing.totalAmount - totalPaid)
    }
  });
  res.json(serialize4(row));
}));
invoicesRouter.delete("/:id", requirePermission("canDeleteInvoice"), asyncHandler(async (req, res) => {
  await deleteSuratJalanForInvoice(req.params.id);
  await deleteOrError(
    res,
    () => prisma.invoice.delete({ where: { id: req.params.id } }),
    "Faktur tidak ditemukan (mungkin sudah terhapus sebelumnya)."
  );
}));

// server/routes/suratJalans.ts
import { Router as Router7 } from "express";
var suratJalansRouter = Router7();
var serialize5 = (sj) => ({
  id: sj.id,
  suratJalanNumber: sj.suratJalanNumber,
  invoiceId: sj.invoiceId,
  invoiceNumber: sj.invoiceNumber,
  date: sj.date,
  customerId: sj.customerId,
  customerName: sj.customerName,
  customerPhone: sj.customerPhone ?? void 0,
  customerAddress: sj.customerAddress ?? void 0,
  items: fromJson(sj.itemsJson, []),
  koliCount: sj.koliCount,
  driverName: sj.driverName ?? void 0,
  vehicleNumber: sj.vehicleNumber ?? void 0,
  status: sj.status,
  notes: sj.notes ?? void 0
});
suratJalansRouter.get("/", asyncHandler(async (_req, res) => {
  const rows = await prisma.suratJalan.findMany();
  res.json(rows.map(serialize5));
}));
suratJalansRouter.put("/:id", requirePermission("canManageSuratJalan"), validateBody(suratJalanUpdateSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.suratJalan.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Surat jalan tidak ditemukan (mungkin sudah terhapus)." });
    return;
  }
  const { driverName, vehicleNumber, status, notes } = req.body;
  const row = await prisma.suratJalan.update({
    where: { id: req.params.id },
    data: { driverName, vehicleNumber, status, notes }
  });
  res.json(serialize5(row));
}));

// server/routes/returns.ts
import { Router as Router8 } from "express";
var returnsRouter = Router8();
var serialize6 = (r) => ({
  id: r.id,
  returnNumber: r.returnNumber,
  date: r.date,
  invoiceId: r.invoiceId,
  invoiceNumber: r.invoiceNumber,
  customerId: r.customerId,
  customerName: r.customerName,
  items: fromJson(r.itemsJson, []),
  totalRefundAmount: r.totalRefundAmount,
  refundType: r.refundType,
  notes: r.notes ?? void 0,
  status: r.status
});
var withRecomputedTotals = (body) => {
  const items = (body.items || []).map((it) => ({
    ...it,
    totalRefundValue: it.returnedQuantity * it.unitRefundPrice
  }));
  const totalRefundAmount = items.reduce((sum, it) => sum + it.totalRefundValue, 0);
  return { ...body, items, totalRefundAmount };
};
var toData4 = (body) => ({
  returnNumber: body.returnNumber,
  date: body.date,
  invoiceId: body.invoiceId,
  invoiceNumber: body.invoiceNumber,
  customerId: body.customerId,
  customerName: body.customerName,
  itemsJson: toJson(body.items),
  totalRefundAmount: body.totalRefundAmount,
  refundType: body.refundType,
  notes: body.notes ?? null,
  status: body.status
});
returnsRouter.get("/", asyncHandler(async (_req, res) => {
  const rows = await prisma.productReturn.findMany();
  res.json(rows.map(serialize6));
}));
returnsRouter.post("/", requirePermission("canProcessReturn"), validateBody(returnSchema), asyncHandler(async (req, res) => {
  const row = await prisma.productReturn.create({ data: toData4(withRecomputedTotals(req.body)) });
  res.status(201).json(serialize6(row));
}));
returnsRouter.put("/:id", requirePermission("canProcessReturn"), validateBody(returnSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.productReturn.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    res.status(404).json({ error: "Retur tidak ditemukan (mungkin sudah terhapus)." });
    return;
  }
  const row = await prisma.productReturn.update({ where: { id: req.params.id }, data: toData4(withRecomputedTotals(req.body)) });
  res.json(serialize6(row));
}));
returnsRouter.delete("/:id", requirePermission("canProcessReturn"), asyncHandler(async (req, res) => {
  await deleteOrError(
    res,
    () => prisma.productReturn.delete({ where: { id: req.params.id } }),
    "Retur tidak ditemukan (mungkin sudah terhapus sebelumnya)."
  );
}));

// server/routes/settings.ts
import { Router as Router9 } from "express";
var settingsRouter = Router9();
var serialize7 = (s) => ({
  minQtyTier2: s.minQtyTier2,
  discountTier2: s.discountTier2,
  minQtyTier3: s.minQtyTier3,
  discountTier3: s.discountTier3,
  sizeSurchargeLimit: s.sizeSurchargeLimit,
  sizeSurchargeAmount: s.sizeSurchargeAmount,
  packingFeePerKoli: s.packingFeePerKoli,
  ppnPercentage: s.ppnPercentage,
  enablePpn: s.enablePpn,
  warehouseTerms: fromJson(s.warehouseTermsJson, []),
  deliveryTerms: fromJson(s.deliveryTermsJson, []),
  companyName: s.companyName ?? void 0,
  companyAddress: s.companyAddress ?? void 0,
  companyPhone: s.companyPhone ?? void 0,
  companyLogoUrl: s.companyLogoUrl ?? void 0
});
settingsRouter.get("/", asyncHandler(async (_req, res) => {
  const row = await prisma.systemSettings.findUnique({ where: { id: 1 } });
  res.json(row ? serialize7(row) : DEFAULT_SETTINGS);
}));
settingsRouter.put("/", requirePermission("canEditSettings"), validateBody(settingsSchema), asyncHandler(async (req, res) => {
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
    companyLogoUrl: body.companyLogoUrl ?? null
  };
  const row = await prisma.systemSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data
  });
  res.json(serialize7(row));
}));

// server/routes/activityLogs.ts
import { Router as Router10 } from "express";
var activityLogsRouter = Router10();
var MAX_LOGS = 1e3;
var serialize8 = (l) => ({
  id: l.id,
  timestamp: l.timestamp,
  actionType: l.actionType,
  category: l.category,
  description: l.description,
  details: l.details ?? void 0,
  username: l.username ?? void 0
});
activityLogsRouter.get("/", asyncHandler(async (_req, res) => {
  const rows = await prisma.activityLog.findMany({ orderBy: { timestamp: "desc" }, take: MAX_LOGS });
  res.json(rows.map(serialize8));
}));
activityLogsRouter.post("/", validateBody(activityLogSchema), asyncHandler(async (req, res) => {
  const { actionType, category, description, details } = req.body;
  const created = await prisma.activityLog.create({
    data: {
      timestamp: (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19),
      actionType,
      category,
      description,
      details,
      // Identity always comes from the verified session, never from the request
      // body — otherwise any logged-in user could forge log entries under another
      // user's name (or hide their own actions).
      username: req.authUser?.username
    }
  });
  const toKeep = await prisma.activityLog.findMany({
    orderBy: { timestamp: "desc" },
    skip: MAX_LOGS,
    select: { id: true }
  });
  if (toKeep.length > 0) {
    await prisma.activityLog.deleteMany({ where: { id: { in: toKeep.map((r) => r.id) } } });
  }
  const rows = await prisma.activityLog.findMany({ orderBy: { timestamp: "desc" }, take: MAX_LOGS });
  res.status(201).json(rows.map(serialize8));
  void created;
}));
activityLogsRouter.delete("/", requirePermission("canClearLogs"), asyncHandler(async (_req, res) => {
  await prisma.activityLog.deleteMany({});
  res.json({ ok: true });
}));

// server/routes/commissions.ts
import { Router as Router11 } from "express";
var commissionsRouter = Router11();
commissionsRouter.get("/rates", asyncHandler(async (_req, res) => {
  const rows = await prisma.commissionMonthlyRate.findMany();
  const map = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });
  res.json(map);
}));
commissionsRouter.put("/rates/:key", requirePermission("canEditCommissionRate"), validateBody(commissionRateSchema), asyncHandler(async (req, res) => {
  const { value } = req.body;
  const row = await prisma.commissionMonthlyRate.upsert({
    where: { key: req.params.key },
    create: { key: req.params.key, value },
    update: { value }
  });
  res.json({ [row.key]: row.value });
}));
commissionsRouter.get("/payments", asyncHandler(async (_req, res) => {
  const rows = await prisma.commissionMonthlyPayment.findMany();
  const map = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });
  res.json(map);
}));
commissionsRouter.put("/payments/:key", requirePermission("canPayCommission"), validateBody(commissionPaymentSchema), asyncHandler(async (req, res) => {
  const { value } = req.body;
  const row = await prisma.commissionMonthlyPayment.upsert({
    where: { key: req.params.key },
    create: { key: req.params.key, value },
    update: { value }
  });
  res.json({ [row.key]: row.value });
}));

// server/routes/importLegacy.ts
import { Router as Router12 } from "express";
var importLegacyRouter = Router12();
importLegacyRouter.post("/", validateBody(legacyImportSchema), asyncHandler(async (req, res) => {
  const body = req.body || {};
  const {
    customers = [],
    products = [],
    salesmen = [],
    invoices = [],
    suratJalans = [],
    returns = [],
    settings,
    users = [],
    activityLogs = [],
    monthlyPayments = {},
    monthlyRates = {}
  } = body;
  await prisma.$transaction(async (tx) => {
    for (const c of customers) {
      await tx.customer.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          name: c.name,
          type: c.type,
          hasFlatPriceSizeLarge: c.hasFlatPriceSizeLarge,
          enableVolumeDiscount: c.enableVolumeDiscount ?? null,
          volumeMode: c.volumeMode ?? null,
          customBasePrice: c.customBasePrice,
          customPricesJson: toJson(c.customPrices),
          customTier2PricesJson: toJson(c.customTier2Prices),
          customTier3PricesJson: toJson(c.customTier3Prices),
          customTier2MinQtyJson: toJson(c.customTier2MinQty),
          customTier3MinQtyJson: toJson(c.customTier3MinQty),
          customSizeSurchargesJson: toJson(c.customSizeSurcharges),
          phone: c.phone ?? null,
          address: c.address ?? null,
          commissionRate: c.commissionRate ?? null
        },
        update: {}
      });
    }
    for (const p of products) {
      await tx.product.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          name: p.name,
          defaultPrice: p.defaultPrice,
          priceTier2: p.priceTier2 ?? null,
          priceTier3: p.priceTier3 ?? null,
          customSurchargeLimit: p.customSurchargeLimit ?? null,
          customSurchargeAmount: p.customSurchargeAmount ?? null,
          customSurchargesJson: toJson(p.customSurcharges)
        },
        update: {}
      });
    }
    for (const s of salesmen) {
      await tx.salesman.upsert({
        where: { id: s.id },
        create: { id: s.id, name: s.name, phone: s.phone ?? null, commissionPerPair: s.commissionPerPair },
        update: {}
      });
    }
    if (settings) {
      await tx.systemSettings.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          minQtyTier2: settings.minQtyTier2,
          discountTier2: settings.discountTier2,
          minQtyTier3: settings.minQtyTier3,
          discountTier3: settings.discountTier3,
          sizeSurchargeLimit: settings.sizeSurchargeLimit,
          sizeSurchargeAmount: settings.sizeSurchargeAmount,
          packingFeePerKoli: settings.packingFeePerKoli,
          ppnPercentage: settings.ppnPercentage,
          enablePpn: settings.enablePpn,
          warehouseTermsJson: toJson(settings.warehouseTerms),
          deliveryTermsJson: toJson(settings.deliveryTerms),
          companyName: settings.companyName ?? null,
          companyAddress: settings.companyAddress ?? null,
          companyPhone: settings.companyPhone ?? null,
          companyLogoUrl: settings.companyLogoUrl ?? null
        },
        update: {}
      });
    }
    for (const u of users) {
      const existing = await tx.user.findUnique({ where: { username: u.username.toLowerCase() } });
      if (existing) continue;
      const passwordHash = await hashPassword(u.password || "ganti-password-ini");
      await tx.user.create({
        data: {
          username: u.username.toLowerCase(),
          passwordHash,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt || (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 19),
          allowedTabsJson: toJson(u.allowedTabs),
          permissionsJson: toJson(u.permissions)
        }
      });
    }
    for (const inv of invoices) {
      await tx.invoice.upsert({
        where: { id: inv.id },
        create: {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customerId: inv.customerId,
          customerName: inv.customerName,
          customerType: inv.customerType,
          customerPhone: inv.customerPhone ?? null,
          customerAddress: inv.customerAddress ?? null,
          hasFlatPriceSizeLarge: inv.hasFlatPriceSizeLarge,
          itemsJson: toJson(inv.items),
          wantsPacking: inv.wantsPacking,
          koliCount: inv.koliCount,
          packingFee: inv.packingFee,
          hasOngkir: inv.hasOngkir ?? null,
          ongkirAmount: inv.ongkirAmount ?? null,
          totalPairs: inv.totalPairs,
          subtotal: inv.subtotal,
          taxRate: inv.taxRate ?? null,
          ppnAmount: inv.ppnAmount ?? null,
          totalAmount: inv.totalAmount,
          dpAmount: inv.dpAmount ?? null,
          remainingBalance: inv.remainingBalance ?? null,
          notes: inv.notes ?? null,
          status: inv.status,
          salesmanId: inv.salesmanId ?? null,
          salesmanName: inv.salesmanName ?? null,
          commissionPerPair: inv.commissionPerPair ?? null,
          commissionStatus: inv.commissionStatus ?? null,
          paymentProofUrl: inv.paymentProofUrl ?? null,
          paymentProofUrlsJson: toJson(inv.paymentProofUrls),
          paymentsJson: toJson(inv.payments)
        },
        update: {}
      });
    }
    for (const sj of suratJalans) {
      await tx.suratJalan.upsert({
        where: { id: sj.id },
        create: {
          id: sj.id,
          suratJalanNumber: sj.suratJalanNumber,
          invoiceId: sj.invoiceId,
          invoiceNumber: sj.invoiceNumber,
          date: sj.date,
          customerId: sj.customerId,
          customerName: sj.customerName,
          customerPhone: sj.customerPhone ?? null,
          customerAddress: sj.customerAddress ?? null,
          itemsJson: toJson(sj.items),
          koliCount: sj.koliCount,
          driverName: sj.driverName ?? null,
          vehicleNumber: sj.vehicleNumber ?? null,
          status: sj.status,
          notes: sj.notes ?? null
        },
        update: {}
      });
    }
    for (const r of returns) {
      await tx.productReturn.upsert({
        where: { id: r.id },
        create: {
          id: r.id,
          returnNumber: r.returnNumber,
          date: r.date,
          invoiceId: r.invoiceId,
          invoiceNumber: r.invoiceNumber,
          customerId: r.customerId,
          customerName: r.customerName,
          itemsJson: toJson(r.items),
          totalRefundAmount: r.totalRefundAmount,
          refundType: r.refundType,
          notes: r.notes ?? null,
          status: r.status
        },
        update: {}
      });
    }
    for (const log of activityLogs) {
      await tx.activityLog.upsert({
        where: { id: log.id },
        create: {
          id: log.id,
          timestamp: log.timestamp,
          actionType: log.actionType,
          category: log.category,
          description: log.description,
          details: log.details ?? null,
          username: log.username ?? null
        },
        update: {}
      });
    }
    for (const [key, value] of Object.entries(monthlyRates)) {
      await tx.commissionMonthlyRate.upsert({
        where: { key },
        create: { key, value },
        update: {}
      });
    }
    for (const [key, value] of Object.entries(monthlyPayments)) {
      await tx.commissionMonthlyPayment.upsert({
        where: { key },
        create: { key, value },
        update: {}
      });
    }
  });
  const allInvoices = await prisma.invoice.findMany();
  for (const inv of allInvoices) {
    await syncSuratJalanForInvoice(inv);
  }
  res.json({ ok: true });
}));

// server/app.ts
var app = express();
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(express.json({ limit: "20mb" }));
var seededOnce = null;
app.use((_req, res, next) => {
  if (!seededOnce) {
    seededOnce = ensureSeeded().catch((err) => {
      seededOnce = null;
      throw err;
    });
  }
  seededOnce.then(() => next()).catch(next);
});
app.use("/api/auth", authRouter);
app.use("/api/users", requireAuth, usersRouter);
app.use("/api/customers", requireAuth, customersRouter);
app.use("/api/products", requireAuth, productsRouter);
app.use("/api/salesmen", requireAuth, salesmenRouter);
app.use("/api/invoices", requireAuth, invoicesRouter);
app.use("/api/surat-jalans", requireAuth, suratJalansRouter);
app.use("/api/returns", requireAuth, returnsRouter);
app.use("/api/settings", requireAuth, settingsRouter);
app.use("/api/activity-logs", requireAuth, activityLogsRouter);
app.use("/api/commissions", requireAuth, commissionsRouter);
app.use("/api/import-legacy", requireAuth, requireSuperAdmin, importLegacyRouter);
if (process.env.NODE_ENV === "production") {
  const distDir = path2.resolve(process.cwd(), "dist");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path2.join(distDir, "index.html"));
  });
}
app.use((err, _req, res, _next) => {
  console.error("Unhandled route error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Terjadi kesalahan pada server." });
});

// server/serverless.ts
var serverless_default = app;
export {
  serverless_default as default
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
