import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  DollarSign, TrendingUp, Target, 
  Activity, AlertOctagon, Sparkles 
} from 'lucide-react';
import { MetricsCard } from './MetricsCard';
import { AdEntry, ExtraExpense, Offer, DashboardMetrics, ViewMode, DateRangeType, RecurringExpense } from '../types';
import { analyzePerformance } from '../services/geminiService';

interface DashboardProps {
  ads: AdEntry[];
  expenses: ExtraExpense[];
  recurringExpenses: RecurringExpense[];
  offers: Offer[];
  selectedOfferId: string | 'all';
  dateRange: DateRangeType;
}

export const Dashboard: React.FC<DashboardProps> = ({ ads, expenses, recurringExpenses, offers, selectedOfferId, dateRange }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Helper: Date Filtering Logic ---
  const getDateRangeBounds = (range: DateRangeType, offsetDays: number = 0) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Shift the reference date if we are calculating previous period
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() - offsetDays);

    let startDate = new Date(referenceDate);
    let endDate = new Date(referenceDate);

    switch (range) {
      case 'today':
        break; // start = end = today
      case 'yesterday':
        startDate.setDate(referenceDate.getDate() - 1);
        endDate.setDate(referenceDate.getDate() - 1);
        break;
      case 'last3days':
        startDate.setDate(referenceDate.getDate() - 2);
        break;
      case 'last7days':
        startDate.setDate(referenceDate.getDate() - 6);
        break;
      case 'last30days':
        startDate.setDate(referenceDate.getDate() - 29);
        break;
      case 'thisMonth':
        startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
        endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
        break;
      case 'allTime':
        startDate = new Date(2020, 0, 1);
        break;
    }
    return { startDate, endDate };
  };

  const isDateInBounds = (dateStr: string, start: Date, end: Date) => {
    const d = new Date(dateStr);
    // Fix timezone issues by using string comparison for dates or careful constructing
    const dZero = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const startZero = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endZero = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    return dZero >= startZero && dZero <= endZero;
  };

  const calculateMetricsForRange = (
      targetAds: AdEntry[], 
      targetExpenses: ExtraExpense[], 
      rangeType: DateRangeType,
      offset: number = 0
    ): DashboardMetrics => {
      
      let rangeDuration = 1;
      if (rangeType === 'last3days') rangeDuration = 3;
      if (rangeType === 'last7days') rangeDuration = 7;
      if (rangeType === 'last30days') rangeDuration = 30;
      if (rangeType === 'yesterday') rangeDuration = 1;
      
      // If we are looking for "Previous period", the offset is the duration
      const effectiveOffset = offset > 0 ? rangeDuration : 0; 
      
      const { startDate, endDate } = getDateRangeBounds(rangeType, effectiveOffset);

      // Filter Ads
      const relevantAds = targetAds.filter(ad => {
        if (selectedOfferId !== 'all' && ad.offerId !== selectedOfferId) return false;
        return isDateInBounds(ad.date, startDate, endDate);
      });

      // Filter Manual Expenses
      const relevantExpenses = targetExpenses.filter(e => isDateInBounds(e.date, startDate, endDate));

      // Calculate Recurring Expenses within this range
      let recurringTotal = 0;
      if (selectedOfferId === 'all') { // Only apply recurring expenses to global view
          const loopDate = new Date(startDate);
          const endLoop = new Date(endDate);
          
          while (loopDate <= endLoop) {
             const currentDayOfMonth = loopDate.getDate();
             recurringExpenses.forEach(re => {
                if (re.dayOfMonth === currentDayOfMonth) {
                    recurringTotal += re.amount;
                }
             });
             loopDate.setDate(loopDate.getDate() + 1);
          }
      }

      const totalRevenue = relevantAds.reduce((acc, curr) => acc + curr.revenue, 0);
      const totalSpend = relevantAds.reduce((acc, curr) => acc + curr.spend, 0);
      const manualExtras = selectedOfferId === 'all' 
        ? relevantExpenses.reduce((acc, curr) => acc + curr.amount, 0)
        : 0;
      
      const totalExtras = manualExtras + recurringTotal;
      const netProfit = totalRevenue - totalSpend - totalExtras;
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      const totalInvestment = totalSpend + totalExtras;
      const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;

      return { totalRevenue, totalSpend, totalExtras, netProfit, roas, roi };
  };

  const metrics = useMemo(() => calculateMetricsForRange(ads, expenses, dateRange, 0), [ads, expenses, recurringExpenses, selectedOfferId, dateRange]);
  const prevMetrics = useMemo(() => calculateMetricsForRange(ads, expenses, dateRange, 1), [ads, expenses, recurringExpenses, selectedOfferId, dateRange]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const { startDate, endDate } = getDateRangeBounds(dateRange);
    const dataMap = new Map<string, any>();
    
    // Fill all days in range for continuous chart
    const loopDate = new Date(startDate);
    while(loopDate <= endDate) {
        const dateStr = loopDate.toISOString().split('T')[0];
        dataMap.set(dateStr, { date: dateStr, revenue: 0, spend: 0, extras: 0, profit: 0 });
        loopDate.setDate(loopDate.getDate() + 1);
    }

    // Populate Ads
    ads.forEach(ad => {
      if (selectedOfferId !== 'all' && ad.offerId !== selectedOfferId) return;
      if (dataMap.has(ad.date)) {
          const day = dataMap.get(ad.date);
          day.revenue += ad.revenue;
          day.spend += ad.spend;
      }
    });

    // Populate Expenses (Manual + Recurring)
    if (selectedOfferId === 'all') {
        expenses.forEach(exp => {
            if (dataMap.has(exp.date)) {
                dataMap.get(exp.date).extras += exp.amount;
            }
        });

        // Add Recurring
        dataMap.forEach((val, key) => {
            const dateObj = new Date(key + 'T12:00:00'); // Safe date parsing
            const dayOfMonth = dateObj.getDate();
            recurringExpenses.forEach(re => {
                if (re.dayOfMonth === dayOfMonth) {
                    val.extras += re.amount;
                }
            });
        });
    }

    const result = Array.from(dataMap.values()).map(day => {
        const [year, month, dayStr] = day.date.split('-');
        const dateFormatted = `${dayStr}/${month}`;

        return {
            ...day,
            profit: day.revenue - day.spend - day.extras,
            dateFormatted: dateFormatted 
        };
    }).sort((a, b) => a.date.localeCompare(b.date));

    return result;
  }, [ads, expenses, recurringExpenses, selectedOfferId, dateRange]);

  const handleGeminiAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    const result = await analyzePerformance(metrics, ads.slice(-10), expenses.slice(-10)); // Pass slightly more context
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2)}`;

  // Growth Helper
  const getGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const diff = ((current - previous) / previous) * 100;
      return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  const getGrowthColor = (current: number, previous: number, inverse = false) => {
      if (current === previous) return 'text-gray-500';
      const isPositive = current > previous;
      if (inverse) return isPositive ? 'text-rose-600' : 'text-emerald-600';
      return isPositive ? 'text-emerald-600' : 'text-rose-600';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* View Toggles */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex gap-2">
           <button 
            onClick={() => setViewMode('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'overview' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            Visão Geral
          </button>
          <button 
            onClick={() => setViewMode('traffic_only')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'traffic_only' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            Tráfego & ROAS
          </button>
          <button 
            onClick={() => setViewMode('net_profit')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'net_profit' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            Lucro Real
          </button>
        </div>
        
        <button
          onClick={handleGeminiAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md shadow-purple-200"
        >
          <Sparkles size={16} />
          {isAnalyzing ? 'Analisando...' : 'Gerar Insights AI'}
        </button>
      </div>

      {/* AI Analysis Result */}
      {aiAnalysis && (
        <div className="bg-white border border-purple-200 rounded-xl p-6 shadow-lg shadow-purple-100">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-purple-600" size={24} />
            <h3 className="text-lg font-semibold text-gray-900">Insights do Gemini</h3>
          </div>
          <div className="prose prose-sm max-w-none text-gray-600">
             <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard 
          title="Faturamento" 
          value={formatCurrency(metrics.totalRevenue)} 
          icon={DollarSign}
          color="bg-emerald-50 text-emerald-600"
          trend={`${getGrowth(metrics.totalRevenue, prevMetrics.totalRevenue)} vs anterior`}
          trendColor={getGrowthColor(metrics.totalRevenue, prevMetrics.totalRevenue)}
        />
        <MetricsCard 
          title="Investimento (Ads)" 
          value={formatCurrency(metrics.totalSpend)} 
          icon={Activity}
          color="bg-blue-50 text-blue-600"
          trend={`${getGrowth(metrics.totalSpend, prevMetrics.totalSpend)} vs anterior`}
          trendColor={getGrowthColor(metrics.totalSpend, prevMetrics.totalSpend, true)} // Inverse: spending more is usually "red" unless scale context, but kept simple
        />
        <MetricsCard 
          title="Lucro Líquido" 
          value={formatCurrency(metrics.netProfit)} 
          icon={TrendingUp} 
          color={metrics.netProfit >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-red-50 text-red-600"}
          trend={`${getGrowth(metrics.netProfit, prevMetrics.netProfit)} vs anterior`}
          trendColor={getGrowthColor(metrics.netProfit, prevMetrics.netProfit)}
        />
        <MetricsCard 
          title="ROAS Geral" 
          value={`${metrics.roas.toFixed(2)}x`} 
          icon={Target}
          color={metrics.roas >= 2 ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"}
          trend={`ROI: ${metrics.roi.toFixed(0)}%`}
        />
      </div>

       {selectedOfferId === 'all' && viewMode === 'net_profit' && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
              <div>
                 <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Gastos Extras (Total)</p>
                 <p className="text-xl font-bold text-gray-900">{formatCurrency(metrics.totalExtras)}</p>
              </div>
              <AlertOctagon className="text-rose-500 opacity-80" />
            </div>
         </div>
       )}

      {/* Charts Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm min-h-[400px]">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {viewMode === 'overview' && 'Performance Geral (Receita x Gasto)'}
          {viewMode === 'traffic_only' && 'Eficiência de Tráfego (ROAS)'}
          {viewMode === 'net_profit' && 'Lucratividade Real (Pós Despesas)'}
        </h3>
        
        {chartData.length === 0 ? (
           <div className="h-[350px] flex flex-col items-center justify-center text-gray-400">
             <Activity size={48} className="mb-2 opacity-20" />
             <p>Sem dados para este período.</p>
           </div>
        ) : (
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'overview' ? (
                 <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="dateFormatted" 
                      stroke="#94a3b8" 
                      tick={{fontSize: 12}} 
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      tick={{fontSize: 12}} 
                      tickFormatter={(val) => `R$${val}`} 
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => formatCurrency(val)}
                    />
                    <Legend wrapperStyle={{paddingTop: '20px'}}/>
                    <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                    <Area type="monotone" dataKey="spend" name="Ads Spend" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={2} />
                 </AreaChart>
              ) : viewMode === 'traffic_only' ? (
                 <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="dateFormatted" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: '#f1f5f9', opacity: 0.5}}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => formatCurrency(val)}
                    />
                    <Legend wrapperStyle={{paddingTop: '20px'}} />
                    <Bar dataKey="spend" name="Investido" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey="revenue" name="Retorno" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                 </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                   <XAxis dataKey="dateFormatted" stroke="#94a3b8" axisLine={false} tickLine={false} dy={10} />
                   <YAxis stroke="#94a3b8" axisLine={false} tickLine={false} />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val: number) => formatCurrency(val)}
                   />
                   <Legend wrapperStyle={{paddingTop: '20px'}} />
                   <Line type="monotone" dataKey="profit" name="Lucro Líquido" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} />
                   <Line type="monotone" dataKey="extras" name="Gastos Extras" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};