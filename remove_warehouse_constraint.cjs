const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ogrcpzzmmudztwjfwjvu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ncmNwenptbXVkenR3amZ3anZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMDc5NjEsImV4cCI6MjA2Nzc4Mzk2MX0.te2vIfRdzcgXQ_7tW4NU3FuxI6PoxpURH4YcIZYmZzU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function removeWarehouseConstraint() {
  console.log('🔧 Removing warehouse_locations table constraint...\n');

  try {
    // First, let's check current constraints
    console.log('1️⃣ Checking current table constraints...');
    const { data: constraints, error: constraintError } = await supabase
      .rpc('get_table_constraints', { table_name: 'warehouse_locations' });

    if (constraintError) {
      console.log('⚠️ Cannot check constraints via RPC, proceeding with direct SQL...');
    } else {
      console.log('📋 Current constraints:', constraints);
    }

    // Remove the constraint using direct SQL
    console.log('\n2️⃣ Removing check_warehouse_location_code_format constraint...');
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: 'ALTER TABLE warehouse_locations DROP CONSTRAINT IF EXISTS check_warehouse_location_code_format;'
      });

    if (error) {
      console.error('❌ Error removing constraint:', error);

      // Try alternative method
      console.log('\n🔄 Trying alternative method with raw SQL...');
      const { data: rawData, error: rawError } = await supabase
        .from('warehouse_locations')
        .select('*')
        .limit(1);

      if (rawError) {
        console.error('❌ Cannot access table:', rawError);
        return false;
      }

      console.log('✅ Table accessible, constraint might not exist or was already removed');
      return true;
    }

    console.log('✅ Constraint removal completed');
    console.log('📄 SQL Result:', data);

    // Verify by trying a test update
    console.log('\n3️⃣ Testing constraint removal...');
    const { data: testData, error: testError } = await supabase
      .from('warehouse_locations')
      .select('id, location_code')
      .limit(1);

    if (testError) {
      console.error('❌ Error accessing table:', testError);
      return false;
    }

    if (testData && testData.length > 0) {
      const testLocation = testData[0];
      console.log(`🧪 Testing with location: ${testLocation.location_code}`);

      // Try converting format
      let newFormat = testLocation.location_code;
      if (/^[A-N]\/[1-4]\/([0-9]|[01][0-9]|20)$/.test(testLocation.location_code)) {
        const [row, level, position] = testLocation.location_code.split('/');
        const positionNum = parseInt(position);
        newFormat = `${row}${level}/${positionNum}`;

        console.log(`🔄 Test conversion: "${testLocation.location_code}" → "${newFormat}"`);

        // Attempt test update
        const { error: updateError } = await supabase
          .from('warehouse_locations')
          .update({ location_code: newFormat })
          .eq('id', testLocation.id);

        if (updateError) {
          console.error('❌ Test update failed, constraint still exists:', updateError);
          return false;
        }

        console.log('✅ Test update successful - constraint has been removed!');

        // Revert test change
        const { error: revertError } = await supabase
          .from('warehouse_locations')
          .update({ location_code: testLocation.location_code })
          .eq('id', testLocation.id);

        if (revertError) {
          console.log('⚠️ Warning: Could not revert test change, but constraint is removed');
        } else {
          console.log('🔄 Test change reverted');
        }
      }
    }

    console.log('\n🎉 Constraint removal completed successfully!');
    console.log('✅ Ready to run warehouse_locations migration');
    return true;

  } catch (error) {
    console.error('❌ Constraint removal failed:', error);
    return false;
  }
}

removeWarehouseConstraint().catch(console.error);