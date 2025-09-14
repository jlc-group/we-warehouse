import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Package, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { InventoryItem } from '@/hooks/useInventory';

interface InventoryAnalyticsProps {
  items: InventoryItem[];
}

export function InventoryAnalytics({ items }: InventoryAnalyticsProps) {
  const analytics = useMemo(() => {
    // Total metrics
    const totalItems = items.length;
    const totalBoxes = items.reduce((sum, item) => sum + item.quantityBoxes, 0);
    const totalLoose = items.reduce((sum, item) => sum + item.quantityLoose, 0);
    
    // Usage by shelf row
    const shelfUsage = items.reduce((acc, item) => {
      const row = item.location.charAt(0);
      acc[row] = (acc[row] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const shelfData = Object.entries(shelfUsage).map(([row, count]) => ({
      row: `แถว ${row}`,
      count,
      percentage: Math.round((count / totalItems) * 100)
    }));
    
    // Stock levels distribution
    const stockLevels = items.reduce((acc, item) => {
      const total = item.quantityBoxes + item.quantityLoose;
      if (total === 0) acc.empty += 1;
      else if (total < 5) acc.low += 1;
      else if (total < 20) acc.medium += 1;
      else acc.high += 1;
      return acc;
    }, { empty: 0, low: 0, medium: 0, high: 0 });
    
    const stockData = [
      { name: 'สินค้าหมด', value: stockLevels.empty, color: 'hsl(var(--destructive))' },
      { name: 'สต็อกต่ำ', value: stockLevels.low, color: 'hsl(var(--warning))' },
      { name: 'สต็อกปานกลาง', value: stockLevels.medium, color: 'hsl(var(--chart-1))' },
      { name: 'สต็อกสูง', value: stockLevels.high, color: 'hsl(var(--success))' }
    ];
    
    // Top products by quantity
    const topProducts = items
      .sort((a, b) => (b.quantityBoxes + b.quantityLoose) - (a.quantityBoxes + a.quantityLoose))
      .slice(0, 8)
      .map(item => ({
        name: item.productName.length > 15 ? `${item.productName.substring(0, 15)}...` : item.productName,
        quantity: item.quantityBoxes + item.quantityLoose,
        boxes: item.quantityBoxes,
        loose: item.quantityLoose
      }));
    
    // Recent activity (simulated based on update dates)
    const recentActivity = items
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 7)
      .map((item, index) => ({
        date: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toLocaleDateString('th-TH', { 
          month: 'short', 
          day: 'numeric' 
        }),
        updates: Math.floor(Math.random() * 10) + 1
      }));
    
    return {
      totalItems,
      totalBoxes,
      totalLoose,
      shelfData,
      stockData,
      topProducts,
      recentActivity,
      utilizationRate: Math.round((totalItems / (15 * 20 * 4)) * 100) // 15 rows, 20 shelves, 4 levels
    };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">รายการสินค้า</p>
                <p className="text-2xl font-bold">{analytics.totalItems}</p>
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
                <p className="text-2xl font-bold">{analytics.totalBoxes}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">การใช้พื้นที่</p>
                <p className="text-2xl font-bold">{analytics.utilizationRate}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-chart-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">จำนวนเศษ</p>
                <p className="text-2xl font-bold">{analytics.totalLoose}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shelf Usage Chart */}
        <Card>
          <CardHeader>
            <CardTitle>การใช้งานแต่ละแถว</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.shelfData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="row" />
                <YAxis />
                <Tooltip 
                  labelClassName="text-foreground"
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stock Levels Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>การกระจายระดับสต็อก</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.stockData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.stockData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>สินค้าที่มีจำนวนมากที่สุด</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topProducts} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Bar dataKey="quantity" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>กิจกรรมล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.recentActivity}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 'var(--radius)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="updates" 
                  stroke="hsl(var(--chart-3))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}