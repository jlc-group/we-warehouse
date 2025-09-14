import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  productName: string;
  productCode: string;
  location: string;
  lot?: string;
  mfd?: string;
  quantityBoxes: number;
  quantityLoose: number;
  updatedAt: string;
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch inventory items
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('location');

      if (error) throw error;

      const mappedItems: InventoryItem[] = data?.map(item => ({
        id: item.id,
        productName: item.product_name,
        productCode: item.product_code,
        location: item.location,
        lot: item.lot || undefined,
        mfd: item.mfd || undefined,
        quantityBoxes: item.quantity_boxes,
        quantityLoose: item.quantity_loose,
        updatedAt: item.updated_at,
      })) || [];

      setItems(mappedItems);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลสินค้าได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add or update inventory item
  const saveItem = async (itemData: Omit<InventoryItem, 'id' | 'updatedAt'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "ต้องเข้าสู่ระบบ",
          description: "กรุณาเข้าสู่ระบบก่อนทำการบันทึก",
          variant: "destructive",
        });
        return;
      }

      // Check if item exists at this location
      const existingItem = items.find(item => item.location === itemData.location);
      
      if (existingItem) {
        // Update existing item
        const { error } = await supabase
          .from('inventory_items')
          .update({
            product_name: itemData.productName,
            product_code: itemData.productCode,
            lot: itemData.lot || null,
            mfd: itemData.mfd || null,
            quantity_boxes: itemData.quantityBoxes,
            quantity_loose: itemData.quantityLoose,
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Create new item
        const { error } = await supabase
          .from('inventory_items')
          .insert({
            product_name: itemData.productName,
            product_code: itemData.productCode,
            location: itemData.location,
            lot: itemData.lot || null,
            mfd: itemData.mfd || null,
            quantity_boxes: itemData.quantityBoxes,
            quantity_loose: itemData.quantityLoose,
            user_id: user.id,
          });

        if (error) throw error;
      }

      await fetchItems();
      toast({
        title: "บันทึกสำเร็จ",
        description: `บันทึกข้อมูลสินค้าที่ตำแหน่ง ${itemData.location} เรียบร้อยแล้ว`,
      });
    } catch (error) {
      console.error('Error saving inventory item:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลสินค้าได้",
        variant: "destructive",
      });
    }
  };

  // Delete inventory item
  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await fetchItems();
      toast({
        title: "ลบสำเร็จ",
        description: "ลบข้อมูลสินค้าเรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลสินค้าได้",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return {
    items,
    loading,
    saveItem,
    deleteItem,
    refetch: fetchItems,
  };
}