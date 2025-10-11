#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Files to fix
const files = [
  'src/components/AccountingDashboard.tsx',
  'src/components/CustomerSelector.tsx',
  'src/components/DatabaseMigrationStatus.tsx',
  'src/components/EmergencyFallback.tsx',
  'src/components/FulfillmentModeSelector.tsx',
  'src/components/FulfillmentQueue.tsx',
  'src/components/LocationManagement.tsx',
  'src/components/ManualExportModal.tsx',
  'src/components/ManualFulfillmentModal.tsx',
  'src/components/MigrationGuide.tsx',
  'src/components/MultiLocationProductSelector.tsx',
  'src/components/PermissionGate.tsx',
  'src/components/PurchaseOrdersList.tsx',
  'src/components/SKUDisplay.tsx',
  'src/components/SalesOrderModal.tsx',
  'src/components/SalesSystemDebug.tsx',
  'src/components/SalesSystemEmergencyDashboard.tsx',
  'src/components/SalesTab.tsx',
  'src/components/UnifiedExportHistory.tsx',
  'src/components/WarehouseOperations.tsx',
  'src/components/WarehousePickingSystem.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/table.tsx',
  'src/components/ui/textarea.tsx',
  'src/pages/SimpleAuth.tsx'
];

let totalFixed = 0;

files.forEach(file => {
  const filePath = resolve(file);
  try {
    let content = readFileSync(filePath, 'utf8');
    const original = content;

    // Track what we need to import
    const needsImports = {
      FormEvent: false,
      MouseEvent: false,
      ChangeEvent: false,
      KeyboardEvent: false,
      FocusEvent: false,
      TouchEvent: false,
      WheelEvent: false,
      AnimationEvent: false,
      TransitionEvent: false,
      ClipboardEvent: false,
      DragEvent: false,
      PointerEvent: false,
      UIEvent: false,
      SyntheticEvent: false
    };

    // Check what React.* types are used
    Object.keys(needsImports).forEach(eventType => {
      if (content.includes(`React.${eventType}`)) {
        needsImports[eventType] = true;
      }
    });

    // Remove React.FC
    content = content.replace(/: React\.FC(<[^>]+>)?/g, '');

    // Replace React.* event types
    Object.keys(needsImports).forEach(eventType => {
      if (needsImports[eventType]) {
        content = content.replace(new RegExp(`React\\.${eventType}`, 'g'), eventType);
      }
    });

    // If we changed anything, update imports
    if (content !== original) {
      const neededTypes = Object.keys(needsImports).filter(k => needsImports[k]);

      if (neededTypes.length > 0) {
        // Find existing react import
        const importMatch = content.match(/import\s+{([^}]+)}\s+from\s+['"]react['"]/);

        if (importMatch) {
          // Add to existing import
          const existingImports = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);
          const allImports = [...new Set([...existingImports, ...neededTypes])].sort();
          content = content.replace(
            /import\s+{[^}]+}\s+from\s+['"]react['"]/,
            `import { ${allImports.join(', ')} } from 'react'`
          );
        } else {
          // Add new import at the top (after other imports)
          const lines = content.split('\n');
          let insertIndex = 0;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
              insertIndex = i + 1;
            } else if (insertIndex > 0) {
              break;
            }
          }
          lines.splice(insertIndex, 0, `import { ${neededTypes.join(', ')} } from 'react';`);
          content = lines.join('\n');
        }
      }

      writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      totalFixed++;
    } else {
      console.log(`⏭️  Skipped (no changes): ${file}`);
    }
  } catch (err) {
    console.error(`❌ Error processing ${file}:`, err.message);
  }
});

console.log(`\n🎉 Fixed ${totalFixed} files out of ${files.length}`);
