import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {
 CalendarDays,Clock3,Users,ClipboardList,Settings,LogOut,Plus,Trash2,Edit3,ChevronLeft,ChevronRight,
 Shield,MapPin,Search,X,UserPlus,Camera,Save,LockKeyhole,CalendarRange,CheckCircle2,ClipboardCheck,
 BriefcaseBusiness,UserCog,Menu,Shuffle,Timer,Home as HomeIcon,ZoomIn,ZoomOut,Move,Check,Bell
} from 'lucide-react';
import './styles.css';

const URL=import.meta.env.VITE_SUPABASE_URL, KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase=(URL&&KEY)?createClient(URL,KEY):null;
const DEFAULT_TEAMS=['โค้ด','เทคนิค','อุปกรณ์','โลจิสติกส์','ลีดเดอร์'];
const PLAN_TYPES=['งานฝ่าย','งานหลัก'];
const POSITION_ROLES=['ประธานเชียร์','รองประธานเชียร์','ประธานฝ่ายโค้ด','รองประธานฝ่ายโค้ด','ประธานฝ่ายเทคนิค','รองประธานฝ่ายเทคนิค','ประธานฝ่ายอุปกรณ์','รองประธานฝ่ายอุปกรณ์','ประธานฝ่ายโลจิสติกส์','รองประธานฝ่ายโลจิสติกส์','ประธานฝ่ายลีดเดอร์','รองประธานลีดเดอร์','ศิษย์เก่า'];
const DUTIES=['กราว','ประสานงาน','ประสานโสต','ประสานสต๊าฟ','Hแถว','Timekepper','ม้าเร็ว',
'ประจำห้อง 1/1','ประจำห้อง 1/2','ประจำห้อง 1/3','ประจำห้อง 1/4','ประจำห้อง 1/5','ประจำห้อง 1/6',
'ประจำห้อง 1/7','ประจำห้อง 1/8','ประจำห้อง 1/9','ประจำห้อง 1/10','ประจำห้อง 1/11','ประจำห้อง 1/12','อื่นๆ'];
const APPOINTMENT_TYPES=['ซ้อมน้อง','อยู่เย็น','นอนโรงเรียน','ถ่ายคลิป','อื่นๆ'];
const CLEAN_ROOMS=['ห้องเชียร์','ห้องอุปกรณ์','ห้องคอม','ห้องนอน','ห้องน้ำ','หอประชุม'];
const ATT_TYPES={rehearsal:['มา','ลากิจ/ลาป่วย','ไม่มา'],evening:['อยู่เย็น','ลากิจ/ลาป่วย','ไม่อยู่'],sleep:['อยู่ดึก','นอนโรงเรียน','ลากิจ/ลาป่วย','ไม่อยู่']};
const ROLE_LABEL={head:'หัวหน้าตุ้ย',teacher:'อาจารย์ตุ้ย',deputy:'รองหัวตุ้ย',member:'สมาตุ้ย'};
const roleRank={member:0,deputy:1,head:2,teacher:2};
const roleLabel=(u,data)=>data?.customRoles?.find(r=>r.id===u?.custom_role_id)?.name || ROLE_LABEL[u?.role] || 'สมาตุ้ย';
const isFullAdmin=u=>u?.role==='head'||u?.role==='teacher';
const fmt=d=>d?new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T00:00:00')):'';
const todayISO=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const dayDiff=(from,to)=>Math.round((new Date(`${from}T00:00:00`)-new Date(`${to}T00:00:00`))/86400000);
const itemEndDate=x=>x?.end_date||x?.date;
const inDateRange=(x,d)=>!!x?.date && d>=x.date && d<=itemEndDate(x);
const rangeText=x=>x?.date&&itemEndDate(x)!==x.date?`${fmt(x.date)} – ${fmt(itemEndDate(x))}`:fmt(x?.date);
const daysBetween=(a,b)=>{const out=[];let d=new Date(a+'T00:00:00'),e=new Date(b+'T00:00:00');while(d<=e){out.push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1)}return out};
const urgencyClass=diff=>diff<=0?'urgent-today':diff<=3?'urgent-soon':diff<=7?'urgent-week':'urgent-normal';
const urgencyText=diff=>diff<0?'เลยกำหนด':diff===0?'วันนี้':diff===1?'อีก 1 วัน':`อีก ${diff} วัน`;
const timeToMin=t=>{const [h,m]=String(t||'00:00').slice(0,5).split(':').map(Number);return h*60+m};
const overlap=(a,b)=>timeToMin(a.start_time||a.start)<timeToMin(b.end_time||b.end)&&timeToMin(b.start_time||b.start)<timeToMin(a.end_time||a.end);
const esc=(v)=>String(v||'');

async function loadData(){
 const p=await supabase.from('profiles').select('id,email,display_name,role,custom_role_id,team,avatar_url,avatar_scale,avatar_x,avatar_y,bio,birthday,created_at').order('display_name');
 if(p.error)throw p.error;
 const queries=await Promise.all([
  supabase.from('availability').select('*').order('date').order('start_time'),
  supabase.from('day_status').select('*'),
  supabase.from('appointments').select('*').order('date').order('start_time'),
  supabase.from('plans').select('*').order('date').order('start_time'),
  supabase.from('plan_topics').select('*').order('sort_order'),
  supabase.from('plan_duties').select('*'),
  supabase.from('plan_members').select('*'),
  supabase.from('appointment_members').select('*'),
  supabase.from('plan_slots').select('*').order('start_time'),
  supabase.from('attendance').select('*').order('date', {ascending:false}),
  supabase.from('cleaning_duties').select('*').order('date'),
  supabase.from('checkin_members').select('*').order('sort_no'),
  supabase.from('settings').select('*'),
  supabase.from('custom_roles').select('*').order('name'),
  supabase.from('team_options').select('*').order('sort_order').order('name'),
  supabase.from('notifications').select('*').order('created_at',{ascending:false})
 ]);
 for(const [i,q] of queries.entries())if(q.error&&i!==15)throw q.error;
 const [a,s,appointments,plans,topics,duties,planMembers,appointmentMembers,planSlots,attendance,cleaning,checkins,settings,customRoles,teamOptions,notifications]=queries.map(x=>x.data||[]);
 return {users:p.data||[],avail:a,dayStatus:s,appointments,plans,topics,duties,planMembers,appointmentMembers,planSlots,attendance,cleaning,checkins,settings,customRoles,teamOptions,notifications};
}

function App(){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[data,setData]=useState({users:[],avail:[],dayStatus:[],appointments:[],plans:[],topics:[],duties:[],attendance:[],cleaning:[],checkins:[],settings:[],customRoles:[],teamOptions:[],planMembers:[],appointmentMembers:[],planSlots:[],notifications:[]}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[authMode,setAuthMode]=useState('login');
 const refresh=async()=>{try{setError('');const d=await loadData();setData(d);setProfile(d.users.find(x=>x.id===session?.user?.id)||null)}catch(e){setError(e.message||'โหลดข้อมูลไม่สำเร็จ')}};
 useEffect(()=>{if(!supabase){setError('ยังไม่ได้ตั้งค่า Supabase');setLoading(false);return}
  supabase.auth.getSession().then(async({data})=>{setSession(data.session);if(data.session){try{const d=await loadData();setData(d);setProfile(d.users.find(x=>x.id===data.session.user.id)||null)}catch(e){setError(e.message||'โหลดข้อมูลไม่สำเร็จ')}}setLoading(false)});
  const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(!s){setProfile(null);setData({users:[],avail:[],dayStatus:[],appointments:[],plans:[],topics:[],duties:[],attendance:[],cleaning:[],checkins:[],settings:[],customRoles:[],teamOptions:[],planMembers:[],appointmentMembers:[],planSlots:[],notifications:[]});return}setTimeout(async()=>{try{const d=await loadData();setData(d);setProfile(d.users.find(x=>x.id===s.user.id)||null);setError('')}catch(e){setError(e.message||'โหลดข้อมูลไม่สำเร็จ')}},0)});return()=>l.subscription.unsubscribe()},[]);
 if(loading)return <div className="auth"><div className="auth-card"><div className="brand">chownatui<span>.</span></div><p className="tag">กำลังเชื่อมต่อระบบ...</p></div></div>;
 if(!session||!profile)return <Auth mode={authMode} setMode={setAuthMode} error={error} setError={setError}/>;
 return <Dashboard me={profile} data={data} refresh={refresh} setProfile={setProfile} error={error} logout={async()=>{await supabase.auth.signOut();setSession(null)}}/>;
}

function Auth({mode,setMode,error,setError}){
 const [email,setEmail]=useState(''),[pw,setPw]=useState(''),[name,setName]=useState(''),[teamCode,setTeamCode]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const TEAM_CODE=(import.meta.env.VITE_CHOWNATUI_TEAM_CODE||'CHOWNATUI888').trim();
 async function submit(e){e.preventDefault();setError('');setMsg('');setBusy(true);try{
  const normalizedEmail=email.trim().toLowerCase();
  if(!normalizedEmail)throw new Error('กรุณากรอกอีเมล');
  if(pw.length<6)throw new Error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
  if(mode==='login'){
   const r=await supabase.auth.signInWithPassword({email:normalizedEmail,password:pw});
   if(r.error){
    // Check whether this email exists so the UI can distinguish a missing account from a wrong password.
    const exists=await supabase.rpc('email_exists',{check_email:normalizedEmail});
    if(!exists.error && exists.data===false) throw new Error('ไม่พบข้อมูลสมาชิก กรุณาสมัครสมาชิกก่อน');
    throw new Error('รหัสผ่านไม่ถูกต้อง');
   }
  } else {
   if(!name.trim())throw new Error('กรุณาใส่ชื่อที่จะแสดง');
   if(teamCode.trim()!==TEAM_CODE)throw new Error('รหัสเข้าทีมไม่ถูกต้อง');
   const r=await supabase.auth.signUp({email:normalizedEmail,password:pw,options:{data:{display_name:name.trim()}}});
   if(r.error){
    if(/already|registered|exists|duplicate/i.test(r.error.message||'')) throw new Error('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ');
    throw r.error;
   }
   if(r.data.session) setMsg('สมัครสำเร็จ กำลังเข้าสู่ระบบ...');
   else setMsg('สมัครสำเร็จ กรุณาติดต่อผู้ดูแลหากยังไม่สามารถเข้าสู่ระบบได้');
  }
 }catch(e){setError(e.message||'เกิดข้อผิดพลาด')}finally{setBusy(false)}}
 return <div className="auth"><div className="auth-card"><div className="brand">chownatui<span>.</span></div><p className="tag">จัดการเวลาของทีมให้ง่ายกว่าเดิม</p>
  <div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>เข้าสู่ระบบ</button><button className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('')}}>สมัครสมาชิก</button></div>
  <form onSubmit={submit}>{mode==='signup'&&<label>ชื่อที่จะแสดง<input value={name} onChange={e=>setName(e.target.value)} placeholder="เช่น กอตอ" required/></label>}
  <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
  <label>Password<input type="password" value={pw} onChange={e=>setPw(e.target.value)} minLength={6} required/></label>
  {mode==='signup'&&<label>รหัสเข้าทีม<input type="text" value={teamCode} onChange={e=>setTeamCode(e.target.value)} placeholder="" autoCapitalize="characters" required/></label>}
  {(error||msg)&&<div className={error?'error':'notice'}>{error||msg}</div>}
  <button className="primary wide" disabled={busy}>{busy?'กำลังดำเนินการ...':mode==='login'?'เข้าสู่ระบบ':'สร้างบัญชี'}</button></form>
  </div></div>
}

function Avatar({user,className=''}){return user?.avatar_url?<span className={`avatar avatar-frame ${className}`}><img className="avatar-img" style={{'--avatar-scale':user.avatar_scale||1,'--avatar-x':`${user.avatar_x||0}%`,'--avatar-y':`${user.avatar_y||0}%`}} src={user.avatar_url} alt=""/></span>:<div className={`avatar ${className}`}>{user?.display_name?.[0]||'U'}</div>}

function NotificationBell({me,data,refresh}){
 const [open,setOpen]=useState(false);const rows=(data.notifications||[]).filter(n=>n.recipient_id===me.id);const unread=rows.filter(n=>!n.read_at).length;
 async function markRead(id){await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('recipient_id',me.id);refresh()}
 async function markAll(){if(!unread)return;await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('recipient_id',me.id).is('read_at',null);refresh()}
 return <div className="notification-wrap"><button className="icon-btn notification-btn" onClick={()=>setOpen(v=>!v)} aria-label="การแจ้งเตือน"><Bell size={18}/>{unread>0&&<span className="notification-badge">{unread>9?'9+':unread}</span>}</button>{open&&<div className="notification-popover"><div className="notification-head"><b>การแจ้งเตือน</b>{unread>0&&<button onClick={markAll}>อ่านทั้งหมด</button>}</div>{rows.length?rows.slice(0,20).map(n=><button className={`notification-item ${n.read_at?'read':''}`} key={n.id} onClick={()=>!n.read_at&&markRead(n.id)}><b>{n.title}</b><span>{n.body}</span><small>{fmt(n.created_at?.slice(0,10))}</small></button>):<div className="notification-empty">ยังไม่มีการแจ้งเตือน</div>}</div>}</div>
}

function Dashboard({me,data,refresh,setProfile,logout}){
 const [page,setPage]=useState('home'),[date,setDate]=useState(todayISO()),[mobileOpen,setMobileOpen]=useState(false);
 const canDeputy=roleRank[me.role]>=1, canHead=isFullAdmin(me);
 const nav=[
  ['home','หน้าหลัก',HomeIcon],['calendar','ปฏิทิน',CalendarRange],
  ['appointments','นัดหมาย',CalendarDays],['availability','ลงเวลา',Clock3],...(canDeputy?[['attendance','เช็คชื่อ',ClipboardCheck]]:[]),['cleaning','เวรทำความสะอาด',ClipboardList],['members','สมาตุ้ยทั้งหมด',Users],
  ...(canDeputy?[['manage','จัดการตุ้ย',Settings]]:[]),['settings','ตั้งค่า',Settings]
 ];
 const title=nav.find(x=>x[0]===page)?.[1]||'หน้าหลัก';
 const go=p=>{setPage(p);setMobileOpen(false)};
 return <div className="app"><aside><div className="brand side">CHOWNATUI <small className="app-version">v.2.5</small></div>{nav.map(([id,t,I])=><button className={page===id?'nav active':'nav'} key={id} onClick={()=>go(id)}><I size={19}/>{t}</button>)}
  <div className="side-bottom"><div className="me"><Avatar user={me}/><div><b>{me.display_name}</b><small>{roleLabel(me,data)}{me.team?` · ${me.team}`:''}</small></div></div><button className="nav" onClick={logout}><LogOut size={18}/>ออกจากระบบ</button></div></aside>
  <main><header><div><button className="mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)}><Menu/></button><div className="mobile-brand">chownatui<span>.</span></div><h1>{title}</h1></div><div className="header-actions"><NotificationBell me={me} data={data} refresh={refresh}/><button className="icon-btn" onClick={()=>go('settings')}><Settings size={18}/></button></div></header>
  {mobileOpen&&<div className="mobile-drawer">{nav.map(([id,t,I])=><button className={page===id?'active':''} key={id} onClick={()=>go(id)}><I size={17}/>{t}</button>)}</div>}
  {page==='home'&&<Home me={me} data={data} date={date} setDate={setDate} go={go}/>}
  {page==='calendar'&&<CalendarPage me={me} data={data} date={date} setDate={setDate}/>}
  {page==='availability'&&<Availability me={me} data={data} date={date} setDate={setDate} refresh={refresh}/>}
  {page==='appointments'&&<Appointments me={me} data={data} date={date} setDate={setDate} refresh={refresh}/>}
  {page==='members'&&<Members me={me} data={data}/>}
  {page==='attendance'&&<AttendanceManager me={me} data={data} refresh={refresh}/>}
  {page==='cleaning'&&<CleaningManager me={me} data={data} refresh={refresh}/>}
  {page==='manage'&&canDeputy&&<Manage me={me} data={data} refresh={refresh} defaultTab="plans"/>}
  {page==='settings'&&<SettingsPage me={me} data={data} refresh={refresh} setProfile={setProfile}/>}
  </main></div>
}

function DatePicker({date,setDate,compact=false}){
 const shift=(n)=>{const d=new Date(date+'T00:00:00');d.setDate(d.getDate()+n);setDate(d.toISOString().slice(0,10))};
 return <div className={`datebar ${compact?'compact':''}`}>
  <button className="date-arrow" onClick={()=>shift(-1)} aria-label="วันก่อนหน้า"><ChevronLeft size={16}/></button>
  <div className="date-display">
   <div className="date-display-text"><small>วันที่</small><b>{fmt(date)}</b></div>
   <label className="date-calendar-button" title="เลือกวันที่" aria-label="เลือกวันที่">
    <CalendarDays size={16}/><input aria-label="เลือกวันที่" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
   </label>
  </div>
  <button className="date-arrow" onClick={()=>shift(1)} aria-label="วันถัดไป"><ChevronRight size={16}/></button>
 </div>
}

function Home({me,data,date,setDate,go}){
 const upcoming=[...data.appointments.map(x=>({...x,kind:'นัดหมาย'})),...data.plans.filter(x=>x.date).map(x=>({...x,kind:'แผนงาน'}))].filter(x=>x.date>=date).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start_time).localeCompare(String(b.start_time))).slice(0,6);
 const av=data.avail.filter(a=>a.user_id===me.id&&a.date===date),status=data.dayStatus.find(x=>x.user_id===me.id&&x.date===date)?.status;
 const isBirthday=me.birthday&&me.birthday.slice(5)===todayISO().slice(5);
 return <section><div className="hero"><div className="home-greeting">{me.avatar_url?<Avatar user={me} className="home-avatar"/>:<Avatar user={me} className="home-avatar"/>}<div><span className="eyebrow">chownatui.</span><h2>{isBirthday?'🎂 Happy Birthday!':'สวัสดี'} {me.display_name} 👋</h2><p>{isBirthday?'ขอให้วันนี้เป็นวันที่ดีและมีความสุขมาก ๆ นะ':'ดูงาน แผนงาน นัดหมาย และเวลาของทีมได้จากที่เดียว'}</p></div></div><DatePicker date={date} setDate={setDate}/></div>
  <div className="card"><div className="card-title"><span>📌 นัดหมาย / งาน</span><button className="link" onClick={()=>go('appointments')}>ดูทั้งหมด</button></div>{upcoming.length?<div className="upcoming-list">{upcoming.map(x=>{const diff=dayDiff(x.date,date);return <div className={`upcoming-item ${urgencyClass(diff)}`} key={`${x.kind}-${x.id}`}><div><b>{x.title||x.name}</b><small>{x.kind} · {fmt(x.date)} · {x.start_time?.slice(0,5)||''}</small></div><span className="urgency-badge">{urgencyText(diff)}</span></div>})}</div>:<p className="muted">ยังไม่มีนัดหมายหรือแผนงานที่กำลังจะถึง</p>}</div>
  <div className="grid2"><div className="card"><div className="card-title"><span>🕐 ช่วงเวลาว่างวันนี้</span><button className="link" onClick={()=>go('availability')}>จัดการ</button></div>{status==='available'&&av.length?<div className="chips">{av.map(a=><span className="chip green" key={a.id}>{a.start_time.slice(0,5)}–{a.end_time.slice(0,5)}</span>)}</div>:<p className="muted">{status==='unavailable'?'วันนี้เลือกไม่ว่าง':'ยังไม่ได้ลงเวลาว่าง'}</p>}</div>
  <div className="card"><div className="card-title"><span>🧭 ทางลัด</span></div><div className="quick-inline"><button onClick={()=>go('calendar')}><CalendarRange/>ปฏิทิน</button><button onClick={()=>go('members')}><Users/>สมาตุ้ยทั้งหมด</button><button onClick={()=>go('settings')}><Settings/>ตั้งค่า</button></div></div></div>
 </section>
}

function Availability({me,data,date,setDate,refresh}){
 const [open,setOpen]=useState(false),[choice,setChoice]=useState(''),[startTime,setStart]=useState('09:00'),[endTime,setEnd]=useState('12:00'),[note,setNote]=useState(''),[err,setErr]=useState(''),[edit,setEdit]=useState(null);
 const status=data.dayStatus.find(x=>x.user_id===me.id&&x.date===date)?.status||'';
 const items=data.avail.filter(a=>a.user_id===me.id&&a.date===date);
 const openNew=()=>{setEdit(null);setChoice(status||'available');setStart('09:00');setEnd('12:00');setNote('');setErr('');setOpen(true)};
 const openEdit=(a)=>{setEdit(a);setChoice('available');setStart(a.start_time.slice(0,5));setEnd(a.end_time.slice(0,5));setNote(a.notes||'');setErr('');setOpen(true)};
 async function save(){setErr('');if(!choice)return setErr('กรุณาเลือกว่างหรือไม่ว่าง');if(choice==='available'&&timeToMin(startTime)>=timeToMin(endTime))return setErr('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม');
  try{const st=await supabase.from('day_status').upsert({user_id:me.id,date,status:choice},{onConflict:'user_id,date'});if(st.error)throw st.error;
   if(choice==='unavailable'){const r=await supabase.from('availability').delete().eq('user_id',me.id).eq('date',date);if(r.error)throw r.error}
   else {const p={user_id:me.id,date,start_time:startTime,end_time:endTime,notes:note.trim()||null};const r=edit?await supabase.from('availability').update(p).eq('id',edit.id):await supabase.from('availability').insert(p);if(r.error)throw r.error}
   setOpen(false);setEdit(null);await refresh()}catch(e){setErr(e.message||'บันทึกเวลาไม่สำเร็จ')}}
 return <section><div className="section-top"><div><h2>🕐 ลงเวลา</h2><p>กดอัปเดตเวลาชีวิตก่อน แล้วเลือกช่วงเวลาที่คุณพร้อมให้ทีมมอบหมายงาน</p></div><button className="primary" onClick={openNew}><Clock3 size={17}/>อัปเดตเวลาชีวิต</button></div>
  <DatePicker date={date} setDate={setDate}/>
  <div className="card life-summary"><div><b>{fmt(date)}</b><p className="muted">{status==='available'?'วันนี้ลงเวลาว่างแล้ว':status==='unavailable'?'วันนี้เลือกไม่ว่าง':'ยังไม่ได้อัปเดตเวลาชีวิต'}</p></div><div className={`status ${status==='available'?'green':status==='unavailable'?'red':'gray'}`}>{status==='available'?'🟢 ว่าง':status==='unavailable'?'🔴 ไม่ว่าง':'⚪ ยังไม่ลงเวลา'}</div></div>
  {items.length?<div className="timeline">{items.map(a=><div className="time-card free" key={a.id}><div className="time"><b>{a.start_time.slice(0,5)}–{a.end_time.slice(0,5)}</b><span>{a.notes||'ช่วงเวลาว่าง'}</span></div><div className="actions"><button onClick={()=>openEdit(a)}><Edit3 size={15}/></button><button onClick={async()=>{await supabase.from('availability').delete().eq('id',a.id);refresh()}}><Trash2 size={15}/></button></div></div>)}</div>:<div className="empty">ยังไม่มีช่วงเวลาว่างของวันนี้</div>}
  {open&&<Modal title={edit?'แก้ไขเวลาชีวิต':'อัปเดตเวลาชีวิต'} close={()=>setOpen(false)}>
   <div className="status-toggle"><button className={choice==='available'?'selected green-btn':''} onClick={()=>setChoice('available')}>🟢 ว่าง</button><button className={choice==='unavailable'?'selected red-btn':''} onClick={()=>setChoice('unavailable')}>🔴 ไม่ว่าง</button></div>
   {choice==='available'&&<div className="form-row"><label>เริ่ม<input type="time" value={startTime} onChange={e=>setStart(e.target.value)}/></label><label>สิ้นสุด<input type="time" value={endTime} onChange={e=>setEnd(e.target.value)}/></label></div>}
   {choice==='available'&&<label>หมายเหตุ<input value={note} onChange={e=>setNote(e.target.value)} placeholder="เช่น ว่างหลังเลิกเรียน"/></label>}
   {err&&<div className="error">{err}</div>}<button className="primary wide" onClick={save}><Save size={17}/>บันทึกข้อมูล</button>
  </Modal>}
 </section>
}

function CalendarPage({me,data,date,setDate}){
 const [month,setMonth]=useState(date.slice(0,7));const [selected,setSelected]=useState(date);
 const cells=useMemo(()=>{const [y,m]=month.split('-').map(Number),first=new Date(y,m-1,1),last=new Date(y,m,0).getDate(),off=(first.getDay()+6)%7,a=Array(off).fill(null);for(let i=1;i<=last;i++)a.push(`${month}-${String(i).padStart(2,'0')}`);while(a.length%7)a.push(null);return a},[month]);
 const events=d=>[...data.appointments.filter(x=>inDateRange(x,d)),...data.plans.filter(x=>inDateRange(x,d))];
 return <section><div className="section-top"><div><h2>📅 ปฏิทิน</h2><p>แสดงเฉพาะงาน/นัดหมาย/แผนงานของวันนั้น</p></div><div className="calendar-month-nav"><button onClick={()=>setMonth(m=>{const d=new Date(m+'-01');d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7)})}><ChevronLeft/></button><b>{new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'}).format(new Date(month+'-01'))}</b><button onClick={()=>setMonth(m=>{const d=new Date(m+'-01');d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,7)})}><ChevronRight/></button></div></div>
 <div className="calendar-card"><div className="calendar-weekdays">{['จ','อ','พ','พฤ','ศ','ส','อา'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{cells.map((d,i)=><button key={i} className={`calendar-cell ${!d?'blank':''} ${d===selected?'selected':''}`} disabled={!d} onClick={()=>{setSelected(d);setDate(d)}}>{d&&<><span className="day-number">{+d.slice(8)}</span>{events(d).slice(0,3).map(x=>{const diff=dayDiff(d,todayISO());return <div className={`calendar-event ${urgencyClass(diff)}`} key={x.id}>{x.title||x.name}</div>})}</>}</button>)}</div></div>
 <div className="card"><div className="section-top"><div><h3>{fmt(selected)}</h3><p>รายการของวันนี้</p></div></div>{events(selected).length?events(selected).map(x=><div className="event-row" key={x.id}><b>{x.title||x.name}</b><span>{x.start_time?.slice(0,5)}{x.end_time?`–${x.end_time.slice(0,5)}`:''}</span><small>{x.notes||x.description||''}</small></div>):<div className="empty">วันนี้ไม่มีงาน</div>}</div>
 </section>
}

function Appointments({me,data,date,setDate,refresh}){
 const canEdit=roleRank[me.role]>=1;const [open,setOpen]=useState(false),[edit,setEdit]=useState(null),[range,setRange]=useState({from:date,to:date});
 const visibleAppts=data.appointments.filter(x=>inDateRange(x,range.from)||inDateRange(x,range.to)||(x.date<=range.from&&itemEndDate(x)>=range.to)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));
 const teamPlans=data.plans.filter(x=>(inDateRange(x,range.from)||inDateRange(x,range.to)||(x.date<=range.from&&itemEndDate(x)>=range.to))&&x.type==='งานฝ่าย'&&me.team&&x.team===me.team).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));
 const mainPlans=data.plans.filter(x=>(inDateRange(x,range.from)||inDateRange(x,range.to)||(x.date<=range.from&&itemEndDate(x)>=range.to))&&x.type==='งานหลัก').sort((a,b)=>a.date.localeCompare(b.date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));
 const renderPlan=p=><div className="card event-row" key={p.id}><div><b>{p.title}</b><small>{p.type}{p.team?` · ${p.team}`:''} · {rangeText(p)}{p.start_time?` · ${p.start_time.slice(0,5)}–${p.end_time?.slice(0,5)}`:''}</small><p>{p.notes||''}</p></div></div>;
 return <section><div className="section-top"><div><h2>📌 นัดหมาย</h2><p>นัดหมาย แผนงานฝ่าย และแผนงานหลัก</p></div>{canEdit&&<button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus/>เพิ่มนัดหมาย</button>}</div>
  <DateRangeBar from={range.from} to={range.to} onChange={(from,to)=>{setRange({from,to});setDate(from)}}/>
  <div className="job-list">{visibleAppts.map(x=>{const diff=dayDiff(x.date,todayISO());return <div className={`card event-row urgency-card ${urgencyClass(diff)}`} key={x.id}><div><b>{x.title}</b><small>{x.type} · {rangeText(x)} · {x.start_time?.slice(0,5)}–{x.end_time?.slice(0,5)}{x.location?` · ${x.location}`:''}</small><span className="urgency-inline">{urgencyText(diff)}</span><p>{x.notes||''}</p><div className="people">{(data.appointmentMembers||[]).filter(m=>m.appointment_id===x.id).map(m=>{const u=data.users.find(u=>u.id===m.user_id);return u?<span key={m.user_id}>{u.display_name}</span>:null})}</div></div>{canEdit&&<div className="actions"><button onClick={()=>{setEdit(x);setOpen(true)}}><Edit3 size={15}/></button><button onClick={async()=>{if(confirm('ลบนัดหมายนี้?')){await supabase.from('appointment_members').delete().eq('appointment_id',x.id);await supabase.from('appointments').delete().eq('id',x.id);refresh()}}}><Trash2 size={15}/></button></div>}</div>})}{!visibleAppts.length&&<div className="empty">ช่วงวันที่นี้ยังไม่มีนัดหมาย</div>}</div>
  <div className="plan-columns"><div><div className="section-divider"><b>แผนงานฝ่าย{me.team?` · ${me.team}`:''}</b></div>{!me.team?<div className="empty">คุณไม่มีฝ่าย</div>:teamPlans.length?teamPlans.map(renderPlan):<div className="empty">ยังไม่มีงานในตอนนี้</div>}</div><div><div className="section-divider"><b>แผนงานหลัก</b></div>{mainPlans.length?mainPlans.map(renderPlan):<div className="empty">ยังไม่มีแผนงานในตอนนี้</div>}</div></div>
  {open&&<AppointmentModal me={me} data={data} item={edit} date={date} close={()=>setOpen(false)} refresh={refresh}/>}</section>
}

function AppointmentModal({me,data,item,date,close,refresh}){
 const [type,setType]=useState(item?.type||APPOINTMENT_TYPES[0]),[title,setTitle]=useState(item?.title||''),[day,setDay]=useState(item?.date||date),[endDay,setEndDay]=useState(item?.end_date||item?.date||date),[start,setStart]=useState(item?.start_time?.slice(0,5)||'13:00'),[end,setEnd]=useState(item?.end_time?.slice(0,5)||'16:00'),[loc,setLoc]=useState(item?.location||''),[notes,setNotes]=useState(item?.notes||''),[members,setMembers]=useState([]),[err,setErr]=useState('');
 useEffect(()=>{setMembers((data.appointmentMembers||[]).filter(x=>x.appointment_id===item?.id).map(x=>x.user_id))},[item,data.appointmentMembers]);
 const busyDays=day<=endDay?daysBetween(day,endDay):[];const unavailableIds=new Set((data.dayStatus||[]).filter(x=>busyDays.includes(x.date)&&x.status==='unavailable').map(x=>x.user_id));
 const unavailableMembers=data.users.filter(u=>unavailableIds.has(u.id));
 const toggleMember=id=>{if(unavailableIds.has(id)){setErr(`เลือกไม่ได้ เพราะ ${data.users.find(u=>u.id===id)?.display_name||'สมาชิกคนนี้'} ไม่ว่างในช่วงวันที่เลือก`);return}setErr('');setMembers(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id])};
 useEffect(()=>{setMembers(v=>v.filter(id=>!unavailableIds.has(id)))},[day,endDay,data.dayStatus]);
 async function save(){setErr('');if(!title.trim())return setErr('กรุณาใส่ชื่อ');if(endDay<day)return setErr('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');if(timeToMin(start)>=timeToMin(end))return setErr('เวลาไม่ถูกต้อง');if(members.some(id=>unavailableIds.has(id)))return setErr('มีผู้เข้าร่วมที่ไม่ว่างในช่วงวันที่เลือก กรุณาเปลี่ยนคน');
  const payload={type,title:title.trim(),date:day,end_date:endDay,start_time:start,end_time:end,location:loc||null,notes:notes||null};
  const r=item?await supabase.from('appointments').update(payload).eq('id',item.id).select('id').single():await supabase.from('appointments').insert({...payload,created_by:me.id}).select('id').single();if(r.error)return setErr(r.error.message);const id=item?.id||r.data.id;
  const old=await supabase.from('appointment_members').delete().eq('appointment_id',id);if(old.error)return setErr(old.error.message);if(members.length){const q=await supabase.from('appointment_members').insert(members.map(user_id=>({appointment_id:id,user_id})));if(q.error)return setErr(q.error.message)}await refresh();close()}
 return <Modal title={item?'แก้ไขนัดหมาย':'เพิ่มนัดหมาย'} close={close}>
  <label>ประเภท<select value={type} onChange={e=>setType(e.target.value)}>{APPOINTMENT_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
  <label>ชื่อ/รายละเอียด<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="เช่น ซ้อมเชียร์น้อง ม.2"/></label>
  <div className="form-row"><label>วันที่เริ่ม<input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label><label>วันที่สิ้นสุด<input type="date" value={endDay} min={day} onChange={e=>setEndDay(e.target.value)}/></label></div>
  <div className="form-row"><label>เวลาเริ่ม<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>เวลาสิ้นสุด<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
  <label>สถานที่<input value={loc} onChange={e=>setLoc(e.target.value)}/></label>
  <label>ผู้เข้าร่วม (เลือกหรือไม่เลือกก็ได้)<div className="member-picker-head"><span>{members.length}/{data.users.length} คน</span><button type="button" className="secondary small-btn" onClick={()=>{setErr('');const eligible=data.users.filter(u=>!unavailableIds.has(u.id));setMembers(members.length===eligible.length?[]:eligible.map(u=>u.id))}}>{members.length===data.users.filter(u=>!unavailableIds.has(u.id)).length?'ยกเลิกทั้งหมด':'เลือกทุกคน'}</button></div>{unavailableMembers.length>0&&<div className="availability-warning">⚠️ {unavailableMembers.map(u=>u.display_name).join(', ')} ไม่ว่างในช่วงวันที่เลือก ระบบไม่ให้เลือกคนที่ไม่ว่าง</div>}<div className="choice-buttons appointment-choices">{data.users.map(u=>{const unavailable=unavailableIds.has(u.id);return <button type="button" key={u.id} className={`${members.includes(u.id)?'choice-chip active':'choice-chip'}${unavailable?' unavailable':''}`} disabled={unavailable} onClick={()=>toggleMember(u.id)}><span>{u.display_name}{u.team?` · ${u.team}`:''}{unavailable?' · ไม่ว่าง':''}</span></button>})}</div></label>
  <label>หมายเหตุ<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="รายละเอียดเพิ่มเติม"/></label>{err&&<div className="error">{err}</div>}<button className="primary wide" onClick={save}><Save/>บันทึก</button>
 </Modal>
}

function DateRangeBar({from,to,onChange}){return <div className="date-range-bar"><label>ตั้งแต่<input type="date" value={from} onChange={e=>onChange(e.target.value,e.target.value>to?e.target.value:to)}/></label><span className="range-separator">ถึง</span><label>ถึง<input type="date" value={to} min={from} onChange={e=>onChange(from,e.target.value)}/></label><button className="secondary" onClick={()=>{const t=todayISO();onChange(t,t)}}>วันนี้</button></div>}

function PlanManager({me,data,refresh}){
 const can=roleRank[me.role]>=1;const [open,setOpen]=useState(false),[edit,setEdit]=useState(null),[range,setRange]=useState({from:todayISO(),to:todayISO()});
 const plans=[...data.plans].filter(p=>inDateRange(p,range.from)||inDateRange(p,range.to)||(p.date<=range.from&&itemEndDate(p)>=range.to)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));
 const teamPlans=plans.filter(p=>p.type==='งานฝ่าย'&&me.team&&p.team===me.team),mainPlans=plans.filter(p=>p.type==='งานหลัก');
 const card=p=><div className="card plan-card" key={p.id}><div><span className="eyebrow">{p.type}</span><h3>{p.title}</h3><small>{p.team||'ทุกฝ่าย'} · {rangeText(p)}{p.start_time?` · ${p.start_time.slice(0,5)}–${p.end_time?.slice(0,5)}`:''}</small>{data.topics.filter(t=>t.plan_id===p.id).map(t=><div className="plan-topic" key={t.id}>• {t.title}</div>)}<p>{p.notes||''}</p>{(data.planMembers||[]).filter(m=>m.plan_id===p.id).length>0&&<div className="people">{(data.planMembers||[]).filter(m=>m.plan_id===p.id).map(m=>{const u=data.users.find(u=>u.id===m.user_id);return u?<span key={m.user_id}>{u.display_name}</span>:null})}</div>}</div>{can&&<div className="actions"><button onClick={()=>{setEdit(p);setOpen(true)}}><Edit3 size={15}/></button></div>}</div>;
 return <div><div className="section-top"><div><h3>แผนงาน</h3><p>แยกแผนงานฝ่ายและแผนงานหลัก พร้อมกรองช่วงวันที่</p></div>{can&&<button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus/>เพิ่มแผนงาน</button>}</div><DateRangeBar from={range.from} to={range.to} onChange={(from,to)=>setRange({from,to})}/><div className="plan-columns"><div><div className="section-divider"><b>แผนงานฝ่าย{me.team?` · ${me.team}`:''}</b></div>{!me.team?<div className="empty">คุณไม่มีฝ่าย</div>:teamPlans.length?teamPlans.map(card):<div className="empty">ยังไม่มีงานในตอนนี้</div>}</div><div><div className="section-divider"><b>แผนงานหลัก</b></div>{mainPlans.length?mainPlans.map(card):<div className="empty">ยังไม่มีแผนงานในตอนนี้</div>}</div></div>{open&&<PlanModal me={me} data={data} item={edit} close={()=>setOpen(false)} refresh={refresh}/>}</div>
}

function PlanModal({me,data,item,close,refresh}){
 const [type,setType]=useState(item?.type==='งานฝ่าย'?'งานฝ่าย':'งานหลัก'),[title,setTitle]=useState(item?.title||''),[team,setTeam]=useState(item?.team||''),[date,setDate]=useState(item?.date||todayISO()),[endDate,setEndDate]=useState(item?.end_date||item?.date||todayISO()),[hasTime,setHasTime]=useState(!!item?.start_time),[start,setStart]=useState(item?.start_time?.slice(0,5)||'13:00'),[end,setEnd]=useState(item?.end_time?.slice(0,5)||'16:00'),[notes,setNotes]=useState(item?.notes||''),[topics,setTopics]=useState([]),[members,setMembers]=useState([]),[err,setErr]=useState('');
 useEffect(()=>{if(item){setTopics(data.topics.filter(x=>x.plan_id===item.id).map(x=>x.title));setMembers((data.planMembers||[]).filter(x=>x.plan_id===item.id).map(x=>x.user_id))}else{setTopics([]);setMembers([])}},[item,data.topics,data.planMembers]);
 async function save(){setErr('');if(!title.trim())return setErr('กรุณาใส่ชื่อแผนงาน');if(endDate<date)return setErr('วันสิ้นสุดต้องไม่ก่อนวันเริ่ม');if(hasTime&&timeToMin(start)>=timeToMin(end))return setErr('เวลาไม่ถูกต้อง');const payload={type,title:title.trim(),team:type==='งานฝ่าย'?(team||null):null,date,end_date:endDate,start_time:hasTime?start:null,end_time:hasTime?end:null,notes:notes||null,created_by:me.id};try{const r=item?await supabase.from('plans').update(payload).eq('id',item.id).select('id').single():await supabase.from('plans').insert(payload).select('id').single();if(r.error)throw r.error;const id=item?.id||r.data.id;
  await supabase.from('plan_topics').delete().eq('plan_id',id);if(topics.filter(Boolean).length){const q=await supabase.from('plan_topics').insert(topics.filter(Boolean).map((t,i)=>({plan_id:id,title:t,sort_order:i})));if(q.error)throw q.error}
  await supabase.from('plan_members').delete().eq('plan_id',id);if(members.length){const q=await supabase.from('plan_members').insert(members.map(user_id=>({plan_id:id,user_id})));if(q.error)throw q.error}
  await refresh();close()}catch(e){setErr(e.message||'บันทึกแผนงานไม่สำเร็จ')}}
 return <Modal title={item?'แก้ไขแผนงาน':'เพิ่มแผนงาน'} close={close}>
  <label>ประเภท<select value={type} onChange={e=>setType(e.target.value)}>{PLAN_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
  <label>ชื่องาน<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="เช่น เตรียมงานเชียร์"/></label>
  {type==='งานฝ่าย'&&<label>ฝ่าย<select value={team} onChange={e=>setTeam(e.target.value)}><option value="">เลือกฝ่าย</option>{(data.teamOptions?.length?data.teamOptions.map(x=>x.name):DEFAULT_TEAMS).map(x=><option key={x}>{x}</option>)}</select></label>}
  <div className="form-row"><label>วันที่เริ่ม<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>วันที่สิ้นสุด<input type="date" value={endDate} min={date} onChange={e=>setEndDate(e.target.value)}/></label></div>
  <div className="time-choice"><label className="switch-line"><input type="checkbox" checked={hasTime} onChange={e=>setHasTime(e.target.checked)}/>กำหนดเวลา</label>{hasTime&&<div className="form-row"><label>เวลาเริ่ม<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>จบ<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>}</div>
  <label>ผู้รับผิดชอบ (เลือกหรือไม่เลือกก็ได้)<div className="member-picker-head"><span>{members.length}/{data.users.length} คน</span><button type="button" className="secondary small-btn" onClick={()=>setMembers(members.length===data.users.length?[]:data.users.map(u=>u.id))}>{members.length===data.users.length?'ยกเลิกทั้งหมด':'เลือกทุกคน'}</button></div><div className="choice-buttons plan-member-choices">{data.users.map(u=><button type="button" key={u.id} className={members.includes(u.id)?'choice-chip active':'choice-chip'} onClick={()=>setMembers(v=>v.includes(u.id)?v.filter(id=>id!==u.id):[...v,u.id])}><span>{u.display_name}</span></button>)}</div></label>
  <h4>หัวข้อ</h4>{topics.map((x,i)=><div className="inline-input" key={i}><input value={x} onChange={e=>setTopics(t=>t.map((v,j)=>j===i?e.target.value:v))} placeholder="หัวข้อที่ต้องทำ"/><button onClick={()=>setTopics(t=>t.filter((_,j)=>j!==i))}><X/></button></div>)}<button className="secondary" onClick={()=>setTopics(t=>[...t,''])}><Plus/>สร้างหัวข้อ</button>
  <label>หมายเหตุ<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="เตรียมอุปกรณ์ / สิ่งที่ต้องทำ / หมายเหตุ"/></label>{err&&<div className="error">{err}</div>}<button className="primary wide" onClick={save}><Save/>บันทึก</button>
 </Modal>
}

function Manage({me,data,refresh,defaultTab}){
 const tabs=[['plans','แผนงานระยะยาว'],['appointments','นัดหมาย'],['people','จัดการสมาชิก'],...(isFullAdmin(me)?[['teams','ฝ่าย'],['roles','ยศและสิทธิ์']]:[])];
 const [tab,setTab]=useState(defaultTab);return <section><div className="section-top"><div><h2>⚙️ จัดการตุ้ย</h2><p>{isFullAdmin(me)?'จัดการได้ทุกอย่าง รวมถึงฝ่ายและยศ':'เพิ่มงาน แผนงาน และจัดการข้อมูลที่ได้รับอนุญาต'}</p></div></div><div className="seg-tabs manage-tabs">{tabs.map(([id,t])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{t}</button>)}</div>
 {tab==='plans'&&<PlanManager me={me} data={data} refresh={refresh}/>}
 {tab==='appointments'&&<AppointmentsManager me={me} data={data} refresh={refresh}/>}
 {tab==='people'&&<PeopleManager me={me} data={data} refresh={refresh}/>}
 {tab==='teams'&&isFullAdmin(me)&&<TeamManager data={data} refresh={refresh}/>}
 {tab==='roles'&&isFullAdmin(me)&&<RoleManager data={data} refresh={refresh}/>}
 {tab==='roles'&&!isFullAdmin(me)&&<div className="empty">เฉพาะหัวหน้าตุ้ยและอาจารย์ตุ้ยเท่านั้นที่กำหนดยศได้</div>}
 </section>
}

function AppointmentsManager({me,data,refresh}){const [open,setOpen]=useState(false),[edit,setEdit]=useState(null),[range,setRange]=useState({from:todayISO(),to:todayISO()});const rows=data.appointments.filter(x=>inDateRange(x,range.from)||inDateRange(x,range.to)||(x.date<=range.from&&itemEndDate(x)>=range.to)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));return <div><div className="section-top"><div><h3>นัดหมาย</h3><p>เพิ่ม แก้ไข และลบรายการนัดหมาย</p></div><button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus/>เพิ่มนัดหมาย</button></div><DateRangeBar from={range.from} to={range.to} onChange={(from,to)=>setRange({from,to})}/>{rows.map(x=><div className="card event-row urgency-card" key={x.id}><div><b>{x.title}</b><small>{x.type} · {rangeText(x)} · {x.start_time.slice(0,5)}–{x.end_time.slice(0,5)}</small><p>{x.notes||''}</p></div><div className="actions"><button onClick={()=>{setEdit(x);setOpen(true)}}><Edit3/></button><button onClick={async()=>{if(confirm('ลบนัดหมายนี้?')){await supabase.from('appointment_members').delete().eq('appointment_id',x.id);await supabase.from('appointments').delete().eq('id',x.id);refresh()}}}><Trash2/></button></div></div>)}{!rows.length&&<div className="empty">ช่วงวันที่นี้ยังไม่มีนัดหมาย</div>}{open&&<AppointmentModal me={me} data={data} item={edit} date={range.from} close={()=>setOpen(false)} refresh={refresh}/>}</div>}

function Members({me,data}){
 const [dates,setDates]=useState({});
 return <section><div className="section-top"><div><h2>👥 สมาตุ้ยทั้งหมด</h2><p>ดูสมาชิก ฝ่าย ยศ และช่วงเวลาว่างของแต่ละคน</p></div></div><div className="member-grid">{data.users.map(u=>{const d=dates[u.id]||todayISO();const slots=data.avail.filter(a=>a.user_id===u.id&&a.date===d);return <div className="member-card" key={u.id}><div className="member-head"><Avatar user={u}/><div><h3>{u.display_name}</h3><small>{roleLabel(u,data)}{u.team?` · ${u.team}`:''}</small></div></div><div className="member-date"><label>วันที่<input type="date" value={d} onChange={e=>setDates(v=>({...v,[u.id]:e.target.value}))}/></label></div>{u.bio&&<p className="bio">{u.bio}</p>}<div className="line"><span>●</span><b>{slots.length?slots.map(x=>`${x.start_time.slice(0,5)}–${x.end_time.slice(0,5)}`).join(' · '):'ยังไม่ได้ลงเวลาว่าง'}</b></div></div>})}</div>{!data.users.length&&<div className="empty">ยังไม่มีสมาชิก</div>}</section>
}

function AttendanceManager({me,data,refresh}){
 const [date,setDate]=useState(todayISO()),[type,setType]=useState('rehearsal'),[rows,setRows]=useState({}),[note,setNote]=useState({});
 const members=data.checkins;
 useEffect(()=>{const obj={};const notes={};data.attendance.filter(x=>x.date===date&&x.type===type).forEach(x=>{obj[x.member_id]=x.status;notes[x.member_id]=x.note||''});setRows(obj);setNote(notes)},[date,type,data.attendance]);
 async function save(){const payload=members.map(m=>({member_id:m.id,date,type,status:rows[m.id]||ATT_TYPES[type][0],note:note[m.id]||null,checked_by:me.id}));const r=await supabase.from('attendance').upsert(payload,{onConflict:'member_id,date,type'});if(r.error)alert(r.error.message);else refresh()}
 return <div><div className="section-top"><div><h3>เช็คชื่อ</h3><p>เลื่อนรายการลง เช็กสถานะทางขวา แล้วกดบันทึก</p></div><button className="primary" onClick={save}><Save/>บันทึกข้อมูล</button></div><div className="checkin-controls"><label>วันที่<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>ประเภท<select value={type} onChange={e=>setType(e.target.value)}><option value="rehearsal">เช็คชื่อซ้อมน้อง</option><option value="evening">เช็คชื่ออยู่เย็น</option><option value="sleep">เช็คชื่อนอนโรงเรียน</option></select></label></div>
 <div className="attendance-table"><div className="att-head"><span>ลำดับ</span><span>รูป</span><span>ชื่อ-สกุล</span><span>ชั้น</span><span>ชื่อเล่น</span><span>ฝ่าย</span><span>สถานะ</span><span>หมายเหตุ</span></div>{members.map(m=><div className="att-row" key={m.id}><span>{m.sort_no}</span><Avatar user={m} /><div>{m.full_name}</div><span>{m.class_name}</span><span>{m.nickname}</span><span>{m.team}</span><select value={rows[m.id]||ATT_TYPES[type][0]} onChange={e=>setRows(r=>({...r,[m.id]:e.target.value}))}>{ATT_TYPES[type].map(x=><option key={x}>{x}</option>)}</select><input value={note[m.id]||''} onChange={e=>setNote(n=>({...n,[m.id]:e.target.value}))} placeholder="หมายเหตุ (ถ้ามี)"/></div>)}</div><AttendanceStats data={data} members={members}/></div>
}

function AttendanceStats({data, members}) {
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState('rehearsal');
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  const rows = data.attendance.filter((x) => x.date === date && x.type === type);
  const labels = ATT_TYPES[type];
  const count = (status) => rows.filter((x) => x.status === status).length;
  const filtered = filter === 'all' ? rows : rows.filter((x) => x.status === filter);

  return (
    <div className="card attendance-stats">
      <div className="section-top">
        <div>
          <h3>สถิติย้อนหลัง</h3>
          <p>กดดูรายละเอียดว่าใครมา ลา หรือขาด</p>
        </div>
        <div className="checkin-toolbar">
          <DatePicker compact date={date} setDate={setDate} />
          <label className="compact-field">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="rehearsal">ซ้อมน้อง</option>
              <option value="evening">อยู่เย็น</option>
              <option value="sleep">นอนโรงเรียน</option>
            </select>
          </label>
        </div>
      </div>

      <div className="attendance-stat-buttons">
        <button
          className="stat-view-btn"
          onClick={() => {
            setFilter('all');
            setOpen(true);
          }}
        >
          ทั้งหมด <b>{rows.length}</b>
        </button>
        {labels.map((status) => (
          <button
            className="stat-view-btn"
            key={status}
            onClick={() => {
              setFilter(status);
              setOpen(true);
            }}
          >
            {status} <b>{count(status)}</b>
          </button>
        ))}
      </div>

      {open && (
        <Modal title={`สถิติ ${fmt(date)}`} close={() => setOpen(false)}>
          <div className="stat-popup-toolbar">
            <button className="primary print-btn" onClick={() => window.print()}><ClipboardList size={16}/>พิมพ์ A4</button>
            {labels.map((status) => (
              <button
                key={status}
                className={filter === status ? 'choice-chip active' : 'choice-chip'}
                onClick={() => setFilter(status)}
              >
                {status} {count(status)}
              </button>
            ))}
          </div>

          <div className="stat-scroll">
            {filtered.map((row) => {
              const member = members.find((x) => x.id === row.member_id);
              return (
                <div className="stat-person" key={row.id}>
                  <Avatar user={member} />
                  <div>
                    <b>{member?.full_name || 'ไม่พบข้อมูล'}</b>
                    <small>
                      {member?.class_name || ''} · {member?.nickname || ''}
                    </small>
                  </div>
                  <span>{row.status}</span>
                  {row.note && <em>{row.note}</em>}
                </div>
              );
            })}
            {!filtered.length && <div className="empty">ยังไม่มีข้อมูลในหมวดนี้</div>}
          </div>
        </Modal>
      )}
      <div className="print-attendance">
        <h1>รายงานการเช็คชื่อ</h1>
        <div className="print-meta">วันที่ {fmt(date)} · {type==='rehearsal'?'ซ้อมน้อง':type==='evening'?'อยู่เย็น':'นอนโรงเรียน'} · {filter==='all'?'ทั้งหมด':filter}</div>
        <table><thead><tr><th>ลำดับ</th><th>ชื่อ-สกุล</th><th>ชั้น</th><th>ชื่อเล่น</th><th>สถานะ</th></tr></thead><tbody>
          {filtered.map((row,i)=>{const member=members.find(x=>x.id===row.member_id);return <tr key={row.id}><td>{member?.sort_no||i+1}</td><td>{member?.full_name||'ไม่พบข้อมูล'}</td><td>{member?.class_name||''}</td><td>{member?.nickname||''}</td><td>{row.status}</td></tr>})}
        </tbody></table>
      </div>
    </div>
  );
}

function mondayOf(date){const d=new Date(date+'T00:00:00');const day=d.getDay();const diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return d.toISOString().slice(0,10)}
function CleaningManager({me,data,refresh}){
 const canEdit=roleRank[me.role]>=1;
 const [date,setDate]=useState(todayISO()),[sets,setSets]=useState([]),[active,setActive]=useState(null),[loaded,setLoaded]=useState(false);
 const week=useMemo(()=>daysBetween(mondayOf(date),(()=>{const d=new Date(mondayOf(date)+'T00:00:00');d.setDate(d.getDate()+4);return d.toISOString().slice(0,10)})()),[date]);
 const weekRows=week.map(day=>({day,rows:data.cleaning.filter(x=>x.date===day)}));
 useEffect(()=>{const rows=data.cleaning.filter(x=>x.date===date);const next=rows.length?rows.map((x,i)=>({...x,set_name:x.set_name||`ชุดที่ ${i+1}`})):[{id:`new-${Date.now()}`,date,set_name:'ชุดที่ 1',user_ids:[],rooms:[]}];setSets(next);setActive(next[0]?.id||null);setLoaded(true)},[date,data.cleaning]);
 const current=sets.find(x=>x.id===active)||sets[0];
 const updateSet=(patch)=>setSets(v=>v.map(x=>x.id===current?.id?{...x,...patch}:x));
 const togglePerson=id=>{if(!current)return;const people=current.user_ids||[];if(people.includes(id))updateSet({user_ids:people.filter(x=>x!==id)});else if(people.length<8)updateSet({user_ids:[...people,id]})};
 const toggleRoom=room=>{if(!current)return;const rooms=current.rooms||[];updateSet({rooms:rooms.includes(room)?rooms.filter(x=>x!==room):[...rooms,room]})};
 const addSet=()=>{const n=sets.length+1;const x={id:`new-${Date.now()}-${n}`,date,set_name:`ชุดที่ ${n}`,user_ids:[],rooms:[]};setSets(v=>[...v,x]);setActive(x.id)};
 const removeSet=()=>{if(!current||sets.length<=1)return;const next=sets.filter(x=>x.id!==current.id);setSets(next);setActive(next[0].id)};
 const randomize=()=>{if(!current)return;const shuffled=[...data.users].sort(()=>Math.random()-.5).slice(0,8);updateSet({user_ids:shuffled.map(x=>x.id)})};
 async function save(){if(!sets.length)return;const cleanSets=sets.map((x,i)=>({...x,set_name:x.set_name?.trim()||`ชุดที่ ${i+1}`,user_ids:(x.user_ids||[]).slice(0,8),rooms:x.rooms||[]}));const old=data.cleaning.filter(x=>x.date===date);const notifications=[];cleanSets.forEach(x=>{const oldRow=x.id?.startsWith('new-')?null:old.find(o=>o.id===x.id);const oldPeople=new Set(oldRow?.user_ids||[]);(x.user_ids||[]).filter(id=>!oldPeople.has(id)).forEach(user_id=>notifications.push({recipient_id:user_id,title:`มีเวรทำความสะอาด ${fmt(date)}`,body:`คุณได้รับเวร ${x.set_name}${x.rooms?.length?` · ${x.rooms.join(' · ')}`:''}`,created_by:me.id}))});
   const del=await supabase.from('cleaning_duties').delete().eq('date',date);if(del.error)return alert(del.error.message);
   const ins=await supabase.from('cleaning_duties').insert(cleanSets.map(x=>({date,set_name:x.set_name,user_ids:x.user_ids,rooms:x.rooms,created_by:me.id})));if(ins.error)return alert(ins.error.message);
   if(notifications.length){const q=await supabase.from('notifications').insert(notifications);if(q.error)console.warn(q.error.message)}
   refresh();
 }
 return <section><div className="section-top"><div><h2>🧹 เวรทำความสะอาด</h2><p>{canEdit?'เลือกคนได้หลายคน สูงสุด 8 คน และเพิ่มได้หลายชุดเวร':'ตารางเวรประจำสัปดาห์ จันทร์–ศุกร์'}</p></div>{canEdit&&<div className="button-row"><button className="secondary" onClick={addSet}><Plus/>เพิ่มชุดเวร</button><button className="primary" onClick={save}><Save/>บันทึกเวร</button></div>}</div>
   {canEdit&&current&&<><DatePicker date={date} setDate={setDate}/><div className="cleaning-set-tabs">{sets.map((x,i)=><button key={x.id} className={x.id===current.id?'active':''} onClick={()=>setActive(x.id)}>{x.set_name||`ชุดที่ ${i+1}`}</button>)}</div><div className="cleaning-picker-grid"><div className="cleaning-picker"><div className="picker-heading"><b>คนทำเวร</b><span>{(current.user_ids||[]).length}/8 คน</span></div><div className="choice-buttons">{data.users.map(u=><button type="button" key={u.id} className={(current.user_ids||[]).includes(u.id)?'choice-chip active':'choice-chip'} onClick={()=>togglePerson(u.id)}><span>{u.display_name}</span></button>)}</div></div><div className="cleaning-picker"><div className="picker-heading"><b>ห้อง</b><span>{(current.rooms||[]).length} ห้อง</span></div><div className="choice-buttons">{CLEAN_ROOMS.map(room=><button type="button" key={room} className={(current.rooms||[]).includes(room)?'choice-chip active':'choice-chip'} onClick={()=>toggleRoom(room)}><span>{room}</span></button>)}</div></div></div><div className="button-row"><button className="secondary" onClick={randomize}><Shuffle/>สุ่ม 8 คน</button>{sets.length>1&&<button className="secondary danger-btn" onClick={removeSet}><Trash2/>ลบชุดนี้</button>}</div></>}
   <div className="cleaning-week"><div className="week-heading"><div><b>เวรรวมทั้งสัปดาห์</b><span>{fmt(week[0])} – {fmt(week[4])}</span></div><DatePicker compact date={date} setDate={setDate}/></div><div className="week-grid">{weekRows.map(({day,rows})=><div className="week-day" key={day}><div className="week-day-head"><b>{new Intl.DateTimeFormat('th-TH',{weekday:'long'}).format(new Date(day+'T00:00:00'))}</b><span>{fmt(day)}</span></div>{rows.length?rows.map((r,i)=><div className="week-duty" key={r.id}><b>{r.set_name||`ชุดที่ ${i+1}`}</b><div className="people">{(r.user_ids||[]).map(id=><span key={id}>{data.users.find(u=>u.id===id)?.display_name||'สมาชิก'}</span>)}</div><small>{(r.rooms||[]).length?'ห้อง: '+r.rooms.join(' · '):'ยังไม่ได้ระบุห้อง'}</small></div>):<div className="week-empty">ไม่มีเวร</div>}</div>)}</div></div></section>
}

function PeopleManager({me,data,refresh}){
 const [editing,setEditing]=useState(null),[form,setForm]=useState(null),[file,setFile]=useState(null),[teamBusy,setTeamBusy]=useState('');
 const canAssignTeam=roleRank[me.role]>=1;
 function open(u){setEditing(u);setFile(null);setForm({...u})}
 async function changeTeam(u,team){
  setTeamBusy(u.id);
  try{const r=await supabase.from('profiles').update({team:team||null}).eq('id',u.id);if(r.error)throw r.error;await refresh()}
  catch(e){alert(e.message||'เปลี่ยนฝ่ายไม่สำเร็จ')}finally{setTeamBusy('')}
 }
 async function save(){let avatar=form.avatar_url||null;if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`member-${form.id}-${Date.now()}.${ext}`;const up=await supabase.storage.from('checkin-avatars').upload(path,file,{upsert:true,contentType:file.type});if(up.error)return alert(up.error.message);avatar=supabase.storage.from('checkin-avatars').getPublicUrl(path).data.publicUrl}const r=await supabase.from('checkin_members').update({full_name:form.full_name,class_name:form.class_name,nickname:form.nickname,team:form.team,linked_user_id:form.linked_user_id||null,avatar_url:avatar}).eq('id',form.id);if(r.error)alert(r.error.message);else{setEditing(null);refresh()}}
 const teams=data.teamOptions?.length?data.teamOptions.map(x=>x.name):DEFAULT_TEAMS;
 return <div>
  {canAssignTeam&&<div className="manage-box"><div className="section-top"><div><h3>จัดฝ่ายให้สมาชิก</h3><p>รองใหญ่ตุ้ย หัวหน้าตุ้ย และอาจารย์ตุ้ย สามารถกำหนดหรือเปลี่ยนฝ่ายให้สมาชิกได้</p></div></div><div className="role-list">{data.users.map(u=><div className="role-user" key={u.id}><div className="role-user-info"><Avatar user={u}/><div><b>{u.display_name}</b><small>{roleLabel(u,data)}</small></div></div><select className="role-select" disabled={teamBusy===u.id} value={u.team||''} onChange={e=>changeTeam(u,e.target.value)}><option value="">ยังไม่เลือกฝ่าย</option>{teams.map(t=><option key={t} value={t}>{t}</option>)}</select></div>)}</div></div>}
  <div><div className="section-top"><div><h3>ข้อมูลคนเช็คชื่อ</h3><p>หัวหน้าตุ้ย/รองหัวตุ้ยแก้รูป ข้อมูล และเชื่อมบัญชีได้</p></div></div><div className="attendance-table people-admin">{data.checkins.map(m=><div className="att-row" key={m.id}><span>{m.sort_no}</span><Avatar user={m}/><div>{m.full_name}</div><span>{m.class_name}</span><span>{m.nickname}</span><span>{m.team}</span><span>{data.users.find(u=>u.id===m.linked_user_id)?.display_name||'ยังไม่เชื่อม'}</span><button onClick={()=>open(m)}><Edit3/></button></div>)}</div>{editing&&<Modal title="แก้ไขข้อมูลสมาชิกเช็คชื่อ" close={()=>setEditing(null)}><label>ชื่อ-สกุล<input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>ชั้น<input value={form.class_name} onChange={e=>setForm({...form,class_name:e.target.value})}/></label><label>ชื่อเล่น<input value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})}/></label><label>ฝ่าย<select value={form.team} onChange={e=>setForm({...form,team:e.target.value})}>{teams.map(x=><option key={x}>{x}</option>)}</select></label><label>รูปภาพ<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label>หรือ URL รูปภาพ<input value={form.avatar_url||''} onChange={e=>setForm({...form,avatar_url:e.target.value})} placeholder="https://..."/></label><label>เชื่อมกับบัญชีในเว็บ<select value={form.linked_user_id||''} onChange={e=>setForm({...form,linked_user_id:e.target.value||null)}><option value="">ยังไม่เชื่อม</option>{data.users.map(u=><option key={u.id} value={u.id}>{u.display_name} · {u.email}</option>)}</select></label><button className="primary wide" onClick={save}><Save/>บันทึก</button></Modal>}</div>
 </div>
}
function TeamManager({data,refresh}){
 const [name,setName]=useState(''); const [editing,setEditing]=useState(null); const [busy,setBusy]=useState(false);
 const teams=data.teamOptions?.length?data.teamOptions:DEFAULT_TEAMS.map((name,i)=>({id:`default-${i}`,name,sort_order:i}));
 async function save(){const n=name.trim();if(!n)return;if(teams.some(t=>t.name.toLowerCase()===n.toLowerCase()&&t.id!==editing?.id))return alert('มีฝ่ายนี้อยู่แล้ว');setBusy(true);try{
  if(editing){const old=editing.name;const r=await supabase.from('team_options').update({name:n}).eq('id',editing.id);if(r.error)throw r.error;
   await supabase.from('profiles').update({team:n}).eq('team',old); await supabase.from('checkin_members').update({team:n}).eq('team',old);
  }else{const r=await supabase.from('team_options').insert({name:n,sort_order:teams.length}).select().single();if(r.error)throw r.error}
  setName('');setEditing(null);await refresh();
 }catch(e){alert(e.message||'บันทึกฝ่ายไม่สำเร็จ')}finally{setBusy(false)}}
 async function remove(t){if(t.id?.startsWith('default-'))return alert('ฝ่ายเริ่มต้นต้องสร้าง/จัดการผ่านฐานข้อมูลก่อน');const p=await supabase.from('profiles').select('id',{count:'exact',head:true}).eq('team',t.name);const c=await supabase.from('checkin_members').select('id',{count:'exact',head:true}).eq('team',t.name);if((p.count||0)+(c.count||0)>0)return alert('ยังลบฝ่ายนี้ไม่ได้ เพราะมีสมาชิกหรือรายชื่อเช็คชื่อใช้อยู่');if(!confirm(`ลบฝ่าย “${t.name}” ?`))return;const r=await supabase.from('team_options').delete().eq('id',t.id);if(r.error)alert(r.error.message);else refresh()}
 return <div className="manage-box"><div className="section-top"><div><h3>ฝ่าย</h3><p>หัวหน้าตุ้ยและอาจารย์ตุ้ยสามารถเพิ่ม แก้ชื่อ และลบฝ่ายได้</p></div></div>
  <div className="inline-form"><input value={name} onChange={e=>setName(e.target.value)} placeholder={editing?'แก้ชื่อฝ่าย':'เพิ่มชื่อฝ่าย'}/><button className="primary" disabled={busy} onClick={save}>{editing?'บันทึกการแก้ไข':'เพิ่มฝ่าย'}</button>{editing&&<button className="secondary" onClick={()=>{setEditing(null);setName('')}}>ยกเลิก</button>}</div>
  <div className="option-list">{teams.map(t=><div className="option-row" key={t.id}><b>{t.name}</b><div className="actions"><button onClick={()=>{setEditing(t);setName(t.name)}}><Edit3 size={15}/></button>{!t.id.startsWith('default-')&&<button onClick={()=>remove(t)}><Trash2 size={15}/></button>}</div></div>)}</div>
 </div>
}

function RoleManager({data,refresh}){
 const [busy,setBusy]=useState(''); const [name,setName]=useState(''); const [editing,setEditing]=useState(null);
 const builtins=[['member','สมาตุ้ย','ดูข้อมูลและลงเวลาของตัวเอง'],['deputy','รองหัวตุ้ย','เพิ่มงาน แผนงาน เช็คชื่อ และเวร'],['head','หัวหน้าตุ้ย','จัดการทุกอย่าง รวมถึงฝ่ายและยศ'],['teacher','อาจารย์ตุ้ย','ทำและดูได้ทุกอย่างเหมือนหัวหน้าตุ้ย']];
 async function setRole(u,value){setBusy(u.id);try{let payload={custom_role_id:null,role:value};if(value.startsWith('custom:')){payload={role:'member',custom_role_id:value.slice(7)}}const r=await supabase.from('profiles').update(payload).eq('id',u.id);if(r.error)throw r.error;await refresh()}catch(e){alert(e.message||'เปลี่ยนยศไม่สำเร็จ')}finally{setBusy('')}}
 async function saveCustom(){const n=name.trim();if(!n)return;if(data.customRoles?.some(r=>r.name.toLowerCase()===n.toLowerCase()&&r.id!==editing?.id))return alert('มียศนี้อยู่แล้ว');const r=editing?await supabase.from('custom_roles').update({name:n}).eq('id',editing.id):await supabase.from('custom_roles').insert({name:n});if(r.error)alert(r.error.message);else{setName('');setEditing(null);refresh()}}
 async function removeCustom(r){if(!confirm(`ลบยศ “${r.name}” ? สมาชิกที่ใช้ยศนี้จะกลับเป็นสมาตุ้ย`))return;const q=await supabase.from('custom_roles').delete().eq('id',r.id);if(q.error)alert(q.error.message);else refresh()}
 return <div className="role-page">
  <div className="role-intro"><div className="role-intro-icon"><Shield/></div><div><h3>ยศและสิทธิ์</h3><p>เฉพาะหัวหน้าตุ้ยและอาจารย์ตุ้ยเท่านั้นที่สามารถใส่หรือเปลี่ยนยศ รวมถึงประธานและรองประธานทุกตำแหน่ง</p></div></div>
  <div className="role-cards">{builtins.map(([id,label,desc])=><div key={id}><b>{label}</b><span>{desc}</span></div>)}</div>
  <div className="manage-box"><h3>เพิ่ม / แก้ไขยศกำหนดเอง</h3><div className="inline-form"><input value={name} onChange={e=>setName(e.target.value)} placeholder="เช่น สต๊าฟ, ที่ปรึกษา"/><button className="primary" onClick={saveCustom}>{editing?'บันทึกการแก้ไข':'เพิ่มยศ'}</button>{editing&&<button className="secondary" onClick={()=>{setEditing(null);setName('')}}>ยกเลิก</button>}</div>
   <div className="option-list">{(data.customRoles||[]).map(r=><div className="option-row" key={r.id}><b>{r.name}</b><div className="actions"><button onClick={()=>{setEditing(r);setName(r.name)}}><Edit3 size={15}/></button><button onClick={()=>removeCustom(r)}><Trash2 size={15}/></button></div></div>)}{!data.customRoles?.length&&<div className="muted">ยังไม่มียศกำหนดเอง</div>}</div>
  </div>
  <div className="role-list">{data.users.map(u=>{const selected=u.custom_role_id?`custom:${u.custom_role_id}`:`builtin:${u.role}`;return <div className="role-user" key={u.id}><div className="role-user-info"><Avatar user={u}/><div><b>{u.display_name}</b><small>{u.team||'ยังไม่เลือกฝ่าย'} · {u.email}</small></div></div><select className="role-select" disabled={busy===u.id} value={selected} onChange={e=>setRole(u,e.target.value.replace(/^builtin:/,''))}><option value="builtin:member">สมาตุ้ย</option><option value="builtin:deputy">รองหัวตุ้ย</option><option value="builtin:head">หัวหน้าตุ้ย</option><option value="builtin:teacher">อาจารย์ตุ้ย</option>{(data.customRoles||[]).map(r=><option key={r.id} value={`custom:${r.id}`}>{r.name}</option>)}</select></div>})}</div>
 </div>
}

function AvatarCropModal({src,scale,x,y,setScale,setX,setY,onCancel,onConfirm}){
 return <div className="modal-bg crop-modal-bg"><div className="modal crop-modal"><div className="modal-head"><h2>ปรับรูปโปรไฟล์</h2><button onClick={onCancel}><X/></button></div><p className="muted crop-help">ขยับรูปให้พอดีกรอบ แล้วกดใช้รูปนี้</p><div className="crop-stage"><img src={src} alt="ตัวอย่างรูป" style={{transform:`translate(${x}%, ${y}%) scale(${scale})`}}/></div><div className="crop-controls"><div className="crop-direction"><button className="secondary" type="button" onClick={()=>setY(v=>Math.max(-50,v-5))}>↑<span>ขึ้น</span></button><div><button className="secondary" type="button" onClick={()=>setX(v=>Math.max(-50,v-5))}>←<span>ซ้าย</span></button><button className="secondary" type="button" onClick={()=>{setX(0);setY(0)}}><Move/><span>กลาง</span></button><button className="secondary" type="button" onClick={()=>setX(v=>Math.min(50,v+5))}>→<span>ขวา</span></button></div><button className="secondary" type="button" onClick={()=>setY(v=>Math.min(50,v+5))}>↓<span>ลง</span></button></div><div className="crop-zoom"><button className="secondary" type="button" onClick={()=>setScale(v=>Math.max(1,Number((v-.1).toFixed(2))))}><ZoomOut/><span>ซูมออก</span></button><b>{Math.round(scale*100)}%</b><button className="secondary" type="button" onClick={()=>setScale(v=>Math.min(2.5,Number((v+.1).toFixed(2))))}><ZoomIn/><span>ซูมเข้า</span></button></div></div><div className="crop-actions"><button className="secondary" onClick={onCancel}>ยกเลิก</button><button className="primary" onClick={onConfirm}><Check/>ใช้รูปนี้</button></div></div></div>
}

function SettingsPage({me,data,refresh,setProfile}){
 const [name,setName]=useState(me.display_name||''),[bio,setBio]=useState(me.bio||''),[team,setTeam]=useState(me.team||''),[birthday,setBirthday]=useState(me.birthday||''),[file,setFile]=useState(null),[preview,setPreview]=useState(me.avatar_url||''),[cropOpen,setCropOpen]=useState(false),[cropScale,setCropScale]=useState(me.avatar_scale||1),[cropX,setCropX]=useState(me.avatar_x||0),[cropY,setCropY]=useState(me.avatar_y||0),[msg,setMsg]=useState(''),[err,setErr]=useState('');
 async function pickFile(f){
  if(!f || !f.type?.startsWith('image/')) return;
  setFile(f);
  const url=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});
  setPreview(url);
  setCropScale(1);setCropX(0);setCropY(0);setCropOpen(true);
}
 function cancelCrop(){setCropOpen(false);setFile(null);setPreview(me.avatar_url||'');setCropScale(me.avatar_scale||1);setCropX(me.avatar_x||0);setCropY(me.avatar_y||0)}
 function confirmCrop(){setCropOpen(false)}
 async function save(){setErr('');setMsg('');try{let avatar=me.avatar_url;if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${me.id}/avatar-${Date.now()}.${ext}`;const u=await supabase.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type});if(u.error)throw u.error;avatar=supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}const r=await supabase.from('profiles').update({display_name:name.trim(),bio:bio.trim()||null,team:team||null,birthday:birthday||null,avatar_url:avatar||null,avatar_scale:cropScale,avatar_x:cropX,avatar_y:cropY}).eq('id',me.id).select().single();if(r.error)throw r.error;setProfile(r.data);await refresh();setFile(null);setMsg('บันทึกเรียบร้อย')}catch(e){setErr(e.message)}}
 return <section><div className="section-top"><div><h2>⚙️ ตั้งค่า</h2><p>แก้ข้อมูลส่วนตัว ฝ่าย และแนะนำตัว</p></div></div><div className="card settings-form-card"><div className="settings-avatar-row"><div className="settings-avatar-preview"><Avatar user={{...me,avatar_url:preview,avatar_scale:file?cropScale:me.avatar_scale,avatar_x:file?cropX:me.avatar_x,avatar_y:file?cropY:me.avatar_y}} className="profile-avatar"/><span>{file?'พรีวิวรูปใหม่':'รูปโปรไฟล์ปัจจุบัน'}</span></div><div className="settings-avatar-actions"><label className="upload-btn">เปลี่ยนรูป<input type="file" accept="image/*" onChange={e=>{pickFile(e.target.files?.[0]);e.target.value=''}}/></label><small className="muted">เลือกรูปแล้วพรีวิวจะขึ้นทันที และจะเปิดหน้าปรับตำแหน่ง/ซูม</small></div></div><div className="settings-fields"><label>ชื่อที่แสดง<input value={name} onChange={e=>setName(e.target.value)} placeholder="กรอกชื่อที่ต้องการให้แสดง"/></label><label>ฝ่าย{roleRank[me.role]>=1?<select value={team} onChange={e=>setTeam(e.target.value)}><option value="">ยังไม่เลือก</option>{(data.teamOptions?.length?data.teamOptions.map(x=>x.name):DEFAULT_TEAMS).map(x=><option key={x}>{x}</option>)}</select>:<div className="readonly-field">{team||'ยังไม่เลือกฝ่าย'}</div>}</label><label>แนะนำตัว<textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="เขียนแนะนำตัวสั้นๆ"/></label><label>วันเกิด<input type="date" value={birthday} onChange={e=>setBirthday(e.target.value)}/></label><div className="settings-role"><span>ยศ</span><b>{roleLabel(me,data)}</b></div>{err&&<div className="error">{err}</div>}{msg&&<div className="notice">{msg}</div>}<button className="primary settings-save" onClick={save}><Save/>บันทึกการตั้งค่า</button></div></div>{cropOpen&&<AvatarCropModal src={preview} scale={cropScale} x={cropX} y={cropY} setScale={setCropScale} setX={setCropX} setY={setCropY} onCancel={cancelCrop} onConfirm={confirmCrop}/>}</section>}

function Modal({title,close,children}){return <div className="modal-bg" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={close}><X/></button></div>{children}</div></div>}

createRoot(document.getElementById('root')).render(<App/>);
