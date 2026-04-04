'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eiokesokgiypxkdyhomd.supabase.co';
const supabaseKey = 'sb_publishable_wurz1buikXlEnKBc3vZnQA_Z2sijqgb'; 
const supabase = createClient(supabaseUrl, supabaseKey);

export default function IssueCenter() {
  const [issues, setIssues] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => { fetchIssues(); }, []);

  async function fetchIssues() {
    const { data } = await supabase.from('problems').select('*').order('created_at', { ascending: false });
    if (data) setIssues(data);
  }

  function getPriorityStyles(score) {
    if (score >= 90) return 'bg-amber-400 text-amber-950 border-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.2)]';
    if (score >= 70) return 'bg-emerald-500 text-white border-emerald-600';
    if (score >= 40) return 'bg-blue-500 text-white border-blue-600';
    if (score >= 20) return 'bg-slate-400 text-white border-slate-500';
    return 'bg-rose-600 text-white border-rose-700 animate-pulse';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userInput.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: userInput, 
          existingIssues: issues.map(i => ({ title: i.title })) 
        })
      });
      
      const brain = await res.json();

      if (brain.decision === "REJECT") {
        // --- REJECTION REASON SHOWN HERE ---
        alert(`❌ REJECTED\n\nReason: ${brain.reason}`);
        setLoading(false);
        return; 
      }

      const { error } = await supabase.from('problems').insert([{ 
        title: userInput, 
        priority: brain.priority, 
        category: brain.category || 'General', 
        reason: brain.reason 
      }]);

      if (!error) {
        setUserInput('');
        fetchIssues();
      }
    } catch (err) {
      alert("System failure. Check console.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteIssue(id) {
    const { error } = await supabase.from('problems').delete().eq('id', id);
    if (!error) fetchIssues();
  }

  const dynamicCategories = ['All', ...new Set(issues.map(i => i.category).filter(Boolean))];

  const processedIssues = issues
    .filter(issue => filterCategory === 'All' || issue.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      return sortBy === 'high-priority' ? b.priority - a.priority : a.priority - b.priority;
    });

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12 font-sans bg-[#FBFBFE] min-h-screen text-slate-900 selection:bg-black selection:text-white">
      
      {/* --- HEADER --- */}
      <header className="mb-16 flex flex-col items-center">
        <div className="bg-red-500 text-white px-4 py-1 rounded-full text-[20px] font-black tracking-[0.4em] mb-4 uppercase">
          Issues that are fixable with software
        </div>
        <h1 className="text-7xl font-black tracking-tighter italic leading-none text-center">
          ISSUE CENTER
        </h1>
      </header>

      {/* --- INPUT AREA --- */}
      <section className="mb-16">
        <form onSubmit={handleSubmit} className="relative group">
          <input 
            className="w-full p-8 pr-32 rounded-[2rem] border-4 border-slate-100 focus:border-black bg-white text-2xl font-medium transition-all shadow-xl focus:shadow-2xl outline-none placeholder:text-slate-300"
            value={userInput} 
            onChange={e => setUserInput(e.target.value)}
            placeholder={loading ? "Analyzing..." : "Describe the problem..."}
            disabled={loading}
          />
          <button 
            type="submit"
            className="absolute right-4 top-4 bottom-4 px-8 bg-black text-white rounded-[1.5rem] font-black hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-30"
            disabled={loading}
          >
            {loading ? "..." : "LOG"}
          </button>
        </form>
      </section>

      {/* --- FILTERS --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 px-2">
        <div className="flex flex-wrap gap-2 justify-center">
          {dynamicCategories.map(cat => (
            <button 
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all border-2 ${
                filterCategory === cat 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-transparent border-b-2 border-slate-200 text-sm font-black p-2 outline-none cursor-pointer hover:border-black transition-all uppercase"
        >
          <option value="newest">Newest First</option>
          <option value="high-priority">Priority: 100 → 0</option>
          <option value="low-priority">Priority: 0 → 100</option>
        </select>
      </div>

      {/* --- ISSUE GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {processedIssues.map(issue => (
          <div key={issue.id} className="relative p-8 bg-white border-4 border-slate-50 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-black transition-all group overflow-hidden">
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <span className={`px-4 py-1.5 rounded-full text-[10px] uppercase font-black border-2 ${getPriorityStyles(issue.priority)}`}>
                  Priority Score: {issue.priority}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full">
                  Category: {issue.category}
                </span>
              </div>
              <button 
                onClick={() => deleteIssue(issue.id)} 
                className="opacity-0 group-hover:opacity-100 text-[10px] font-black text-slate-300 hover:text-red-500 transition-all"
              >
                DELETE
              </button>
            </div>

            <h3 className="text-2xl font-bold leading-tight text-slate-800">
              {issue.title}
            </h3>
          </div>
        ))}
        
        {processedIssues.length === 0 && (
          <div className="col-span-full py-20 text-center border-4 border-dashed border-slate-100 rounded-[3rem]">
            <p className="text-slate-300 font-black text-2xl italic">NO DATA LOGGED</p>
          </div>
        )}
      </div>
    </div>
  );
}