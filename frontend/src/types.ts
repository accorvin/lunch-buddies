export interface Registration {
  userId: string;
  name: string;
  email: string;
  availableDays: string[];
}

export interface Statistics {
  mostPopularDays: string[];
  registrationsByDay: Record<string, number>;
  totalRegistrations: number;
  recentRegistrations: number;
  averageDaysPerRegistration: number;
  lastUpdated: string;
}

export interface Match {
  users: string[];
  commonDays: string[];
}

export interface MatchRound {
  date: string;
  matches: Array<{
    users: string[];
    commonDays: string[];
  }>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
} 