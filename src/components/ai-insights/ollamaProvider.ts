/**
 * Ollama Provider - Local LLM Integration
 * 
 * Ollama ให้รัน LLM บนเครื่องตัวเองได้ฟรี
 * 
 * วิธีติดตั้ง Ollama:
 * 1. ดาวน์โหลดจาก https://ollama.ai
 * 2. ติดตั้งและรัน Ollama
 * 3. ดาวน์โหลด model: ollama pull llama3.2
 * 4. Ollama จะรันที่ http://localhost:11434
 */

// ========== TYPES ==========

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  enabled: boolean;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

// ========== DEFAULT CONFIG ==========

export const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2',
  enabled: false
};

// ========== RECOMMENDED MODELS ==========

export const RECOMMENDED_MODELS = [
  { 
    name: 'llama3.2', 
    displayName: 'Llama 3.2 (3B)', 
    size: '2GB',
    description: 'เร็ว เหมาะกับเครื่องทั่วไป',
    recommended: true
  },
  { 
    name: 'llama3.2:1b', 
    displayName: 'Llama 3.2 (1B)', 
    size: '1.3GB',
    description: 'เร็วมาก RAM น้อย',
    recommended: false
  },
  { 
    name: 'mistral', 
    displayName: 'Mistral 7B', 
    size: '4GB',
    description: 'สมดุลระหว่างเร็วและฉลาด',
    recommended: false
  },
  { 
    name: 'qwen2.5:7b', 
    displayName: 'Qwen 2.5 (7B)', 
    size: '4.7GB',
    description: 'ดีกับภาษาไทย',
    recommended: true
  },
  { 
    name: 'gemma2:2b', 
    displayName: 'Gemma 2 (2B)', 
    size: '1.6GB',
    description: 'จาก Google เร็วและดี',
    recommended: false
  }
];

// ========== OLLAMA PROVIDER CLASS ==========

export class OllamaProvider {
  private config: OllamaConfig;
  
  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = { ...DEFAULT_OLLAMA_CONFIG, ...config };
  }
  
  /**
   * ตรวจสอบว่า Ollama พร้อมใช้งานหรือไม่
   */
  async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        return { connected: true };
      }
      return { connected: false, error: `HTTP ${response.status}` };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return { connected: false, error: 'Connection timeout' };
      }
      return { connected: false, error: error.message || 'Connection failed' };
    }
  }
  
  /**
   * ดึงรายการ models ที่ติดตั้งแล้ว
   */
  async getInstalledModels(): Promise<OllamaModel[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching Ollama models:', error);
      return [];
    }
  }
  
  /**
   * ส่งข้อความไปยัง Ollama
   */
  async chat(
    messages: OllamaMessage[],
    onStream?: (chunk: string) => void
  ): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: !!onStream
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }
    
    // Streaming response
    if (onStream && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const json: OllamaResponse = JSON.parse(line);
            if (json.message?.content) {
              fullResponse += json.message.content;
              onStream(json.message.content);
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
      
      return fullResponse;
    }
    
    // Non-streaming response
    const data: OllamaResponse = await response.json();
    return data.message?.content || '';
  }
  
  /**
   * สร้าง System Prompt สำหรับ Warehouse AI
   */
  buildSystemPrompt(context: any): string {
    return `คุณเป็น AI Assistant สำหรับระบบจัดการคลังสินค้า WE-Warehouse

**ความสามารถของคุณ:**
- วิเคราะห์ข้อมูลสินค้าในคลัง
- วิเคราะห์ยอดขาย
- ให้คำแนะนำการจัดการคลัง
- ตอบคำถามเกี่ยวกับสินค้าและลูกค้า

**กฎการตอบ:**
- ตอบเป็นภาษาไทย
- ใช้ข้อมูลที่ได้รับในการตอบ
- ให้คำแนะนำที่เป็นประโยชน์
- ใช้ emoji ให้เหมาะสม
- ถ้าไม่มีข้อมูล ให้บอกตรงๆ
- ตอบสั้น กระชับ ได้ใจความ

${context ? `**ข้อมูลปัจจุบัน:**
${JSON.stringify(context, null, 2)}` : ''}`;
  }
  
  /**
   * ประมวลผลคำถาม
   */
  async processQuestion(
    question: string,
    context: any,
    chatHistory: OllamaMessage[] = [],
    onStream?: (chunk: string) => void
  ): Promise<{ answer: string; usedOllama: boolean }> {
    // Check connection first
    const { connected, error } = await this.checkConnection();
    if (!connected) {
      return {
        answer: `❌ **ไม่สามารถเชื่อมต่อ Ollama ได้**\n\n` +
          `🔧 วิธีแก้ไข:\n` +
          `1. ตรวจสอบว่า Ollama กำลังรันอยู่\n` +
          `2. รันคำสั่ง: \`ollama serve\`\n` +
          `3. หรือเปิดแอป Ollama\n\n` +
          `📍 URL: ${this.config.baseUrl}\n` +
          `❌ Error: ${error}`,
        usedOllama: false
      };
    }
    
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const messages: OllamaMessage[] = [
        { role: 'system', content: systemPrompt },
        ...chatHistory.slice(-10), // Last 10 messages for context
        { role: 'user', content: question }
      ];
      
      const answer = await this.chat(messages, onStream);
      
      return {
        answer: answer || 'ไม่สามารถสร้างคำตอบได้',
        usedOllama: true
      };
    } catch (error: any) {
      console.error('Ollama processing error:', error);
      return {
        answer: `❌ **เกิดข้อผิดพลาด**\n\n${error.message}`,
        usedOllama: false
      };
    }
  }
  
  // Getters/Setters
  getConfig(): OllamaConfig {
    return { ...this.config };
  }
  
  setConfig(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  setModel(model: string): void {
    this.config.model = model;
  }
  
  setBaseUrl(url: string): void {
    this.config.baseUrl = url;
  }
  
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }
}

// ========== SINGLETON INSTANCE ==========

let ollamaInstance: OllamaProvider | null = null;

export function getOllamaProvider(config?: Partial<OllamaConfig>): OllamaProvider {
  if (!ollamaInstance) {
    ollamaInstance = new OllamaProvider(config);
  } else if (config) {
    ollamaInstance.setConfig(config);
  }
  return ollamaInstance;
}

// ========== HELPER FUNCTIONS ==========

/**
 * ดาวน์โหลด model ผ่าน Ollama API
 */
export async function pullModel(
  modelName: string, 
  baseUrl: string = DEFAULT_OLLAMA_CONFIG.baseUrl,
  onProgress?: (status: string, completed?: number, total?: number) => void
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true })
    });
    
    if (!response.ok || !response.body) {
      throw new Error('Failed to pull model');
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (onProgress) {
            onProgress(
              json.status || 'Downloading...',
              json.completed,
              json.total
            );
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error pulling model:', error);
    return false;
  }
}

/**
 * ลบ model
 */
export async function deleteModel(
  modelName: string,
  baseUrl: string = DEFAULT_OLLAMA_CONFIG.baseUrl
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName })
    });
    return response.ok;
  } catch (error) {
    console.error('Error deleting model:', error);
    return false;
  }
}



