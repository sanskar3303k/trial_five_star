export type User = { id: string; name: string; email: string; role: 'guest' | 'manager'; room: string };
export type ServiceRequest = { id: string; user_id: string; category: string; title: string; detail: string; total: number; status: string; created_at: string; guest_name: string; room: string };
export type Feedback = { id: string; guest_name: string; room: string; rating: number; comment: string; created_at: string; analysis: { sentiment: string; aspects: string[]; recommendation: string; method: string } };
export type MenuItem = { id: string; name: string; description: string; price: number; kind: string; symbol: string; image?: string; badge?: string; category?: string };
export type RoomRecord = {
  room_number: string;
  floor: number;
  type: string;
  price_per_night: number;
  status: 'Occupied' | 'Available' | 'Cleaning' | 'Maintenance';
  guest_name: string | null;
  guest_age: number | null;
  guest_gender: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string | null;
  check_out: string | null;
  guest_count: number | null;
  vip_tier: string | null;
  special_requests: string | null;
  notes: string | null;
};
export type RoomsOverview = {
  stats: {
    total: number;
    occupied: number;
    available: number;
    cleaning: number;
    maintenance: number;
    occupancyRate: number;
  };
  rooms: RoomRecord[];
};
export async function api<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`/api${endpoint}`, { method, credentials: 'same-origin', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'X-SR360': 'portal' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) { if (response.status === 401 && !endpoint.startsWith('/auth/')) window.dispatchEvent(new Event('session-expired')); throw new Error(data.error || 'The request could not be completed.'); }
    return data as T;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) throw new Error('We could not reach the resort. Please check your connection and try again.');
    throw error;
  } finally { window.clearTimeout(timer); }
}
export const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export const formatINRShort = (val: number) => {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return money(val);
};

export type RoomCalculation = {
  type: string;
  total: number;
  occupied: number;
  available: number;
  cleaning: number;
  maintenance: number;
  pricePerNight: number;
  subtotal: number;
  potentialMax: number;
  occupancyRate: number;
  utilizationGap: number;
};

export type ShiftBreakdown = {
  shift: string;
  label: string;
  rooms: number;
  dining: number;
  services: number;
  total: number;
};

export type DayRevenueItem = {
  date: string;
  day: string;
  occupiedRooms: number;
  occupancyPct: number;
  roomRevenue: number;
  diningRevenue: number;
  servicesRevenue: number;
  totalRevenue: number;
  adr: number;
};

export type ThirtyDayPoint = {
  dayIndex: number;
  date: string;
  weekday: string;
  occupiedRooms: number;
  occupancyPct: number;
  revenueLakhs: number;
  totalRevenue: number;
};

export type SavedCalculation = {
  id: string;
  user_id: string;
  title: string;
  calculation_data: {
    targetOccupancy?: number;
    customRates?: Record<string, number>;
    diningPerGuest?: number;
    notes?: string;
    [key: string]: any;
  };
  daily_revenue: number;
  weekly_revenue: number;
  monthly_revenue: number;
  created_at: string;
};

export type RevenueOverview = {
  kpis: {
    totalRooms: number;
    occupiedRooms: number;
    overallOccupancy: number;
    dailyRoomRevenue: number;
    dailyDiningRevenue: number;
    dailyServicesRevenue: number;
    dailyTotalRevenue: number;
    adr: number;
    revpar: number;
    sevenDaysTotalRevenue: number;
    sevenDaysRoomNights: number;
    sevenDaysAvgDaily: number;
    thirtyDaysTotalRevenue: number;
    thirtyDaysRoomNights: number;
    thirtyDaysAvgOccupancy: number;
  };
  roomCalculations: RoomCalculation[];
  oneDayTracker: {
    today: string;
    totalRevenue: number;
    roomRevenue: number;
    diningRevenue: number;
    servicesRevenue: number;
    occupancyPct: number;
    occupiedRooms: number;
    adr: number;
    revpar: number;
    shifts: ShiftBreakdown[];
  };
  sevenDaysTracker: {
    totalRevenue: number;
    roomNights: number;
    days: DayRevenueItem[];
  };
  thirtyDaysTracker: {
    totalRevenue: number;
    roomNights: number;
    weeklySummary: { week: string; revenue: number; avgOcc: number }[];
    days: ThirtyDayPoint[];
  };
  savedCalculations: SavedCalculation[];
};

