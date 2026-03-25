'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eiokesokgiypxkdyhomd.supabase.co';
const supabaseKey = 'sb_publishable_wurz1buikXlEnKBc3vZnQA_Z2sijqgb'; 

const supabase = createClient(supabaseUrl, supabaseKey);

const TIER_WEIGHTS = { 'S': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C+': 5, 'C': 4, 'D+': 3, 'D': 2, 'F': 1 };

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

  async function getAiAnalysis(text) {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      return await res.json();
    } catch (e) {
      return { error: 'Connection failed' };
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userInput.trim()) return;
    setLoading(true);
    
    const analysis = await getAiAnalysis(userInput);

    if (analysis.error) {
      alert(analysis.error);
      setLoading(false);
      return;
    }

    const finalPriority = analysis.priority && analysis.priority.trim() !== '' ? analysis.priority : 'C';
    const finalCategory = analysis.category && analysis.category.trim() !== '' ? analysis.category : 'General';
    const finalReason = analysis.reason && analysis.reason.trim() !== '' ? analysis.reason : 'No reasoning provided.';
    const finalTitle = analysis.title && analysis.title.trim() !== '' ? analysis.title : userInput;

    const { error } = await supabase.from('problems').insert([
      { 
        title: finalTitle, 
        priority: finalPriority, 
        category: finalCategory, 
        reason: finalReason,
        status: 'Open' 
      }
    ]);

    if (!error) {
      setUserInput('');
      fetchIssues();
    } else {
      console.error("Supabase Insert Error:", error);
    }
    setLoading(false);
  }

  async function deleteIssue(id) {
    const { error } = await supabase.from('problems').delete().eq('id', id);
    if (!error) fetchIssues();
  }

  function getTierColor(tier) {
    if (tier === 'S') return 'bg-yellow-400 text-yellow-900 shadow-[0_0_10px_rgba(250,204,21,0.5)]';
    if (tier?.startsWith('A')) return 'bg-emerald-500 text-white';
    if (tier?.startsWith('B')) return 'bg-blue-500 text-white';
    if (tier?.startsWith('C')) return 'bg-slate-400 text-white';
    if (tier?.startsWith('D')) return 'bg-orange-400 text-white';
    if (tier === 'F') return 'bg-red-600 text-white animate-pulse';
    return 'bg-slate-200 text-slate-600';
  }

  const dynamicCategories = ['All', ...new Set(issues.map(i => i.category).filter(Boolean))];

  const processedIssues = issues
    .filter(issue => filterCategory === 'All' || issue.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      
      const weightA = TIER_WEIGHTS[a.priority] || 0;
      const weightB = TIER_WEIGHTS[b.priority] || 0;
      
      return sortBy === 'tier-desc' ? weightB - weightA : weightA - weightB;
    });

  return (
    <div className="max-w-4xl mx-auto p-10 font-sans bg-white min-h-screen text-slate-900">
      <header className="mb-12 text-center">
        <h1 className="text-6xl font-black italic tracking-tighter">IssueCenter</h1>
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Context Intelligence</p>
      </header>

      <form onSubmit={handleSubmit} className="mb-10 flex gap-3">
        <input 
          className="flex-1 p-5 rounded-2xl border-2 border-slate-100 focus:border-black outline-none bg-slate-50 text-xl transition-all"
          value={userInput} 
          onChange={e => setUserInput(e.target.value)}
          placeholder={loading ? "Analyzing..." : "Log an issue..."}
          disabled={loading}
        />
        <button className="bg-black text-white px-10 rounded-2xl font-black hover:bg-slate-800 transition-all disabled:opacity-20 active:scale-95">
          {loading ? "..." : "POST"}
        </button>
      </form>

      {dynamicCategories.length > 1 && (
        <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-4 rounded-2xl mb-8 border border-slate-100 gap-4">
          <div className="flex flex-wrap gap-2">
            {dynamicCategories.map(cat => (
              <button 
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  filterCategory === cat 
                    ? 'bg-black text-white' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-black'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 text-sm font-bold p-2 rounded-xl outline-none cursor-pointer hover:border-black transition-all"
          >
            <option value="newest">Newest First</option>
            <option value="tier-desc">Highest Tier (S to F)</option>
            <option value="tier-asc">Lowest Tier (F to S)</option>
          </select>
        </div>
      )}

      <div className="space-y-4">
        {processedIssues.map(issue => (
          <div key={issue.id} className="p-6 border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all group bg-white">
            <div className="flex justify-between items-start mb-3">
              <div className="flex gap-3 items-center">
                <div className="relative group/priority">
                  <span className={`cursor-help px-3 py-1.5 rounded-xl text-xs font-black tracking-widest ${getTierColor(issue.priority)}`}>
                    {issue.priority || 'N/A'}
                  </span>
                  <div className="absolute bottom-full mb-2 left-0 w-56 p-3 bg-black text-white text-xs rounded-xl opacity-0 group-hover/priority:opacity-100 transition-opacity pointer-events-none z-10 shadow-2xl">
                    {issue.reason}
                  </div>
                </div>

                <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  {issue.category}
                </span>
              </div>
              <button onClick={() => deleteIssue(issue.id)} className="opacity-0 group-hover:opacity-100 text-[10px] font-black text-red-300 hover:text-red-600 transition-all">DELETE</button>
            </div>
            
            <h3 className="text-xl font-bold leading-tight text-slate-800">{issue.title}</h3>
          </div>
        ))}
        
        {processedIssues.length === 0 && (
          <div className="text-center p-10 text-slate-400 font-bold uppercase text-sm tracking-widest">
            No issues found
          </div>
        )}
      </div>
    </div>
  );
}