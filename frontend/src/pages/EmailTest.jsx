import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Mail, Send } from 'lucide-react';
import api from '../services/api';

const EmailTest = () => {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('Test Subject');
    const [text, setText] = useState('This is a test message.');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const handleSend = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const res = await api.post('/email/test-send', { to, subject, text });
            if (res.data.success) {
                setStatus({ type: 'success', message: 'Email sent successfully!' });
            }
        } catch (err) {
            setStatus({ type: 'error', message: err.response?.data?.message || err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-10">
            <Card className="p-8 bg-white shadow-xl rounded-3xl border border-slate-100">
                <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <Mail size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Email <span className="text-blue-600">Testing Module</span></h2>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Simple Text Dispatch Test</p>
                    </div>
                </div>

                <form onSubmit={handleSend} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Recipient Email</label>
                        <input 
                            type="email" 
                            required
                            value={to} 
                            onChange={(e) => setTo(e.target.value)} 
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            placeholder="officer@bank.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Subject</label>
                        <input 
                            type="text" 
                            required
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)} 
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Message Body</label>
                        <textarea 
                            required
                            value={text} 
                            onChange={(e) => setText(e.target.value)} 
                            rows={6}
                            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                        ></textarea>
                    </div>

                    {status && (
                        <div className={`p-4 rounded-xl text-sm font-bold ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                            {status.message}
                        </div>
                    )}

                    <Button 
                        type="submit" 
                        variant="primary" 
                        className="w-full py-4 bg-blue-600 shadow-xl shadow-blue-200" 
                        icon={Send} 
                        disabled={loading}
                        loading={loading}
                    >
                        {loading ? 'Transmitting...' : 'Send Test Email'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default EmailTest;
