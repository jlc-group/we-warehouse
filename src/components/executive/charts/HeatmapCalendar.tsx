import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, subMonths, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { th } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Calendar as CalendarIcon } from 'lucide-react';

interface DayData {
  date: Date;
  count: number;
  value: number;
  orders: number;
}

interface HeatmapCalendarProps {
  data: Array<{
    created_at: string;
    quantity_exported: number;
    customer_name: string;
    unit_price?: number;
    total_value?: number;
  }>;
  monthsToShow?: number;
  onDayClick?: (date: Date) => void;
}

export const HeatmapCalendar = ({
  data,
  monthsToShow = 3,
  onDayClick
}: HeatmapCalendarProps) => {

  // Calculate heatmap data
  const { calendarData, maxCount, maxValue, stats } = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, monthsToShow - 1));
    const endDate = endOfMonth(now);

    // Create map of date -> data
    const dataByDate = new Map<string, DayData>();

    data.forEach(item => {
      const date = parseISO(item.created_at);
      const dateKey = format(date, 'yyyy-MM-dd');

      // Calculate value using actual price data
      const itemValue = item.total_value != null
        ? item.total_value
        : item.unit_price != null
          ? item.quantity_exported * item.unit_price
          : item.quantity_exported * 150;

      const existing = dataByDate.get(dateKey);
      if (existing) {
        existing.count += item.quantity_exported;
        existing.orders += 1;
        existing.value += itemValue;
      } else {
        dataByDate.set(dateKey, {
          date,
          count: item.quantity_exported,
          value: itemValue,
          orders: 1,
        });
      }
    });

    // Find max values for color scaling
    let maxCount = 0;
    let maxValue = 0;
    dataByDate.forEach(d => {
      if (d.count > maxCount) maxCount = d.count;
      if (d.value > maxValue) maxValue = d.value;
    });

    // Calculate stats
    const totalDays = dataByDate.size;
    const totalCount = Array.from(dataByDate.values()).reduce((sum, d) => sum + d.count, 0);
    const totalValue = Array.from(dataByDate.values()).reduce((sum, d) => sum + d.value, 0);
    const avgPerDay = totalDays > 0 ? totalCount / totalDays : 0;

    // Find best and worst days
    const sortedDays = Array.from(dataByDate.entries())
      .map(([dateKey, data]) => ({ dateKey, ...data }))
      .sort((a, b) => b.count - a.count);

    const bestDay = sortedDays[0];
    const worstDay = sortedDays[sortedDays.length - 1];

    return {
      calendarData: dataByDate,
      maxCount,
      maxValue,
      stats: {
        totalDays,
        totalCount,
        totalValue,
        avgPerDay,
        bestDay,
        worstDay,
      },
    };
  }, [data, monthsToShow]);

  // Generate months to display
  const months = useMemo(() => {
    const now = new Date();
    const result = [];

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      // Get all days in month
      const days = eachDayOfInterval({ start, end });

      // Get calendar weeks (pad with empty days)
      const firstDayOfWeek = getDay(start); // 0 = Sunday
      const paddingStart = Array(firstDayOfWeek).fill(null);

      const lastDayOfWeek = getDay(end);
      const paddingEnd = Array(6 - lastDayOfWeek).fill(null);

      const allDays = [...paddingStart, ...days, ...paddingEnd];

      // Split into weeks
      const weeks: (Date | null)[][] = [];
      for (let j = 0; j < allDays.length; j += 7) {
        weeks.push(allDays.slice(j, j + 7));
      }

      result.push({
        monthDate,
        monthName: format(monthDate, 'MMMM yyyy', { locale: th }),
        weeks,
      });
    }

    return result;
  }, [monthsToShow]);

  // Get color intensity based on count
  const getColorIntensity = (count: number): string => {
    if (count === 0) return 'bg-gray-50 border border-gray-200';

    const intensity = maxCount > 0 ? count / maxCount : 0;

    if (intensity >= 0.8) return 'bg-emerald-600 text-white';
    if (intensity >= 0.6) return 'bg-emerald-500 text-white';
    if (intensity >= 0.4) return 'bg-emerald-400';
    if (intensity >= 0.2) return 'bg-emerald-300';
    return 'bg-emerald-200';
  };

  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">วันที่มีการเคลื่อนไหว</p>
                <p className="text-2xl font-bold">{stats.totalDays}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">เฉลี่ยต่อวัน</p>
                <p className="text-2xl font-bold">{Math.round(stats.avgPerDay)}</p>
                <p className="text-xs text-muted-foreground">ชิ้น</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">🏆 วันที่ดีที่สุด</p>
              {stats.bestDay ? (
                <>
                  <p className="text-lg font-bold text-emerald-600">
                    {format(stats.bestDay.date, 'd MMM', { locale: th })}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">{stats.bestDay.count.toLocaleString()}</span> ชิ้น
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50">
          <CardContent className="p-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">📉 วันที่ต่ำสุด</p>
              {stats.worstDay ? (
                <>
                  <p className="text-lg font-bold text-orange-600">
                    {format(stats.worstDay.date, 'd MMM', { locale: th })}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">{stats.worstDay.count.toLocaleString()}</span> ชิ้น
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Heatmaps */}
      <div className="grid gap-6 lg:grid-cols-3">
        {months.map((month, monthIdx) => (
          <Card key={monthIdx}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                📅 {month.monthName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {weekDays.map((day, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-medium text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                {month.weeks.map((week, weekIdx) => (
                  <div key={weekIdx} className="grid grid-cols-7 gap-1">
                    {week.map((day, dayIdx) => {
                      if (!day) {
                        return (
                          <div
                            key={`empty-${weekIdx}-${dayIdx}`}
                            className="aspect-square"
                          />
                        );
                      }

                      const dateKey = format(day, 'yyyy-MM-dd');
                      const dayData = calendarData.get(dateKey);
                      const count = dayData?.count || 0;
                      const isToday = isSameDay(day, new Date());

                      return (
                        <button
                          key={dateKey}
                          onClick={() => onDayClick?.(day)}
                          className={`
                            aspect-square rounded-md flex items-center justify-center text-xs font-medium
                            transition-all hover:scale-110 hover:shadow-md cursor-pointer
                            ${getColorIntensity(count)}
                            ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                          `}
                          title={
                            dayData
                              ? `${format(day, 'd MMMM', { locale: th })}\n${count.toLocaleString()} ชิ้น\n${dayData.orders} ออเดอร์\n฿${dayData.value.toLocaleString()}`
                              : format(day, 'd MMMM', { locale: th })
                          }
                        >
                          {format(day, 'd')}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                <span className="text-muted-foreground">น้อย</span>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded bg-gray-50 border border-gray-200" />
                  <div className="w-4 h-4 rounded bg-emerald-200" />
                  <div className="w-4 h-4 rounded bg-emerald-300" />
                  <div className="w-4 h-4 rounded bg-emerald-400" />
                  <div className="w-4 h-4 rounded bg-emerald-500" />
                  <div className="w-4 h-4 rounded bg-emerald-600" />
                </div>
                <span className="text-muted-foreground">มาก</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Summary */}
      <Card className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.totalCount.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">ยอดรวมทั้งหมด</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                ฿{stats.totalValue.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">มูลค่ารวม</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-600">
                {Math.round(stats.avgPerDay)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">เฉลี่ยต่อวัน (ชิ้น)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💡 การวิเคราะห์รูปแบบ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Busiest days pattern */}
            {(() => {
              const dayOfWeekCounts = new Map<number, number>();
              calendarData.forEach((data) => {
                const dayOfWeek = getDay(data.date);
                const current = dayOfWeekCounts.get(dayOfWeek) || 0;
                dayOfWeekCounts.set(dayOfWeek, current + data.count);
              });

              const busiestDayOfWeek = Array.from(dayOfWeekCounts.entries())
                .sort((a, b) => b[1] - a[1])[0];

              if (busiestDayOfWeek) {
                const dayName = weekDays[busiestDayOfWeek[0]];
                return (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl">📊</div>
                    <div>
                      <p className="font-semibold text-sm">วัน{dayName} คือวันที่มียอดสูงสุด</p>
                      <p className="text-xs text-muted-foreground">
                        ยอดรวม {busiestDayOfWeek[1].toLocaleString()} ชิ้น
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Consistency check */}
            {(() => {
              const variance = stats.avgPerDay > 0
                ? (stats.bestDay?.count || 0) / stats.avgPerDay
                : 0;

              if (variance > 3) {
                return (
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl">⚠️</div>
                    <div>
                      <p className="font-semibold text-sm">ยอดขายมีความผันแปรสูง</p>
                      <p className="text-xs text-muted-foreground">
                        ยอดสูงสุดมากกว่าค่าเฉลี่ยถึง {variance.toFixed(1)} เท่า
                      </p>
                    </div>
                  </div>
                );
              } else if (variance > 1 && variance <= 2) {
                return (
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl">✅</div>
                    <div>
                      <p className="font-semibold text-sm">ยอดขายสม่ำเสมอ</p>
                      <p className="text-xs text-muted-foreground">
                        การกระจายตัวของยอดขายดี
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Growth trend */}
            {(() => {
              const firstMonth = months[0];
              const lastMonth = months[months.length - 1];

              if (firstMonth && lastMonth) {
                const firstMonthTotal = Array.from(calendarData.entries())
                  .filter(([dateKey]) => {
                    const date = parseISO(dateKey);
                    return date >= firstMonth.weeks[0][0]! && date <= firstMonth.weeks[firstMonth.weeks.length - 1][6]!;
                  })
                  .reduce((sum, [, data]) => sum + data.count, 0);

                const lastMonthTotal = Array.from(calendarData.entries())
                  .filter(([dateKey]) => {
                    const date = parseISO(dateKey);
                    return date >= lastMonth.weeks[0][0]! && date <= lastMonth.weeks[lastMonth.weeks.length - 1][6]!;
                  })
                  .reduce((sum, [, data]) => sum + data.count, 0);

                const growth = firstMonthTotal > 0
                  ? ((lastMonthTotal - firstMonthTotal) / firstMonthTotal) * 100
                  : 0;

                if (Math.abs(growth) > 10) {
                  return (
                    <div className={`flex items-start gap-3 p-3 rounded-lg ${growth > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      <div className="text-2xl">{growth > 0 ? '📈' : '📉'}</div>
                      <div>
                        <p className="font-semibold text-sm">
                          ยอดขาย{growth > 0 ? 'เติบโต' : 'ลดลง'} {Math.abs(growth).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          เมื่อเทียบเดือนแรกกับเดือนล่าสุด
                        </p>
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
