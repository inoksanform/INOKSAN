'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  BarChart3, 
  Users, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  Calendar,
  Download,
  Tag,
  AlertTriangle,
  Building2,
  User,
  UserCheck,
  Paperclip
} from 'lucide-react';

type Ticket = {
  id: string;
  ticketId?: string;
  subject: string;
  status: string;
  priority: string;
  contactPerson: string;
  email?: string;
  createdAt: any;
  companyName: string;
  country?: string;
  issueType?: string;
  salesmanName?: string;
  regionalManager?: string;
  attachmentUrls?: string[];
};

type DashboardStats = {
  totalTickets: number;
  openTickets: number;
  highPriority: number;
  topIssueType: string;
  topCountries: { country: string; count: number }[];
  weeklyVolume: number[];
  topCustomers: { company: string; count: number }[];
  topSalesmen: { salesman: string; count: number; openTickets: number }[];
  topRegionalManagers: { manager: string; count: number; openTickets: number }[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTickets: 0,
    openTickets: 0,
    highPriority: 0,
    topIssueType: 'N/A',
    topCountries: [],
    weeklyVolume: [0, 0, 0, 0, 0, 0, 0],
    topCustomers: [],
    topSalesmen: [],
    topRegionalManagers: []
  });
  const [loading, setLoading] = useState(true);
  
  // Date Range State (Default: Last 30 days)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      // Fetch tickets (Filtering client-side for simplicity with date range on Timestamp fields)
      // Ideally use Firestore range queries, but for now client-side filter is fine for moderate data
      const ticketsQuery = query(
        collection(db, "tickets"), 
        orderBy("createdAt", "desc")
      );
      
      const querySnapshot = await getDocs(ticketsQuery);
      const fetchedTickets: Ticket[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const ticketDate = data.createdAt?.toDate();
        
        if (ticketDate && ticketDate >= start && ticketDate <= end) {
          fetchedTickets.push({ id: doc.id, ...data } as Ticket);
        }
      });

      setTickets(fetchedTickets);

      // Calculate statistics
      const totalTickets = fetchedTickets.length;
      const openTickets = fetchedTickets.filter(t => t.status !== 'Closed' && t.status !== 'Resolved').length;
      const highPriority = fetchedTickets.filter(t => t.priority === 'Critical' || t.priority === 'High' || t.priority === 'Urgent (equipment stopped)').length;
      
      // Calculate Top Issue Type
      const issueCounts: { [key: string]: number } = {};
      fetchedTickets.forEach(t => {
        const type = t.issueType || 'Other';
        issueCounts[type] = (issueCounts[type] || 0) + 1;
      });
      const topIssueTypeEntry = Object.entries(issueCounts).sort((a, b) => b[1] - a[1])[0];
      const topIssueType = topIssueTypeEntry ? `${topIssueTypeEntry[0]} (${Math.round(topIssueTypeEntry[1]/totalTickets*100)}%)` : 'N/A';

      // Calculate top countries
      const countryCounts: { [key: string]: number } = {};
      fetchedTickets.forEach(ticket => {
        const country = ticket.country || 'Unknown';
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      });
      
      const topCountries = Object.entries(countryCounts)
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate top customers (companies)
      const companyCounts: { [key: string]: number } = {};
      fetchedTickets.forEach(ticket => {
        const company = ticket.companyName || 'Unknown';
        companyCounts[company] = (companyCounts[company] || 0) + 1;
      });

      const topCustomers = Object.entries(companyCounts)
        .map(([company, count]) => ({ company, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate top salesmen
      const salesmanCounts: { [key: string]: { total: number; open: number } } = {};
      fetchedTickets.forEach(ticket => {
        const salesman = ticket.salesmanName || 'Unknown';
        if (!salesmanCounts[salesman]) {
          salesmanCounts[salesman] = { total: 0, open: 0 };
        }
        salesmanCounts[salesman].total++;
        if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
          salesmanCounts[salesman].open++;
        }
      });

      const topSalesmen = Object.entries(salesmanCounts)
        .map(([salesman, data]) => ({ 
          salesman, 
          count: data.total, 
          openTickets: data.open 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate top regional managers
      const managerCounts: { [key: string]: { total: number; open: number } } = {};
      fetchedTickets.forEach(ticket => {
        const manager = ticket.regionalManager || 'Unknown';
        if (!managerCounts[manager]) {
          managerCounts[manager] = { total: 0, open: 0 };
        }
        managerCounts[manager].total++;
        if (ticket.status !== 'Closed' && ticket.status !== 'Resolved') {
          managerCounts[manager].open++;
        }
      });

      const topRegionalManagers = Object.entries(managerCounts)
        .map(([manager, data]) => ({ 
          manager, 
          count: data.total, 
          openTickets: data.open 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate weekly volume (based on the fetched range, grouped by day of week if range < 2 weeks, or just last 7 days of range)
      // For consistency with the chart "Weekly Volume", we'll just show the last 7 days relative to TODAY, 
      // but filtered by the selected range if it overlaps. 
      // Actually, the user wants "weekly ticket volume" on the chart.
      // Let's make the chart dynamic based on the date range if possible, or stick to "Last 7 Days" chart.
      // The user request was "filter date to be 'from to'". This usually applies to the data shown.
      // I'll update the chart to show volume over the selected range (bucketed).
      // For simplicity in this iteration, I'll keep the "Weekly Volume" chart as "Volume in Selected Range" (last 7 data points or bucketed).
      // Let's just show the last 7 days of the selected range.
      
      const weeklyVolume = Array(7).fill(0);
      const rangeEnd = new Date(dateRange.end);
      
      fetchedTickets.forEach(ticket => {
        const ticketDate = ticket.createdAt?.toDate();
        if (ticketDate) {
          const daysAgo = Math.floor((rangeEnd.getTime() - ticketDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysAgo >= 0 && daysAgo < 7) {
            weeklyVolume[6 - daysAgo]++;
          }
        }
      });

      setStats({
        totalTickets,
        openTickets,
        highPriority,
        topIssueType,
        topCountries,
        weeklyVolume,
        topCustomers,
        topSalesmen,
        topRegionalManagers
      });
      
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (tickets.length === 0) {
      alert("No data to download");
      return;
    }

    const headers = ['Ticket ID', 'Date', 'Company', 'Contact Person', 'Email', 'Country', 'Subject', 'Status', 'Priority', 'Issue Type'];
    
    const csvContent = [
      headers.join(','),
      ...tickets.map(t => [
        t.ticketId || t.id,
        t.createdAt?.toDate().toLocaleDateString() || '',
        `"${t.companyName || ''}"`,
        `"${t.contactPerson || ''}"`,
        t.email || '',
        `"${t.country || ''}"`,
        `"${t.subject || ''}"`,
        t.status,
        t.priority,
        t.issueType || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `inoksan_report_${dateRange.start}_to_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-1">Welcome back, Admin</p>
        </div>
        
        {/* Date Filter & Download */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#2C2F36] p-2 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 px-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span className="text-gray-400 text-sm">From:</span>
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-[#3A3D45] text-white border border-gray-600 rounded px-2 py-1 text-sm outline-none focus:border-[#ee3035]"
            />
            <button 
              onClick={() => setDateRange({
                start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
                end: new Date().toISOString().split('T')[0]
              })}
              className="bg-[#3A3D45] text-white border border-gray-600 rounded px-3 py-1 text-sm hover:bg-[#2C2F36] transition-colors"
            >
              Reset
            </button>
            <span className="text-gray-400 text-sm">To:</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-[#3A3D45] text-white border border-gray-600 rounded px-2 py-1 text-sm outline-none focus:border-[#ee3035]"
            />
          </div>
          
          <button 
            onClick={downloadReport}
            className="flex items-center gap-2 bg-[#ee3035] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium w-full sm:w-auto justify-center"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </header>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Total Tickets" 
          value={stats.totalTickets.toLocaleString()} 
          subtext="In selected range"
          icon={<BarChart3 className="h-6 w-6 text-blue-400" />} 
        />
        <StatCard 
          title="Critical / High Priority" 
          value={stats.highPriority.toString()} 
          subtext="Urgent tickets"
          isNegative={stats.highPriority > 0}
          icon={<AlertTriangle className="h-6 w-6 text-yellow-400" />} 
        />
        <StatCard 
          title="Top Issue Type" 
          value={stats.topIssueType.split('(')[0]} 
          subtext={stats.topIssueType.includes('(') ? `(${stats.topIssueType.split('(')[1]}` : ''}
          icon={<Tag className="h-6 w-6 text-green-400" />} 
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Volume Chart */}
        <div className="bg-[#2C2F36] p-6 rounded-xl border border-gray-700 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#ee3035]" />
            Volume (Last 7 Days of Range)
          </h3>
          <div className="h-64 flex items-end justify-between gap-2 px-4">
            {stats.weeklyVolume.map((count, i) => {
              const maxCount = Math.max(...stats.weeklyVolume, 1);
              const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={i} className="w-full bg-blue-500/20 hover:bg-[#ee3035] rounded-t-sm transition-all relative group" style={{ height: `${height}%` }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-sm text-gray-400">
             {/* Simple labels for last 7 days of the selected range */}
            {Array(7).fill(0).map((_, i) => {
               const d = new Date(dateRange.end);
               d.setDate(d.getDate() - (6 - i));
               return <span key={i}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
            })}
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-[#2C2F36] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#ee3035]" />
            Tickets by Region
          </h3>
          <div className="space-y-4">
            {stats.topCountries.map((country, index) => (
              <div key={country.country} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white w-8">#{index + 1}</span>
                  <span className="text-gray-300">{country.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#ee3035] rounded-full" 
                      style={{ width: `${(country.count / Math.max(...stats.topCountries.map(c => c.count), 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-400 w-8 text-right">{country.count}</span>
                </div>
              </div>
            ))}
            {stats.topCountries.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No data available for this period
              </div>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-[#2C2F36] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-400" />
            Top Customers
          </h3>
          <div className="space-y-4">
            {stats.topCustomers.map((customer, index) => (
              <div key={customer.company} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white w-8">#{index + 1}</span>
                  <span className="text-gray-300 truncate max-w-[150px]" title={customer.company}>{customer.company}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${(customer.count / Math.max(...stats.topCustomers.map(c => c.count), 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-400 w-8 text-right">{customer.count}</span>
                </div>
              </div>
            ))}
            {stats.topCustomers.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No data available for this period
              </div>
            )}
          </div>
        </div>

        {/* Issue Type Chart */}
        <div className="bg-[#2C2F36] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-green-400" />
            Issue Types Distribution
          </h3>
          <div className="space-y-3">
            {(() => {
              const issueCounts: { [key: string]: number } = {};
              tickets.forEach(t => {
                const type = t.issueType || 'Other';
                issueCounts[type] = (issueCounts[type] || 0) + 1;
              });
              const sortedIssues = Object.entries(issueCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6);
              const maxCount = Math.max(...sortedIssues.map(([, count]) => count), 1);
              
              return sortedIssues.map(([issue, count]) => (
                <div key={issue} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300 truncate">{issue}</span>
                    <span className="text-gray-400">{count}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all" 
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Priority Chart */}
        <div className="bg-[#2C2F36] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            Priority Distribution
          </h3>
          <div className="space-y-3">
            {(() => {
              const priorityCounts: { [key: string]: number } = {};
              tickets.forEach(t => {
                const priority = t.priority || 'Normal';
                priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
              });
              const sortedPriorities = Object.entries(priorityCounts)
                .sort((a, b) => b[1] - a[1]);
              const maxCount = Math.max(...sortedPriorities.map(([, count]) => count), 1);
              
              return sortedPriorities.map(([priority, count]) => (
                <div key={priority} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300 truncate">{priority}</span>
                    <span className="text-gray-400">{count}</span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        priority === 'High' || priority === 'Critical' || priority === 'Urgent (equipment stopped)' 
                          ? 'bg-red-500' 
                          : priority === 'Medium' 
                          ? 'bg-yellow-500' 
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Top Regional Managers */}
        <div className="bg-[#2C2F36] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-purple-400" />
            Top Regional Managers
          </h3>
          <div className="space-y-4">
            {stats.topRegionalManagers.map((manager, index) => (
              <div key={manager.manager} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white w-8">#{index + 1}</span>
                  <span className="text-gray-300 truncate max-w-[200px]" title={manager.manager}>{manager.manager}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full" 
                      style={{ width: `${(manager.count / Math.max(...stats.topRegionalManagers.map(m => m.count), 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-400 w-12 text-right">{manager.count}</span>
                  {manager.openTickets > 0 && (
                    <span className="text-xs text-yellow-400">({manager.openTickets} open)</span>
                  )}
                </div>
              </div>
            ))}
            {stats.topRegionalManagers.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No data available for this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attachments Summary Table */}
      <div className="bg-[#2C2F36] p-6 rounded-xl border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Paperclip className="h-5 w-5 text-blue-400" />
          Tickets with Attachments Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-600">
                <th className="text-left py-3 px-4 text-gray-300">Category</th>
                <th className="text-right py-3 px-4 text-gray-300">Count</th>
                <th className="text-right py-3 px-4 text-gray-300">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const withAttachments = tickets.filter(t => t.attachmentUrls && t.attachmentUrls.length > 0).length;
                const withoutAttachments = tickets.filter(t => !t.attachmentUrls || t.attachmentUrls.length === 0).length;
                const total = tickets.length;
                
                return [
                  {
                    category: 'With Attachments',
                    count: withAttachments,
                    percentage: total > 0 ? ((withAttachments / total) * 100).toFixed(1) : '0.0'
                  },
                  {
                    category: 'Without Attachments', 
                    count: withoutAttachments,
                    percentage: total > 0 ? ((withoutAttachments / total) * 100).toFixed(1) : '0.0'
                  },
                  {
                    category: 'Total Tickets',
                    count: total,
                    percentage: '100.0'
                  }
                ].map((row, index) => (
                  <tr key={row.category} className={`${index < 2 ? 'border-b border-gray-700' : ''}`}>
                    <td className="py-3 px-4 text-gray-300">{row.category}</td>
                    <td className="py-3 px-4 text-right text-white font-medium">{row.count}</td>
                    <td className="py-3 px-4 text-right text-gray-400">{row.percentage}%</td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtext, icon, isNegative }: any) {
  return (
    <div className="bg-[#2C2F36] p-6 rounded-xl border border-gray-700 hover:border-[#ee3035]/50 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
        <div className="p-2 bg-[#3A3D45] rounded-lg">
          {icon}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className={`text-xs font-medium mt-1 ${
          isNegative ? 'text-[#ee3035]' : 'text-gray-500'
        }`}>
          {subtext}
        </div>
      </div>
    </div>
  );
}
