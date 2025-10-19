'use client';

import { useMemo } from 'react';

import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  BarChart3, 
  Settings, 
  FileText, 
  Users,
  ArrowRight,
  Zap,
  Shield,
  TrendingUp
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

export default function DashboardDemo() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pb-16 pt-12">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />
        
        <div className="relative">
          <div className="text-center space-y-6 mb-12">
            <Badge className="mb-4 px-4 py-2 text-sm font-medium">
              <Zap className="w-3 h-3 mr-2 inline" />
              Computerized Maintenance Management System
            </Badge>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              GMAO Platform
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Optimize your maintenance operations with intelligent workflows, real-time monitoring, and data-driven insights
            </p>
            
            
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto px-4">
            <StatCard
              icon={<Wrench className="w-8 h-8 text-blue-600" />}
              value="2,547"
              label="Work Orders"
              trend="+12% this month"
            />
            <StatCard
              icon={<CheckCircle className="w-8 h-8 text-green-600" />}
              value="94.5%"
              label="Completion Rate"
              trend="Above target"
            />
            <StatCard
              icon={<Clock className="w-8 h-8 text-purple-600" />}
              value="2.3hrs"
              label="Avg Response Time"
              trend="-15% faster"
            />
            <StatCard
              icon={<TrendingUp className="w-8 h-8 text-orange-600" />}
              value="98.2%"
              label="Equipment Uptime"
              trend="+3.5% increase"
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful Features for Modern Maintenance</h2>
            <p className="text-muted-foreground text-lg">
              Everything you need to streamline your maintenance operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Wrench className="w-6 h-6" />}
              title="Work Order Management"
              description="Create, assign, and track work orders with real-time status updates and priority management"
              color="blue"
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6" />}
              title="Preventive Maintenance"
              description="Schedule and automate preventive maintenance tasks to reduce downtime and extend equipment life"
              color="green"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Analytics & Reporting"
              description="Gain insights with comprehensive dashboards and customizable reports on maintenance performance"
              color="purple"
            />
            <FeatureCard
              icon={<Settings className="w-6 h-6" />}
              title="Asset Management"
              description="Track all your equipment, spare parts, and inventory with detailed maintenance history"
              color="orange"
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Team Collaboration"
              description="Coordinate with your maintenance team through task assignments and internal communication"
              color="indigo"
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Compliance & Safety"
              description="Ensure regulatory compliance and maintain safety standards with automated checklists"
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 px-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose GMAO Platform?</h2>
            <p className="text-muted-foreground text-lg">
              Transform your maintenance operations with proven results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <BenefitCard
              icon={<TrendingUp className="w-12 h-12 text-green-600" />}
              title="Increase Efficiency"
              description="Reduce maintenance costs by up to 30% and improve equipment uptime with predictive maintenance strategies"
            />
            <BenefitCard
              icon={<Zap className="w-12 h-12 text-yellow-600" />}
              title="Faster Response Times"
              description="Cut emergency response times by 50% with automated alerts and mobile-first work order management"
            />
            <BenefitCard
              icon={<Shield className="w-12 h-12 text-blue-600" />}
              title="Enhanced Reliability"
              description="Achieve 99%+ equipment reliability with data-driven maintenance scheduling and asset tracking"
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Transform Your Maintenance Operations?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join hundreds of organizations optimizing their maintenance with GMAO Platform
          </p>
          
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, trend }: { 
  icon: React.ReactNode; 
  value: string; 
  label: string; 
  trend: string;
}) {
  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-bold">{value}</div>
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
            {trend}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureCard({ icon, title, description, color }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const colorClasses = useMemo(() => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
      green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
      purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
      orange: 'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
      indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400',
      red: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
    };
    return colors[color] || colors.blue;
  }, [color]);

  return (
    <Card className="hover:shadow-lg transition-shadow border-2 hover:border-gray-300 dark:hover:border-gray-600">
      <CardHeader>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses}`}>
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

function BenefitCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center space-y-4">
      <div className="flex justify-center mb-4">
        <div className="p-4 rounded-full bg-white dark:bg-gray-800 shadow-lg">
          {icon}
        </div>
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}