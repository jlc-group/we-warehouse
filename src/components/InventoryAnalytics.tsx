import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Package, TrendingUp, Archive, Gauge } from 'lucide-react';
import type { InventoryItem } from '@/hooks/useInventory';

interface InventoryAnalyticsProps {
  items: InventoryItem[];
}

export function InventoryAnalytics({ items }: InventoryAnalyticsProps) {
  // Calculate metrics
  const totalItems = items.length;
  const totalBoxes = items.reduce((sum, item) => sum + item.quantity_boxes, 0);
  const totalLoose = items.reduce((sum, item) => sum + item.quantity_loose, 0);

  // Shelf usage by row
  const shelfUsage = items.reduce((acc, item) => {
    const row = item.location.split('/')[0];
    acc[row] = (acc[row] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const shelfData = Object.entries(shelfUsage).map(([row, count]) => ({
    row: `แถว ${row}`,
    count
  }));

  // Calculate stock levels
  const stockLevels = items.reduce((acc, item) => {
    const total = item.quantity_boxes + item.quantity_loose;
    if (total === 0) acc.empty++;
    else if (total < 5) acc.low++;
    else if (total < 20) acc.medium++;
    else acc.high++;
    return acc;
  }, { empty: 0, low: 0, medium: 0, high: 0 });

  // Top products by quantity
  const topProducts = items
    .map(item => ({
      name: item.product_name,
      total: item.quantity_boxes + item.quantity_loose
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Recent activity (simulated)
  const recentActivity = [
    { day: 'จ.', items: Math.floor(Math.random() * 10) + 5 },
    { day: 'อ.', items: Math.floor(Math.random() * 10) + 5 },
    { day: 'พ.', items: Math.floor(Math.random() * 10) + 5 },
    { day: 'พฤ.', items: Math.floor(Math.random() * 10) + 5 },
    { day: 'ศ.', items: Math.floor(Math.random() * 10) + 5 },
    { day: 'ส.', items: Math.floor(Math.random() * 10) + 5 },
    { day: 'อา.', items: Math.floor(Math.random() * 10) + 5 },
  ];

  const stockLevelData = [
    { name: 'หมด', value: stockLevels.empty, color: '#ef4444' },
    { name: 'ต่ำ', value: stockLevels.low, color: '#f59e0b' },
    { name: 'ปานกลาง', value: stockLevels.medium, color: '#3b82f6' },
    { name: 'สูง', value: stockLevels.high, color: '#10b981' },
  ];

  // Calculate utilization rate (assuming 144 total positions: 3 rows * 4 levels * 12 positions)
  const totalPositions = 144;
  const utilization = ((totalItems / totalPositions) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">รายการทั้งหมด</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">จำนวนลัง</p>
                <p className="text-2xl font-bold">{totalBoxes}</p>
              </div>
              <Archive className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">จำนวนเศษ</p>
                <p className="text-2xl font-bold">{totalLoose}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">อัตราการใช้พื้นที่</p>
                <p className="text-2xl font-bold">{utilization}%</p>
              </div>
              <Gauge className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shelf Usage */}
        <Card>
          <CardHeader>
            <CardTitle>การใช้งานแถวชั้น</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={shelfData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="row" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Levels */}
        <Card>
          <CardHeader>
            <CardTitle>สถานะสต็อก</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stockLevelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stockLevelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>สินค้าที่มีมากที่สุด</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              กิจกรรมล่าสุด (7 วัน)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={recentActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="items" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}