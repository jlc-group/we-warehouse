import { supabase } from '@/integrations/supabase/client';
import { secureGatewayClient } from '@/utils/secureGatewayClient';

// TypeScript interfaces for event logging
export interface SystemEvent {
  id: string;
  event_type: EventType;
  event_category: string;
  event_action: string;
  event_title: string;
  event_description?: string;
  entity_type?: string;
  entity_id?: string;
  related_entities?: Record<string, any>;
  event_data?: Record<string, any>;
  metadata?: Record<string, any>;
  changes_before?: Record<string, any>;
  changes_after?: Record<string, any>;
  user_id?: string;
  user_agent?: string;
  ip_address?: string;
  session_id?: string;
  status: EventStatus;
  severity: EventSeverity;
  warehouse_id?: string;
  location_context?: string;
  processing_time_ms?: number;
  api_endpoint?: string;
  http_method?: string;
  response_status?: number;
  created_at: string;
  occurred_at: string;
}

export type EventType = 'inventory' | 'user_action' | 'system' | 'error' | 'business_process';
export type EventStatus = 'success' | 'warning' | 'error' | 'info';
export type EventSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface EventLogFilters {
  event_type?: EventType;
  event_category?: string;
  status?: EventStatus;
  severity?: EventSeverity;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  warehouse_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface CreateEventParams {
  event_type: EventType;
  event_category: string;
  event_action: string;
  event_title: string;
  event_description?: string;
  entity_type?: string;
  entity_id?: string;
  related_entities?: Record<string, any>;
  event_data?: Record<string, any>;
  metadata?: Record<string, any>;
  changes_before?: Record<string, any>;
  changes_after?: Record<string, any>;
  user_id?: string;
  status?: EventStatus;
  severity?: EventSeverity;
  warehouse_id?: string;
  location_context?: string;
  processing_time_ms?: number;
  api_endpoint?: string;
  http_method?: string;
  response_status?: number;
}

class EventLoggingService {
  private getCurrentUser(): string {
    // Since this app doesn't use authentication, generate a session-based user ID
    const sessionUserId = sessionStorage.getItem('warehouse_user_id');
    if (sessionUserId) {
      return sessionUserId;
    }

    // Generate a new session user ID
    const newUserId = crypto.randomUUID();
    sessionStorage.setItem('warehouse_user_id', newUserId);
    return newUserId;
  }

  private getSessionInfo() {
    return {
      user_id: this.getCurrentUser(),
      user_agent: navigator.userAgent,
      session_id: sessionStorage.getItem('warehouse_session_id') || crypto.randomUUID(),
      ip_address: null, // This would need to be set server-side
    };
  }

  /**
   * Log a comprehensive system event
   */
  async logEvent(params: CreateEventParams): Promise<{ success: boolean; event_id?: string; error?: string }> {
    try {
      const sessionInfo = this.getSessionInfo();

      const eventData = {
        ...params,
        ...sessionInfo,
        occurred_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('system_events')
        .insert(eventData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Failed to log event:', error);
        return { success: false, error: error.message };
      }

      return { success: true, event_id: data.id };
    } catch (error) {
      console.error('❌ Event logging service error:', error);
      return { success: false, error: 'Failed to log event' };
    }
  }

  /**
   * Log inventory-related events
   */
  async logInventoryEvent(
    action: 'create' | 'update' | 'delete' | 'transfer',
    inventoryId: string,
    title: string,
    description?: string,
    changesBefore?: Record<string, any>,
    changesAfter?: Record<string, any>,
    additionalData?: Record<string, any>
  ) {
    return this.logEvent({
      event_type: 'inventory',
      event_category: 'stock_movement',
      event_action: action,
      event_title: title,
      event_description: description,
      entity_type: 'inventory_item',
      entity_id: inventoryId,
      changes_before: changesBefore,
      changes_after: changesAfter,
      event_data: additionalData,
      status: 'success',
      severity: 'info',
    });
  }

  /**
   * Log user actions (UI interactions)
   */
  async logUserAction(
    action: string,
    title: string,
    description?: string,
    entityType?: string,
    entityId?: string,
    eventData?: Record<string, any>
  ) {
    return this.logEvent({
      event_type: 'user_action',
      event_category: 'ui_interaction',
      event_action: action,
      event_title: title,
      event_description: description,
      entity_type: entityType,
      entity_id: entityId,
      event_data: eventData,
      status: 'info',
      severity: 'info',
    });
  }

  /**
   * Log business process events (orders, transfers, etc.)
   */
  async logBusinessProcess(
    process: string,
    action: string,
    title: string,
    description?: string,
    entityType?: string,
    entityId?: string,
    eventData?: Record<string, any>,
    severity: EventSeverity = 'info'
  ) {
    return this.logEvent({
      event_type: 'business_process',
      event_category: process,
      event_action: action,
      event_title: title,
      event_description: description,
      entity_type: entityType,
      entity_id: entityId,
      event_data: eventData,
      status: 'success',
      severity,
    });
  }

  /**
   * Log system errors
   */
  async logError(
    title: string,
    error: Error | string,
    context?: {
      api_endpoint?: string;
      http_method?: string;
      response_status?: number;
      entity_type?: string;
      entity_id?: string;
      additional_data?: Record<string, any>;
    }
  ) {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'object' ? error.stack : undefined;

    return this.logEvent({
      event_type: 'error',
      event_category: 'application_error',
      event_action: 'error_occurred',
      event_title: title,
      event_description: errorMessage,
      entity_type: context?.entity_type,
      entity_id: context?.entity_id,
      event_data: {
        error_message: errorMessage,
        error_stack: errorStack,
        ...context?.additional_data,
      },
      api_endpoint: context?.api_endpoint,
      http_method: context?.http_method,
      response_status: context?.response_status,
      status: 'error',
      severity: 'high',
    });
  }

  /**
   * Log QR code scanning events
   */
  async logQRScan(
    location: string,
    success: boolean,
    action?: string,
    eventData?: Record<string, any>
  ) {
    return this.logEvent({
      event_type: 'user_action',
      event_category: 'qr_scanning',
      event_action: success ? 'scan_success' : 'scan_failure',
      event_title: success ? 'สแกน QR Code สำเร็จ' : 'สแกน QR Code ไม่สำเร็จ',
      event_description: `สแกน QR Code สำหรับตำแหน่ง ${location}`,
      location_context: location,
      event_data: {
        location,
        intended_action: action,
        ...eventData,
      },
      status: success ? 'success' : 'error',
      severity: 'info',
    });
  }

  /**
   * Fetch events with filtering and pagination
   */
  async getEvents(filters: EventLogFilters = {}): Promise<{
    success: boolean;
    data?: SystemEvent[];
    error?: string;
    total_count?: number;
  }> {
    try {
      let query = supabase
        .from('system_events')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.event_type) {
        query = query.eq('event_type', filters.event_type);
      }
      if (filters.event_category) {
        query = query.eq('event_category', filters.event_category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type);
      }
      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id);
      }
      if (filters.warehouse_id) {
        query = query.eq('warehouse_id', filters.warehouse_id);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);

      // Order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('❌ Failed to fetch events:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: data as SystemEvent[],
        total_count: count || 0
      };
    } catch (error) {
      console.error('❌ Event fetching service error:', error);
      return { success: false, error: 'Failed to fetch events' };
    }
  }

  /**
   * Get recent events for dashboard
   */
  async getRecentEvents(limit: number = 20) {
    return this.getEvents({ limit });
  }

  /**
   * Get error events for monitoring
   */
  async getErrorEvents(limit: number = 50) {
    return this.getEvents({
      status: 'error',
      limit
    });
  }

  /**
   * Get inventory events for a specific item
   */
  async getInventoryEvents(inventoryId: string, limit: number = 30) {
    return this.getEvents({
      event_type: 'inventory',
      entity_id: inventoryId,
      limit
    });
  }

  /**
   * Get events for a specific location
   */
  async getLocationEvents(location: string, limit: number = 30) {
    try {
      const { data, error } = await supabase
        .from('system_events')
        .select('*')
        .eq('location_context', location)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: data as SystemEvent[] };
    } catch (error) {
      return { success: false, error: 'Failed to fetch location events' };
    }
  }

  /**
   * Get event statistics for dashboard
   */
  async getEventStats(timeframe: '24h' | '7d' | '30d' = '24h') {
    try {
      const timeframeSql = {
        '24h': "NOW() - INTERVAL '24 hours'",
        '7d': "NOW() - INTERVAL '7 days'",
        '30d': "NOW() - INTERVAL '30 days'"
      };

      const { data, error } = await supabase
        .from('system_events')
        .select('event_type, status, severity')
        .gte('created_at', timeframeSql[timeframe]);

      if (error) {
        return { success: false, error: error.message };
      }

      // Process statistics
      const stats = {
        total_events: data.length,
        by_type: {} as Record<string, number>,
        by_status: {} as Record<string, number>,
        by_severity: {} as Record<string, number>,
      };

      data.forEach((event: any) => {
        stats.by_type[event.event_type] = (stats.by_type[event.event_type] || 0) + 1;
        stats.by_status[event.status] = (stats.by_status[event.status] || 0) + 1;
        stats.by_severity[event.severity] = (stats.by_severity[event.severity] || 0) + 1;
      });

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: 'Failed to fetch event statistics' };
    }
  }
}

// Export singleton instance
export const eventLogger = new EventLoggingService();

// Convenience functions for common logging scenarios
export const logUserAction = eventLogger.logUserAction.bind(eventLogger);
export const logInventoryEvent = eventLogger.logInventoryEvent.bind(eventLogger);
export const logBusinessProcess = eventLogger.logBusinessProcess.bind(eventLogger);
export const logError = eventLogger.logError.bind(eventLogger);
export const logQRScan = eventLogger.logQRScan.bind(eventLogger);

// Hook for React components
export const useEventLogging = () => {
  return {
    logUserAction,
    logInventoryEvent,
    logBusinessProcess,
    logError,
    logQRScan,
    getEvents: eventLogger.getEvents.bind(eventLogger),
    getRecentEvents: eventLogger.getRecentEvents.bind(eventLogger),
    getErrorEvents: eventLogger.getErrorEvents.bind(eventLogger),
    getInventoryEvents: eventLogger.getInventoryEvents.bind(eventLogger),
    getLocationEvents: eventLogger.getLocationEvents.bind(eventLogger),
    getEventStats: eventLogger.getEventStats.bind(eventLogger),
  };
};

export default eventLogger;