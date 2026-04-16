'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = 'https://eiokesokgiypxkdyhomd.supabase.co';
const supabaseKey = 'sb_publishable_wurz1buikXlEnKBc3vZnQA_Z2sijqgb'; 
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 🛡️ THE BULLETPROOF AVATAR COMPONENT 🛡️ ---
const SmartAvatar = ({ role, name, email, sizeClass = "w-full h-full object-contain p-2" }) => {
  const companyName = name || 'Company';
  const domain = companyName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

  const urls = {
    clearbit: `https://logo.clearbit.com/${domain}`, 
    google: `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`,
    uiAvatars: `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=10b981&color=fff&bold=true&size=128`,
    bot: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email || 'guest')}&backgroundColor=b6e3f4`
  };

  const [imgSrc, setImgSrc] = useState(role === 'company' ? urls.clearbit : urls.bot);
  const [attempt, setAttempt] = useState(0);

  const handleError = () => {
    if (role !== 'company') return;
    
    if (attempt === 0) {
      setImgSrc(urls.google); // גיבוי 1: גוגל
      setAttempt(1);
    } else if (attempt === 1) {
      setImgSrc(urls.uiAvatars); // גיבוי 2: אותיות
      setAttempt(2);
    }
  };

  return (
    <img 
      src={imgSrc} 
      className={sizeClass} 
      alt={companyName} 
      onError={handleError}
      style={{ textIndent: '-9999px', color: 'transparent' }} // מסתיר את האייקון השבור
    />
  );
};


// --- MAIN APP COMPONENT ---
export default function IssueCenter() {
  const [issues, setIssues] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [sortBy, setSortBy] = useState('high-priority');
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);
      fetchIssues();
    };
    init();
  }, []);

  async function fetchIssues() {
    const { data } = await supabase.from('problems').select('*');
    if (data) setIssues(data);
  }

  async function toggleBeer(issueId, currentAssignedId) {
    if (!user) return;
    const isAssignedToMe = currentAssignedId === user.id;
    const updateData = isAssignedToMe 
      ? { assigned_to_id: null, assigned_to_name: null } 
      : { assigned_to_id: user.id, assigned_to_name: user.user_metadata?.display_name || user.email?.split('@')[0] };
    await supabase.from('problems').update(updateData).eq('id', issueId);
    fetchIssues();
  }

  async function deleteIssue(issueId, ownerId) {
    const isAdmin = user?.user_metadata?.role === 'admin';
    const isOwner = user?.id === ownerId;
    if ((isAdmin || isOwner) && confirm("Terminate this log?")) {
      await supabase.from('problems').delete().eq('id', issueId);
      fetchIssues();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!userInput.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userInput, existingIssues: issues.map(i => ({ title: i.title })) })
      });
      const brain = await res.json();
      if (brain.decision === "REJECT") {
        alert(`❌ REJECTED: ${brain.reason}`);
      } else {
        await supabase.from('problems').insert([{ 
          title: userInput, priority: brain.priority, category: brain.category, 
          reason: brain.reason, user_id: user.id, author_email: user.email 
        }]);
        setUserInput('');
        fetchIssues();
      }
    } finally { setLoading(false); }
  }

  const processedIssues = issues
    .filter(i => filterCategory === 'All' || i.category === filterCategory)
    .sort((a, b) => sortBy === 'high-priority' ? b.priority - a.priority : a.priority - b.priority);

  if (!user) return <div className="h-screen flex items-center justify-center font-black italic">BOOTING SYSTEM...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 font-sans bg-[#FBFBFE] min-h-screen text-slate-900">
      
      {/* --- IDENTITY BAR --- */}
      <div className="flex justify-between items-center mb-16 bg-white p-6 rounded-[2.5rem] border-[4px] border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 to-cyan-400 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
            <div className="relative w-20 h-20 bg-white border-[4px] border-black rounded-full overflow-hidden flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              
              {/* THE BULLETPROOF AVATAR IS HERE */}
              <SmartAvatar 
                role={user.user_metadata?.role} 
                name={user.user_metadata?.display_name} 
                email={user.email} 
              />
              
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">System Authenticated</p>
            </div>
            <p className="text-4xl font-black tracking-tighter uppercase leading-none">{user.user_metadata?.display_name || user.email?.split('@')[0]}</p>
          </div>
        </div>

        <button onClick={() => { supabase.auth.signOut(); router.push('/login'); }} className="bg-rose-50 text-rose-600 border-4 border-black px-8 py-3 rounded-2xl font-black text-sm hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">LOGOUT</button>
      </div>

      {/* HEADER */}
      <header className="mb-20 text-center">
        <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter italic leading-[0.8] uppercase mb-6 drop-shadow-xl">ISSUE<br/><span className="text-emerald-500">CENTER</span></h1>
        <p className="font-black uppercase tracking-[0.5em] text-slate-600 text-s">FOR SOFTWARE FIXES</p>
      </header>

      {/* INPUT */}
      <section className="mb-24">
        <form onSubmit={handleSubmit} className="relative group">
          <input className="w-full p-12 pr-44 rounded-[3.5rem] border-[6px] border-black bg-white text-4xl font-black shadow-[20px_20px_0px_0px_rgba(16,185,129,0.1)] focus:shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] outline-none transition-all focus:-translate-y-2 focus:-translate-x-1 placeholder:text-slate-200" value={userInput} onChange={e => setUserInput(e.target.value)} placeholder="Describe a problem..." disabled={loading} />
          <button type="submit" className="absolute right-8 top-8 bottom-8 px-12 bg-black text-white rounded-[2.5rem] font-black text-2xl hover:bg-emerald-500 transition-all active:scale-90" disabled={loading}>{loading ? "..." : "LOG"}</button>
        </form>
      </section>

      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 px-2">
        <div className="flex flex-wrap gap-2 justify-center">
          {['All', ...new Set(issues.map(i => i.category).filter(Boolean))].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-6 py-3 rounded-full text-xs font-black transition-all border-[3px] uppercase ${filterCategory === cat ? 'bg-black text-white border-black' : 'bg-white border-slate-200 text-slate-400 hover:border-black hover:text-black'}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {processedIssues.map(issue => (
          <div key={issue.id} className="relative p-10 bg-white border-[6px] border-black rounded-[3rem] shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:shadow-[20px_20px_0px_0px_rgba(16,185,129,1)] hover:-translate-y-2 transition-all group">
            <div className="flex justify-between items-start mb-8">
              <span className={`px-8 py-2 rounded-full text-xs font-black border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${issue.priority >= 70 ? 'bg-emerald-400' : 'bg-rose-400'}`}>Score: {issue.priority}</span>
              {(user.id === issue.user_id || user.user_metadata?.role === 'admin') && (
                <button onClick={() => deleteIssue(issue.id, issue.user_id)} className="text-slate-300 hover:text-rose-500 font-black text-[10px] uppercase">Delete</button>
              )}
            </div>
            <h3 className="text-3xl font-black leading-none mb-6 uppercase tracking-tighter">{issue.title}</h3>
            
            <div className="flex items-center gap-2 mb-8 bg-slate-50 p-2 rounded-xl border-[3px] border-black w-fit shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
               
               {/* THE BULLETPROOF AVATAR FOR EACH ISSUE */}
               <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-black bg-white">
                 <SmartAvatar 
                   role="private" 
                   email={issue.author_email} 
                   sizeClass="w-full h-full object-cover" 
                 />
               </div>

               <span className="text-[10px] font-black uppercase text-slate-700">{issue.author_email?.split('@')[0]}</span>
            </div>

            <div className="pt-6 border-t-[4px] border-black flex items-center justify-between">
              {issue.assigned_to_name ? (
                <div className="flex flex-col gap-1">
                  <div className="bg-amber-400 border-[3px] border-black px-4 py-2 rounded-xl font-black text-[11px] uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">🍺 Held by: {issue.assigned_to_name}</div>
                  {issue.assigned_to_id === user.id && <button onClick={() => toggleBeer(issue.id, issue.assigned_to_id)} className="text-[10px] font-black text-rose-500 hover:underline text-left pl-1">Unassign</button>}
                </div>
              ) : (
                <button onClick={() => toggleBeer(issue.id, null)} className="bg-black text-white text-xs font-black px-8 py-4 rounded-2xl hover:bg-emerald-500 transition-all uppercase shadow-[4px_4px_0px_0px_rgba(16,185,129,0.5)]">Hold My Beer</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}