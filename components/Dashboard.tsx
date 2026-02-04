
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell 
} from 'recharts';
import { 
  DollarSign, TrendingUp, Target, 
  Activity, Sparkles,
  Filter, Calendar, ChevronDown, ArrowRight
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
  setSelectedOfferId: (id: string | 'all') => void;
  dateRange: DateRangeType;
  setDateRange: (range: DateRangeType) => void;
  customDates?: { start: string; end: string };
  setCustomDates?: (dates: { start: string; end: string }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  ads, expenses, recurringExpenses, offers, 
  selectedOfferId, setSelectedOfferId, 
  dateRange, setDateRange,
  customDates = { start: '', end: '' },
  setCustomDates
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Identifica se é uma visão de dia único
  const isSingleDay = dateRange === 'today' || dateRange === 'yesterday' || (dateRange === 'custom' && customDates.start === customDates.end);

  const getDateRangeBounds = (range: DateRangeType, offsetDays: number = 0) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const referenceDate = new Date(today);
    referenceDate.setDate(today.getDate() - offsetDays);
    let startDate = new Date(referenceDate);
    let endDate = new Date(referenceDate);

    switch (range) {
      case 'today': break;
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
      case 'custom':
        // Lógica para Custom:
        // Se offsetDays > 0, significa que estamos calculando o período anterior.
        // Precisamos saber a duração do período customizado atual para subtrair.
        if (customDates.start && customDates.end) {
            const start = new Date(customDates.start + 'T00:00:00');
            const end = new Date(customDates.end + 'T00:00:00');
            
            if (offsetDays > 0) {
               // Calcula duração em dias
               const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
               // Retrocede 'duration' dias a partir do start
               endDate = new Date(start);
               endDate.setDate(endDate.getDate() - 1);
               
               startDate = new Date(endDate);
               startDate.setDate(startDate.getDate() - duration + 1);
            } else {
               startDate = start;
               endDate = end;
            }
        }
        break;
    }
    return { startDate, endDate };
  };

  const isDateInBounds = (dateStr: string, start: Date, end: Date) => {
    const d = new Date(dateStr);
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
    if (rangeType === 'thisMonth') rangeDuration = 30;
    
    // Para custom, o 'offset' no getDateRangeBounds já lida com o cálculo,
    // então passamos um flag simples (1 para anterior, 0 para atual)
    // ao invés de calcular dias fixos aqui.
    
    // Se não for custom, a lógica antiga de offset funciona.
    const effectiveOffset = (rangeType !== 'custom' && offset > 0) ? rangeDuration : (offset > 0 ? 1 : 0);
    
    const { startDate, endDate } = getDateRangeBounds(rangeType, effectiveOffset);

    const relevantAds = targetAds.filter(ad => {
      if (selectedOfferId !== 'all' && ad.offerId !== selectedOfferId) return false;
      return isDateInBounds(ad.date, startDate, endDate);
    });

    const relevantExpenses = targetExpenses.filter(e => isDateInBounds(e.date, startDate, endDate));

    let recurringTotal = 0;
    if (selectedOfferId === 'all') {
      const loopDate = new Date(startDate);
      const endLoop = new Date(endDate);
      while (loopDate <= endLoop) {
        const currentDayOfMonth = loopDate.getDate();
        recurringExpenses.forEach(re => {
          if (re.dayOfMonth === currentDayOfMonth) recurringTotal += re.amount;
        });
        loopDate.setDate(loopDate.getDate() + 1);
      }
    }

    const totalRevenue = relevantAds.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalSpend = relevantAds.reduce((acc, curr) => acc + curr.spend, 0);
    const manualExtras = selectedOfferId === 'all' ? relevantExpenses.reduce((acc, curr) => acc + curr.amount, 0) : 0;
    const totalExtras = manualExtras + recurringTotal;
    const netProfit = totalRevenue - totalSpend - totalExtras;
    const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const totalInvestment = totalSpend + totalExtras;
    const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment) * 100 : 0;

    return { totalRevenue, totalSpend, totalExtras, netProfit, roas, roi };
  };

  const metrics = useMemo(() => calculateMetricsForRange(ads, expenses, dateRange, 0), [ads, expenses, recurringExpenses, selectedOfferId, dateRange, customDates]);
  const prevMetrics = useMemo(() => calculateMetricsForRange(ads, expenses, dateRange, 1), [ads, expenses, recurringExpenses, selectedOfferId, dateRange, customDates]);

  const chartData = useMemo(() => {
    const { startDate, endDate } = getDateRangeBounds(dateRange);
    const dataMap = new Map<string, any>();
    const loopDate = new Date(startDate);
    
    // Garante que o loop rode pelo menos uma vez para pegar o dia atual
    if (isSingleDay) {
        const dateStr = loopDate.toISOString().split('T')[0];
        dataMap.set(dateStr, { date: dateStr, revenue: 0, spend: 0, extras: 0, profit: 0 });
    } else {
        while(loopDate <= endDate) {
            const dateStr = loopDate.toISOString().split('T')[0];
            dataMap.set(dateStr, { date: dateStr, revenue: 0, spend: 0, extras: 0, profit: 0 });
            loopDate.setDate(loopDate.getDate() + 1);
        }
    }

    ads.forEach(ad => {
      if (selectedOfferId !== 'all' && ad.offerId !== selectedOfferId) return;
      if (dataMap.has(ad.date)) {
        const day = dataMap.get(ad.date);
        day.revenue += ad.revenue;
        day.spend += ad.spend;
      }
    });

    if (selectedOfferId === 'all') {
      expenses.forEach(exp => {
        if (dataMap.has(exp.date)) dataMap.get(exp.date).extras += exp.amount;
      });
      // Lógica de recorrentes simplificada para gráfico
      if (isSingleDay) {
          const dateStr = loopDate.toISOString().split('T')[0];
          const dateObj = new Date(dateStr + 'T12:00:00');
          const dayOfMonth = dateObj.getDate();
           recurringExpenses.forEach(re => {
            if (re.dayOfMonth === dayOfMonth && dataMap.has(dateStr)) {
                dataMap.get(dateStr).extras += re.amount;
            }
          });
      } else {
          dataMap.forEach((val, key) => {
            const dateObj = new Date(key + 'T12:00:00');
            const dayOfMonth = dateObj.getDate();
            recurringExpenses.forEach(re => {
              if (re.dayOfMonth === dayOfMonth) val.extras += re.amount;
            });
          });
      }
    }

    return Array.from(dataMap.values()).map(day => {
      const [year, month, dayStr] = day.date.split('-');
      return {
        ...day,
        profit: day.revenue - day.spend - day.extras,
        dateFormatted: `${dayStr}/${month}`
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [ads, expenses, recurringExpenses, selectedOfferId, dateRange, isSingleDay, customDates]);

  // Dados transformados para o gráfico de barras de dia único
  const singleDayChartData = useMemo(() => {
    if (!isSingleDay || chartData.length === 0) return [];
    const day = chartData[0];
    return [
        { name: 'Faturamento', value: day.revenue, color: '#10b981' },
        { name: 'Investimento', value: day.spend, color: '#3b82f6' },
        { name: 'Lucro Líquido', value: day.profit, color: day.profit >= 0 ? '#6366f1' : '#f43f5e' }
    ];
  }, [chartData, isSingleDay]);

  const handleGeminiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzePerformance(metrics, ads.slice(-10), expenses.slice(-10));
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2)}`;
  const getGrowth = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const diff = ((current - previous) / previous) * 100;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`;
  };

  const getGrowthColor = (current: number, previous: number, inverse = false) => {
    if (current === previous) return 'text-gray-500';
    const isPositive = current > previous;
    if (inverse) return isPositive ? 'text-rose-600' : 'text-emerald-600';
    return isPositive ? 'text-emerald-600' : 'text-rose-600' as any;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start bg-white p-4 rounded-[2rem] border border-gray-200 shadow-sm">
        <div className="lg:col-span-4 flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 h-[60px]">
           <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm"><Filter size={16}/></div>
           <div className="flex-1">
              <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Produto / Oferta</label>
              <select 
                value={selectedOfferId} 
                onChange={(e) => setSelectedOfferId(e.target.value)}
                className="w-full bg-transparent border-none text-sm font-black text-gray-900 focus:ring-0 cursor-pointer appearance-none uppercase"
              >
                <option value="all">TODAS AS OFERTAS</option>
                {offers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
           </div>
           <ChevronDown size={14} className="text-gray-400"/>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-2">
            <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-2xl border border-gray-100 h-[60px]">
                <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm"><Calendar size={16}/></div>
                <div className="flex-1">
                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest">Janela de Análise</label>
                    <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value as DateRangeType)}
                        className="w-full bg-transparent border-none text-sm font-black text-gray-900 focus:ring-0 cursor-pointer appearance-none uppercase"
                    >
                        <option value="today">HOJE</option>
                        <option value="yesterday">ONTEM</option>
                        <option value="last3days">ÚLTIMOS 3 DIAS</option>
                        <option value="last7days">ÚLTIMOS 7 DIAS</option>
                        <option value="last30days">ÚLTIMOS 30 DIAS</option>
                        <option value="thisMonth">ESTE MÊS</option>
                        <option value="allTime">TODO O PERÍODO</option>
                        <option value="custom">PERSONALIZADO</option>
                    </select>
                </div>
                <ChevronDown size={14} className="text-gray-400"/>
            </div>
            
            {/* Seletor Customizado Condicional */}
            {dateRange === 'custom' && setCustomDates && (
                <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl animate-fade-in border border-indigo-100">
                    <input 
                        type="date" 
                        value={customDates.start}
                        onChange={(e) => setCustomDates({...customDates, start: e.target.value})}
                        className="bg-transparent border-none text-xs font-bold text-indigo-700 p-0 focus:ring-0 w-24"
                    />
                    <ArrowRight size={12} className="text-indigo-400"/>
                    <input 
                        type="date" 
                        value={customDates.end}
                        onChange={(e) => setCustomDates({...customDates, end: e.target.value})}
                        className="bg-transparent border-none text-xs font-bold text-indigo-700 p-0 focus:ring-0 w-24"
                    />
                </div>
            )}
        </div>

        <div className="lg:col-span-3 h-[60px]">
          <button
            onClick={handleGeminiAnalysis}
            disabled={isAnalyzing}
            className="w-full h-full flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all disabled:opacity-50 shadow-xl shadow-gray-200"
          >
            <Sparkles size={16} className="text-indigo-400" />
            {isAnalyzing ? 'Processando...' : 'Insights Sênior AI'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl w-fit">
        {[
          { id: 'overview', label: 'Visão Geral' },
          { id: 'traffic_only', label: 'Tráfego & ROAS' },
          { id: 'net_profit', label: 'Lucro Real' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setViewMode(tab.id as ViewMode)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {aiAnalysis && (
        <div className="bg-white border-2 border-indigo-100 rounded-[2.5rem] p-10 shadow-2xl animate-scale-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200"><Sparkles size={24} /></div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Relatório de IA - Gemini Sênior</h3>
          </div>
          <div className="prose prose-indigo max-w-none text-gray-700 font-medium leading-relaxed">
             <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          trendColor={getGrowthColor(metrics.totalSpend, prevMetrics.totalSpend, true)}
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

      <div className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-sm min-h-[500px]">
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-10">
          {isSingleDay 
            ? `Análise Diária: ${dateRange === 'today' ? 'Hoje' : dateRange === 'yesterday' ? 'Ontem' : customDates.start.split('-').reverse().join('/')}`
            : viewMode === 'overview' ? 'Gráfico de Tração (Receita x Gasto)'
            : viewMode === 'traffic_only' ? 'Eficiência Comercial (ROAS)'
            : 'Fluxo de Lucratividade'
          }
        </h3>
        
        <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {isSingleDay ? (
                 <BarChart data={singleDayChartData} barSize={80}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} tickFormatter={(val) => `R$${val}`} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} formatter={(val: number) => formatCurrency(val)} />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                      {singleDayChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                 </BarChart>
              ) : viewMode === 'overview' ? (
                 <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="dateFormatted" stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} tickFormatter={(val) => `R$${val}`} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} formatter={(val: number) => formatCurrency(val)} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '30px', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase'}}/>
                    <Area type="monotone" dataKey="revenue" name="Faturamento" stroke="#10b981" fill="url(#colorRev)" strokeWidth={4} />
                    <Area type="monotone" dataKey="spend" name="Ads Spend" stroke="#3b82f6" fill="url(#colorSpend)" strokeWidth={4} />
                 </AreaChart>
              ) : viewMode === 'traffic_only' ? (
                 <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="dateFormatted" stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                    <YAxis stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} formatter={(val: number) => formatCurrency(val)} />
                    <Legend wrapperStyle={{paddingTop: '30px', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase'}} />
                    <Bar dataKey="spend" name="Investido" fill="#3b82f6" radius={[8, 8, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="revenue" name="Retorno" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={40} />
                 </BarChart>
              ) : (
                <LineChart data={chartData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                   <XAxis dataKey="dateFormatted" stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} dy={10} />
                   <YAxis stroke="#94a3b8" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                   <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} formatter={(val: number) => formatCurrency(val)} />
                   <Legend wrapperStyle={{paddingTop: '30px', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase'}} />
                   <Line type="monotone" dataKey="profit" name="Lucro Líquido" stroke="#6366f1" strokeWidth={5} dot={{r: 6, strokeWidth: 3, fill: '#fff'}} />
                   <Line type="monotone" dataKey="extras" name="Despesas" stroke="#f43f5e" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
      </div>
    </div>
  );
};
