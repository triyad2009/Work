import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './main';
import { Wallet, LayoutDashboard, ListTodo, Upload, ArrowDownToLine, ShieldCheck, LogOut, UserPlus, LogIn, Menu, X, CheckCircle2, Clock3, AlertCircle } from 'lucide-react';

const money = (n) => new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(Number(n || 0));

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [view, setView] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login');
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
      else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id); else { setProfile(null); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function loadProfile(id) {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
    setProfile(data);
    setLoading(false);
  }

  if (!supabase) return <SetupScreen />;
  if (loading) return <div className="center"><div className="loader" /><p>Loading Work...</p></div>;
  if (!session) return <Auth mode={authMode} setMode={setAuthMode} />;

  const nav = [
    ['dashboard', 'Dashboard', LayoutDashboard],
    ['tasks', 'Tasks', ListTodo],
    ['submit', 'Submit Work', Upload],
    ['withdraw', 'Withdraw', ArrowDownToLine],
    ...(profile?.role === 'admin' ? [['admin', 'Admin', ShieldCheck]] : [])
  ];

  return <div className="app">
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="logo">W</div><div><b>WORK</b><span>Earn with tasks</span></div></div>
      <nav>{nav.map(([id, label, Icon]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => {setView(id);setMobileNav(false)}}><Icon size={18}/>{label}</button>)}</nav>
      <div className="side-bottom">
        <div className="mini-user"><div className="avatar">{profile?.name?.[0] || 'U'}</div><div><b>{profile?.name || 'User'}</b><span>{profile?.role || 'member'}</span></div></div>
        <button className="logout" onClick={() => supabase.auth.signOut()}><LogOut size={17}/> Log out</button>
      </div>
    </aside>
    {mobileNav && <div className="backdrop" onClick={() => setMobileNav(false)} />}
    <main>
      <header><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)}>{mobileNav ? <X/> : <Menu/>}</button><div><span className="eyebrow">WORKSPACE</span><h1>{view === 'dashboard' ? 'Welcome back' : view === 'admin' ? 'Admin control' : view.replace('-', ' ')}</h1></div><div className="top-wallet"><Wallet size={17}/>{money(profile?.wallet_balance)}</div></header>
      {view === 'dashboard' && <Dashboard profile={profile} setView={setView}/>}
      {view === 'tasks' && <Tasks />}
      {view === 'submit' && <SubmitWork profile={profile}/>}
      {view === 'withdraw' && <Withdraw profile={profile}/>}
      {view === 'admin' && profile?.role === 'admin' && <Admin />}
    </main>
  </div>;
}

function SetupScreen() {
  return <div className="center"><div className="setup-card"><div className="logo">W</div><h1>Connect Supabase</h1><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your <code>.env</code> file, then run the app.</p></div></div>;
}

function Auth({ mode, setMode }) {
  const [form, setForm] = useState({name:'', email:'', phone:'', password:''});
  const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMsg('');
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { name: form.name, phone: form.phone } }});
      if (error) setMsg(error.message); else setMsg('Account created. Check your email if confirmation is enabled.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({email:form.email,password:form.password});
      if (error) setMsg(error.message);
    }
    setBusy(false);
  }
  return <div className="auth"><div className="auth-copy"><div className="logo">W</div><span className="eyebrow">TASK → APPROVAL → WALLET</span><h1>Turn simple work into real earnings.</h1><p>Complete admin-posted tasks, submit proof, get approved, and build your wallet balance.</p><div className="feature-row"><span>✓ Fast registration</span><span>✓ Transparent balance</span><span>✓ Admin review</span></div></div>
    <form className="auth-card" onSubmit={submit}><div className="auth-tabs"><button type="button" className={mode==='login'?'sel':''} onClick={()=>setMode('login')}><LogIn size={16}/> Login</button><button type="button" className={mode==='signup'?'sel':''} onClick={()=>setMode('signup')}><UserPlus size={16}/> Register</button></div><h2>{mode==='signup'?'Create your account':'Welcome back'}</h2><p className="muted">{mode==='signup'?'Register in under a minute.':'Sign in to continue earning.'}</p>
      {mode==='signup' && <><label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your name"/></label><label>Phone number<input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+880 1XXXXXXXXX"/></label></>}
      <label>Email<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="you@example.com"/></label><label>Password<input required minLength="6" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="••••••••"/></label>
      {msg && <div className="notice">{msg}</div>}<button className="primary wide" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account':'Login'}</button>
    </form></div>;
}

function Dashboard({profile,setView}) {
  return <section className="content"><div className="hero-card"><div><span className="eyebrow">YOUR WALLET</span><div className="balance">{money(profile?.wallet_balance)}</div><p>Available balance</p></div><button className="light-btn" onClick={()=>setView('withdraw')}>Withdraw funds <ArrowDownToLine size={16}/></button></div><div className="grid3"><Stat title="Wallet" value={money(profile?.wallet_balance)} icon={Wallet}/><Stat title="Approved earnings" value={money(profile?.total_earned)} icon={CheckCircle2}/><Stat title="Pending" value={money(profile?.pending_earnings)} icon={Clock3}/></div><div className="section-head"><div><span className="eyebrow">HOW IT WORKS</span><h2>Three simple steps</h2></div></div><div className="steps"><Step n="01" title="Pick a task" text="Open a task posted by the admin and follow its requirements."/><Step n="02" title="Submit proof" text="Upload your own work or required image and send it for review."/><Step n="03" title="Get approved" text="After approval, the configured earning is added to your wallet." /></div></section>;
}
function Stat({title,value,icon:Icon}) { return <div className="stat"><Icon size={19}/><span>{title}</span><b>{value}</b></div> }
function Step({n,title,text}) { return <div className="step"><span>{n}</span><h3>{title}</h3><p>{text}</p></div> }

function Tasks() {
  const [tasks,setTasks]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{supabase.from('tasks').select('*').eq('is_active',true).order('created_at',{ascending:false}).then(({data})=>{setTasks(data||[]);setLoading(false)})},[]);
  return <section className="content"><div className="section-head"><div><span className="eyebrow">AVAILABLE WORK</span><h2>Tasks</h2></div></div>{loading?<p>Loading tasks…</p>:tasks.length===0?<Empty text="No active tasks yet. Check back when the admin publishes new work."/>:<div className="task-grid">{tasks.map(t=><article className="task" key={t.id}><div className="task-top"><span className="pill">৳{t.reward}</span><span>{t.submission_type}</span></div><h3>{t.title}</h3><p>{t.description}</p><small>Max submissions: {t.max_submissions ?? '—'}</small></article>)}</div>}</section>;
}
function SubmitWork({profile}) {
  const [tasks,setTasks]=useState([]); const [taskId,setTaskId]=useState(''); const [file,setFile]=useState(null); const [note,setNote]=useState(''); const [busy,setBusy]=useState(false); const [msg,setMsg]=useState('');
  useEffect(()=>{supabase.from('tasks').select('*').eq('is_active',true).order('created_at',{ascending:false}).then(({data})=>setTasks(data||[]))},[]);
  async function submit(e){e.preventDefault(); if(!taskId||!file)return setMsg('Select a task and upload your proof.'); setBusy(true); setMsg('');
    const ext=file.name.split('.').pop(); const path=profile.id+'/'+crypto.randomUUID()+'.'+ext;
    const up=await supabase.storage.from('submissions').upload(path,file,{upsert:false}); if(up.error){setMsg(up.error.message);setBusy(false);return}
    const {error}=await supabase.from('submissions').insert({user_id:profile.id,task_id:taskId,file_path:path,note,status:'pending'});
    setMsg(error?error.message:'Submitted successfully. Waiting for admin approval.'); if(!error){setFile(null);setNote('');} setBusy(false);
  }
  return <section className="content"><div className="form-card"><span className="eyebrow">PROOF OF WORK</span><h2>Submit a completed task</h2><p className="muted">Upload your own work. Admin approval is required before the reward enters your wallet.</p><form onSubmit={submit}><label>Task<select required value={taskId} onChange={e=>setTaskId(e.target.value)}><option value="">Choose a task</option>{tasks.map(t=><option value={t.id} key={t.id}>{t.title} — ৳{t.reward}</option>)}</select></label><label>Proof image/file<input required type="file" accept="image/*,.pdf" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label>Note<textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional details for the reviewer"/></label>{msg&&<div className="notice">{msg}</div>}<button className="primary" disabled={busy}>{busy?'Uploading…':'Submit for approval'}</button></form></div></section>;
}
function Withdraw({profile}) {
  const [settings,setSettings]=useState(null); const [amount,setAmount]=useState(''); const [method,setMethod]=useState('bKash'); const [account,setAccount]=useState(''); const [msg,setMsg]=useState('');
  useEffect(()=>{supabase.from('settings').select('*').eq('id',1).single().then(({data})=>setSettings(data))},[]);
  async function request(e){e.preventDefault();const a=Number(amount); if(!settings||a<settings.min_withdrawal)return setMsg('Minimum withdrawal is '+money(settings?.min_withdrawal));if(a>Number(profile.wallet_balance))return setMsg('Insufficient wallet balance.');const {error}=await supabase.from('withdrawals').insert({user_id:profile.id,amount:a,method,account_number:account,status:'pending'});setMsg(error?error.message:'Withdrawal request submitted for admin review.');if(!error)setAmount('');}
  return <section className="content"><div className="withdraw-layout"><div className="form-card"><span className="eyebrow">CASH OUT</span><h2>Request withdrawal</h2><p className="muted">Minimum: {money(settings?.min_withdrawal)}</p><form onSubmit={request}><label>Amount (BDT)<input required type="number" min={settings?.min_withdrawal||1} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="500"/></label><label>Payment method<select value={method} onChange={e=>setMethod(e.target.value)}><option>bKash</option><option>Nagad</option><option>Rocket</option><option>Bank</option></select></label><label>Account number<input required value={account} onChange={e=>setAccount(e.target.value)} placeholder="01XXXXXXXXX"/></label>{msg&&<div className="notice">{msg}</div>}<button className="primary">Send request</button></form></div><div className="balance-panel"><Wallet size={22}/><span>Available</span><strong>{money(profile?.wallet_balance)}</strong><small>Withdrawals are manually reviewed by the admin.</small></div></div></section>;
}
function Admin() {
  const [tasks,setTasks]=useState([]); const [subs,setSubs]=useState([]); const [withdrawals,setWithdrawals]=useState([]); const [reward,setReward]=useState('50'); const [title,setTitle]=useState(''); const [desc,setDesc]=useState('');
  async function load(){const [a,b,c]=await Promise.all([supabase.from('tasks').select('*').order('created_at',{ascending:false}),supabase.from('submissions').select('*, tasks(title, reward), profiles(name,email)').order('created_at',{ascending:false}),supabase.from('withdrawals').select('*, profiles(name,email)').order('created_at',{ascending:false})]);setTasks(a.data||[]);setSubs(b.data||[]);setWithdrawals(c.data||[])}
  useEffect(()=>{load()},[]);
  async function addTask(e){e.preventDefault();await supabase.from('tasks').insert({title,description:desc,reward:Number(reward),submission_type:'image'});setTitle('');setDesc('');load()}
  async function approveSub(s){const task=s.tasks;const {error}=await supabase.rpc('approve_submission',{submission_id:s.id});if(error)alert(error.message);load()}
  async function approveWithdrawal(w){const {error}=await supabase.rpc('approve_withdrawal',{withdrawal_id:w.id});if(error)alert(error.message);load()}
  return <section className="content"><div className="admin-grid"><div className="form-card"><span className="eyebrow">ADMIN</span><h2>Create task</h2><form onSubmit={addTask}><label>Task title<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Upload a beautiful photo"/></label><label>Description<textarea required value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Tell users exactly what to submit"/></label><label>Reward (BDT)<input type="number" min="1" value={reward} onChange={e=>setReward(e.target.value)}/></label><button className="primary">Publish task</button></form></div><div className="admin-list"><h2>Pending submissions</h2>{subs.filter(x=>x.status==='pending').length===0?<Empty text="No pending submissions."/>:subs.filter(x=>x.status==='pending').map(s=><div className="row" key={s.id}><div><b>{s.profiles?.name}</b><span>{s.tasks?.title}</span></div><button className="small-btn" onClick={()=>approveSub(s)}>Approve +৳{s.tasks?.reward}</button></div>)}</div><div className="admin-list"><h2>Withdrawal requests</h2>{withdrawals.filter(x=>x.status==='pending').length===0?<Empty text="No pending withdrawals."/>:withdrawals.filter(x=>x.status==='pending').map(w=><div className="row" key={w.id}><div><b>{w.profiles?.name}</b><span>{w.method} · {w.account_number} · {money(w.amount)}</span></div><button className="small-btn" onClick={()=>approveWithdrawal(w)}>Approve</button></div>)}</div></div><div className="admin-list"><h2>Published tasks</h2>{tasks.map(t=><div className="row" key={t.id}><div><b>{t.title}</b><span>{money(t.reward)} · {t.is_active?'Active':'Inactive'}</span></div></div>)}</div></section>;
}
function Empty({text}) { return <div className="empty"><AlertCircle size={22}/><p>{text}</p></div> }
