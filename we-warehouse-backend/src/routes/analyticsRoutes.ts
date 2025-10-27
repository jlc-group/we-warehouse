import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';

const router = Router();

/**
 * Analytics Routes
 * High-performance aggregated queries for sales analytics
 */

// GET /api/analytics/table-structure - Debug: Get table structure and sample data
router.get('/table-structure', AnalyticsController.getTableStructure);

// GET /api/analytics/products - List of products with sales data
router.get('/products', AnalyticsController.getProductList);

// GET /api/analytics/customers - List of customers with purchase data
router.get('/customers', AnalyticsController.getCustomerList);

// GET /api/analytics/product-comparison - Product sales comparison with date ranges
router.get('/product-comparison', AnalyticsController.getProductComparison);

// GET /api/analytics/customer-comparison - Customer purchase comparison with date ranges
router.get('/customer-comparison', AnalyticsController.getCustomerComparison);

// GET /api/analytics/sales-summary - Sales summary with SA, CN breakdown
router.get('/sales-summary', AnalyticsController.getSalesSummary);

// GET /api/analytics/product-forecast - Product forecast with Base Code grouping (X6, X12 multipliers)
router.get('/product-forecast', AnalyticsController.getProductForecast);

// GET /api/analytics/product-forecast-prediction - Product forecast prediction (3-month average)
router.get('/product-forecast-prediction', AnalyticsController.getProductForecastPrediction);

// GET /api/analytics/check-duplicate-codes - Check for duplicate product codes in same invoice
router.get('/check-duplicate-codes', AnalyticsController.checkDuplicateCodes);

// GET /api/analytics/check-cancelled-sales - Check cancelled sales invoices
router.get('/check-cancelled-sales', AnalyticsController.checkCancelledSales);

// GET /api/analytics/check-duplicate-docno - Check for duplicate DOCNO
router.get('/check-duplicate-docno', AnalyticsController.checkDuplicateDocno);

// GET /api/analytics/compare-calculation-methods - Compare different calculation methods
router.get('/compare-calculation-methods', AnalyticsController.compareCalculationMethods);

// GET /api/analytics/check-vat-calculation - Check VAT calculation in NETAMOUNT
router.get('/check-vat-calculation', AnalyticsController.checkVatCalculation);

// GET /api/analytics/compare-all-amount-fields - Compare all amount fields to find closest match to External API
router.get('/compare-all-amount-fields', AnalyticsController.compareAllAmountFields);

// GET /api/analytics/compare-db-vs-external - Compare DB vs External API month-by-month
router.get('/compare-db-vs-external', AnalyticsController.compareDbVsExternal);

export default router;
