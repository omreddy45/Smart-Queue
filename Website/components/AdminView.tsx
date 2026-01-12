import React, { useEffect, useState, useRef } from 'react';
import { BackendService } from '../services/mockBackend';
import { GeminiService } from '../services/geminiService';
import { QueueStats, Canteen } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, Clock, Users, Activity, Sparkles, MoreHorizontal, Download, LogOut } from 'lucide-react';

interface AdminViewProps {
    canteen: Canteen;
    onLogout?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ canteen, onLogout }) => {
    const [stats, setStats] = useState<QueueStats | null>(null);
    const [chartData, setChartData] = useState<{ name: string, orders: number }[]>([]);
    const [insights, setInsights] = useState<string>('');
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [report, setReport] = useState<string>('');
    const [loadingReport, setLoadingReport] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [qrSrc, setQrSrc] = useState<string>('');
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const loadData = async () => {
        try {
            const statsData = await BackendService.getStats(canteen.id);
            setStats(statsData);
            const trafficData = await BackendService.getHourlyTraffic(canteen.id);
            setChartData(trafficData);
        } catch (err) {
            console.error('Error loading data:', err);
        }
    };

    useEffect(() => {
        // Construct the unique URL for this canteen
        const url = new URL(window.location.origin);
        url.searchParams.set('canteenId', canteen.id);

        // Generate QR Image using a stable public API to avoid browser-side library issues
        const params = new URLSearchParams();
        params.set('canteenId', canteen.id);
        params.set('name', canteen.name);
        params.set('campus', canteen.campus);
        params.set('themeColor', canteen.themeColor);

        // Construct the full URL with all parameters
        url.search = params.toString();

        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url.toString())}&color=111827&bgcolor=ffffff`;
        setQrSrc(qrApiUrl);

        // Initial load
        loadData();

        // Set up event listeners
        const handleDataUpdate = () => {
            console.log('[AdminView] Stats update event received');
            loadData();
        };

        window.addEventListener('smartqueue-update', handleDataUpdate);
        
        // Also listen to storage changes
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'smartqueue_tokens') {
                console.log('[AdminView] Storage changed, loading data');
                loadData();
            }
        };
        window.addEventListener('storage', handleStorageChange);

        // Set up polling as fallback (every 2 seconds)
        pollingIntervalRef.current = setInterval(() => {
            loadData();
        }, 2000);

        return () => {
            window.removeEventListener('smartqueue-update', handleDataUpdate);
            window.removeEventListener('storage', handleStorageChange);
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [canteen.id]);

    const handleGenerateInsights = async () => {
        if (!stats) return;
        setLoadingInsights(true);
        try {
            const text = await GeminiService.generateQueueInsights(stats);
            setInsights(text);
        } catch (error) {
            console.error("Error generating insights:", error);
            setInsights("Unable to generate AI report at this moment. Please try again in a few seconds.");
        } finally {
            setLoadingInsights(false);
        }
    };

    const handleGenerateDetailedReport = async () => {
        if (!stats) return;
        setLoadingReport(true);
        try {
            // Get today's order summary for sales analysis
            const orderSummary = await BackendService.getTodaysOrderSummary(canteen.id);
            const detailedReport = await GeminiService.generateDetailedReport(stats, canteen.name, orderSummary);
            setReport(detailedReport);
            setShowReportModal(true);
        } catch (error) {
            console.error("Error generating report:", error);
            setReport("Unable to generate detailed report at this moment. Please try again in a few seconds.");
            setShowReportModal(true);
        } finally {
            setLoadingReport(false);
        }
    };

    if (!stats) return <div className="p-20 text-center text-gray-400 animate-pulse">Loading dashboard...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{canteen.name} Dashboard</h1>
                    <p className="text-gray-500">Overview of performance for {canteen.campus}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm text-green-600">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Live Updates
                    </div>
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Orders" value={stats.totalOrdersToday} icon={<TrendingUp size={20} className="text-white" />} gradient="from-blue-500 to-blue-600" />
                <StatCard title="Avg Wait Time" value={`${stats.averageWaitTime}m`} icon={<Clock size={20} className="text-white" />} gradient="from-purple-500 to-purple-600" />
                <StatCard title="Active Queue" value={stats.activeQueueLength} icon={<Users size={20} className="text-white" />} gradient="from-green-500 to-green-600" />
                <StatCard title="Peak Hour" value="12 PM" icon={<Activity size={20} className="text-white" />} gradient="from-orange-500 to-orange-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Chart */}
                <Card className="lg:col-span-2 min-h-[400px]" title="Traffic Volume">
                    <div className="h-80 w-full mt-4">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        allowDecimals={false}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                                        itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                                    />
                                    <Bar dataKey="orders" radius={[6, 6, 0, 0]} barSize={32} animationDuration={800}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <Activity size={48} className="mb-4 opacity-20" />
                                <p>No traffic data available yet.</p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Sidebar Column */}
                <div className="space-y-6">

                    {/* QR Code Asset Card */}
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 text-center relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 to-purple-600" />

                        <h3 className="text-gray-900 font-bold mb-1">Canteen QR Code</h3>
                        <p className="text-xs text-gray-400 mb-6">Scan to join {canteen.name} queue</p>

                        <div className="bg-white p-4 rounded-xl border-4 border-gray-900 inline-block shadow-sm mb-4">
                            {qrSrc ? (
                                <img src={qrSrc} alt="Canteen QR Code" className="w-32 h-32" />
                            ) : (
                                <div className="w-32 h-32 bg-gray-100 animate-pulse rounded" />
                            )}
                        </div>

                        <div className="text-[10px] font-mono text-gray-400 bg-gray-50 p-2 rounded break-all mb-4 border border-gray-100">
                            ID: {canteen.id}
                        </div>

                        {qrSrc && (
                            <a href={qrSrc} download={`canteen-${canteen.id}-qr.png`} className="block w-full">
                                <Button variant="outline" size="sm" fullWidth className="text-xs">
                                    <Download size={14} className="mr-2" /> Download Sticker
                                </Button>
                            </a>
                        )}
                    </div>

                    {/* AI Insights */}
                    <Card title="Gemini Intelligence" className="bg-gradient-to-b from-white to-indigo-50/30">
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Queue Analysis</h4>
                                    <p className="text-sm text-gray-500 mt-1">Get AI-driven insights on staff allocation and wait times.</p>
                                </div>
                            </div>

                            {insights ? (
                                <div className={`p-5 rounded-xl border shadow-sm text-sm space-y-3 relative animate-fade-in ${insights.includes('Failed') || insights.includes('unavailable')
                                        ? 'bg-red-50 border-red-100'
                                        : 'bg-white border-indigo-100'
                                    }`}>
                                    <div className={`font-semibold flex items-center gap-2 ${insights.includes('Failed') || insights.includes('unavailable')
                                            ? 'text-red-700'
                                            : 'text-indigo-700'
                                        }`}>
                                        <Sparkles size={14} /> {insights.includes('Failed') || insights.includes('unavailable') ? 'Report Error' : 'Report Generated'}
                                    </div>
                                    <div className={`leading-relaxed whitespace-pre-wrap ${insights.includes('Failed') || insights.includes('unavailable')
                                            ? 'text-red-700'
                                            : 'text-gray-700'
                                        }`}>{insights}</div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setInsights('')}
                                        className={`w-full mt-2 text-xs ${insights.includes('Failed') || insights.includes('unavailable')
                                                ? 'text-red-400 hover:text-red-600'
                                                : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        Clear Report
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <Button fullWidth onClick={handleGenerateInsights} disabled={loadingInsights} className="bg-gray-900 hover:bg-black text-white shadow-lg shadow-gray-200">
                                        {loadingInsights ? 'Analyzing Data...' : 'Generate Insights'}
                                    </Button>
                                    <Button fullWidth onClick={handleGenerateDetailedReport} disabled={loadingReport} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                                        {loadingReport ? 'Generating Report...' : 'Generate Detailed Report'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Detailed Report Modal */}
                    {showReportModal && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
                            <Card className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white shadow-2xl">
                                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
                                    <h2 className="text-2xl font-bold text-gray-900">Detailed Admin Report</h2>
                                    <button
                                        onClick={() => setShowReportModal(false)}
                                        className="text-gray-500 hover:text-gray-700 text-2xl"
                                    >
                                        ×
                                    </button>
                                </div>
                                
                                <div className="p-6">
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                                        <p className="text-sm text-blue-800">
                                            <strong>Canteen:</strong> {canteen.name} | <strong>Generated:</strong> {new Date().toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed font-sans bg-white p-6 rounded-lg border border-gray-200">
                                        {report}
                                    </div>

                                    <div className="mt-6 flex gap-3 sticky bottom-0 bg-white pt-4 border-t border-gray-200">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                const element = document.createElement('a');
                                                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(report));
                                                element.setAttribute('download', `${canteen.name}-report-${new Date().toISOString().split('T')[0]}.txt`);
                                                element.style.display = 'none';
                                                document.body.appendChild(element);
                                                element.click();
                                                document.body.removeChild(element);
                                            }}
                                            className="flex-1"
                                        >
                                            <Download size={16} className="mr-2" /> Download Report
                                        </Button>
                                        <Button
                                            fullWidth
                                            onClick={() => setShowReportModal(false)}
                                            className="flex-1 bg-gray-900 hover:bg-black text-white"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon, gradient }: { title: string, value: string | number, icon: React.ReactNode, gradient: string }) => (
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100 hover:-translate-y-1 transition-transform duration-300">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg shadow-gray-200`}>
                {icon}
            </div>
            <button className="text-gray-300 hover:text-gray-500"><MoreHorizontal size={20} /></button>
        </div>
        <div>
            <h3 className="text-gray-500 text-sm font-semibold mb-1 uppercase tracking-wide">{title}</h3>
            <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
        </div>
    </div>
);