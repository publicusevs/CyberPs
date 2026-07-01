import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
    FileText, 
    Activity, 
    TrendingUp, 
    ShieldAlert, 
    ArrowUpRight,
    Users,
    Search,
    ChevronRight,
    Clock
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Table';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalCases: 0,
        activeCases: 0,
        closedCases: 0,
        totalFraudAmount: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    const chartData = [
        { name: 'Jan', cases: 4 },
        { name: 'Feb', cases: 7 },
        { name: 'Mar', cases: 12 },
        { name: 'Apr', cases: stats.totalCases || 15 },
    ];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await api.get('/dashboard/stats');
            if (res.data.success) {
                setStats(res.data.stats);
                setRecentActivity(res.data.recentActivity);
            }
        } catch (err) {
            console.error('Data sync failed');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    if (loading) return <div className="p-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Loading operational data...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                        Command<span className="text-blue-600"> Deck</span>
                    </h1>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold tracking-[0.2em] mt-1 ml-1">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                        SYSTEM OPERATIONAL // CENTRAL HUB
                    </div>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" icon={Search}>Lookup Case</Button>
                    <Button variant="primary" icon={FileText}>New Case</Button>
                </div>
            </div>

            {/* Key Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="p-6 border-l-4 border-l-blue-600">
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-2">Total Cases</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-4xl font-black tracking-tighter text-slate-900">{stats.totalCases}</h3>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FileText size={20} /></div>
                    </div>
                    <p className="text-[9px] text-emerald-600 font-bold mt-4 flex items-center gap-1 uppercase tracking-widest">
                        <ArrowUpRight size={12} /> +12% this month
                    </p>
                </Card>

                <Card className="p-6 border-l-4 border-l-emerald-600">
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-2">Active Investigations</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-4xl font-black tracking-tighter text-slate-900">{stats.activeCases}</h3>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Activity size={20} /></div>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold mt-4 uppercase tracking-widest">Ongoing operations</p>
                </Card>

                <Card className="p-6 border-l-4 border-l-amber-500">
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-2">Asset Recovery</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-black tracking-tighter text-slate-900 leading-none mb-1">{formatCurrency(stats.totalFraudAmount)}</h3>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-500"><TrendingUp size={20} /></div>
                    </div>
                    <p className="text-[9px] text-amber-600 font-bold mt-4 uppercase tracking-widest">High-value tracking</p>
                </Card>

                <Card className="p-6 border-l-4 border-l-rose-500">
                    <p className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mb-2">Critical Alerts</p>
                    <div className="flex items-end justify-between">
                        <h3 className="text-4xl font-black tracking-tighter text-slate-900">04</h3>
                        <div className="p-2 bg-rose-50 rounded-lg text-rose-500"><ShieldAlert size={20} /></div>
                    </div>
                    <p className="text-[9px] text-rose-600 font-bold mt-4 uppercase tracking-widest">Action Required</p>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8">
                    <CardHeader title="Incident Statistics" subtitle="Case registration velocity" icon={Activity} color="blue" />
                    <div className="h-64 w-full mt-4" style={{ minHeight: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '10px' }}
                                />
                                <Area type="monotone" dataKey="cases" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCases)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-8">
                    <CardHeader title="Unit Activity" subtitle="Registration by unit" icon={Users} color="green" />
                    <div className="h-64 w-full mt-4" style={{ minHeight: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                            <BarChart data={[{name: 'RS', val: 8}, {name: 'PS', val: 12}, {name: 'AV', val: 5}, {name: 'NK', val: 9}]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '10px' }}
                                />
                                <Bar dataKey="val" fill="#059669" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Recent Table */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-black tracking-tight uppercase italic flex items-center gap-2 text-slate-900">
                        <Clock size={20} className="text-blue-600" /> Recent Case Reports
                    </h2>
                    <Button variant="ghost" className="text-[10px] tracking-widest uppercase">Refresh Data</Button>
                </div>
                <Table headers={["Case No", "Operator", "Date Logged", "Status"]}>
                    {recentActivity.map((activity, i) => (
                        <TableRow key={i}>
                            <TableCell className="font-bold text-blue-600">{activity.fir_no}</TableCell>
                            <TableCell className="text-slate-600">{activity.created_by}</TableCell>
                            <TableCell className="text-slate-400 text-xs">{new Date(activity.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                                <Badge variant={activity.status === 'Active' ? 'default' : 'success'}>
                                    {activity.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                    {recentActivity.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={4} className="py-20 text-center text-slate-400 italic font-medium text-xs tracking-widest">
                                No recent entries found
                            </TableCell>
                        </TableRow>
                    )}
                </Table>
            </Card>
        </div>
    );
};

export default Dashboard;
