import { getConnection, sql } from '../config/database.js';
import { CSSale, CSSaleSub, SalesOrderResponse, SalesLineItemResponse, PackingListResponse } from '../types/sales.types.js';
import { StockCardRow, StockCardQueryParams } from '../types/stock.types.js';

export class SQLServerService {
  /**
   * Fetch all sales orders with optional filtering
   */
  static async fetchSalesOrders(params?: {
    startDate?: string;
    endDate?: string;
    arcode?: string;
    docstatus?: string;
    limit?: number;
    offset?: number;
  }): Promise<SalesOrderResponse[]> {
    try {
      const pool = await getConnection();
      let query = `
        SELECT
          DOCNO, DOCDATE, TAXNO, ARCODE, ARNAME, TOTALAMOUNT
        FROM CSSALE
        WHERE 1=1
      `;

      const request = pool.request();

      // Apply filters
      if (params?.startDate) {
        query += ' AND DOCDATE >= @startDate';
        request.input('startDate', sql.DateTime, new Date(params.startDate));
      }

      if (params?.endDate) {
        query += ' AND DOCDATE <= @endDate';
        request.input('endDate', sql.DateTime, new Date(params.endDate));
      }

      if (params?.arcode) {
        query += ' AND ARCODE = @arcode';
        request.input('arcode', sql.VarChar, params.arcode);
      }

      // Note: DOCSTATUS column removed - doesn't exist in CSSALE table
      // if (params?.docstatus) {
      //   query += ' AND DOCSTATUS = @docstatus';
      //   request.input('docstatus', sql.VarChar, params.docstatus);
      // }

      // Enforce default pagination to prevent unbounded queries
      const safeLimit = Math.min(Math.max(params?.limit ?? 200, 1), 5000);
      const safeOffset = Math.max(params?.offset ?? 0, 0);

      // Order by date descending with pagination
      query += ' ORDER BY DOCDATE DESC, DOCNO DESC';
      query += ' OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';

      request.input('limit', sql.Int, safeLimit);
      request.input('offset', sql.Int, safeOffset);

      const result = await request.query<CSSale>(query);

      return result.recordset.map(row => ({
        docno: row.DOCNO,
        docdate: row.DOCDATE ? row.DOCDATE.toISOString() : null,
        taxno: row.TAXNO,
        arcode: row.ARCODE,
        arname: row.ARNAME,
        totalamount: row.TOTALAMOUNT,
      }));
    } catch (error) {
      console.error('Error fetching sales orders:', error);
      throw error;
    }
  }

  /**
   * Fetch stock card (inventory ledger) movements from CSSTOCKCARD
   */
  static async fetchStockCard(params?: StockCardQueryParams): Promise<StockCardRow[]> {
    try {
      const pool = await getConnection();
      const request = pool.request();

      const selectFields = `
        CREATEUSER, UPDATEUSER, SYSCREATE, SYSUPDATE, CLOSEFLAG,
        STKCARD_CALC, STKQTY_CALC, DOCGROUP, TRANSID, TABLENAME,
        STKTIME, MYSORT, AUTOID, TRANSTYPE, DOCDATE, DOCNO, TAXNO,
        LINEID, APCODE, ARCODE, REFLINEID, REFDOCNO, PRODUCTCODE,
        WAREHOUSE, LOCATION, WAREHOUSEREF, LOCATIONREF, UNITQTY2,
        INQTY, INCOST, INAMOUNT, OUTQTY, OUTCOST, OUTAMOUNT,
        BALQTY, BALCOST, BALAMOUNT, INOUTFLAG, SYSDOCFLAG
      `;

      let query = `
        SELECT
          ${selectFields}
        FROM CSSTOCKCARD
        WHERE 1=1
      `;

      if (params?.productCode) {
        query += ' AND PRODUCTCODE = @productCode';
        request.input('productCode', sql.VarChar, params.productCode);
      }

      if (params?.warehouse) {
        query += ' AND WAREHOUSE = @warehouse';
        request.input('warehouse', sql.VarChar, params.warehouse);
      }

      if (params?.location) {
        query += ' AND LOCATION = @location';
        request.input('location', sql.VarChar, params.location);
      }

      if (params?.docgroup) {
        query += ' AND DOCGROUP = @docgroup';
        request.input('docgroup', sql.VarChar, params.docgroup);
      }

      if (params?.transtype) {
        query += ' AND TRANSTYPE = @transtype';
        request.input('transtype', sql.VarChar, params.transtype);
      }

      if (params?.fromDate) {
        query += ' AND DOCDATE >= @fromDate';
        request.input('fromDate', sql.DateTime, new Date(params.fromDate));
      }

      if (params?.toDate) {
        // inclusive end-date
        query += ' AND DOCDATE < DATEADD(DAY, 1, @toDate)';
        request.input('toDate', sql.DateTime, new Date(params.toDate));
      }

      // Base ordering (oldest to newest)
      query += ' ORDER BY DOCDATE, STKTIME, DOCNO, ISNULL(LINEID, 0), AUTOID';

      // Enforce default pagination
      const safeLimit = Math.min(Math.max(params?.limit ?? 500, 1), 5000);
      request.input('limit', sql.Int, safeLimit);
      query += ' OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY';

      const result = await request.query<StockCardRow>(query);
      return result.recordset as unknown as StockCardRow[];
    } catch (error) {
      console.error('Error fetching stock card:', error);
      throw error;
    }
  }

  /**
   * Fetch single sales order by DOCNO with line items
   */
  static async fetchSalesOrderById(docno: string, limit?: number): Promise<SalesOrderResponse | null> {
    try {
      const pool = await getConnection();

      // Fetch header
      const headerResult = await pool
        .request()
        .input('docno', sql.VarChar, docno)
        .query<CSSale>(`
          SELECT * FROM CSSALE WHERE DOCNO = @docno
        `);

      if (headerResult.recordset.length === 0) {
        return null;
      }

      const header = headerResult.recordset[0];

      // Fetch line items with enforced pagination
      const safeLimitDetail = Math.min(Math.max(limit ?? 1000, 1), 5000);
      const itemsRequest = pool
        .request()
        .input('docno', sql.VarChar, docno)
        .input('limit', sql.Int, safeLimitDetail);

      const itemsResult = await itemsRequest.query<CSSaleSub>(`
          SELECT * FROM CSSALESUB
          WHERE DOCNO = @docno
          ORDER BY LINEID
          OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `);

      const items: SalesLineItemResponse[] = itemsResult.recordset.map(item => ({
        lineid: item.LINEID,
        productcode: item.PRODUCTCODE,
        productname: item.PRODUCTNAME,
        quantity: item.QUANTITY,
        unitname: item.UNITNAME,
        unitprice: item.UNITPRICE,
        netamount: item.NETAMOUNT,
      }));

      return {
        docno: header.DOCNO,
        docdate: header.DOCDATE ? header.DOCDATE.toISOString() : null,
        taxno: header.TAXNO,
        arcode: header.ARCODE,
        arname: header.ARNAME,
        totalamount: header.TOTALAMOUNT,
        items,
      };
    } catch (error) {
      console.error('Error fetching sales order by ID:', error);
      throw error;
    }
  }

  /**
   * Fetch line items for a specific document
   */
  static async fetchSalesLineItems(docno: string, limit?: number): Promise<SalesLineItemResponse[]> {
    try {
      const pool = await getConnection();

      const safeLimit = Math.min(Math.max(limit ?? 1000, 1), 5000);

      const request = pool
        .request()
        .input('docno', sql.VarChar, docno)
        .input('limit', sql.Int, safeLimit);

      const result = await request.query<CSSaleSub>(`
          SELECT
            LINEID, PRODUCTCODE, PRODUCTNAME,
            QUANTITY, UNITNAME, UNITPRICE, NETAMOUNT,
            WHCODE, LOCATIONCODE
          FROM CSSALESUB
          WHERE DOCNO = @docno
          ORDER BY LINEID
          OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
        `);

      return result.recordset.map(item => ({
        lineid: item.LINEID,
        productcode: item.PRODUCTCODE,
        productname: item.PRODUCTNAME,
        quantity: item.QUANTITY,
        unitname: item.UNITNAME,
        unitprice: item.UNITPRICE,
        netamount: item.NETAMOUNT,
      }));
    } catch (error) {
      console.error('Error fetching sales line items:', error);
      throw error;
    }
  }

  /**
   * Generate packing list for warehouse
   */
  static async fetchPackingList(params?: {
    taxDate?: string;
    docstatus?: string;
    limit?: number;
  }): Promise<PackingListResponse[]> {
    try {
      const pool = await getConnection();
      const request = pool.request();

      // Query headers
      let headerQuery = `
        SELECT
          s.TAXNO, s.TAXDATE, s.DOCNO, s.DOCDATE, s.ARCODE, s.ARNAME, s.TOTALAMOUNT, s.CLOSEFLAG
        FROM CSSALE s
        WHERE 1=1
      `;

      if (params?.taxDate) {
        headerQuery += ' AND CAST(s.TAXDATE AS DATE) = @taxDate';
        request.input('taxDate', sql.Date, params.taxDate);
      }

      if (params?.docstatus) {
        headerQuery += ' AND s.DOCSTATUS = @docstatus';
        request.input('docstatus', sql.VarChar, params.docstatus);
      }

      // Enforce default pagination to prevent unbounded queries
      const safeLimit = Math.min(Math.max(params?.limit ?? 500, 1), 5000);

      headerQuery += ' ORDER BY s.TAXNO, s.DOCNO';
      headerQuery += ' OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY';

      request.input('limit', sql.Int, safeLimit);

      const headerResult = await request.query(headerQuery);
      
      // For each order, get items
      const packingList: any[] = [];
      
      for (const header of headerResult.recordset) {
        const itemsRequest = pool.request();
        itemsRequest.input('docno', sql.VarChar, header.DOCNO);
        
        const itemsResult = await itemsRequest.query(`
          SELECT LINEID, PRODUCTCODE, PRODUCTNAME, QUANTITY, UNITNAME as UNIT
          FROM CSSALESUB
          WHERE DOCNO = @docno
          ORDER BY LINEID
        `);
        
        packingList.push({
          TAXNO: header.TAXNO,
          TAXDATE: header.TAXDATE ? header.TAXDATE.toISOString() : null,
          DOCNO: header.DOCNO,
          DOCDATE: header.DOCDATE ? header.DOCDATE.toISOString() : null,
          ARCODE: header.ARCODE,
          ARNAME: header.ARNAME,
          TOTALAMOUNT: header.TOTALAMOUNT,
          CLOSEFLAG: header.CLOSEFLAG,
          ITEM_COUNT: itemsResult.recordset.length,
          ITEMS: itemsResult.recordset.map((item: any) => ({
            LINEID: item.LINEID,
            PRODUCTCODE: item.PRODUCTCODE,
            PRODUCTNAME: item.PRODUCTNAME,
            QUANTITY: item.QUANTITY,
            UNIT: item.UNIT || '-',
          })),
        });
      }

      return packingList;
    } catch (error) {
      console.error('Error fetching packing list:', error);
      throw error;
    }
  }

  /**
   * Health check - test database connection
   */
  static async healthCheck(): Promise<{ status: string; database: string }> {
    try {
      const pool = await getConnection();
      await pool.request().query('SELECT 1 AS test');

      return {
        status: 'connected',
        database: process.env.DB_DATABASE || 'unknown',
      };
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}
