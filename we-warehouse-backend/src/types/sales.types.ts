/**
 * TypeScript types for CSSALE and CSSALESUB tables
 * Generated from SQL Server External Database: JHCSMILE
 */

/**
 * CSSALE - Sales Document Header
 * Primary Key: DOCNO
 */
export interface CSSale {
  DOCNO: string; // Primary Key - เลขที่เอกสาร
  DOCDATE: Date | null; // วันที่เอกสาร
  TAXDATE: Date | null; // วันที่ใบกำกับภาษี
  TAXNO: string | null; // เลขที่ใบกำกับภาษี
  ARCODE: string | null; // รหัสลูกค้า
  ARNAME: string | null; // ชื่อลูกค้า
  ADDRESS1: string | null;
  ADDRESS2: string | null;
  PROVINCE: string | null;
  ZIPCODE: string | null;
  TELEPHONE: string | null;
  FAX: string | null;
  TAXID: string | null; // เลขผู้เสียภาษี
  CONTACT: string | null;
  CREDITDAY: number | null;
  DUEDATE: Date | null;
  PROJECTCODE: string | null;
  PROJECTNAME: string | null;
  REFNO: string | null; // เลขที่อ้างอิง
  REFDATE: Date | null;
  VATTYPE: string | null; // ประเภทภาษี
  VATRATE: number | null; // อัตราภาษี
  BEFOREVAT: number | null; // ราคาก่อน VAT
  VATAMOUNT: number | null; // จำนวน VAT
  TOTALAMOUNT: number | null; // ยอดรวมทั้งหมด
  DISCOUNT: number | null;
  DISCOUNTTYPE: string | null;
  DISCOUNTAMOUNT: number | null;
  NETAMOUNT: number | null; // ยอดสุทธิ
  PAYMENTTYPE: string | null; // ประเภทการชำระเงิน
  PAYMENTDATE: Date | null;
  PAYMENTAMOUNT: number | null;
  PAYMENTREF: string | null;
  BANKCODE: string | null;
  BANKNAME: string | null;
  BRANCHCODE: string | null;
  BRANCHNAME: string | null;
  ACCOUNTNO: string | null;
  ACCOUNTNAME: string | null;
  CHEQUENO: string | null;
  CHEQUEDATE: Date | null;
  CHEQUEBANK: string | null;
  CHEQUEBRANCH: string | null;
  CREDITCARDNO: string | null;
  CREDITCARDTYPE: string | null;
  CREDITCARDEXPIRE: string | null;
  APPROVALCODE: string | null;
  REMARK1: string | null;
  REMARK2: string | null;
  REMARK3: string | null;
  SALECODE: string | null; // รหัสพนักงานขาย
  SALENAME: string | null; // ชื่อพนักงานขาย
  DEPTCODE: string | null;
  DEPTNAME: string | null;
  WHCODE: string | null; // รหัสคลังสินค้า
  WHNAME: string | null; // ชื่อคลังสินค้า
  DOCSTATUS: string | null; // สถานะเอกสาร
  CANCELREASON: string | null;
  CANCELDATE: Date | null;
  CANCELBY: string | null;
  PRINTCOUNT: number | null;
  PRINTDATE: Date | null;
  PRINTBY: string | null;
  CREATEDATE: Date | null;
  CREATEBY: string | null;
  UPDATEDATE: Date | null;
  UPDATEBY: string | null;
  APPROVEDATE: Date | null;
  APPROVEBY: string | null;
  POSTDATE: Date | null;
  POSTBY: string | null;
  SHIPDATE: Date | null; // วันที่จัดส่ง
  SHIPBY: string | null;
  SHIPADDRESS1: string | null;
  SHIPADDRESS2: string | null;
  SHIPPROVINCE: string | null;
  SHIPZIPCODE: string | null;
  SHIPTELEPHONE: string | null;
  SHIPCONTACT: string | null;
  TRANSPORTCODE: string | null;
  TRANSPORTNAME: string | null;
  VEHICLECODE: string | null;
  VEHICLENAME: string | null;
  DRIVERCODE: string | null;
  DRIVERNAME: string | null;
  FREIGHT: number | null;
  INSURANCE: number | null;
  PACKAGING: number | null;
  SERVICE: number | null;
  OTHER: number | null;
  WITHHOLDTAX: number | null;
  WITHHOLDTAXRATE: number | null;
  WITHHOLDTAXAMOUNT: number | null;
  PAIDAMOUNT: number | null;
  REMAINAMOUNT: number | null;
  BALANCEAMOUNT: number | null;
  CURRENCY: string | null;
  EXCHANGERATE: number | null;
  TOTALFOREIGN: number | null;
  NETFOREIGN: number | null;
  COSTAMOUNT: number | null;
  PROFIT: number | null;
  PROFITPERCENT: number | null;
  WEIGHT: number | null;
  VOLUME: number | null;
  PACKAGE: number | null;
  SOCODE: string | null; // Sales Order Code
  SONO: string | null; // Sales Order Number
  SODATE: Date | null;
  POCODE: string | null;
  PONO: string | null; // Purchase Order Number
  PODATE: Date | null;
  DOCODE: string | null;
  DONO: string | null; // Delivery Order Number
  DODATE: Date | null;
  INVOICECODE: string | null;
  INVOICENO: string | null;
  INVOICEDATE: Date | null;
  RECEIPTCODE: string | null;
  RECEIPTNO: string | null;
  RECEIPTDATE: Date | null;
  BILLINGCODE: string | null;
  BILLINGNO: string | null;
  BILLINGDATE: Date | null;
  CNCODE: string | null;
  CNNO: string | null; // Credit Note Number
  CNDATE: Date | null;
  DNCODE: string | null;
  DNNO: string | null; // Debit Note Number
  DNDATE: Date | null;
  RUNNINGNO: number | null;
  YEARMONTH: string | null;
  FISCALYEAR: string | null;
  PERIOD: string | null;
  QUARTERPERIOD: string | null;
  COMPANYCODE: string | null;
  COMPANYNAME: string | null;
  BRCODE: string | null;
  BRNAME: string | null;
  AREACODE: string | null;
  AREANAME: string | null;
  REGIONCODE: string | null;
  REGIONNAME: string | null;
  COUNTRYCODE: string | null;
  COUNTRYNAME: string | null;
  TEMPLATE: string | null;
  FORM: string | null;
  REPORT: string | null;
  ACTIVE: string | null;
  FLAG1: string | null;
  FLAG2: string | null;
  FLAG3: string | null;
  FLAG4: string | null;
  FLAG5: string | null;
  NUMBER1: number | null;
  NUMBER2: number | null;
  NUMBER3: number | null;
  NUMBER4: number | null;
  NUMBER5: number | null;
  DATE1: Date | null;
  DATE2: Date | null;
  DATE3: Date | null;
  DATE4: Date | null;
  DATE5: Date | null;
  TEXT1: string | null;
  TEXT2: string | null;
  TEXT3: string | null;
  TEXT4: string | null;
  TEXT5: string | null;
}

/**
 * CSSALESUB - Sales Line Items
 * Composite Key: DOCNO + LINEID
 * Foreign Key: DOCNO → CSSALE.DOCNO
 */
export interface CSSaleSub {
  DOCNO: string; // Foreign Key - เลขที่เอกสาร
  LINEID: number; // Part of composite key - ลำดับบรรทัด
  PRODUCTCODE: string | null; // รหัสสินค้า
  PRODUCTNAME: string | null; // ชื่อสินค้า
  PRODUCTDESC: string | null;
  PRODUCTTYPE: string | null;
  PRODUCTGROUP: string | null;
  PRODUCTCATEGORY: string | null;
  PRODUCTBRAND: string | null;
  PRODUCTMODEL: string | null;
  PRODUCTSIZE: string | null;
  PRODUCTCOLOR: string | null;
  BARCODE: string | null;
  SERIALNO: string | null;
  LOTNO: string | null;
  EXPIREDATE: Date | null;
  QUANTITY: number | null; // จำนวน
  UNITCODE: string | null; // รหัสหน่วย
  UNITNAME: string | null; // ชื่อหน่วย
  UNITRATE: number | null;
  BASEQTY: number | null;
  BASEUNIT: string | null;
  UNITPRICE: number | null; // ราคาต่อหน่วย
  DISCOUNT: number | null;
  DISCOUNTTYPE: string | null;
  DISCOUNTAMOUNT: number | null;
  BEFOREVAT: number | null;
  VATTYPE: string | null;
  VATRATE: number | null;
  VATAMOUNT: number | null;
  TOTALAMOUNT: number | null;
  NETAMOUNT: number | null; // ยอดสุทธิ
  COSTPRICE: number | null;
  COSTAMOUNT: number | null;
  PROFIT: number | null;
  PROFITPERCENT: number | null;
  WEIGHT: number | null;
  VOLUME: number | null;
  PACKAGE: number | null;
  WHCODE: string | null; // รหัสคลังสินค้า
  WHNAME: string | null;
  LOCATIONCODE: string | null; // รหัสตำแหน่ง
  LOCATIONNAME: string | null;
  BINCODE: string | null;
  BINNAME: string | null;
  REMARK: string | null;
  PROJECTCODE: string | null;
  PROJECTNAME: string | null;
  ACTIVITYCODE: string | null;
  ACTIVITYNAME: string | null;
  JOBCODE: string | null;
  JOBNAME: string | null;
  REFNO: string | null;
  REFLINEID: number | null;
  SOCODE: string | null;
  SONO: string | null;
  SOLINEID: number | null;
  POCODE: string | null;
  PONO: string | null;
  POLINEID: number | null;
  DOCODE: string | null;
  DONO: string | null;
  DOLINEID: number | null;
  INVOICECODE: string | null;
  INVOICENO: string | null;
  INVOICELINEID: number | null;
  RECEIPTCODE: string | null;
  RECEIPTNO: string | null;
  RECEIPTLINEID: number | null;
  EXCHANGERATE: number | null;
  FOREIGNPRICE: number | null;
  FOREIGNAMOUNT: number | null;
  FOREIGNNETAMOUNT: number | null;
  COMMISSIONRATE: number | null;
  COMMISSIONAMOUNT: number | null;
  TAXCODE: string | null;
  TAXNAME: string | null;
  TAXRATE: number | null;
  TAXAMOUNT: number | null;
  ACTIVE: string | null;
  FLAG1: string | null;
  FLAG2: string | null;
  FLAG3: string | null;
  NUMBER1: number | null;
  NUMBER2: number | null;
  NUMBER3: number | null;
  DATE1: Date | null;
  DATE2: Date | null;
  DATE3: Date | null;
  TEXT1: string | null;
  TEXT2: string | null;
  TEXT3: string | null;
}

/**
 * API Response types
 */
export interface SalesOrderResponse {
  docno: string;
  docdate: string | null;
  taxno: string | null;
  arcode: string | null;
  arname: string | null;
  totalamount: number | null;
  docstatus: string | null;
  items?: SalesLineItemResponse[];
}

export interface SalesLineItemResponse {
  lineid: number;
  productcode: string | null;
  productname: string | null;
  quantity: number | null;
  unitname: string | null;
  unitprice: number | null;
  netamount: number | null;
}

export interface PackingListResponse {
  docno: string;
  docdate: string | null;
  arname: string | null;
  items: Array<{
    productcode: string | null;
    productname: string | null;
    quantity: number | null;
    unitname: string | null;
  }>;
}
