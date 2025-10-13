#!/usr/bin/env node
/**
 * Test Reserved Stock System
 * ทดสอบการจองสต็อก end-to-end
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load .env
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    value = value.replace(/^["'](.*)["']$/, '$1');
    envVars[key] = value;
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);

console.log('🧪 Testing Reserved Stock System\n');

async function testReservation() {
  try {
    // 1. Get a sample inventory item
    console.log('1️⃣  Finding a sample inventory item...');
    const { data: items, error: itemError } = await supabase
      .from('inventory_items')
      .select('id, product_name, location, total_base_quantity, reserved_quantity, warehouse_id')
      .gt('total_base_quantity', 10)
      .limit(1);

    if (itemError || !items || items.length === 0) {
      console.error('❌ No inventory items found with sufficient stock');
      return;
    }

    const item = items[0];
    console.log(`   ✅ Found: ${item.product_name} at ${item.location}`);
    console.log(`   📦 Total: ${item.total_base_quantity}, Reserved: ${item.reserved_quantity || 0}`);
    console.log(`   🆔 ID: ${item.id}\n`);

    // 2. Create a test reservation
    console.log('2️⃣  Creating test reservation (10 units)...');
    const { data: reservationId, error: reserveError } = await supabase
      .rpc('reserve_stock_safe', {
        p_inventory_item_id: item.id,
        p_fulfillment_item_id: null,
        p_warehouse_code: 'A',
        p_location: item.location,
        p_level1_qty: 0,
        p_level2_qty: 0,
        p_level3_qty: 10,
        p_total_qty: 10,
        p_reserved_by: null, // NULL instead of fake UUID
        p_notes: 'Test reservation from CLI'
      });

    if (reserveError) {
      console.error('   ❌ Error creating reservation:', reserveError.message);
      return;
    }

    console.log(`   ✅ Reservation created! ID: ${reservationId}\n`);

    // 3. Check updated inventory
    console.log('3️⃣  Checking inventory after reservation...');
    const { data: updatedItem, error: checkError } = await supabase
      .from('inventory_available')
      .select('quantity, reserved_quantity, available_quantity')
      .eq('id', item.id)
      .single();

    if (checkError) {
      console.error('   ❌ Error checking inventory:', checkError.message);
    } else {
      console.log(`   📦 Total: ${updatedItem.quantity}`);
      console.log(`   🔒 Reserved: ${updatedItem.reserved_quantity}`);
      console.log(`   ✅ Available: ${updatedItem.available_quantity}\n`);
    }

    // 4. View the reservation
    console.log('4️⃣  Viewing reservation details...');
    const { data: reservation, error: viewError } = await supabase
      .from('stock_reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (viewError) {
      console.error('   ❌ Error viewing reservation:', viewError.message);
    } else {
      console.log(`   📋 Status: ${reservation.status}`);
      console.log(`   📦 Quantity: ${reservation.reserved_total_quantity}`);
      console.log(`   📅 Reserved at: ${new Date(reservation.reserved_at).toLocaleString('th-TH')}\n`);
    }

    // 5. Ask user what to do
    console.log('5️⃣  What do you want to do next?');
    console.log('   A) Cancel reservation (คืนสต็อก)');
    console.log('   B) Fulfill reservation (หักสต็อกจริง)');
    console.log('   C) Leave it as is (ปล่อยไว้)\n');
    console.log('💡 To test:');
    console.log(`   • Cancel: node test-reservation.mjs cancel ${reservationId}`);
    console.log(`   • Fulfill: node test-reservation.mjs fulfill ${reservationId}`);
    console.log(`   • View dashboard: เครื่องมือ → 🔒 Reserved Stock\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function cancelReservation(reservationId) {
  console.log(`🔄 Cancelling reservation ${reservationId}...\n`);

  const { data, error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: reservationId,
    p_cancelled_by: null
  });

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Reservation cancelled! Stock returned.\n');

    // Check status
    const { data: reservation } = await supabase
      .from('stock_reservations')
      .select('status, cancelled_at')
      .eq('id', reservationId)
      .single();

    if (reservation) {
      console.log(`   Status: ${reservation.status}`);
      console.log(`   Cancelled at: ${new Date(reservation.cancelled_at).toLocaleString('th-TH')}\n`);
    }
  }
}

async function fulfillReservation(reservationId) {
  console.log(`✅ Fulfilling reservation ${reservationId}...\n`);

  const { data, error } = await supabase.rpc('fulfill_reservation', {
    p_reservation_id: reservationId,
    p_fulfilled_by: null
  });

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ Reservation fulfilled! Stock deducted.\n');

    // Check status
    const { data: reservation } = await supabase
      .from('stock_reservations')
      .select('status, fulfilled_at')
      .eq('id', reservationId)
      .single();

    if (reservation) {
      console.log(`   Status: ${reservation.status}`);
      console.log(`   Fulfilled at: ${new Date(reservation.fulfilled_at).toLocaleString('th-TH')}\n`);
    }
  }
}

// Main
const args = process.argv.slice(2);
const command = args[0];
const reservationId = args[1];

if (command === 'cancel' && reservationId) {
  cancelReservation(reservationId);
} else if (command === 'fulfill' && reservationId) {
  fulfillReservation(reservationId);
} else {
  testReservation();
}
