import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Mail, Save, Plus, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

const MailSettings = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('credentials');
    
    // Credentials State
    const [credentials, setCredentials] = useState({ EMAIL_USER: '', EMAIL_PASSWORD: '' });
    
    // Banks State
    const [banks, setBanks] = useState([]);
    const [editingBankIndex, setEditingBankIndex] = useState(-1);
    const [editBankData, setEditBankData] = useState({ bank_name: '', bankmail: '', bankaddress: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const credRes = await api.get('/settings/mail');
            setCredentials(credRes.data);
            
            const bankRes = await api.get('/settings/banks');
            setBanks(bankRes.data);
        } catch (error) {
            console.error('Failed to load settings:', error);
            addToast('Failed to load settings from server', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCredentials = async () => {
        try {
            await api.post('/settings/mail', credentials);
            addToast('Mail credentials saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save credentials:', error);
            addToast('Failed to save mail credentials', 'error');
        }
    };

    const handleSaveBanks = async (updatedBanks) => {
        try {
            await api.post('/settings/banks', updatedBanks);
            setBanks(updatedBanks);
            addToast('Bank list updated successfully!', 'success');
        } catch (error) {
            console.error('Failed to update bank list:', error);
            addToast('Failed to update bank list', 'error');
        }
    };

    const handleEditBank = (index) => {
        setEditingBankIndex(index);
        setEditBankData(banks[index]);
    };

    const handleSaveBankEdit = () => {
        const newBanks = [...banks];
        if (editingBankIndex >= 0) {
            newBanks[editingBankIndex] = editBankData;
        } else {
            newBanks.push(editBankData);
        }
        handleSaveBanks(newBanks);
        setEditingBankIndex(-1);
        setEditBankData({ bank_name: '', bankmail: '', bankaddress: '' });
    };

    const handleDeleteBank = (index) => {
        if(window.confirm('Are you sure you want to remove this bank from the list?')) {
            const newBanks = [...banks];
            newBanks.splice(index, 1);
            handleSaveBanks(newBanks);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

    return (
        <div className="w-full">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Mail size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mail Configuration</h1>
                    <p className="text-sm font-medium text-slate-500">Manage sender credentials and recipient node lists.</p>
                </div>
            </div>

            <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('credentials')}
                    className={`px-4 py-2 font-bold text-sm transition-colors ${activeTab === 'credentials' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Sender Credentials
                </button>
                <button
                    onClick={() => setActiveTab('banks')}
                    className={`px-4 py-2 font-bold text-sm transition-colors ${activeTab === 'banks' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                >
                    Bank & Nodal Officer Emails
                </button>
            </div>

            {activeTab === 'credentials' && (
                <Card className="max-w-xl">
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sender Email ID</label>
                            <input
                                type="text"
                                value={credentials.EMAIL_USER}
                                onChange={(e) => setCredentials({...credentials, EMAIL_USER: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Password</label>
                            <input
                                type="password"
                                value={credentials.EMAIL_PASSWORD}
                                onChange={(e) => setCredentials({...credentials, EMAIL_PASSWORD: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <div className="pt-4">
                            <Button onClick={handleSaveCredentials} className="flex items-center gap-2">
                                <Save size={16} /> Save Credentials
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {activeTab === 'banks' && (
                <Card>
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800">Bank Recipients List</h2>
                            <Button onClick={() => { setEditingBankIndex(-2); setEditBankData({ bank_name: '', bankmail: '', bankaddress: '' }); }} className="flex items-center gap-2" variant="outline">
                                <Plus size={16} /> Add New Bank
                            </Button>
                        </div>
                        
                        {(editingBankIndex === -2 || editingBankIndex >= 0) && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6 flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bank Name</label>
                                    <input type="text" value={editBankData.bank_name} onChange={(e) => setEditBankData({...editBankData, bank_name: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm" placeholder="e.g. Axis Bank" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email ID</label>
                                    <input type="email" value={editBankData.bankmail} onChange={(e) => setEditBankData({...editBankData, bankmail: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm" placeholder="e.g. nodal@bank.com" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                                    <input type="text" value={editBankData.bankaddress} onChange={(e) => setEditBankData({...editBankData, bankaddress: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm" placeholder="Optional Address" />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleSaveBankEdit} className="bg-blue-600 hover:bg-blue-700">Save</Button>
                                    <Button onClick={() => setEditingBankIndex(-1)} variant="outline" className="bg-white">Cancel</Button>
                                </div>
                            </div>
                        )}

                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-bold text-slate-600">Bank Name</th>
                                        <th className="px-4 py-3 font-bold text-slate-600">Email ID</th>
                                        <th className="px-4 py-3 font-bold text-slate-600">Address</th>
                                        <th className="px-4 py-3 font-bold text-slate-600 w-24 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {banks.map((b, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3 font-semibold text-slate-800">{b.bank_name}</td>
                                            <td className="px-4 py-3 text-slate-600">{b.bankmail}</td>
                                            <td className="px-4 py-3 text-slate-500 text-xs">{b.bankaddress}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-center gap-3">
                                                    <button onClick={() => handleEditBank(idx)} className="text-blue-500 hover:text-blue-700 transition-colors"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleDeleteBank(idx)} className="text-rose-500 hover:text-rose-700 transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default MailSettings;
