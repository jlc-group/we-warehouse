/**
 * Types for CSSTOCKCARD (Stock Card / Inventory Ledger)
 */

export interface StockCardRow {
  CREATEUSER: string | null;
  UPDATEUSER: string | null;
  SYSCREATE: Date | null;
  SYSUPDATE: Date | null;
  CLOSEFLAG: number | string | null;
  STKCARD_CALC: number | string | null;
  STKQTY_CALC: number | string | null;
  DOCGROUP: string | null;
  TRANSID: string | null;
  TABLENAME: string | null;
  STKTIME: string | Date | null;
  MYSORT: number | null;
  AUTOID: number | null;
  TRANSTYPE: string | null;
  DOCDATE: Date | null;
  DOCNO: string | null;
  TAXNO: string | null;
  LINEID: number | null;
  APCODE: string | null;
  ARCODE: string | null;
  REFLINEID: number | null;
  REFDOCNO: string | null;
  PRODUCTCODE: string | null;
  WAREHOUSE: string | null;
  LOCATION: string | null;
  WAREHOUSEREF: string | null;
  LOCATIONREF: string | null;
  UNITQTY2: number | null;
  INQTY: number | null;
  INCOST: number | null;
  INAMOUNT: number | null;
  OUTQTY: number | null;
  OUTCOST: number | null;
  OUTAMOUNT: number | null;
  BALQTY: number | null;
  BALCOST: number | null;
  BALAMOUNT: number | null;
  INOUTFLAG: string | number | null;
  SYSDOCFLAG: string | number | null;
  CALCULATED_BALANCE?: number; // ยอดคงเหลือที่คำนวณจาก IN - OUT (เพิ่มโดย backend)
}

export interface StockCardQueryParams {
  productCode?: string;
  warehouse?: string;
  location?: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
  docgroup?: string;
  transtype?: string;
  limit?: number;
}
