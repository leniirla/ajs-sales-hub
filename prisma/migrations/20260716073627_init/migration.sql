-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "allowedTabsJson" TEXT,
    "permissionsJson" TEXT
);

-- CreateTable
CREATE TABLE "Session" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hasFlatPriceSizeLarge" BOOLEAN NOT NULL,
    "enableVolumeDiscount" BOOLEAN,
    "volumeMode" TEXT,
    "customBasePrice" REAL NOT NULL,
    "customPricesJson" TEXT,
    "customTier2PricesJson" TEXT,
    "customTier3PricesJson" TEXT,
    "customTier2MinQtyJson" TEXT,
    "customTier3MinQtyJson" TEXT,
    "customSizeSurchargesJson" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "commissionRate" REAL
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "defaultPrice" REAL NOT NULL,
    "priceTier2" REAL,
    "priceTier3" REAL,
    "customSurchargeLimit" REAL,
    "customSurchargeAmount" REAL,
    "customSurchargesJson" TEXT
);

-- CreateTable
CREATE TABLE "Salesman" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "commissionPerPair" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerType" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "hasFlatPriceSizeLarge" BOOLEAN NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "wantsPacking" BOOLEAN NOT NULL,
    "koliCount" INTEGER NOT NULL,
    "packingFee" REAL NOT NULL,
    "hasOngkir" BOOLEAN,
    "ongkirAmount" REAL,
    "totalPairs" INTEGER NOT NULL,
    "subtotal" REAL NOT NULL,
    "taxRate" REAL,
    "ppnAmount" REAL,
    "totalAmount" REAL NOT NULL,
    "dpAmount" REAL,
    "remainingBalance" REAL,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "salesmanId" TEXT,
    "salesmanName" TEXT,
    "commissionPerPair" REAL,
    "commissionStatus" TEXT,
    "paymentProofUrl" TEXT,
    "paymentProofUrlsJson" TEXT,
    "paymentsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProductReturn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "returnNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "totalRefundAmount" REAL NOT NULL,
    "refundType" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SuratJalan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "suratJalanNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "itemsJson" TEXT NOT NULL,
    "koliCount" INTEGER NOT NULL,
    "driverName" TEXT,
    "vehicleNumber" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "minQtyTier2" INTEGER NOT NULL,
    "discountTier2" REAL NOT NULL,
    "minQtyTier3" INTEGER NOT NULL,
    "discountTier3" REAL NOT NULL,
    "sizeSurchargeLimit" INTEGER NOT NULL,
    "sizeSurchargeAmount" REAL NOT NULL,
    "packingFeePerKoli" REAL NOT NULL,
    "ppnPercentage" REAL NOT NULL,
    "enablePpn" BOOLEAN NOT NULL,
    "warehouseTermsJson" TEXT,
    "deliveryTermsJson" TEXT,
    "companyName" TEXT,
    "companyAddress" TEXT,
    "companyPhone" TEXT,
    "companyLogoUrl" TEXT
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "username" TEXT
);

-- CreateTable
CREATE TABLE "CommissionMonthlyRate" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "CommissionMonthlyPayment" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "SuratJalan_invoiceId_key" ON "SuratJalan"("invoiceId");
