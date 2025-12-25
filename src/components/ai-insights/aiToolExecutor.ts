/**
 * AI Tool Executor - ตัวจัดการเรียกใช้ Tools สำหรับ AI
 * 
 * รองรับ:
 * - Rule-based tool selection
 * - LLM function calling (OpenAI/Claude)
 * - Multi-tool execution
 */

import { aiDataProvider, AI_TOOLS, AIQueryResult } from './aiDataProvider';

// ========== TYPES ==========

export interface ToolCall {
  toolName: string;
  params: Record<string, any>;
  reason?: string;
}

export interface ToolExecutionResult {
  toolName: string;
  result: AIQueryResult<any>;
  executionTime: number;
}

export interface AIResponse {
  answer: string;
  toolsUsed: ToolExecutionResult[];
  confidence: number;
  sources: string[];
}

// ========== INTENT DETECTION ==========

const INTENT_PATTERNS = [
  // Inventory queries
  {
    patterns: [/สรุป.*คลัง/i, /ภาพรวม.*สินค้า/i, /inventory.*summary/i, /stock.*ทั้งหมด/i],
    tool: 'getInventorySummary',
    params: {}
  },
  {
    patterns: [/ค้นหา.*สินค้า/i, /หา.*สินค้า/i, /search.*product/i],
    tool: 'searchInventory',
    extractParams: (text: string) => ({
      query: text.match(/ค้นหา.*?["'](.+?)["']|หา\s+(.+?)(?:\s|$)/)?.[1] || text.split(' ').slice(-1)[0],
      limit: 10
    })
  },
  {
    patterns: [/stock.*ต่ำ/i, /สินค้า.*น้อย/i, /low.*stock/i, /ใกล้.*หมด/i],
    tool: 'getLowStockItems',
    params: { threshold: 10 }
  },
  {
    patterns: [/ตำแหน่ง/i, /โลเคชั่น/i, /location/i, /ชั้น/i, /แถว/i],
    tool: 'getLocationInfo',
    extractParams: (text: string) => {
      const locationMatch = text.match(/([A-Z]\/\d+\/\d+)|([A-Z]-\d+-\d+)|ตำแหน่ง\s*(\S+)/i);
      return { location: locationMatch?.[1] || locationMatch?.[3] || '' };
    }
  },
  {
    patterns: [/รหัส.*สินค้า/i, /sku/i, /product.*info/i, /ข้อมูล.*สินค้า/i],
    tool: 'getProductInfo',
    extractParams: (text: string) => {
      const skuMatch = text.match(/([A-Z]{2,}-[A-Z0-9-]+)|รหัส\s*(\S+)|sku\s*(\S+)/i);
      return { query: skuMatch?.[1] || skuMatch?.[2] || skuMatch?.[3] || '' };
    }
  },
  
  // Movement queries
  {
    patterns: [/การเคลื่อนไหว.*ล่าสุด/i, /recent.*movement/i, /ประวัติ.*ล่าสุด/i],
    tool: 'getRecentMovements',
    params: { limit: 20 }
  },
  {
    patterns: [/ประวัติ.*สินค้า/i, /product.*history/i, /movement.*ของ/i],
    tool: 'getProductMovements',
    extractParams: (text: string) => {
      const skuMatch = text.match(/([A-Z]{2,}-[A-Z0-9-]+)|สินค้า\s*(\S+)/i);
      return { sku: skuMatch?.[1] || skuMatch?.[2] || '' };
    }
  },
  
  // Analytics queries
  {
    patterns: [/วิเคราะห์/i, /analytics/i, /สถิติ/i, /รายงาน.*คลัง/i],
    tool: 'getInventoryAnalytics',
    params: {}
  },
  {
    patterns: [/สต็อกที่ควรมี/i, /ควรมี.*สต็อก/i, /ควรสั่ง.*สินค้า/i, /recommended.*stock/i, /แนะนำ.*สต็อก/i],
    tool: 'getRecommendedStock',
    extractParams: (text: string) => {
      const skuMatch = text.match(/([A-Z]{2,}-[A-Z0-9-]+)|สินค้า\s*(\S+)/i);
      const daysMatch = text.match(/(\d+)\s*วัน/);
      const coverageDays = daysMatch ? parseInt(daysMatch[1], 10) : 45;
      const dates = text.match(/(\d{4}-\d{2}-\d{2})/g);

      let startDate: string | undefined;
      let endDate: string | undefined;
      if (dates && dates.length >= 2) {
        startDate = dates[0];
        endDate = dates[1];
      }

      return {
        sku: skuMatch?.[1] || skuMatch?.[2] || '',
        coverageDays,
        startDate,
        endDate
      };
    }
  },
  {
    patterns: [/schema/i, /โครงสร้าง.*ตาราง/i, /ตาราง.*มี field/i, /ฟิลด์.*ในตาราง/i, /column.*ในตาราง/i],
    tool: 'getTableSchema',
    extractParams: (text: string) => {
      const tableMatch = text.match(/ตาราง\s*(\w+)/i) || text.match(/table\s*(\w+)/i);
      return {
        tableName: tableMatch?.[1] || 'inventory_items'
      };
    }
  },
  {
    patterns: [/มีตารางอะไรบ้าง/i, /schema.*ทั้งหมด/i, /overview.*schema/i, /โครงสร้างฐานข้อมูล/i],
    tool: 'getSchemaOverview',
    params: {}
  },
  {
    patterns: [/ตัวอย่าง.*ข้อมูล/i, /sample.*rows?/i, /ดูข้อมูลบางแถว/i],
    tool: 'getTableSampleRows',
    extractParams: (text: string) => {
      const tableMatch = text.match(/ตาราง\s*(\w+)/i) || text.match(/table\s*(\w+)/i);
      const limitMatch = text.match(/(\d+)\s*แถว/) || text.match(/(\d+)\s*rows?/i);
      return {
        tableName: tableMatch?.[1] || 'inventory_items',
        limit: limitMatch ? parseInt(limitMatch[1], 10) : 5
      };
    }
  },
  {
    patterns: [/ความสัมพันธ์.*ตาราง/i, /ตาราง.*เชื่อมกันยังไง/i, /relation.*table/i, /workflow.*ขาย.*คลัง.*จัดส่ง/i],
    tool: 'getSchemaOverview',
    params: {}
  },
  
  // Warehouse overview / stats
  {
    patterns: [/ภาพรวม.*คลัง/i, /ภาพรวม.*warehouse/i, /สรุป.*คลัง/i, /overview.*warehouse/i],
    tool: 'getWarehouseOverview',
    params: {}
  },
  {
    patterns: [/สถิติ.*คลัง/i, /สถิติ.*warehouse/i, /สถิติ.*คลังสินค้า/i],
    tool: 'getWarehouseStats',
    params: {}
  },

  // Sales & Finance overview
  {
    patterns: [/ภาพรวม.*ยอดขาย/i, /สรุป.*ยอดขาย/i, /dashboard.*การเงิน/i, /ยอดขายรวม/i],
    tool: 'getSalesOverview',
    extractParams: (text: string) => {
      const dates = text.match(/(\d{4}-\d{2}-\d{2})/g);
      if (dates && dates.length >= 2) {
        return { startDate: dates[0], endDate: dates[1] };
      }
      return {};
    }
  },
  {
    patterns: [
      /สินค้า.*ยอดตก/i,
      /ยอดขาย.*สินค้า.*ลดลง/i,
      /สินค้า.*ขายตก/i,
      /สินค้าไหน.*ยอด.*ตก/i,
      /สินค้าที่มียอดขายลดลง/i
    ],
    tool: 'getTopDroppingProducts',
    extractParams: (text: string) => {
      const dates = text.match(/(\d{4}-\d{2}-\d{2})/g);
      const limitMatch = text.match(/top\s*(\d+)/i) || text.match(/(\d+)\s*อันดับ/i);
      const params: Record<string, any> = {};
      if (dates && dates.length >= 2) {
        params.startDate = dates[0];
        params.endDate = dates[1];
      }
      if (limitMatch) {
        params.limit = parseInt(limitMatch[1], 10);
      }
      return params;
    }
  },
  {
    patterns: [
      /ลูกค้า.*ซื้อน้อยลง/i,
      /ลูกค้า.*ยอดซื้อ.*ลดลง/i,
      /ลูกค้า.*ยอดตก/i,
      /ลูกค้าที่ซื้อน้อยลง/i
    ],
    tool: 'getTopDroppingCustomers',
    extractParams: (text: string) => {
      const dates = text.match(/(\d{4}-\d{2}-\d{2})/g);
      const limitMatch = text.match(/top\s*(\d+)/i) || text.match(/(\d+)\s*อันดับ/i);
      const params: Record<string, any> = {};
      if (dates && dates.length >= 2) {
        params.startDate = dates[0];
        params.endDate = dates[1];
      }
      if (limitMatch) {
        params.limit = parseInt(limitMatch[1], 10);
      }
      return params;
    }
  }
];

// ========== AI TOOL EXECUTOR CLASS ==========

export class AIToolExecutor {
  private static instance: AIToolExecutor;
  
  private constructor() {}
  
  static getInstance(): AIToolExecutor {
    if (!AIToolExecutor.instance) {
      AIToolExecutor.instance = new AIToolExecutor();
    }
    return AIToolExecutor.instance;
  }
  
  /**
   * ตรวจจับ intent จากข้อความ
   */
  detectIntent(text: string): ToolCall[] {
    const detectedTools: ToolCall[] = [];
    
    for (const intent of INTENT_PATTERNS) {
      const matched = intent.patterns.some(pattern => pattern.test(text));
      
      if (matched) {
        const params = intent.extractParams 
          ? intent.extractParams(text) 
          : intent.params || {};
        
        detectedTools.push({
          toolName: intent.tool,
          params,
          reason: `Matched pattern for ${intent.tool}`
        });
      }
    }
    
    // If no specific intent detected, try general inventory summary
    if (detectedTools.length === 0) {
      // Check if it's asking about a specific product
      const skuMatch = text.match(/([A-Z]{2,}-[A-Z0-9-]+)/i);
      if (skuMatch) {
        detectedTools.push({
          toolName: 'getProductInfo',
          params: { query: skuMatch[1] },
          reason: 'Found SKU pattern in text'
        });
      }
    }
    
    return detectedTools;
  }
  
  /**
   * Execute single tool
   */
  async executeTool(toolCall: ToolCall): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const result = await aiDataProvider.executeTool(toolCall.toolName, toolCall.params);
    const executionTime = Date.now() - startTime;
    
    return {
      toolName: toolCall.toolName,
      result,
      executionTime
    };
  }
  
  /**
   * Execute multiple tools
   */
  async executeTools(toolCalls: ToolCall[]): Promise<ToolExecutionResult[]> {
    const results = await Promise.all(
      toolCalls.map(toolCall => this.executeTool(toolCall))
    );
    return results;
  }
  
  /**
   * Process user question and generate response
   */
  async processQuestion(question: string): Promise<AIResponse> {
    // 1. Detect intent and required tools
    const toolCalls = this.detectIntent(question);
    
    // 2. Execute tools
    const toolResults = await this.executeTools(toolCalls);
    
    // 3. Generate response based on tool results
    const answer = this.generateResponse(question, toolResults);
    
    return {
      answer,
      toolsUsed: toolResults,
      confidence: toolCalls.length > 0 ? 0.8 : 0.5,
      sources: toolResults.map(r => this.mapSourceToLabel(r.result.source))
    };
  }
  
  /**
   * Generate human-readable response from tool results
   */
  private generateResponse(question: string, toolResults: ToolExecutionResult[]): string {
    if (toolResults.length === 0) {
      return 'ขอโทษครับ ไม่สามารถเข้าใจคำถามได้ กรุณาลองถามใหม่ เช่น:\n' +
        '- สรุปสินค้าในคลัง\n' +
        '- ค้นหาสินค้า FG-XXX\n' +
        '- ดู stock ต่ำ\n' +
        '- วิเคราะห์ข้อมูลคลัง';
    }
    
    const responses: string[] = [];
    
    for (const toolResult of toolResults) {
      if (!toolResult.result.success) {
        responses.push(`❌ เกิดข้อผิดพลาด: ${toolResult.result.error}`);
        continue;
      }
      
      const data = toolResult.result.data;
      
      switch (toolResult.toolName) {
        case 'getInventorySummary':
          responses.push(this.formatInventorySummary(data));
          break;
          
        case 'getProductInfo':
          responses.push(this.formatProductInfo(data));
          break;
          
        case 'searchInventory':
          responses.push(this.formatSearchResults(data));
          break;
          
        case 'getLowStockItems':
          responses.push(this.formatLowStockItems(data));
          break;
          
        case 'getLocationInfo':
          responses.push(this.formatLocationInfo(data));
          break;
          
        case 'getRecentMovements':
          responses.push(this.formatMovements(data));
          break;
          
        case 'getProductMovements':
          responses.push(this.formatMovements(data));
          break;
          
        case 'getInventoryAnalytics':
          responses.push(this.formatAnalytics(data));
          break;
        
        case 'getRecommendedStock':
          responses.push(this.formatRecommendedStock(data));
          break;
        
        case 'getWarehouseStats':
          responses.push(this.formatWarehouseStats(data));
          break;

        case 'getWarehouseOverview':
          responses.push(this.formatWarehouseOverview(data));
          break;

        case 'getSalesOverview':
          responses.push(this.formatSalesOverview(data));
          break;

        case 'getTableSchema':
          responses.push(this.formatTableSchema(data));
          break;

        case 'getSchemaOverview':
          responses.push(this.formatSchemaOverview(data));
          break;

        case 'getTableSampleRows':
          responses.push(this.formatTableSampleRows(data));
          break;

        case 'getTopDroppingProducts':
          responses.push(this.formatTopDroppingProducts(data));
          break;

        case 'getTopDroppingCustomers':
          responses.push(this.formatTopDroppingCustomers(data));
          break;
        
        default:
          responses.push(`ข้อมูลจาก ${toolResult.toolName}:\n${JSON.stringify(data, null, 2)}`);
      }
    }
    
    return responses.join('\n\n---\n\n');
  }
  
  /**
   * แปลง source ภายในให้เป็น label ภาษาไทยที่อ่านง่ายสำหรับผู้ใช้
   */
  private mapSourceToLabel(source?: string): string {
    if (!source) return 'ไม่ระบุแหล่งข้อมูล';
    const key = source.toLowerCase();

    if (key.startsWith('inventory_')) {
      return 'Supabase: ข้อมูลสินค้า/สต็อก (inventory)';
    }

    if (key.startsWith('warehouses_')) {
      return 'Supabase: ข้อมูลคลังสินค้า (warehouses)';
    }

    if (key === 'analytics') {
      return 'Supabase: Analytics จาก inventory_items';
    }

    if (key.startsWith('schema_')) {
      return 'Schema Metadata: โครงสร้างฐานข้อมูล';
    }

    if (key.startsWith('samples_')) {
      return 'Supabase: ตัวอย่างข้อมูลจากตาราง';
    }

    if (key === 'recommended_stock') {
      return 'AI Analytics: คำแนะนำสต็อกที่ควรมี';
    }

    if (key === 'sales_api') {
      return 'Sales API: ยอดขาย/ลูกค้า';
    }

    if (key === 'ai_data_provider') {
      return 'AI Data Provider ภายในระบบ';
    }

    return source;
  }
  
  // ========== RESPONSE FORMATTERS ==========
  
  private formatInventorySummary(data: any): string {
    if (!data) return 'ไม่พบข้อมูล';
    
    let response = `## 📦 สรุปสินค้าในคลัง\n\n`;
    response += `- **จำนวนรายการทั้งหมด**: ${data.totalItems?.toLocaleString()} รายการ\n`;
    response += `- **จำนวนตำแหน่งที่ใช้งาน**: ${data.totalLocations?.toLocaleString()} ตำแหน่ง\n\n`;
    
    if (data.byProductType) {
      response += `### ตามประเภทสินค้า:\n`;
      for (const [type, count] of Object.entries(data.byProductType)) {
        response += `- ${type}: ${(count as number).toLocaleString()} รายการ\n`;
      }
    }
    
    if (data.lowStockItems?.length > 0) {
      response += `\n### ⚠️ สินค้า Stock ต่ำ (${data.lowStockItems.length} รายการ):\n`;
      data.lowStockItems.slice(0, 5).forEach((item: any) => {
        response += `- **${item.sku}**: ${item.quantity} ชิ้น (${item.location})\n`;
      });
    }
    
    return response;
  }
  
  private formatTableSchema(data: any): string {
    if (!data) return 'ไม่พบข้อมูลโครงสร้างตาราง';

    let response = `## 🧱 โครงสร้างตาราง ${data.name || ''}\n\n`;

    if (data.description) {
      response += `${data.description}\n\n`;
    }

    if (Array.isArray(data.columns) && data.columns.length > 0) {
      response += `### คอลัมน์หลัก\n`;
      data.columns.forEach((col: any) => {
        const nullable = col.isNullable ? ' (อนุญาตให้ว่างได้)' : '';
        const pk = col.isPrimaryKey ? ' [PK]' : '';
        const desc = col.description ? ` — ${col.description}` : '';
        response += `- **${col.name}**${pk}: ${col.type}${nullable}${desc}\n`;
      });
      response += '\n';
    }

    if (Array.isArray(data.relationships) && data.relationships.length > 0) {
      response += `### ความสัมพันธ์กับตารางอื่น\n`;
      data.relationships.forEach((rel: any) => {
        const desc = rel.description ? ` — ${rel.description}` : '';
        response += `- ${data.name}.${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}${desc}\n`;
      });
      response += '\n';
    }

    if (Array.isArray(data.sampleQuestions) && data.sampleQuestions.length > 0) {
      response += `### ตัวอย่างคำถามที่เหมาะกับตารางนี้\n`;
      data.sampleQuestions.forEach((q: string) => {
        response += `- ${q}\n`;
      });
    }

    return response.trim() || 'ไม่พบข้อมูลโครงสร้างตาราง';
  }

  private formatSchemaOverview(data: any[]): string {
    if (!data || data.length === 0) return 'ไม่พบข้อมูล schema';

    let response = '## 🧱 ภาพรวมโครงสร้างฐานข้อมูลที่ AI ใช้งานได้\n\n';

    data.forEach((table: any) => {
      response += `### ${table.name}\n`;
      if (table.description) {
        response += `${table.description}\n`;
      }

      if (Array.isArray(table.columns) && table.columns.length > 0) {
        const keyCols = table.columns.slice(0, 5).map((c: any) => c.name).join(', ');
        response += `- คอลัมน์สำคัญ: ${keyCols}\n`;
      }

      if (Array.isArray(table.relationships) && table.relationships.length > 0) {
        const relSummary = table.relationships
          .slice(0, 3)
          .map((rel: any) => `${rel.fromColumn} → ${rel.toTable}.${rel.toColumn}`)
          .join(', ');
        response += `- ความสัมพันธ์หลัก: ${relSummary}\n`;
      }

      response += '\n';
    });

    return response.trim();
  }

  private formatTopDroppingProducts(data: any): string {
    if (!data || !Array.isArray(data.products) || data.products.length === 0) {
      return '✅ ไม่พบสินค้าใดที่มียอดขายลดลงอย่างมีนัยสำคัญในช่วงที่เปรียบเทียบ';
    }

    const formatCurrency = (value: number) => {
      if (!value) return '฿0';
      return '฿' + value.toLocaleString('th-TH', { maximumFractionDigits: 0 });
    };

    const { period, products } = data;

    let response = '## 📉 สินค้าที่มียอดขายลดลงมากที่สุด\n\n';
    if (period) {
      response += `ช่วงเปรียบเทียบ:\n- ปัจจุบัน: ${period.currentStart} ถึง ${period.currentEnd}\n- ก่อนหน้า: ${period.previousStart} ถึง ${period.previousEnd}\n\n`;
    }

    products.forEach((p: any, index: number) => {
      const emoji = index === 0 ? '🔻' : index === 1 ? '⬇️' : '↘️';
      const currentSales = Number(p.currentSales || 0);
      const previousSales = Number(p.previousSales || 0);
      const growth = Number(p.growth || 0);
      const growthPercent = Number(p.growthPercent || 0);

      response += `${emoji} **${p.productName}** (${p.productCode})\n`;
      response += `- ปัจจุบัน: ${formatCurrency(currentSales)}\n`;
      response += `- ก่อนหน้า: ${formatCurrency(previousSales)}\n`;
      response += `- เปลี่ยนแปลง: ${formatCurrency(growth)} (${growthPercent.toFixed(1)}%)\n\n`;
    });

    response += '_แนะนำ: โฟกัสเช็คสต็อก ราคา และโปรโมชั่นของสินค้ากลุ่มนี้เป็นพิเศษ_';

    return response.trim();
  }

  private formatTopDroppingCustomers(data: any): string {
    if (!data || !Array.isArray(data.customers) || data.customers.length === 0) {
      return '✅ ไม่พบลูกค้าที่มียอดซื้อลดลงอย่างมีนัยสำคัญในช่วงที่เปรียบเทียบ';
    }

    const formatCurrency = (value: number) => {
      if (!value) return '฿0';
      return '฿' + value.toLocaleString('th-TH', { maximumFractionDigits: 0 });
    };

    const { period, customers } = data;

    let response = '## 👥 ลูกค้าที่มียอดซื้อลดลงมากที่สุด\n\n';
    if (period) {
      response += `ช่วงเปรียบเทียบ:\n- ปัจจุบัน: ${period.currentStart} ถึง ${period.currentEnd}\n- ก่อนหน้า: ${period.previousStart} ถึง ${period.previousEnd}\n\n`;
    }

    customers.forEach((c: any, index: number) => {
      const emoji = index === 0 ? '🔻' : index === 1 ? '⬇️' : '↘️';
      const currentPurchases = Number(c.currentPurchases || 0);
      const previousPurchases = Number(c.previousPurchases || 0);
      const growth = Number(c.growth || 0);
      const growthPercent = Number(c.growthPercent || 0);

      response += `${emoji} **${c.arname}** (${c.arcode})\n`;
      response += `- ปัจจุบัน: ${formatCurrency(currentPurchases)}\n`;
      response += `- ก่อนหน้า: ${formatCurrency(previousPurchases)}\n`;
      response += `- เปลี่ยนแปลง: ${formatCurrency(growth)} (${growthPercent.toFixed(1)}%)\n\n`;
    });

    response += '_แนะนำ: วางแผนติดต่อ/เสนอโปรพิเศษให้ลูกค้ากลุ่มนี้ เพื่อดึงยอดกลับมา_';

    return response.trim();
  }

  private formatTableSampleRows(data: any): string {
    if (!data || !Array.isArray(data.rows)) {
      return 'ไม่พบตัวอย่างข้อมูลจากตาราง';
    }

    const tableName = data.table || 'ไม่ระบุตาราง';
    let response = `## 📄 ตัวอย่างข้อมูลจากตาราง ${tableName}\n\n`;
    response += `- จำนวนแถวที่ดึงมา: ${data.rowCount}\n\n`;

    const rows = data.rows.slice(0, 5);
    rows.forEach((row: any, index: number) => {
      response += `### แถวที่ ${index + 1}\n`;
      Object.entries(row).forEach(([key, value]) => {
        const display =
          typeof value === 'object' && value !== null
            ? JSON.stringify(value)
            : String(value);
        response += `- **${key}**: ${display}\n`;
      });
      response += '\n';
    });

    if (data.rowCount > rows.length) {
      response += `_แสดงเฉพาะ ${rows.length} แถวแรกจากทั้งหมด ${data.rowCount} แถว_\n`;
    }

    return response.trim();
  }
  
  private formatRecommendedStock(data: any): string {
    if (!data) return 'ไม่สามารถคำนวณสต็อกที่แนะนำได้';

    const formatInt = (value: number) => {
      if (!value) return '0';
      return value.toLocaleString('th-TH', { maximumFractionDigits: 0 });
    };

    const hasSalesHistory = (data.totalSold || 0) > 0;
    const coverageDays = data.coverageDays || 45;

    let response = '## 📦 แนะนำสต็อกสินค้า (โหมดเน้นไม่ให้ของขาด)\n\n';

    response += `- **สินค้า**: ${data.productName || '-'} (${data.sku || '-'})\n`;

    if (data.periodStart && data.periodEnd) {
      response += `- **ช่วงยอดขายที่ใช้คำนวณ**: ${data.periodStart} ถึง ${data.periodEnd}`;
      if (data.samplesDays) {
        response += ` (รวม ${formatInt(data.samplesDays)} วัน)`;
      }
      response += '\n';
    }

    if (hasSalesHistory) {
      response += `- **ยอดขายรวมในช่วงนั้น**: ${formatInt(data.totalSold || 0)} ชิ้น\n`;
      response += `- **ยอดขายเฉลี่ยต่อวัน**: ${(data.averageDailySales || 0).toFixed(2)} ชิ้น/วัน\n\n`;
      response += `- **ต้องการเผื่อสต็อก**: ${formatInt(coverageDays)} วัน\n`;
      response += `- **วันเผื่อความปลอดภัย (safety days)**: ${formatInt(data.safetyDays || 0)} วัน\n`;
      response += `- **สต็อกเพื่อความปลอดภัย (safety stock)**: ${formatInt(data.safetyStock || 0)} ชิ้น\n\n`;
    } else {
      response += `- ⚠️ ยังไม่พบประวัติยอดขายสำหรับสินค้านี้ในช่วงเวลาที่ใช้คำนวณ\n`;
      response += `  จึงใช้สต็อกปัจจุบันเป็นจุดอ้างอิงหลัก แนะนำให้ดู trend เพิ่มเติมจากยอดขายเมื่อมีข้อมูลมากขึ้น\n\n`;
    }

    response += `- **สต็อกปัจจุบันในคลัง**: ${formatInt(data.currentStock || 0)} ชิ้น\n`;
    response += `- **สต็อกที่แนะนำให้ถือ (รวม safety)**: ${formatInt(data.recommendedStock || 0)} ชิ้น\n`;
    response += `- **จำนวนที่ควรสั่งเพิ่ม (ถ้าต้องการไม่ให้ของขาด)**: ${formatInt(data.suggestedOrderQty || 0)} ชิ้น\n\n`;

    response += `_หมายเหตุ: สูตรนี้เน้นไม่ให้ของขาด โดยใช้ยอดขายย้อนหลัง + เผื่อสต็อก ${coverageDays} วัน และเพิ่ม safety stock ตามความผันผวนของยอดขาย_`;

    return response;
  }
  
  private formatWarehouseStats(data: any[]): string {
    if (!data || data.length === 0) return 'ไม่พบสถิติคลังสินค้า';

    let response = `## 🏭 สถิติสินค้าแยกตามคลัง\n\n`;
    data.slice(0, 10).forEach((w: any) => {
      response += `### ${w.warehouseName}${w.warehouseCode ? ` (${w.warehouseCode})` : ''}\n`;
      response += `- สถานะ: ${w.isActive ? 'ใช้งานอยู่' : 'ปิดใช้งาน'}\n`;
      response += `- จำนวนรายการสินค้า: ${w.totalItems?.toLocaleString()} รายการ\n`;
      response += `- จำนวนชิ้นรวม: ${w.totalQuantity?.toLocaleString()} ชิ้น\n`;
      response += `- SKU ไม่ซ้ำ: ${w.uniqueSkus?.toLocaleString()} รายการ\n`;
      response += `- ตำแหน่งที่ใช้งาน: ${w.usedLocations?.toLocaleString()} ตำแหน่ง\n\n`;
    });

    if (data.length > 10) {
      response += `_...และอีก ${data.length - 10} คลัง_`;
    }

    return response;
  }

  private formatWarehouseOverview(data: any): string {
    if (!data) return 'ไม่พบภาพรวมคลังสินค้า';

    let response = `## 🏬 ภาพรวมคลังสินค้า\n\n`;
    response += `- **จำนวนคลังทั้งหมด**: ${data.totalWarehouses?.toLocaleString()} คลัง\n`;
    response += `- **คลังที่เปิดใช้งาน**: ${data.activeWarehouses?.toLocaleString()} คลัง\n`;
    response += `- **จำนวนรายการสินค้าในทุกคลัง**: ${data.totalItems?.toLocaleString()} รายการ\n`;
    response += `- **จำนวนชิ้นรวมทุกคลัง**: ${data.totalQuantity?.toLocaleString()} ชิ้น\n\n`;

    if (data.topWarehousesByQuantity?.length > 0) {
      response += `### 🏆 Top คลังตามจำนวนชิ้น\n`;
      data.topWarehousesByQuantity.forEach((w: any, i: number) => {
        response += `${i + 1}. **${w.warehouseName}${w.warehouseCode ? ` (${w.warehouseCode})` : ''}** - ${w.totalQuantity?.toLocaleString()} ชิ้น\n`;
      });
    }

    return response;
  }

  private formatSalesOverview(data: any): string {
    if (!data) return 'ไม่พบข้อมูลยอดขาย';

    const formatCurrency = (value: number) => {
      if (!value) return '฿0';
      return '฿' + value.toLocaleString('th-TH', { maximumFractionDigits: 0 });
    };

    const dailyTrend = Array.isArray(data.dailyTrend) ? data.dailyTrend : [];
    const hasTrend = dailyTrend.length > 0;

    let response = `## 💰 ภาพรวมยอดขายและลูกค้า\n\n`;
    response += `- **ยอดขายรวม**: ${formatCurrency(data.totalSales || 0)}\n`;
    response += `- **จำนวนออเดอร์**: ${data.orderCount?.toLocaleString('th-TH')} ออเดอร์\n`;
    response += `- **ยอดเฉลี่ยต่อออเดอร์**: ${formatCurrency(data.avgOrderValue || 0)}\n`;

    if (hasTrend) {
      const firstDay = dailyTrend[0];
      const lastDay = dailyTrend[dailyTrend.length - 1];

      let maxDay = firstDay;
      let minDay = firstDay;
      for (const day of dailyTrend) {
        if (day.amount > maxDay.amount) maxDay = day;
        if (day.amount < minDay.amount) minDay = day;
      }

      const growthPercent = firstDay.amount > 0
        ? ((lastDay.amount - firstDay.amount) / firstDay.amount) * 100
        : 0;

      response += `- **ช่วงวันที่ที่มีข้อมูล**: ${firstDay.date} ถึง ${lastDay.date}\n`;
      response += `- **วันยอดขายสูงสุด**: ${maxDay.date} (${formatCurrency(maxDay.amount)})\n`;
      response += `- **วันยอดขายต่ำสุด**: ${minDay.date} (${formatCurrency(minDay.amount)})\n`;
      response += `- **แนวโน้มปลายช่วงเทียบต้นช่วง**: ${growthPercent >= 0 ? 'ขาขึ้น' : 'ขาลง'} (${growthPercent.toFixed(1)}%)\n\n`;
    } else {
      response += '\n';
    }

    if (data.topProducts?.length) {
      response += `### 📦 Top 5 สินค้าขายดี\n`;
      data.topProducts.slice(0, 5).forEach((p: any, i: number) => {
        response += `${i + 1}. **${p.productName}** (${p.productCode}) - ${formatCurrency(p.totalSales || 0)} | ${
          p.quantity?.toLocaleString('th-TH')
        } ชิ้น\n`;
      });
      response += '\n';
    }

    if (data.topCustomers?.length) {
      response += `### 👥 Top 5 ลูกค้า\n`;
      data.topCustomers.slice(0, 5).forEach((c: any, i: number) => {
        response += `${i + 1}. **${c.arname}** (${c.arcode}) - ${formatCurrency(c.totalPurchases || 0)}\n`;
      });
    }

    return response;
  }
  
  private formatProductInfo(data: any[]): string {
    if (!data || data.length === 0) return 'ไม่พบข้อมูลสินค้า';
    
    let response = `## 🔍 ข้อมูลสินค้า (${data.length} รายการ)\n\n`;
    
    data.slice(0, 5).forEach(product => {
      response += `### ${product.sku}\n`;
      response += `- **ชื่อ**: ${product.productName}\n`;
      response += `- **Stock รวม**: ${product.totalStock?.toLocaleString()} ชิ้น\n`;
      response += `- **ตำแหน่ง**: ${product.locations?.length || 0} ตำแหน่ง\n`;
      
      if (product.locations?.length > 0) {
        response += `  - ${product.locations.slice(0, 3).map((l: any) => `${l.location}: ${l.quantity}`).join(', ')}`;
        if (product.locations.length > 3) response += ` ...และอีก ${product.locations.length - 3} ตำแหน่ง`;
        response += '\n';
      }
      response += '\n';
    });
    
    if (data.length > 5) {
      response += `\n_...และอีก ${data.length - 5} รายการ_`;
    }
    
    return response;
  }
  
  private formatSearchResults(data: any[]): string {
    if (!data || data.length === 0) return 'ไม่พบผลลัพธ์การค้นหา';
    
    let response = `## 🔎 ผลการค้นหา (${data.length} รายการ)\n\n`;
    response += `| SKU | ชื่อสินค้า | ตำแหน่ง | จำนวน |\n`;
    response += `|-----|-----------|---------|-------|\n`;
    
    data.slice(0, 10).forEach(item => {
      response += `| ${item.sku} | ${item.product_name?.substring(0, 20) || '-'} | ${item.location} | ${item.unit_level3_quantity} |\n`;
    });
    
    return response;
  }
  
  private formatLowStockItems(data: any[]): string {
    if (!data || data.length === 0) return '✅ ไม่มีสินค้า Stock ต่ำ';
    
    let response = `## ⚠️ สินค้า Stock ต่ำ (${data.length} รายการ)\n\n`;
    
    data.forEach(item => {
      const emoji = item.unit_level3_quantity < 5 ? '🔴' : '🟡';
      response += `${emoji} **${item.sku}**: ${item.unit_level3_quantity} ชิ้น\n`;
      response += `   - ${item.product_name}\n`;
      response += `   - ตำแหน่ง: ${item.location}\n\n`;
    });
    
    return response;
  }
  
  private formatLocationInfo(data: any[]): string {
    if (!data || data.length === 0) return 'ไม่พบข้อมูลในตำแหน่งนี้';
    
    const location = data[0]?.location || 'Unknown';
    let response = `## 📍 ตำแหน่ง: ${location}\n\n`;
    response += `**จำนวนสินค้า**: ${data.length} รายการ\n\n`;
    
    data.forEach(item => {
      response += `- **${item.sku}**: ${item.unit_level3_quantity} ชิ้น\n`;
      response += `  ${item.product_name || ''}\n`;
    });
    
    return response;
  }
  
  private formatMovements(data: any[]): string {
    if (!data || data.length === 0) return 'ไม่พบประวัติการเคลื่อนไหว';
    
    let response = `## 📋 ประวัติการเคลื่อนไหว (${data.length} รายการ)\n\n`;
    
    data.slice(0, 10).forEach(movement => {
      const actionEmoji = movement.action === 'add' ? '➕' : 
                         movement.action === 'remove' ? '➖' : 
                         movement.action === 'transfer' ? '🔄' : '📝';
      const date = new Date(movement.timestamp).toLocaleString('th-TH');
      
      response += `${actionEmoji} **${movement.sku}** - ${movement.action}\n`;
      response += `   จำนวน: ${Math.abs(movement.quantity)} | ตำแหน่ง: ${movement.location}\n`;
      response += `   เวลา: ${date}\n\n`;
    });
    
    return response;
  }
  
  private formatAnalytics(data: any): string {
    if (!data) return 'ไม่สามารถวิเคราะห์ข้อมูลได้';
    
    let response = `## 📊 การวิเคราะห์ข้อมูลคลัง\n\n`;
    
    response += `### สถิติพื้นฐาน\n`;
    response += `- **รายการทั้งหมด**: ${data.totalItems?.toLocaleString()}\n`;
    response += `- **SKU ไม่ซ้ำ**: ${data.uniqueSkus?.toLocaleString()}\n`;
    response += `- **ตำแหน่งที่ใช้งาน**: ${data.occupiedLocations?.toLocaleString()}\n`;
    response += `- **เฉลี่ยสินค้า/ตำแหน่ง**: ${data.summary?.averageItemsPerLocation?.toFixed(2)}\n\n`;
    
    if (data.topProductsByQuantity?.length > 0) {
      response += `### 🏆 Top 5 สินค้า (ตามจำนวน)\n`;
      data.topProductsByQuantity.slice(0, 5).forEach((p: any, i: number) => {
        response += `${i + 1}. **${p.sku}**: ${p.total.toLocaleString()} ชิ้น\n`;
      });
    }
    
    return response;
  }
  
  /**
   * Get available tools list
   */
  getAvailableTools(): typeof AI_TOOLS {
    return AI_TOOLS;
  }
}

// Export singleton
export const aiToolExecutor = AIToolExecutor.getInstance();




