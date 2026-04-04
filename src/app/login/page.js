'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient('https://eiokesokgiypxkdyhomd.supabase.co', 'sb_publishable_wurz1buikXlEnKBc3vZnQA_Z2sijqgb');

export default function AuthPage() {
  const [role, setRole] = useState('private'); 
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // States לכל סוג
  const [email, setEmail] = useState('');       
  const [password, setPassword] = useState(''); 
  const [username, setUsername] = useState('');     
  const [companyName, setCompanyName] = useState(''); 
  const [secretCode, setSecretCode] = useState('');   

  const handleAccess = async () => {
    setLoading(true);
    let authData = { email: '', password: '' };
    let displayName = '';

    if (role === 'private') {
      authData = { email, password };
      displayName = username;
    } 
    else if (role === 'company') {
      if (secretCode !== '123') { alert("Wrong Company Code!"); setLoading(false); return; }
      authData = { 
        email: `company_${companyName.replace(/\s+/g, '').toLowerCase()}@center.com`, 
        password: `company_${secretCode}` 
      };
      displayName = companyName;
    } 
    else if (role === 'admin') {
      if (secretCode !== '67') { alert("Access Denied!"); setLoading(false); return; }
      authData = { email: 'admin@center.com', password: 'admin_secret_67' };
      displayName = 'ADMIN';
    }

    // שלב 1: ניסיון התחברות
    const { data: signInData, error: loginError } = await supabase.auth.signInWithPassword(authData);
    
    if (loginError) {
      // שלב 2: אם החשבון לא קיים, נרשום אותו אוטומטית (Registration Logic)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        ...authData,
        options: { data: { role, display_name: displayName } }
      });
      
      if (signUpError) {
        alert(signUpError.message);
      } else {
        // הוספת הפרופיל ל-DB במידה והרגע נרשם
        if (signUpData?.user) {
          await supabase.from('profiles').insert([
            { id: signUpData.user.id, username: displayName, role: role, company_name: role === 'company' ? companyName : null }
          ]);
        }
        router.push('/');
      }
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  // פונקציית כניסה כאורח
  const handleAnonymous = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) alert(error.message);
    else router.push('/');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFE] font-sans p-4 text-slate-900">
      <div className="bg-white border-[6px] border-black p-10 rounded-[3rem] shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
        
        <h1 className="text-5xl font-black italic tracking-tighter mb-10 text-center uppercase leading-none">
          ISSUE<br/>ACCESS
        </h1>

        <div className="flex gap-2 mb-10 bg-slate-100 p-1.5 rounded-[1.5rem]">
          {['private', 'company', 'admin'].map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setSecretCode(''); setUsername(''); setCompanyName(''); }}
              className={`flex-1 py-3 rounded-xl text-[11px] font-black uppercase transition-all ${role === r ? 'bg-black text-white' : 'text-slate-400 hover:text-black font-bold'}`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          
          {role === 'private' && (
            <>
              <input className="w-full p-5 rounded-2xl border-4 border-slate-100 focus:border-black outline-none font-bold text-lg" placeholder="USERNAME" value={username} onChange={e => setUsername(e.target.value)} />
              <input className="w-full p-5 rounded-2xl border-4 border-slate-100 focus:border-black outline-none font-bold text-lg" placeholder="EMAIL" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="w-full p-5 rounded-2xl border-4 border-slate-100 focus:border-black outline-none font-bold text-lg" placeholder="PASSWORD" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </>
          )}

          {role === 'company' && (
            <>
              <input className="w-full p-5 rounded-2xl border-4 border-slate-100 focus:border-black outline-none font-bold text-lg" placeholder="COMPANY NAME" value={companyName} onChange={e => setCompanyName(e.target.value)} />
              <input className="w-full p-5 rounded-2xl border-4 border-slate-100 focus:border-black outline-none font-bold text-lg" placeholder="SECRET CODE" type="password" value={secretCode} onChange={e => setSecretCode(e.target.value)} />
            </>
          )}

          {role === 'admin' && (
            <input className="w-full p-8 rounded-2xl border-4 border-red-500 focus:border-black outline-none font-black text-3xl text-center placeholder:text-red-200" placeholder="Enter Secret Code" type="password" value={secretCode} onChange={e => setSecretCode(e.target.value)} />
          )}

          <button onClick={handleAccess} disabled={loading} className="w-full py-6 bg-black text-white rounded-[2rem] font-black text-xl hover:bg-emerald-500 transition-all active:scale-95 shadow-lg">
            {loading ? 'WAIT...' : 'ACCESS CENTER'}
          </button>

          {/* כפתור אורח שביקשת להחזיר */}
          <button 
            onClick={handleAnonymous} 
            disabled={loading}
            className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-black transition-all"
          >
            Enter as Guest (Anonymous)
          </button>
        </div>
      </div>
    </div>
  );
}