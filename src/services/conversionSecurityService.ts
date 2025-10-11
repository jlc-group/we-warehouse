import type { ConversionRateData } from '@/types';

// Permission levels
export enum ConversionPermission {
  READ = 'conversion:read',
  CREATE = 'conversion:create',
  UPDATE = 'conversion:update',
  DELETE = 'conversion:delete',
  BATCH_UPDATE = 'conversion:batch_update',
  ADMIN = 'conversion:admin'
}

// User roles that can access conversion features
export enum UserRole {
  VIEWER = 'viewer',
  WAREHOUSE_STAFF = 'warehouse_staff',
  INVENTORY_MANAGER = 'inventory_manager',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin'
}

// Role-permission mapping
const ROLE_PERMISSIONS: Record<UserRole, ConversionPermission[]> = {
  [UserRole.VIEWER]: [ConversionPermission.READ],
  [UserRole.WAREHOUSE_STAFF]: [
    ConversionPermission.READ,
    ConversionPermission.CREATE,
    ConversionPermission.UPDATE
  ],
  [UserRole.INVENTORY_MANAGER]: [
    ConversionPermission.READ,
    ConversionPermission.CREATE,
    ConversionPermission.UPDATE,
    ConversionPermission.DELETE,
    ConversionPermission.BATCH_UPDATE
  ],
  [UserRole.ADMIN]: [
    ConversionPermission.READ,
    ConversionPermission.CREATE,
    ConversionPermission.UPDATE,
    ConversionPermission.DELETE,
    ConversionPermission.BATCH_UPDATE,
    ConversionPermission.ADMIN
  ],
  [UserRole.SUPER_ADMIN]: Object.values(ConversionPermission)
};

// Security validation results
export interface SecurityValidationResult {
  allowed: boolean;
  reason?: string;
  warnings?: string[];
}

// Audit log entry
export interface ConversionAuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  sku?: string;
  oldData?: Partial<ConversionRateData>;
  newData?: Partial<ConversionRateData>;
  success: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

class ConversionSecurityService {
  private static instance: ConversionSecurityService;
  private auditLogs: ConversionAuditLog[] = [];
  private suspiciousActivity: Map<string, number> = new Map();
  private readonly MAX_AUDIT_LOGS = 10000;
  private readonly SUSPICIOUS_THRESHOLD = 50; // Operations per hour

  static getInstance(): ConversionSecurityService {
    if (!ConversionSecurityService.instance) {
      ConversionSecurityService.instance = new ConversionSecurityService();
    }
    return ConversionSecurityService.instance;
  }

  // Get current user (simplified - in real app would get from auth context)
  private getCurrentUser(): { id: string; role: UserRole } {
    // In real implementation, this would come from authentication context
    return {
      id: '00000000-0000-0000-0000-000000000000',
      role: UserRole.INVENTORY_MANAGER // Default role for now
    };
  }

  // Check if user has permission
  hasPermission(permission: ConversionPermission): boolean {
    const user = this.getCurrentUser();
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  }

  // Validate security for conversion operations
  validateOperation(
    operation: ConversionPermission,
    data?: Partial<ConversionRateData>
  ): SecurityValidationResult {
    const user = this.getCurrentUser();
    const warnings: string[] = [];

    // Check basic permission
    if (!this.hasPermission(operation)) {
      return {
        allowed: false,
        reason: `ไม่มีสิทธิ์ในการดำเนินการ ${operation}`
      };
    }

    // Check for suspicious activity
    const activityCount = this.suspiciousActivity.get(user.id) || 0;
    if (activityCount > this.SUSPICIOUS_THRESHOLD) {
      return {
        allowed: false,
        reason: 'กิจกรรมผิดปกติ: การดำเนินการถูกระงับชั่วคราว'
      };
    }

    // Additional validations based on operation type
    switch (operation) {
      case ConversionPermission.DELETE:
        if (data?.sku && this.isProtectedSKU(data.sku)) {
          return {
            allowed: false,
            reason: 'SKU นี้ได้รับการป้องกัน ไม่สามารถลบได้'
          };
        }
        warnings.push('การลบข้อมูลอัตราแปลงไม่สามารถยกเลิกได้');
        break;

      case ConversionPermission.BATCH_UPDATE:
        if (user.role === UserRole.WAREHOUSE_STAFF) {
          return {
            allowed: false,
            reason: 'ไม่มีสิทธิ์ในการอัปเดตแบบกลุ่ม'
          };
        }
        warnings.push('การอัปเดตแบบกลุ่มอาจส่งผลกระทบต่อข้อมูลจำนวนมาก');
        break;

      case ConversionPermission.UPDATE:
        if (data && this.hasRiskyConversionRates(data)) {
          warnings.push('อัตราแปลงที่กำหนดอาจไม่ปกติ กรุณาตรวจสอบอีกครั้ง');
        }
        break;
    }

    // Track activity
    this.trackActivity(user.id);

    return {
      allowed: true,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // Check if SKU is protected (e.g., critical products)
  private isProtectedSKU(sku: string): boolean {
    // Define protected SKUs (in real app, this might come from database)
    const protectedSKUs = ['CRITICAL-001', 'ESSENTIAL-002'];
    return protectedSKUs.includes(sku);
  }

  // Check for risky conversion rates
  private hasRiskyConversionRates(data: Partial<ConversionRateData>): boolean {
    // Flag unusually high conversion rates
    if (data.unit_level1_rate && data.unit_level1_rate > 5000) return true;
    if (data.unit_level2_rate && data.unit_level2_rate > 500) return true;

    // Flag unusual ratios
    if (data.unit_level1_rate && data.unit_level2_rate) {
      const ratio = data.unit_level1_rate / data.unit_level2_rate;
      if (ratio < 5 || ratio > 200) return true; // Unusual ratio
    }

    return false;
  }

  // Track user activity for suspicious behavior detection
  private trackActivity(userId: string): void {
    const count = this.suspiciousActivity.get(userId) || 0;
    this.suspiciousActivity.set(userId, count + 1);

    // Reset counter after an hour
    setTimeout(() => {
      const currentCount = this.suspiciousActivity.get(userId) || 0;
      if (currentCount > 0) {
        this.suspiciousActivity.set(userId, Math.max(0, currentCount - 1));
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  // Log audit trail
  logAuditTrail(
    action: string,
    data?: {
      sku?: string;
      oldData?: Partial<ConversionRateData>;
      newData?: Partial<ConversionRateData>;
      success: boolean;
      errorMessage?: string;
    }
  ): void {
    const user = this.getCurrentUser();
    const auditEntry: ConversionAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId: user.id,
      action,
      sku: data?.sku,
      oldData: data?.oldData,
      newData: data?.newData,
      success: data?.success ?? true,
      errorMessage: data?.errorMessage,
      ipAddress: this.getClientIP(),
      userAgent: this.getUserAgent()
    };

    this.auditLogs.push(auditEntry);

    // Keep only recent logs to prevent memory issues
    if (this.auditLogs.length > this.MAX_AUDIT_LOGS) {
      this.auditLogs.splice(0, this.auditLogs.length - this.MAX_AUDIT_LOGS);
    }

    console.log('📋 Audit logged:', {
      action,
      sku: data?.sku,
      success: data?.success,
      user: user.id
    });
  }

  // Get client IP (simplified)
  private getClientIP(): string {
    // In real implementation, this would get actual client IP
    return '127.0.0.1';
  }

  // Get user agent (simplified)
  private getUserAgent(): string {
    if (typeof navigator !== 'undefined') {
      return navigator.userAgent;
    }
    return 'Unknown';
  }

  // Get audit logs for review
  getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    sku?: string;
    fromDate?: Date;
    toDate?: Date;
    success?: boolean;
  }): ConversionAuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action.includes(filters.action));
      }
      if (filters.sku) {
        logs = logs.filter(log => log.sku === filters.sku);
      }
      if (filters.fromDate) {
        logs = logs.filter(log => log.timestamp >= filters.fromDate!);
      }
      if (filters.toDate) {
        logs = logs.filter(log => log.timestamp <= filters.toDate!);
      }
      if (filters.success !== undefined) {
        logs = logs.filter(log => log.success === filters.success);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get security metrics
  getSecurityMetrics(): {
    totalOperations: number;
    failedOperations: number;
    suspiciousUsers: number;
    recentErrors: ConversionAuditLog[];
  } {
    const recentLogs = this.auditLogs.filter(
      log => Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const failedOperations = recentLogs.filter(log => !log.success).length;
    const suspiciousUsers = Array.from(this.suspiciousActivity.entries())
      .filter(([_, count]) => count > this.SUSPICIOUS_THRESHOLD / 2)
      .length;

    const recentErrors = this.auditLogs
      .filter(log => !log.success)
      .slice(0, 10); // Last 10 errors

    return {
      totalOperations: recentLogs.length,
      failedOperations,
      suspiciousUsers,
      recentErrors
    };
  }

  // Clear old audit logs
  clearOldLogs(olderThanDays: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialCount = this.auditLogs.length;
    this.auditLogs = this.auditLogs.filter(log => log.timestamp >= cutoffDate);
    const removedCount = initialCount - this.auditLogs.length;

    console.log(`🧹 Cleared ${removedCount} old audit logs older than ${olderThanDays} days`);
    return removedCount;
  }

  // Reset suspicious activity counters
  resetSuspiciousActivity(): void {
    this.suspiciousActivity.clear();
    console.log('🔄 Reset suspicious activity counters');
  }
}

// Export singleton instance
export const conversionSecurityService = ConversionSecurityService.getInstance();

// Export convenience functions
export const hasConversionPermission = (permission: ConversionPermission) =>
  conversionSecurityService.hasPermission(permission);

export const validateConversionOperation = (
  operation: ConversionPermission,
  data?: Partial<ConversionRateData>
) => conversionSecurityService.validateOperation(operation, data);

export const logConversionAudit = (
  action: string,
  data?: {
    sku?: string;
    oldData?: Partial<ConversionRateData>;
    newData?: Partial<ConversionRateData>;
    success: boolean;
    errorMessage?: string;
  }
) => conversionSecurityService.logAuditTrail(action, data);

export const getConversionAuditLogs = (filters?: {
  userId?: string;
  action?: string;
  sku?: string;
  fromDate?: Date;
  toDate?: Date;
  success?: boolean;
}) => conversionSecurityService.getAuditLogs(filters);

export const getConversionSecurityMetrics = () => conversionSecurityService.getSecurityMetrics();