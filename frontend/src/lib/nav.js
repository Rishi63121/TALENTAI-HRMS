import {
  BarChart3,
  Briefcase,
  CalendarCheck,
  FileSearch,
  LayoutDashboard,
  MessagesSquare,
  Rocket,
  ShieldCheck,
  TrendingUp,
  UserCircle,
  UserSearch,
  Users,
  Wallet,
} from 'lucide-react';

/**
 * Single source of truth for navigation. `primary: true` items appear in the phone bottom bar;
 * everything else lives in the "Menu" drawer.
 */
export const NAV = {
  admin: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, primary: true },
        { label: 'Analytics', path: '/admin/analytics', icon: BarChart3, primary: true },
      ],
    },
    {
      section: 'People',
      items: [
        { label: 'Employees', path: '/admin/employees', icon: Users, primary: true },
        { label: 'Attendance', path: '/admin/attendance', icon: CalendarCheck },
        { label: 'Payroll', path: '/admin/payroll', icon: Wallet },
        { label: 'Performance', path: '/admin/performance', icon: TrendingUp },
        { label: 'Recruiters', path: '/admin/recruiters', icon: ShieldCheck },
      ],
    },
    {
      section: 'Recruitment',
      items: [
        { label: 'Jobs', path: '/admin/jobs', icon: Briefcase },
        { label: 'Candidates', path: '/admin/candidates', icon: UserSearch, primary: true },
        { label: 'Resume Screening', path: '/admin/screening', icon: FileSearch },
        { label: 'Interviews', path: '/admin/interview', icon: MessagesSquare },
        { label: 'Onboarding', path: '/admin/onboarding', icon: Rocket },
      ],
    },
  ],
  recruiter: [
    {
      section: 'Overview',
      items: [{ label: 'Dashboard', path: '/recruiter/dashboard', icon: LayoutDashboard, primary: true }],
    },
    {
      section: 'Recruitment',
      items: [
        { label: 'Jobs', path: '/recruiter/jobs', icon: Briefcase, primary: true },
        { label: 'Candidates', path: '/recruiter/candidates', icon: UserSearch, primary: true },
        { label: 'Resume Screening', path: '/recruiter/screening', icon: FileSearch, primary: true },
        { label: 'Interviews', path: '/recruiter/interview', icon: MessagesSquare },
        { label: 'Onboarding', path: '/recruiter/onboarding', icon: Rocket },
      ],
    },
  ],
  employee: [
    {
      section: 'My workspace',
      items: [
        { label: 'Dashboard', path: '/employee/dashboard', icon: LayoutDashboard, primary: true },
        { label: 'Attendance', path: '/employee/attendance', icon: CalendarCheck, primary: true },
        { label: 'Payroll', path: '/employee/payroll', icon: Wallet, primary: true },
        { label: 'Performance', path: '/employee/performance', icon: TrendingUp },
        { label: 'Profile', path: '/employee/profile', icon: UserCircle, primary: true },
      ],
    },
  ],
};

export const flatNav = (role) => (NAV[role] || []).flatMap((s) => s.items);

export function titleForPath(role, pathname) {
  return flatNav(role).find((i) => pathname.startsWith(i.path))?.label || 'TalentAI';
}
