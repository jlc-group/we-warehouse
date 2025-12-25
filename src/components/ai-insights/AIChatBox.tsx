/**
 * AIChatBox - AI Chat Interface สำหรับถามตอบ
 * รองรับ:
 * - Rule-based responses
 * - AI Data Provider (query database)
 * - LLM Integration (OpenAI/Claude)
 * - Local LLM (Ollama)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageCircle,
  Send,
  Bot,
  User,
  Sparkles,
  Lightbulb,
  Settings,
  Trash2,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap,
  Brain,
  HelpCircle,
  Database,
  Search,
  Home,
  Wifi,
  WifiOff,
  Download,
  RefreshCw
} from 'lucide-react';
// Simple markdown-like renderer (no external dependency)
import {
  ChatMessage,
  QuickQuestion,
  SalesContext,
  LLMConfig,
  QUICK_QUESTIONS,
  processQuestion,
  generateId
} from './aiChatEngine';
import { aiToolExecutor } from './aiToolExecutor';
import {
  getOllamaProvider,
  OllamaConfig,
  RECOMMENDED_MODELS,
  OllamaModel
} from './ollamaProvider';

// Extended LLM Config to include Ollama
interface ExtendedLLMConfig extends LLMConfig {
  provider: 'openai' | 'claude' | 'ollama' | 'none';
  ollamaUrl?: string;
  ollamaModel?: string;
}

interface AIChatBoxProps {
  context: SalesContext;
  isLoading?: boolean;
}

export function AIChatBox({ context, isLoading = false }: AIChatBoxProps) {
  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeQuickCategory, setActiveQuickCategory] = useState<string>('all');

  // LLM Config
  const [llmConfig, setLlmConfig] = useState<ExtendedLLMConfig>({
    provider: 'none',
    apiKey: '',
    model: 'gpt-4o-mini',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2'
  });

  // Ollama specific state
  const [ollamaConnected, setOllamaConnected] = useState<boolean | null>(null);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: generateId(),
        role: 'assistant',
        content: `👋 **สวัสดีครับ! ผมคือ AI Assistant**\n\nผมเข้าถึงข้อมูลคลังสินค้า ยอดขาย ลูกค้า และโครงสร้างฐานข้อมูลได้แล้ว 🎉\n\n📊 **สามารถถามได้เช่น:**\n- สรุปสินค้าในคลัง\n- ค้นหาสินค้า FG-XXX\n- ดู stock ต่ำ หรือแนะนำสต็อกที่ควรมีของสินค้า FG-001\n- วิเคราะห์ข้อมูลคลัง\n- ภาพรวมยอดขายช่วงนี้เป็นยังไงบ้าง\n- สินค้าขายดี Top 5\n- มีตารางอะไรบ้างที่ AI ใช้งานได้\n- ขอดูโครงสร้างตาราง inventory_items หรือ workflow การขาย→คลัง→จัดส่ง\n\n💡 ลองพิมพ์คำถามหรือกดเลือกจาก **Quick Questions** ด้านล่าง\n\n⚙️ **ตั้งค่า Ollama** เพื่อใช้ Local AI ที่ฉลาดกว่า! 👇`,
        timestamp: new Date()
      }]);
    }
  }, [messages.length]);

  // Check Ollama connection
  const checkOllamaConnection = useCallback(async () => {
    setIsCheckingOllama(true);
    const ollama = getOllamaProvider({
      baseUrl: llmConfig.ollamaUrl || 'http://localhost:11434'
    });

    const { connected } = await ollama.checkConnection();
    setOllamaConnected(connected);

    if (connected) {
      const models = await ollama.getInstalledModels();
      setOllamaModels(models);
    }

    setIsCheckingOllama(false);
  }, [llmConfig.ollamaUrl]);

  // Auto-check Ollama when settings open
  useEffect(() => {
    if (showSettings && llmConfig.provider === 'ollama') {
      checkOllamaConnection();
    }
  }, [showSettings, llmConfig.provider, checkOllamaConnection]);

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);
    setStreamingText('');

    try {
      // Check if using Ollama
      if (llmConfig.provider === 'ollama') {
        const ollama = getOllamaProvider({
          baseUrl: llmConfig.ollamaUrl,
          model: llmConfig.ollamaModel,
          enabled: true
        });

        // Get context data from tool executor
        const toolResponse = await aiToolExecutor.processQuestion(userMessage.content);
        const contextData = toolResponse.toolsUsed.length > 0 ? {
          queryResult: toolResponse.answer,
          sources: toolResponse.sources
        } : context;

        // Stream response
        let fullResponse = '';
        const result = await ollama.processQuestion(
          userMessage.content,
          contextData,
          messages.map(m => ({ role: m.role, content: m.content })),
          (chunk) => {
            fullResponse += chunk;
            setStreamingText(fullResponse);
          }
        );

        setStreamingText('');

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: result.answer,
          timestamp: new Date(),
          sources: result.usedOllama ? ['Ollama (Local)'] : ['Fallback']
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // 1. ลองใช้ AI Tool Executor ก่อน (query database)
        const toolResponse = await aiToolExecutor.processQuestion(userMessage.content);

        // 2. ถ้าได้คำตอบจาก tools
        if (toolResponse.toolsUsed.length > 0 && toolResponse.confidence > 0.6) {
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: toolResponse.answer,
            timestamp: new Date(),
            sources: toolResponse.sources
          };

          setMessages(prev => [...prev, assistantMessage]);
        } else {
          // 3. Fallback ไปใช้ rule-based หรือ LLM
          const result = await processQuestion(
            userMessage.content,
            context,
            llmConfig,
            messages
          );

          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: result.answer,
            timestamp: new Date(),
            data: result.data,
            sources: result.sources
          };

          setMessages(prev => [...prev, assistantMessage]);
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setStreamingText('');
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // Handle quick question
  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
    setTimeout(() => handleSend(), 100);
  };

  // Copy message
  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear chat
  const handleClear = () => {
    setMessages([{
      id: generateId(),
      role: 'assistant',
      content: '🔄 เริ่มการสนทนาใหม่แล้ว\n\nถามอะไรก็ได้เลยครับ! 😊',
      timestamp: new Date()
    }]);
  };

  // Filter quick questions
  const filteredQuickQuestions = activeQuickCategory === 'all'
    ? QUICK_QUESTIONS
    : QUICK_QUESTIONS.filter(q => q.category === activeQuickCategory);

  // Get provider display info
  const getProviderBadge = () => {
    switch (llmConfig.provider) {
      case 'ollama':
        return {
          text: `🏠 Ollama (${llmConfig.ollamaModel})`,
          className: ollamaConnected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        };
      case 'openai':
        return { text: '🤖 OpenAI', className: 'bg-green-100 text-green-800' };
      case 'claude':
        return { text: '✨ Claude', className: 'bg-purple-100 text-purple-800' };
      default:
        return { text: '📋 Rule-based', className: 'bg-gray-100' };
    }
  };

  const providerBadge = getProviderBadge();

  return (
    <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 via-white to-purple-50 shadow-lg">
      {/* Header */}
      <CardHeader
        className="cursor-pointer hover:bg-indigo-50/50 transition-colors pb-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <MessageCircle className="h-6 w-6 text-indigo-600" />
              <Sparkles className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent text-lg font-bold">
                💬 AI Chat Assistant
              </span>
              <p className="text-xs font-normal text-gray-500">
                ถาม-ตอบข้อมูล | Rule-based + Ollama + LLM
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={providerBadge.className}>
              {providerBadge.text}
            </Badge>
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Messages Area */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                  )}

                  <div className={`max-w-[80%] ${message.role === 'user' ? 'order-1' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 ${message.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-md'
                          : 'bg-white border border-gray-200 shadow-sm rounded-bl-md'
                        }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="text-gray-800 whitespace-pre-wrap text-sm">
                          {/* Simple markdown rendering */}
                          {message.content.split('\n').map((line, i) => {
                            // Bold text
                            let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                            // Code
                            processed = processed.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');
                            // Headers
                            if (line.startsWith('### ')) {
                              return <h4 key={i} className="font-bold text-base mt-2 mb-1">{line.replace('### ', '')}</h4>;
                            }
                            if (line.startsWith('## ')) {
                              return <h3 key={i} className="font-bold text-lg mt-2 mb-1">{line.replace('## ', '')}</h3>;
                            }
                            // List items
                            if (line.startsWith('• ') || line.startsWith('- ') || line.match(/^\d+\. /)) {
                              return <p key={i} className="ml-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processed) }} />;
                            }
                            // Empty lines
                            if (line.trim() === '') {
                              return <br key={i} />;
                            }
                            return <p key={i} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(processed) }} />;
                          })}
                        </div>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>

                    {/* Message metadata */}
                    <div className={`flex items-center gap-2 mt-1 text-xs text-gray-400 ${message.role === 'user' ? 'justify-end' : ''}`}>
                      <span>{message.timestamp.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                      {message.sources && message.sources.length > 0 && (
                        <span className="text-indigo-400">• {message.sources.join(', ')}</span>
                      )}
                      {message.role === 'assistant' && (
                        <button
                          onClick={() => handleCopy(message.content, message.id)}
                          className="hover:text-gray-600 transition-colors"
                        >
                          {copiedId === message.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center order-2">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming text */}
              {streamingText && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm max-w-[80%]">
                    <div className="text-gray-800 whitespace-pre-wrap text-sm">
                      {streamingText}
                      <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1" />
                    </div>
                  </div>
                </div>
              )}

              {isProcessing && !streamingText && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>กำลังคิด...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Quick Questions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Quick Questions
              </div>
              <Tabs value={activeQuickCategory} onValueChange={setActiveQuickCategory}>
                <TabsList className="h-7 bg-gray-100">
                  <TabsTrigger value="all" className="text-xs px-2 h-6">ทั้งหมด</TabsTrigger>
                  <TabsTrigger value="sales" className="text-xs px-2 h-6">💰</TabsTrigger>
                  <TabsTrigger value="product" className="text-xs px-2 h-6">📦</TabsTrigger>
                  <TabsTrigger value="customer" className="text-xs px-2 h-6">👥</TabsTrigger>
                  <TabsTrigger value="trend" className="text-xs px-2 h-6">📈</TabsTrigger>
                  <TabsTrigger value="general" className="text-xs px-2 h-6">🏭</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex flex-wrap gap-2">
              {filteredQuickQuestions.slice(0, 6).map((q) => (
                <Button
                  key={q.id}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 hover:bg-indigo-50 hover:border-indigo-300"
                  onClick={() => handleQuickQuestion(q.question)}
                  disabled={isProcessing}
                >
                  <span className="mr-1">{q.icon}</span>
                  {q.question}
                </Button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="พิมพ์คำถามของคุณ..."
              disabled={isProcessing || isLoading}
              className="flex-1 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isProcessing || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-red-600"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                ล้างแชท
              </Button>
            </div>

            {/* Settings Dialog */}
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-gray-500">
                  <Settings className="h-3 w-3 mr-1" />
                  ตั้งค่า AI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-indigo-600" />
                    ตั้งค่า AI Engine
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <Label>AI Provider</Label>
                    <Select
                      value={llmConfig.provider}
                      onValueChange={(v) => setLlmConfig(prev => ({ ...prev, provider: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            Rule-based (ฟรี, ไม่ต้อง API)
                          </div>
                        </SelectItem>
                        <SelectItem value="ollama">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-blue-500" />
                            Ollama (Local, ฟรี, ฉลาด!)
                          </div>
                        </SelectItem>
                        <SelectItem value="openai">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-green-500" />
                            OpenAI (GPT-4, GPT-3.5)
                          </div>
                        </SelectItem>
                        <SelectItem value="claude">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            Claude (Anthropic)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Ollama Settings */}
                  {llmConfig.provider === 'ollama' && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          <Home className="h-4 w-4 text-blue-600" />
                          Ollama Settings
                        </h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={checkOllamaConnection}
                          disabled={isCheckingOllama}
                        >
                          {isCheckingOllama ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                          )}
                          ทดสอบ
                        </Button>
                      </div>

                      {/* Connection Status */}
                      {ollamaConnected !== null && (
                        <Alert className={ollamaConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                          <AlertDescription className="flex items-center gap-2 text-sm">
                            {ollamaConnected ? (
                              <>
                                <Wifi className="h-4 w-4 text-green-600" />
                                <span className="text-green-800">เชื่อมต่อ Ollama สำเร็จ!</span>
                              </>
                            ) : (
                              <>
                                <WifiOff className="h-4 w-4 text-red-600" />
                                <span className="text-red-800">ไม่พบ Ollama - ตรวจสอบว่ารันอยู่หรือไม่</span>
                              </>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Ollama URL */}
                      <div className="space-y-2">
                        <Label>Ollama URL</Label>
                        <Input
                          value={llmConfig.ollamaUrl || 'http://localhost:11434'}
                          onChange={(e) => setLlmConfig(prev => ({ ...prev, ollamaUrl: e.target.value }))}
                          placeholder="http://localhost:11434"
                        />
                      </div>

                      {/* Model Selection */}
                      <div className="space-y-2">
                        <Label>Model</Label>
                        {ollamaModels.length > 0 ? (
                          <Select
                            value={llmConfig.ollamaModel}
                            onValueChange={(v) => setLlmConfig(prev => ({ ...prev, ollamaModel: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือก Model" />
                            </SelectTrigger>
                            <SelectContent>
                              {ollamaModels.map(model => (
                                <SelectItem key={model.name} value={model.name}>
                                  {model.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Select
                            value={llmConfig.ollamaModel}
                            onValueChange={(v) => setLlmConfig(prev => ({ ...prev, ollamaModel: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="เลือก Model" />
                            </SelectTrigger>
                            <SelectContent>
                              {RECOMMENDED_MODELS.map(model => (
                                <SelectItem key={model.name} value={model.name}>
                                  <div className="flex items-center gap-2">
                                    <span>{model.displayName}</span>
                                    {model.recommended && (
                                      <Badge variant="secondary" className="text-xs">แนะนำ</Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Installation Instructions */}
                      <div className="p-3 bg-white rounded-lg border text-xs space-y-2">
                        <p className="font-medium">📦 วิธีติดตั้ง Ollama:</p>
                        <ol className="list-decimal list-inside space-y-1 text-gray-600">
                          <li>ดาวน์โหลดจาก <a href="https://ollama.ai" target="_blank" rel="noopener" className="text-blue-600 underline">ollama.ai</a></li>
                          <li>ติดตั้งและเปิดแอป Ollama</li>
                          <li>เปิด Terminal แล้วรัน: <code className="bg-gray-100 px-1 rounded">ollama pull llama3.2</code></li>
                          <li>กลับมากดทดสอบการเชื่อมต่อ</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  {/* OpenAI/Claude Settings */}
                  {(llmConfig.provider === 'openai' || llmConfig.provider === 'claude') && (
                    <>
                      <div className="space-y-2">
                        <Label>API Key</Label>
                        <Input
                          type="password"
                          value={llmConfig.apiKey || ''}
                          onChange={(e) => setLlmConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder={`ใส่ ${llmConfig.provider === 'openai' ? 'OpenAI' : 'Claude'} API Key`}
                        />
                        <p className="text-xs text-gray-500">
                          {llmConfig.provider === 'openai'
                            ? 'รับ API Key ได้ที่ platform.openai.com'
                            : 'รับ API Key ได้ที่ console.anthropic.com'}
                        </p>
                      </div>

                      {/* Model Selection */}
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Select
                          value={llmConfig.model || ''}
                          onValueChange={(v) => setLlmConfig(prev => ({ ...prev, model: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="เลือก Model" />
                          </SelectTrigger>
                          <SelectContent>
                            {llmConfig.provider === 'openai' ? (
                              <>
                                <SelectItem value="gpt-4o-mini">GPT-4o Mini (เร็ว, ถูก)</SelectItem>
                                <SelectItem value="gpt-4o">GPT-4o (ฉลาดสุด)</SelectItem>
                                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (ถูกที่สุด)</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="claude-3-haiku-20240307">Claude 3 Haiku (เร็ว, ถูก)</SelectItem>
                                <SelectItem value="claude-3-sonnet-20240229">Claude 3 Sonnet (สมดุล)</SelectItem>
                                <SelectItem value="claude-3-opus-20240229">Claude 3 Opus (ฉลาดสุด)</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Info Box */}
                  <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                    <div className="flex gap-2">
                      <HelpCircle className="h-5 w-5 text-indigo-600 shrink-0" />
                      <div className="text-xs text-indigo-800">
                        <p className="font-medium mb-1">เปรียบเทียบ:</p>
                        <ul className="space-y-1">
                          <li>• <strong>Rule-based:</strong> ฟรี, เร็ว, ตอบตาม pattern</li>
                          <li>• <strong>Ollama:</strong> ฟรี, ฉลาด, รันบนเครื่อง 🌟</li>
                          <li>• <strong>OpenAI/Claude:</strong> ฉลาดมาก, มีค่าใช้จ่าย</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setShowSettings(false)}>
                    บันทึก
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
