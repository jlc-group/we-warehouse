/**
 * AI Chat Engine - รองรับทั้ง Rule-based และ LLM
 * 
 * Features:
 * - Rule-based responses (ไม่ต้อง API)
 * - LLM Integration ready (OpenAI/Claude)
 * - Context-aware (ใช้ข้อมูลจริง)
 * - Thai language support
 */

import { SCHEMA_METADATA, TableMeta } from './aiSchemaMetadata';

// ========== TYPES ==========

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  data?: any; // ข้อมูลเพิ่มเติมสำหรับแสดงผล
  sources?: string[]; // แหล่งข้อมูลที่ใช้
}

export interface QuickQuestion {
  id: string;
  question: string;
  category: 'sales' | 'product' | 'customer' | 'trend' | 'general';
  icon: string;
}

export interface SalesContext {
  totalSales: number;
  orderCount: number;
  topProducts: Array<{
    productCode: string;
    productName: string;
    totalSales: number;
    totalQuantity: number;
  }>;
  topCustomers: Array<{
    arcode: string;
    arname: string;
    totalPurchases: number;
    orderCount: number;
  }>;
  dailySales: Array<{
    date: string;
    amount: number;
  }>;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentChange: number;
  };
}

export interface LLMConfig {
  provider: 'openai' | 'claude' | 'none' | 'ollama';
  apiKey?: string;
  model?: string;
  maxTokens?: number;
}

export interface ChatEngineConfig {
  llmConfig: LLMConfig;
  context: SalesContext;
  language: 'th' | 'en';
}

// ========== QUICK QUESTIONS ==========

export const QUICK_QUESTIONS: QuickQuestion[] = [
  // Sales
  { id: 'q1', question: 'ยอดขายรวมเป็นเท่าไหร่?', category: 'sales', icon: '💰' },
  { id: 'q2', question: 'ยอดขายเฉลี่ยต่อวันเท่าไหร่?', category: 'sales', icon: '📊' },
  { id: 'q3', question: 'วันไหนขายดีที่สุด?', category: 'sales', icon: '📅' },
  
  // Product
  { id: 'q4', question: 'สินค้าขายดี Top 5 คืออะไร?', category: 'product', icon: '🏆' },
  { id: 'q5', question: 'สินค้าไหนควรเพิ่ม stock?', category: 'product', icon: '📦' },
  { id: 'q6', question: 'สินค้าไหนยอดขายลดลง?', category: 'product', icon: '📉' },
  
  // Customer
  { id: 'q7', question: 'ลูกค้า Top 5 คือใคร?', category: 'customer', icon: '👥' },
  { id: 'q8', question: 'มีลูกค้าใหม่กี่ราย?', category: 'customer', icon: '🎉' },
  { id: 'q9', question: 'ลูกค้าไหนซื้อน้อยลง?', category: 'customer', icon: '⚠️' },
  
  // Trend
  { id: 'q10', question: 'แนวโน้มยอดขายเป็นยังไง?', category: 'trend', icon: '📈' },
  { id: 'q11', question: 'คาดการณ์ยอดขายเดือนหน้า?', category: 'trend', icon: '🔮' },
  { id: 'q12', question: 'เปรียบเทียบกับช่วงก่อนหน้า?', category: 'trend', icon: '⚖️' },
  
  // General (รวม Inventory)
  { id: 'q13', question: 'สรุปสินค้าในคลัง', category: 'general', icon: '🏭' },
  { id: 'q14', question: 'ดู stock ต่ำ', category: 'general', icon: '⚠️' },
  { id: 'q15', question: 'วิเคราะห์ข้อมูลคลัง', category: 'general', icon: '📊' },
  { id: 'q16', question: 'การเคลื่อนไหวล่าสุด', category: 'general', icon: '🔄' },
  { id: 'q17', question: 'มีอะไรต้องดูแลเร่งด่วน?', category: 'general', icon: '🚨' },
  { id: 'q18', question: 'แนะนำกลยุทธ์เพิ่มยอดขาย', category: 'general', icon: '💡' },
  
  // Global AI tools (Sales + Warehouse + Schema)
  { id: 'q19', question: 'ภาพรวมยอดขายในช่วงนี้เป็นยังไงบ้าง?', category: 'sales', icon: '📈' },
  { id: 'q20', question: 'ช่วยคำนวณสต็อกที่ควรมีของสินค้า FG-001', category: 'product', icon: '📦' },
  { id: 'q21', question: 'ภาพรวมคลังสินค้าและจำนวน stock ในแต่ละคลัง', category: 'general', icon: '🏭' },
  { id: 'q22', question: 'สถิติสินค้าแยกตามคลัง', category: 'general', icon: '📊' },
  { id: 'q23', question: 'มีตารางอะไรบ้างที่ AI ใช้งานได้?', category: 'general', icon: '📈' },
  { id: 'q24', question: 'ขอดูโครงสร้างตาราง inventory_items', category: 'general', icon: '📊' },
  { id: 'q25', question: 'ขอตัวอย่างข้อมูล 3 แถวจากตาราง sales_bills', category: 'general', icon: '📊' },
  { id: 'q26', question: 'ตารางขาย คลัง และจัดส่งเชื่อมกันยังไงบ้าง?', category: 'general', icon: '🔄' },
  { id: 'q27', question: 'ช่วงนี้สินค้าตัวไหนยอดขายตกลงบ้าง?', category: 'product', icon: '📉' },
  { id: 'q28', question: 'ลูกค้าคนไหนซื้อน้อยลงเมื่อเทียบกับก่อนหน้า?', category: 'customer', icon: '⚠️' },
];

// ========== RULE-BASED ENGINE ==========

/**
 * ประมวลผลคำถามด้วย Rule-based
 */
export function processWithRules(
  question: string,
  context: SalesContext
): { answer: string; data?: any; sources: string[] } {
  const q = question.toLowerCase();
  
  // Format helpers
  const formatCurrency = (n: number) => `฿${n.toLocaleString('th-TH')}`;
  const formatNumber = (n: number) => n.toLocaleString('th-TH');
  const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
  const getTableMeta = (name: string): TableMeta | undefined => {
    if (!name) return undefined;
    const key = name.toLowerCase();
    if (SCHEMA_METADATA[key]) return SCHEMA_METADATA[key];
    return Object.values(SCHEMA_METADATA).find(t => t.name.toLowerCase() === key);
  };

  const extractTableNames = (): string[] => {
    const names = new Set<string>();
    const regex = /(from|join|ตาราง)\s+([a-zA-Z0-9_]+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(q)) !== null) {
      names.add(match[2].toLowerCase());
    }
    return Array.from(names);
  };

  if (
    q.includes('sql') ||
    q.includes('query') ||
    q.includes('join ') ||
    q.includes(' join') ||
    q.includes('เชื่อมตาราง') ||
    q.includes('ตัวอย่าง sql') ||
    q.includes('ตัวอย่าง query')
  ) {
    const tableNames = extractTableNames();
    const metas = tableNames
      .map(name => getTableMeta(name))
      .filter((m): m is TableMeta => !!m);

    if (metas.length === 0) {
      return {
        answer:
          '🧱 **แนวทางเขียน SQL เบื้องต้น**\n\n' +
          '1. เริ่มจากเลือกตารางหลักที่ต้องการ เช่น `sales_bills`, `inventory_items`\n' +
          '2. ใช้คำสั่ง `SELECT` ระบุคอลัมน์ และ `FROM` ชื่อตาราง\n' +
          '3. ถ้าต้องการ JOIN ให้ดูคอลัมน์เชื่อมจากเมนู "โครงสร้างตาราง" ก่อน\n\n' +
          'ลองระบุชื่อตารางในคำถาม เช่น:\n' +
          '`ช่วยเขียน SQL ดึงยอดขายรายวันจากตาราง sales_bills`',
        sources: ['Schema/SQL Helper']
      };
    }

    if (metas.length === 1) {
      const meta = metas[0];
      const keyCols = meta.columns
        .slice(0, 8)
        .map(
          c =>
            `- \`${c.name}\` (${c.type})` +
            (c.description ? ` — ${c.description}` : '')
        )
        .join('\n');
      const selectCols = meta.columns.slice(0, 3).map(c => c.name).join(', ');
      const exampleSql =
        'SELECT\n' +
        '  ' +
        selectCols +
        '\n' +
        'FROM ' +
        meta.name +
        '\n' +
        'LIMIT 100;';
      let answer =
        '🧱 **ตัวอย่างการใช้ตาราง ' +
        meta.name +
        ' ใน SQL**\n\n';
      answer +=
        '**คำอธิบายตาราง:** ' + meta.description + '\n\n';
      answer += '**คอลัมน์สำคัญ:**\n' + keyCols + '\n\n';
      answer += '**ตัวอย่าง Query เบื้องต้น:**\n';
      answer += '```sql\n' + exampleSql + '\n```\n';
      if (meta.sampleQuestions && meta.sampleQuestions.length > 0) {
        answer +=
          '\nตัวอย่างคำถามที่เหมาะกับตารางนี้:\n' +
          meta.sampleQuestions.map(qs => '- ' + qs).join('\n');
      }
      return {
        answer,
        data: meta,
        sources: ['Schema Metadata']
      };
    }

    const t1 = metas[0];
    const t2 = metas[1];
    const relFrom1 = (t1.relationships || []).find(r => r.toTable === t2.name);
    const relFrom2 = (t2.relationships || []).find(r => r.toTable === t1.name);
    const rel = relFrom1 || relFrom2;
    if (rel) {
      const left = relFrom1 ? t1 : t2;
      const right = relFrom1 ? t2 : t1;
      const fromCol = relFrom1 ? rel.fromColumn : rel.toColumn;
      const toCol = relFrom1 ? rel.toColumn : rel.fromColumn;
      const sql =
        'SELECT\n' +
        '  ' +
        left.name +
        '.*,\n' +
        '  ' +
        right.name +
        '.*\n' +
        'FROM ' +
        left.name +
        '\n' +
        'JOIN ' +
        right.name +
        '\n' +
        '  ON ' +
        left.name +
        '.' +
        fromCol +
        ' = ' +
        right.name +
        '.' +
        toCol +
        '\n' +
        'LIMIT 100;';
      const desc =
        rel.description ||
        left.name +
          '.' +
          fromCol +
          ' เชื่อมกับ ' +
          right.name +
          '.' +
          toCol;
      const answer =
        '🔗 **ตัวอย่างการ JOIN ตาราง ' +
        left.name +
        ' กับ ' +
        right.name +
        '**\n\n' +
        'คีย์ที่ใช้เชื่อม: `' +
        left.name +
        '.' +
        fromCol +
        '` ↔ `' +
        right.name +
        '.' +
        toCol +
        '`\n' +
        'คำอธิบาย: ' +
        desc +
        '\n\n' +
        '**ตัวอย่าง Query:**\n' +
        '```sql\n' +
        sql +
        '\n```\n';
      return {
        answer,
        data: { left: left.name, right: right.name, relationship: rel },
        sources: ['Schema Metadata']
      };
    }

    const answer =
      'ℹ️ **ไม่พบความสัมพันธ์โดยตรงระหว่างตารางที่ระบุ**\n\n' +
      'ตารางที่พบใน metadata: ' +
      metas.map(m => '`' + m.name + '`').join(', ') +
      '\n\n' +
      'ลองเช็คที่เมนู "โครงสร้างตาราง" เพื่อดูคอลัมน์ที่ใช้เชื่อม เช่น *_id, *_code หรือ foreign key ต่าง ๆ จากนั้นเขียน JOIN โดยใช้คอลัมน์เหล่านั้นในเงื่อนไข ON';
    return {
      answer,
      data: metas.map(m => m.name),
      sources: ['Schema Metadata']
    };
  }
  
  // ========== SALES QUESTIONS ==========
  
  if (q.includes('ยอดขายรวม') || q.includes('ยอดขายทั้งหมด') || q.includes('total sales')) {
    return {
      answer: `💰 **ยอดขายรวม: ${formatCurrency(context.totalSales)}**\n\n` +
        `📦 จำนวนออเดอร์: ${formatNumber(context.orderCount)} รายการ\n` +
        `💵 เฉลี่ยต่อออเดอร์: ${formatCurrency(context.orderCount > 0 ? context.totalSales / context.orderCount : 0)}\n` +
        `📅 ช่วงเวลา: ${formatDate(context.dateRange.startDate)} - ${formatDate(context.dateRange.endDate)}`,
      data: { totalSales: context.totalSales, orderCount: context.orderCount },
      sources: ['Sales Summary']
    };
  }
  
  if (q.includes('ยอดขายเฉลี่ย') || q.includes('average')) {
    const days = context.dailySales.length || 1;
    const avgDaily = context.totalSales / days;
    const avgOrder = context.orderCount > 0 ? context.totalSales / context.orderCount : 0;
    
    return {
      answer: `📊 **ยอดขายเฉลี่ย**\n\n` +
        `📅 เฉลี่ยต่อวัน: ${formatCurrency(avgDaily)}\n` +
        `🛒 เฉลี่ยต่อออเดอร์: ${formatCurrency(avgOrder)}\n` +
        `📆 จำนวนวันที่มีข้อมูล: ${days} วัน`,
      data: { avgDaily, avgOrder, days },
      sources: ['Daily Sales Data']
    };
  }
  
  if (q.includes('วันไหนขายดี') || q.includes('best day') || q.includes('วันที่ขายดี')) {
    if (context.dailySales.length === 0) {
      return { answer: '❌ ไม่มีข้อมูลยอดขายรายวัน', sources: [] };
    }
    
    const sorted = [...context.dailySales].sort((a, b) => b.amount - a.amount);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];
    
    return {
      answer: `📅 **วันที่ขายดีที่สุด**\n\n` +
        `🥇 **${formatDate(best.date)}**: ${formatCurrency(best.amount)}\n\n` +
        `📊 Top 5 วันที่ขายดี:\n` +
        sorted.slice(0, 5).map((d, i) => `${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]} ${formatDate(d.date)}: ${formatCurrency(d.amount)}`).join('\n') +
        `\n\n📉 วันที่ขายน้อยสุด: ${formatDate(worst.date)} (${formatCurrency(worst.amount)})`,
      data: { best, worst, top5: sorted.slice(0, 5) },
      sources: ['Daily Sales Data']
    };
  }
  
  // ========== PRODUCT QUESTIONS ==========
  
  if (q.includes('สินค้าขายดี') || q.includes('top product') || q.includes('สินค้า top')) {
    if (context.topProducts.length === 0) {
      return { answer: '❌ ไม่มีข้อมูลสินค้า', sources: [] };
    }
    
    const top5 = context.topProducts.slice(0, 5);
    return {
      answer: `🏆 **สินค้าขายดี Top 5**\n\n` +
        top5.map((p, i) => 
          `${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]} **${p.productName}**\n` +
          `   รหัส: ${p.productCode}\n` +
          `   ยอดขาย: ${formatCurrency(p.totalSales)}\n` +
          `   จำนวน: ${formatNumber(p.totalQuantity)} ชิ้น`
        ).join('\n\n'),
      data: { top5 },
      sources: ['Product Sales Data']
    };
  }
  
  if (q.includes('เพิ่ม stock') || q.includes('สต็อก') || q.includes('stock')) {
    const top3 = context.topProducts.slice(0, 3);
    return {
      answer: `📦 **สินค้าที่ควรเพิ่ม Stock**\n\n` +
        `จากข้อมูลยอดขาย สินค้าที่ขายดีและควรมี stock เพียงพอ:\n\n` +
        top3.map((p, i) => 
          `${i + 1}. **${p.productName}** (${p.productCode})\n` +
          `   ยอดขาย: ${formatCurrency(p.totalSales)} | ${formatNumber(p.totalQuantity)} ชิ้น\n` +
          `   💡 แนะนำ: ตรวจสอบ stock คงเหลือและ reorder point`
        ).join('\n\n'),
      data: { recommendations: top3 },
      sources: ['Product Sales Analysis']
    };
  }
  
  if (q.includes('ยอดขายลดลง') || q.includes('declining') || q.includes('ขายน้อยลง')) {
    return {
      answer: `📉 **สินค้าที่ต้องระวัง**\n\n` +
        `⚠️ ต้องการข้อมูลเปรียบเทียบช่วงก่อนหน้าเพื่อวิเคราะห์\n\n` +
        `💡 **คำแนะนำ:**\n` +
        `1. เปรียบเทียบกับช่วงเดียวกันปีก่อน\n` +
        `2. ตรวจสอบ stock ว่าหมดหรือไม่\n` +
        `3. ดูราคาคู่แข่ง\n` +
        `4. พิจารณาทำโปรโมชั่น`,
      sources: ['Analysis Suggestion']
    };
  }
  
  // ========== CUSTOMER QUESTIONS ==========
  
  if (q.includes('ลูกค้า top') || q.includes('top customer') || q.includes('ลูกค้าขายดี')) {
    if (context.topCustomers.length === 0) {
      return { answer: '❌ ไม่มีข้อมูลลูกค้า', sources: [] };
    }
    
    const top5 = context.topCustomers.slice(0, 5);
    return {
      answer: `👥 **ลูกค้า Top 5**\n\n` +
        top5.map((c, i) => 
          `${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]} **${c.arname}**\n` +
          `   รหัส: ${c.arcode}\n` +
          `   ยอดซื้อ: ${formatCurrency(c.totalPurchases)}\n` +
          `   จำนวนออเดอร์: ${formatNumber(c.orderCount)} ครั้ง`
        ).join('\n\n'),
      data: { top5 },
      sources: ['Customer Sales Data']
    };
  }
  
  if (q.includes('ลูกค้าใหม่') || q.includes('new customer')) {
    return {
      answer: `🎉 **ลูกค้าใหม่**\n\n` +
        `⚠️ ต้องการข้อมูลเปรียบเทียบช่วงก่อนหน้าเพื่อระบุลูกค้าใหม่\n\n` +
        `💡 **วิธีดูลูกค้าใหม่:**\n` +
        `1. เปรียบเทียบรายชื่อลูกค้าช่วงนี้ vs ก่อนหน้า\n` +
        `2. ดูจากวันที่สั่งซื้อครั้งแรก`,
      sources: ['Analysis Suggestion']
    };
  }
  
  // ========== TREND QUESTIONS ==========
  
  if (q.includes('แนวโน้ม') || q.includes('trend') || q.includes('ทิศทาง')) {
    const trend = context.trend;
    if (!trend) {
      return { answer: '❌ ไม่มีข้อมูลแนวโน้ม', sources: [] };
    }
    
    const emoji = trend.direction === 'up' ? '📈' : trend.direction === 'down' ? '📉' : '➡️';
    const text = trend.direction === 'up' ? 'ขาขึ้น' : trend.direction === 'down' ? 'ขาลง' : 'คงที่';
    
    return {
      answer: `${emoji} **แนวโน้มยอดขาย: ${text}**\n\n` +
        `📊 เปลี่ยนแปลง: ${trend.percentChange >= 0 ? '+' : ''}${trend.percentChange.toFixed(1)}%\n\n` +
        (trend.direction === 'up' 
          ? `✅ **สิ่งที่ควรทำ:**\n1. รักษาโมเมนตัม\n2. เพิ่ม stock สินค้าขายดี\n3. ขยายตลาด`
          : trend.direction === 'down'
          ? `⚠️ **สิ่งที่ควรทำ:**\n1. วิเคราะห์สาเหตุ\n2. ดูคู่แข่ง\n3. ทำโปรโมชั่น`
          : `💡 **สิ่งที่ควรทำ:**\n1. หาโอกาสเพิ่มยอด\n2. ออกผลิตภัณฑ์ใหม่`),
      data: trend,
      sources: ['Trend Analysis']
    };
  }
  
  if (q.includes('คาดการณ์') || q.includes('forecast') || q.includes('เดือนหน้า')) {
    const avgDaily = context.dailySales.length > 0 
      ? context.totalSales / context.dailySales.length 
      : 0;
    const forecast30 = avgDaily * 30;
    
    return {
      answer: `🔮 **คาดการณ์ยอดขาย**\n\n` +
        `📊 จากยอดขายเฉลี่ย ${formatCurrency(avgDaily)}/วัน\n\n` +
        `📅 คาดการณ์ 30 วันถัดไป: **${formatCurrency(forecast30)}**\n\n` +
        `⚠️ *หมายเหตุ: การคาดการณ์อิงจากค่าเฉลี่ย ผลจริงอาจแตกต่างตาม seasonality และปัจจัยอื่น*`,
      data: { avgDaily, forecast30 },
      sources: ['Simple Forecast']
    };
  }
  
  // ========== GENERAL QUESTIONS ==========
  
  if (q.includes('สรุป') || q.includes('overview') || q.includes('ภาพรวม')) {
    const avgDaily = context.dailySales.length > 0 ? context.totalSales / context.dailySales.length : 0;
    const avgOrder = context.orderCount > 0 ? context.totalSales / context.orderCount : 0;
    
    return {
      answer: `📋 **สรุปภาพรวม**\n\n` +
        `📅 ช่วงเวลา: ${formatDate(context.dateRange.startDate)} - ${formatDate(context.dateRange.endDate)}\n\n` +
        `💰 **ยอดขาย**\n` +
        `• รวม: ${formatCurrency(context.totalSales)}\n` +
        `• เฉลี่ย/วัน: ${formatCurrency(avgDaily)}\n` +
        `• เฉลี่ย/ออเดอร์: ${formatCurrency(avgOrder)}\n\n` +
        `📦 **สินค้าขายดี**\n` +
        context.topProducts.slice(0, 3).map((p, i) => `${i + 1}. ${p.productName}: ${formatCurrency(p.totalSales)}`).join('\n') +
        `\n\n👥 **ลูกค้าสำคัญ**\n` +
        context.topCustomers.slice(0, 3).map((c, i) => `${i + 1}. ${c.arname}: ${formatCurrency(c.totalPurchases)}`).join('\n'),
      data: { summary: true },
      sources: ['All Data Sources']
    };
  }
  
  if (q.includes('เร่งด่วน') || q.includes('urgent') || q.includes('ดูแล')) {
    return {
      answer: `🚨 **สิ่งที่ต้องดูแลเร่งด่วน**\n\n` +
        `1. **ตรวจสอบ Stock** สินค้าขายดี:\n` +
        context.topProducts.slice(0, 3).map(p => `   • ${p.productName}`).join('\n') +
        `\n\n2. **ติดตามลูกค้าสำคัญ** ที่ซื้อลดลง\n\n` +
        `3. **วิเคราะห์แนวโน้ม** ${context.trend?.direction === 'down' ? '⚠️ ยอดขายลดลง!' : '✅ ยอดขายปกติ'}\n\n` +
        `💡 *แนะนำ: เปิดดู AI Insights Panel เพื่อดูรายละเอียด*`,
      sources: ['Priority Analysis']
    };
  }
  
  if (q.includes('กลยุทธ์') || q.includes('strategy') || q.includes('เพิ่มยอด')) {
    return {
      answer: `💡 **กลยุทธ์เพิ่มยอดขาย**\n\n` +
        `📈 **ระยะสั้น (1-2 สัปดาห์)**\n` +
        `1. โปรโมทสินค้าขายดี: ${context.topProducts[0]?.productName || 'สินค้าหลัก'}\n` +
        `2. Flash Sale วันที่ขายน้อย\n` +
        `3. Bundle สินค้าคู่กัน\n\n` +
        `🎯 **ระยะกลาง (1-3 เดือน)**\n` +
        `1. โปรแกรมสะสมแต้ม\n` +
        `2. ส่วนลดลูกค้าประจำ\n` +
        `3. ขยายช่องทางขาย\n\n` +
        `🚀 **ระยะยาว**\n` +
        `1. วิเคราะห์ Customer Lifetime Value\n` +
        `2. พัฒนาสินค้าใหม่\n` +
        `3. Loyalty Program`,
      sources: ['Strategy Suggestions']
    };
  }
  
  // ========== SPECIFIC PRODUCT/CUSTOMER QUERIES ==========
  
  // ค้นหาสินค้าเฉพาะ
  const productMatch = q.match(/สินค้า\s*[:\s]?\s*([^\s]+)|product\s*[:\s]?\s*([^\s]+)/i);
  if (productMatch) {
    const searchTerm = (productMatch[1] || productMatch[2]).toLowerCase();
    const found = context.topProducts.find(p => 
      p.productCode.toLowerCase().includes(searchTerm) ||
      p.productName.toLowerCase().includes(searchTerm)
    );
    
    if (found) {
      return {
        answer: `📦 **ข้อมูลสินค้า: ${found.productName}**\n\n` +
          `• รหัส: ${found.productCode}\n` +
          `• ยอดขาย: ${formatCurrency(found.totalSales)}\n` +
          `• จำนวนขาย: ${formatNumber(found.totalQuantity)} ชิ้น\n` +
          `• อันดับ: #${context.topProducts.indexOf(found) + 1} จาก ${context.topProducts.length} สินค้า`,
        data: found,
        sources: ['Product Data']
      };
    }
  }
  
  // ค้นหาลูกค้าเฉพาะ
  const customerMatch = q.match(/ลูกค้า\s*[:\s]?\s*([^\s]+)|customer\s*[:\s]?\s*([^\s]+)/i);
  if (customerMatch) {
    const searchTerm = (customerMatch[1] || customerMatch[2]).toLowerCase();
    const found = context.topCustomers.find(c => 
      c.arcode.toLowerCase().includes(searchTerm) ||
      c.arname.toLowerCase().includes(searchTerm)
    );
    
    if (found) {
      return {
        answer: `👤 **ข้อมูลลูกค้า: ${found.arname}**\n\n` +
          `• รหัส: ${found.arcode}\n` +
          `• ยอดซื้อรวม: ${formatCurrency(found.totalPurchases)}\n` +
          `• จำนวนออเดอร์: ${formatNumber(found.orderCount)} ครั้ง\n` +
          `• เฉลี่ย/ออเดอร์: ${formatCurrency(found.totalPurchases / found.orderCount)}\n` +
          `• อันดับ: #${context.topCustomers.indexOf(found) + 1} จาก ${context.topCustomers.length} ลูกค้า`,
        data: found,
        sources: ['Customer Data']
      };
    }
  }
  
  // ========== DEFAULT RESPONSE ==========
  
  return {
    answer: `🤔 **ไม่เข้าใจคำถาม**\n\n` +
      `ลองถามใหม่ เช่น:\n` +
      `• "ยอดขายรวมเท่าไหร่?"\n` +
      `• "สินค้าขายดี Top 5?"\n` +
      `• "ลูกค้า Top 5?"\n` +
      `• "แนวโน้มยอดขายเป็นยังไง?"\n` +
      `• "สรุปภาพรวม"\n\n` +
      `หรือกดเลือกจาก Quick Questions ด้านล่าง 👇`,
    sources: []
  };
}

// ========== LLM INTEGRATION ==========

/**
 * สร้าง System Prompt สำหรับ LLM
 */
export function buildSystemPrompt(context: SalesContext): string {
  const formatCurrency = (n: number) => `฿${n.toLocaleString('th-TH')}`;
  
  return `คุณเป็น AI Assistant ผู้เชี่ยวชาญด้านการวิเคราะห์ยอดขาย
  
**ข้อมูลปัจจุบัน:**
- ช่วงเวลา: ${context.dateRange.startDate} ถึง ${context.dateRange.endDate}
- ยอดขายรวม: ${formatCurrency(context.totalSales)}
- จำนวนออเดอร์: ${context.orderCount} รายการ
- แนวโน้ม: ${context.trend?.direction || 'ไม่ทราบ'} (${context.trend?.percentChange?.toFixed(1) || 0}%)

**สินค้าขายดี Top 5:**
${context.topProducts.slice(0, 5).map((p, i) => `${i + 1}. ${p.productName} (${p.productCode}): ${formatCurrency(p.totalSales)}`).join('\n')}

**ลูกค้าสำคัญ Top 5:**
${context.topCustomers.slice(0, 5).map((c, i) => `${i + 1}. ${c.arname} (${c.arcode}): ${formatCurrency(c.totalPurchases)}`).join('\n')}

**คำสั่ง:**
- ตอบเป็นภาษาไทย
- ใช้ข้อมูลจริงในการตอบ
- ให้คำแนะนำที่เป็นประโยชน์
- ใช้ emoji ให้เหมาะสม
- ถ้าไม่มีข้อมูล ให้บอกตรงๆ`;
}

/**
 * เรียก OpenAI API
 */
export async function callOpenAI(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || 'ไม่สามารถสร้างคำตอบได้';
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

/**
 * เรียก Claude API
 */
export async function callClaude(
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  model: string = 'claude-3-haiku-20240307'
): Promise<string> {
  try {
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        system: systemMessage,
        messages: chatMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
      })
    });
    
    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.content[0]?.text || 'ไม่สามารถสร้างคำตอบได้';
  } catch (error) {
    console.error('Claude API Error:', error);
    throw error;
  }
}

// ========== MAIN CHAT ENGINE ==========

/**
 * ประมวลผลคำถาม (เลือก Rule-based หรือ LLM)
 */
export async function processQuestion(
  question: string,
  context: SalesContext,
  llmConfig: LLMConfig,
  chatHistory: ChatMessage[] = []
): Promise<{ answer: string; data?: any; sources: string[]; usedLLM: boolean }> {
  
  // ถ้าไม่มี LLM config หรือ API key → ใช้ Rule-based
  if (llmConfig.provider === 'none' || !llmConfig.apiKey) {
    const result = processWithRules(question, context);
    return { ...result, usedLLM: false };
  }
  
  // ลอง Rule-based ก่อน (ถ้าตอบได้ดี ไม่ต้องเรียก LLM)
  const ruleResult = processWithRules(question, context);
  if (!ruleResult.answer.includes('ไม่เข้าใจคำถาม')) {
    return { ...ruleResult, usedLLM: false };
  }
  
  // ใช้ LLM สำหรับคำถามที่ Rule-based ตอบไม่ได้
  try {
    const systemPrompt = buildSystemPrompt(context);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: question }
    ];
    
    let answer: string;
    if (llmConfig.provider === 'openai') {
      answer = await callOpenAI(messages, llmConfig.apiKey!, llmConfig.model);
    } else if (llmConfig.provider === 'claude') {
      answer = await callClaude(messages, llmConfig.apiKey!, llmConfig.model);
    } else {
      return { ...ruleResult, usedLLM: false };
    }
    
    return {
      answer,
      sources: ['AI Analysis (LLM)'],
      usedLLM: true
    };
  } catch (error) {
    console.error('LLM Error, falling back to rules:', error);
    return { ...ruleResult, usedLLM: false };
  }
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

