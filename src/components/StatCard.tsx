
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const StatCard = ({ title, value, subtitle, icon: Icon, iconColor = "text-blue-600", trend }: StatCardProps) => {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg border-none bg-card/50 backdrop-blur-sm rounded-2xl shadow-sm overflow-hidden">
      <CardContent className="p-3 md:p-4 lg:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1 truncate">{title}</p>
            <div className="flex items-baseline gap-1 md:gap-2">
              <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">{value}</h3>
              {trend && (
                <span className={`text-xs md:text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? '+' : ''}{trend.value}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 truncate hidden sm:block">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 md:p-3 rounded-lg bg-muted ${iconColor} shrink-0`}>
            <Icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard;
