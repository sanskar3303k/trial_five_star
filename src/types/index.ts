// Type definitions for the resort intelligence platform

export interface Staff {
  id: string;
  name: string;
  role: string;
  department: string;
  shift: string;
  status: 'available' | 'busy' | 'off-duty';
  workload: number;
  skills: string[];
  avatar: string;
}

export interface Equipment {
  id: string;
  name: string;
  location: string;
  status: 'optimal' | 'warning' | 'critical';
  healthScore: number;
  lastMaintenance: string;
  nextMaintenance: string;
  failureRisk: number;
  temperature?: number;
  vibration?: number;
}

export interface Inventory {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unit: string;
  consumption: number;
  daysRemaining: number;
  supplier: string;
  status: 'in-stock' | 'low-stock' | 'critical';
}

export interface Guest {
  id: string;
  name: string;
  room: string;
  checkIn: string;
  checkOut: string;
  vipStatus: boolean;
  preferences: {
    roomType: string;
    dietary: string[];
    interests: string[];
  };
  satisfaction: number;
  spend: number;
}

export interface Review {
  id: string;
  guestName: string;
  rating: number;
  comment: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  category: string;
  date: string;
}

export interface PricingRule {
  id: string;
  roomType: string;
  basePrice: number;
  currentPrice: number;
  recommendedPrice: number;
  demand: 'low' | 'medium' | 'high' | 'surge';
  confidence: number;
  status: 'active' | 'pending' | 'applied';
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
  actions?: string[];
}

export interface AIInsight {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  impact: string;
  action: string;
  category: string;
}

export interface Metric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down';
  icon?: string;
}
