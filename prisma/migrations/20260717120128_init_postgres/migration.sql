-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "allowedTabsJson" TEXT,
    "permissionsJson" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hasFlatPriceSizeLarge" BOOLEAN NOT NULL,
    "enableVolumeDiscount" BOOLEAN,
    "volumeMode" TEXT,
    "customBasePrice" DOUBLE PRECISION NOT NULL,
    "customPricesJson" TEXT,
    "customTier2PricesJson" TEXT,
    "customTier3PricesJson" TEXT,
    "customTier2MinQtyJson" TEXT,
    "customTier3MinQtyJson" TEXT,
    "customSizeSurchargesJson" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "commissionRate" DOUBLE PRECISION,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultPrice" DOUBLE PRECISION NOT NULL,
    "priceTier2" DOUBLE PRECISION,
    "priceTier3" DOUBLE PRECISION,
    "customSurchargeLimit" DOUBLE PRECISION,
    "customSurchargeAmount" DOUBLE PRECISION,
    "customSurchargesJson" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Salesman" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "commissionPerPair" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Salesman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
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
    "packingFee" DOUBLE PRECISION NOT NULL,
    "hasOngkir" BOOLEAN,
    "ongkirAmount" DOUBLE PRECISION,
    "totalPairs" INTEGER NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION,
    "ppnAmount" DOUBLE PRECISION,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "dpAmount" DOUBLE PRECISION,
    "remainingBalance" DOUBLE PRECISION,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "salesmanId" TEXT,
    "salesmanName" TEXT,
    "commissionPerPair" DOUBLE PRECISION,
    "commissionStatus" TEXT,
    "paymentProofUrl" TEXT,
    "paymentProofUrlsJson" TEXT,
    "paymentsJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReturn" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "itemsJson" TEXT NOT NULL,
    "totalRefundAmount" DOUBLE PRECISION NOT NULL,
    "refundType" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL,

    CONSTRAINT "ProductReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuratJalan" (
    "id" TEXT NOT NULL,
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
    "notes" TEXT,

    CONSTRAINT "SuratJalan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "minQtyTier2" INTEGER NOT NULL,
    "discountTier2" DOUBLE PRECISION NOT NULL,
    "minQtyTier3" INTEGER NOT NULL,
    "discountTier3" DOUBLE PRECISION NOT NULL,
    "sizeSurchargeLimit" INTEGER NOT NULL,
    "sizeSurchargeAmount" DOUBLE PRECISION NOT NULL,
    "packingFeePerKoli" DOUBLE PRECISION NOT NULL,
    "ppnPercentage" DOUBLE PRECISION NOT NULL,
    "enablePpn" BOOLEAN NOT NULL,
    "warehouseTermsJson" TEXT,
    "deliveryTermsJson" TEXT,
    "companyName" TEXT,
    "companyAddress" TEXT,
    "companyPhone" TEXT,
    "companyLogoUrl" TEXT,

    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "username" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionMonthlyRate" (
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CommissionMonthlyRate_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "CommissionMonthlyPayment" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "CommissionMonthlyPayment_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "SuratJalan_invoiceId_key" ON "SuratJalan"("invoiceId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
