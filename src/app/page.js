'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabaseUrl = 'https://eiokesokgiypxkdyhomd.supabase.co';
const supabaseKey = 'sb_publishable_wurz1buikXlEnKBc3vZnQA_Z2sijqgb'; 
const supabase = createClient(supabaseUrl, supabaseKey);

// --- THE BULLETPROOF AVATAR COMPONENT (Jira Styled) ---
const SmartAvatar = ({ role, name, email, sizeClass = "w-full h-full object-cover" }) => {
  const companyName = name || 'Company';
  const domain = companyName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

  const urls = {
    clearbit: `https://logo.clearbit.com/${domain}`, 
    google: `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`,
    uiAvatars: `https://ui-avatars.com/api/?name=${encodeURIComponent(companyName)}&background=0052cc&color=fff&size=128`,
    bot: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email || 'guest')}&backgroundColor=e9eaed`
  };

  const [imgSrc, setImgSrc] = useState(role === 'company' ? urls.clearbit : urls.bot);
  const [attempt, setAttempt] = useState(0);

  const handleError = () => {
    if (role !== 'company') return;
    
    if (attempt === 0) {
      setImgSrc(urls.google); // Backup 1: Google
      setAttempt(1);
    } else if (attempt === 1) {
      setImgSrc(urls.uiAvatars); // Backup 2: Letters
      setAttempt(2);
    }
  };

  return (
    <img 
      src={imgSrc} 
      className={sizeClass} 
      alt={companyName} 
      onError={handleError}
      style={{ textIndent: '-9999px', color: 'transparent' }} // Hides broken icon
    />
  );
};

// --- MAIN APP COMPONENT ---
export default function IssueCenter() {
  const [issues, setIssues] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  // Filters & Sorting State
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All'); // All, Available, Taken
  const [filterAuthor, setFilterAuthor] = useState('All'); // All, Mine
  const [sortBy, setSortBy] = useState('high-priority'); // high-priority, low-priority

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

  // Apply all filters and sorting
  const processedIssues = issues
    .filter(i => filterCategory === 'All' || i.category === filterCategory)
    .filter(i => {
      if (filterStatus === 'Available') return !i.assigned_to_id;
      if (filterStatus === 'Taken') return !!i.assigned_to_id;
      return true;
    })
    .filter(i => {
      if (filterAuthor === 'Mine') return i.user_id === user?.id;
      return true;
    })
    .sort((a, b) => sortBy === 'high-priority' ? b.priority - a.priority : a.priority - b.priority);

  if (!user) return <div className="h-screen flex items-center justify-center font-medium text-[#172B4D]">BOOTING SYSTEM...</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-12 font-sans bg-[#FAFBFC] min-h-screen text-[#172B4D]">
      
      {/* --- IDENTITY BAR --- */}
      <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-sm border border-[#DFE1E6] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border border-[#DFE1E6] bg-[#F4F5F7]">
            <SmartAvatar 
              role={user.user_metadata?.role} 
              name={user.user_metadata?.display_name} 
              email={user.email} 
            />
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-[#36B37E] rounded-full"></span>
              <p className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wide">System Authenticated</p>
            </div>
            <p className="text-lg font-medium leading-none text-[#172B4D]">
              {user.user_metadata?.display_name || user.email?.split('@')[0]}
            </p>
          </div>
        </div>

        <button 
          onClick={() => { supabase.auth.signOut(); router.push('/login'); }} 
          className="bg-[rgba(9,30,66,0.04)] text-[#42526E] px-4 py-2 rounded-[3px] font-medium hover:bg-[rgba(9,30,66,0.08)] transition-colors"
        >
          LOGOUT
        </button>
      </div>

      {/* HEADER */}
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-[#172B4D] mb-1">IssueCenter</h1>
        <p className="text-sm text-[#5E6C84]">For Software Fixes</p>
      </header>

      {/* INPUT */}
      <section className="mb-8">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            className="flex-1 px-4 py-2 rounded-[3px] border-2 border-[#DFE1E6] bg-white text-sm text-[#172B4D] focus:border-[#4C9AFF] focus:outline-none transition-colors placeholder:text-[#97A0AF]" 
            value={userInput} 
            onChange={e => setUserInput(e.target.value)} 
            placeholder="Describe a problem..." 
            disabled={loading} 
          />
          <button 
            type="submit" 
            className="px-6 py-2 bg-[#0052CC] text-white rounded-[3px] font-medium hover:bg-[#0047B3] transition-colors disabled:opacity-50" 
            disabled={loading}
          >
            {loading ? "..." : "PUBLISH"}
          </button>
        </form>
      </section>

      {/* FILTERS & SORTERS */}
      <div className="flex flex-col mb-4 gap-4 bg-white p-4 border border-[#DFE1E6] rounded-sm shadow-sm">
        
        {/* Top Row: Categories & Sort */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">Epic:</span>
            {['All', ...new Set(issues.map(i => i.category).filter(Boolean))].map(cat => (
              <button 
                key={cat} 
                onClick={() => setFilterCategory(cat)} 
                className={`px-3 py-1 rounded-[3px] text-sm font-medium transition-colors ${
                  filterCategory === cat 
                  ? 'bg-[#E6EFFC] text-[#0052CC]' 
                  : 'bg-[#EBECF0] text-[#42526E] hover:bg-[#DFE1E6]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">Sort:</span>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#FAFBFC] border border-[#DFE1E6] text-[#172B4D] text-sm rounded-[3px] px-2 py-1.5 outline-none focus:border-[#4C9AFF] hover:bg-[#EBECF0] cursor-pointer"
            >
              <option value="high-priority">Highest Importance First</option>
              <option value="low-priority">Lowest Importance First</option>
            </select>
          </div>
        </div>

        {/* Bottom Row: Additional Filters */}
        <div className="flex flex-wrap gap-6 pt-3 border-t border-[#DFE1E6]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">Status:</span>
            <div className="flex gap-2">
              {['All', 'Available', 'Taken'].map(status => (
                <button 
                  key={status} 
                  onClick={() => setFilterStatus(status)} 
                  className={`px-3 py-1 rounded-[3px] text-sm font-medium transition-colors ${
                    filterStatus === status 
                    ? 'bg-[#E6EFFC] text-[#0052CC]' 
                    : 'bg-transparent text-[#42526E] hover:bg-[#EBECF0]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-[#5E6C84] uppercase tracking-wider">Author:</span>
            <div className="flex gap-2">
              {['All', 'Mine'].map(author => (
                <button 
                  key={author} 
                  onClick={() => setFilterAuthor(author)} 
                  className={`px-3 py-1 rounded-[3px] text-sm font-medium transition-colors ${
                    filterAuthor === author 
                    ? 'bg-[#E6EFFC] text-[#0052CC]' 
                    : 'bg-transparent text-[#42526E] hover:bg-[#EBECF0]'
                  }`}
                >
                  {author === 'Mine' ? 'My Issues' : 'Everyone'}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ISSUES LIST (Smart Rows) */}
      <div className="flex flex-col gap-2">
        {processedIssues.length === 0 ? (
          <div className="p-8 text-center text-[#5E6C84] bg-white border border-[#DFE1E6] rounded-sm">
            No issues found matching your filters.
          </div>
        ) : (
          processedIssues.map(issue => (
            <div 
              key={issue.id} 
              className="group flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 bg-white border border-[#DFE1E6] rounded-sm hover:bg-[#FAFBFC] hover:shadow-sm transition-all"
            >
              
              {/* LEFT SIDE: Category and Smart Wrapping Title */}
              <div className="flex flex-col gap-2 flex-1 w-full">
                {issue.category && (
                  <div className="flex items-center">
                    <span className="bg-[#EAE6FF] text-[#403294] px-2 py-0.5 rounded-[3px] text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="14" height="14" rx="2" fill="#8777D9"/><path d="M4.5 8L7.5 11L11.5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      {issue.category}
                    </span>
                  </div>
                )}
                
                {/* Title drops down and expands the row if it's too long */}
                <h3 className="text-sm font-medium text-[#172B4D] hover:text-[#0052CC] break-words leading-relaxed cursor-pointer">
                  {issue.title}
                </h3>
              </div>
              
              {/* RIGHT SIDE: Strictly right-aligned Score, Author, Actions */}
              <div className="flex flex-wrap md:flex-nowrap items-center justify-end gap-5 shrink-0 md:min-w-max border-t md:border-t-0 border-[#DFE1E6] pt-3 md:pt-0 mt-2 md:mt-0">
                
                {/* SCORE LOZENGE */}
                <span className={`px-2 py-0.5 rounded-[3px] text-[11px] font-bold uppercase shrink-0 ${issue.priority >= 70 ? 'bg-[#E3FCEF] text-[#006644]' : 'bg-[#FFEBE6] text-[#BF2600]'}`}>
                  Importance Score: {issue.priority}
                </span>

                {/* AUTHOR */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-[#F4F5F7]">
                    <SmartAvatar 
                      role="private" 
                      email={issue.author_email} 
                    />
                  </div>
                  <span className="text-xs text-[#5E6C84]" title={issue.author_email}>
                    {issue.author_email?.split('@')[0]}
                  </span>
                </div>

                {/* ASSIGN ACTION / HOLD MY BEER */}
                <div className="flex justify-end shrink-0 min-w-[120px]">
                  {issue.assigned_to_name ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="bg-[#FFFAE6] text-[#FF8B00] border border-[#FFE380] px-2 py-1 rounded-[3px] font-semibold text-[11px] max-w-[140px] truncate" title={issue.assigned_to_name}>
                        🍺 Held by: {issue.assigned_to_name}
                      </div>
                      {issue.assigned_to_id === user.id && (
                        <button onClick={() => toggleBeer(issue.id, issue.assigned_to_id)} className="text-[11px] font-medium text-[#5E6C84] hover:text-[#0052CC] hover:underline">
                          Unassign
                        </button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => toggleBeer(issue.id, null)} className="bg-[rgba(9,30,66,0.04)] text-[#42526E] text-xs font-medium px-3 py-1.5 rounded-[3px] hover:bg-[rgba(9,30,66,0.08)] transition-colors">
                      Hold My Beer
                    </button>
                  )}
                </div>

                {/* DELETE ACTION */}
                <div className="w-8 flex justify-end shrink-0">
                  {(user.id === issue.user_id || user.user_metadata?.role === 'admin') && (
                    <button 
                      onClick={() => deleteIssue(issue.id, issue.user_id)} 
                      className="text-[#5E6C84] hover:text-[#DE350B] text-[11px] font-medium p-1.5 rounded hover:bg-[#FFEBE6] transition-colors md:opacity-0 group-hover:opacity-100"
                      title="Delete Issue"
                    >
                      Delete
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}