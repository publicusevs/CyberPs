import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Search, Filter, Eye, ChevronRight, FileText, BadgeAlert, Database, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, Table, TableRow, TableCell } from '../components/ui/Table';
import { InputField } from '../components/ui/InputField';

const CaseList = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCases();
    }, []);

    const fetchCases = async () => {
        try {
            const res = await api.get('/cases');
            if (res.data.success) {
                setCases(res.data.data);
            }
        } catch (err) {
            console.error('Fetch error');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value.length > 2) {
            const res = await api.get(`/cases/search?q=${value}`);
            setCases(res.data.data);
        } else if (value.length === 0) {
            fetchCases();
        }
    };

    const handleDelete = async (caseId, firNo) => {
        const confirmDelete = window.confirm(`WARNING: You are about to permanently delete Case ${firNo || caseId}.\n\nThis will instantly destroy all related data, artifacts, and legal notices associated with this case from the database and disk. This action CANNOT BE UNDONE.\n\nAre you absolutely sure you want to proceed?`);
        
        if (confirmDelete) {
            try {
                setLoading(true);
                const res = await api.delete(`/cases/${caseId}`);
                if (res.data.success) {
                    await fetchCases();
                } else {
                    alert(res.data.message || 'Failed to delete case.');
                    setLoading(false);
                }
            } catch (err) {
                console.error('Delete error', err);
                alert('An error occurred while attempting to delete the case.');
                setLoading(false);
            }
        }
    };

    if (loading) return <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading operational vault...</div>;

    const getStatusVariant = (status) => {
        switch (status) {
            case 'Active': return 'default';
            case 'Pending': return 'warning';
            case 'Closed': return 'success';
            default: return 'muted';
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">
                        Evidence<span className="text-blue-600"> Vault</span>
                    </h1>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black tracking-[0.2em] mt-1 ml-1 uppercase">
                        <Database size={12} className="text-blue-600" />
                        Authenticated Access // {cases.length} Records
                    </div>
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    <div className="w-full md:w-80">
                        <InputField 
                            icon={Search} 
                            placeholder="Search by ACK / FIR / Mobile" 
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    <Button variant="outline" className="p-2.5"><Filter size={20} /></Button>
                    <Link to="/cases/new">
                        <Button variant="primary" icon={FileText}>New Case</Button>
                    </Link>
                </div>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50">
                <Table headers={["Intel Code / ID", "Investigator", "Asset Value", "Status", "Date Logged", "Action"]}>
                    {cases.map((c) => (
                        <TableRow key={c.case_id} className="cursor-default hover:bg-slate-50 transition-colors">
                            <TableCell>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-900 tracking-tight">FIR: {c.fir_no}</p>
                                    <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">ACK: {c.ackn_no || 'MANUAL'}</p>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600 uppercase">
                                        {c.assigned_to_name?.[0] || 'U'}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700">{c.assigned_to_name || 'UNASSIGNED'}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className={`font-mono text-sm font-bold tracking-tighter ${parseFloat(c.fraud_amount) > 100000 ? 'text-rose-600' : 'text-slate-900'}`}>
                                    ₹{parseFloat(c.fraud_amount).toLocaleString()}
                                    {parseFloat(c.fraud_amount) > 100000 && <BadgeAlert size={14} className="inline ml-2 text-rose-500" />}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(c.status)}>{c.status}</Badge>
                            </TableCell>
                            <TableCell className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
                                {new Date(c.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right flex items-center justify-end gap-2">
                                <Link to={`/cases/${c.case_id}`}>
                                    <Button variant="ghost" className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl">
                                        <Eye size={18} />
                                    </Button>
                                </Link>
                                <Button 
                                    variant="ghost" 
                                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                                    onClick={() => handleDelete(c.case_id, c.fir_no)}
                                    title="Permanently Delete Case"
                                >
                                    <Trash2 size={18} />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                    {cases.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="py-32 text-center">
                                <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-xs text-slate-400 font-black uppercase tracking-[0.3em]">No records found</p>
                            </TableCell>
                        </TableRow>
                    )}
                </Table>
            </Card>
        </div>
    );
};

export default CaseList;
