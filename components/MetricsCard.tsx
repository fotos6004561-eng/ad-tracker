import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendColor?: 'text-emerald-600' | 'text-rose-600' | 'text-gray-500';
  color?: string; // Tailwind bg class for icon container
}

export const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, icon: Icon, trend, trendColor = 'text-gray-500', color = 'bg-blue-50 text-blue-600' }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={20} />
        </div>
      </div>
      {trend && (
        <p className={`text-xs font-medium ${trendColor} flex items-center gap-1`}>
          {trend}
        </p>
      )}
    </div>
  );
};