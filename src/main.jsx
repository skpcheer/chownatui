import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createClient} from '@supabase/supabase-js';
import {
 CalendarDays,Clock3,Users,ClipboardList,Settings,LogOut,Plus,Trash2,Edit3,ChevronLeft,ChevronRight,
 Shield,MapPin,Search,X,UserPlus,Camera,Save,LockKeyhole,CalendarRange,CheckCircle2,ClipboardCheck,
 BriefcaseBusiness,UserCog,Menu,RefreshCw,Shuffle,Timer,Home as HomeIcon,ZoomIn,ZoomOut,Move,Check
} from 'lucide-react';
import './styles.css';

const URL=import.meta.env.VITE_SUPABASE_URL, KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase=(URL&&KEY)?createClient(URL,KEY):null;
const TEAMS=['โค้ด','เทคนิค','อุปกรณ์','โลจิสติกส์','ลีดเดอร์'];
const PLAN_TYPES=['งานฝ่าย','งานหลัก','ซ้อมเชียร์'];
const DUTIES=['กราว','ประสานงาน','ประสานโสต','ประสานสต๊าฟ','Hแถว','Timekepper','ม้าเร็ว',
'ประจำห้อง 1/1','ประจำห้อง 1/2','ประจำห้อง 1/3','ประจำห้อง 1/4','ประจำห้อง 1/5','ประจำห้อง 1/6',
'ประจำห้อง 1/7','ประจำห้อง 1/8','ประจำห้อง 1/9','ประจำห้อง 1/10','ประจำห้อง 1/11','ประจำห้อง 1/12','อื่นๆ'];
const APPOINTMENT_TYPES=['ซ้อมน้อง','อยู่เย็น','นอนโรงเรียน','ถ่ายคลิป','อื่นๆ'];
const CLEAN_ROOMS=['ห้องเชียร์','ห้องอุปกรณ์','ห้องคอม','ห้องนอน','ห้องน้ำ','หอประชุม'];
const ATT_TYPES={rehearsal:['มา','ลากิจ/ลาป่วย','ไม่มา'],evening:['อยู่เย็น','ลากิจ/ลาป่วย','ไม่อยู่'],sleep:['อยู่ดึก','นอนโรงเรียน','ลากิจ/ลาป่วย','ไม่อยู่']};
const ROLE_LABEL={head:'หัวหน้าตุ้ย',deputy:'รองหัวตุ้ย',member:'สมาตุ้ย'};
const roleRank={member:0,deputy:1,head:2};
const fmt=d=>d?new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d+'T00:00:00')):'';
const todayISO=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const timeToMin=t=>{const [h,m]=String(t||'00:00').slice(0,5).split(':').map(Number);return h*60+m};
const overlap=(a,b)=>timeToMin(a.start_time||a.start)<timeToMin(b.end_time||b.end)&&timeToMin(b.start_time||b.start)<timeToMin(a.end_time||a.end);
const esc=(v)=>String(v||'');

async function loadData(){
 const p=await supabase.from('profiles').select('id,email,display_name,role,team,avatar_url,avatar_scale,avatar_x,avatar_y,bio,created_at').order('display_name');
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
  supabase.from('settings').select('*')
 ]);
 for(const q of queries)if(q.error)throw q.error;
 const [a,s,appointments,plans,topics,duties,planMembers,appointmentMembers,planSlots,attendance,cleaning,checkins,settings]=queries.map(x=>x.data||[]);
 return {users:p.data||[],avail:a,dayStatus:s,appointments,plans,topics,duties,planMembers,appointmentMembers,planSlots,attendance,cleaning,checkins,settings};
}

function App(){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[data,setData]=useState({users:[],avail:[],dayStatus:[],appointments:[],plans:[],topics:[],duties:[],attendance:[],cleaning:[],checkins:[],settings:[],planMembers:[],appointmentMembers:[],planSlots:[]}),[loading,setLoading]=useState(true),[error,setError]=useState(''),[authMode,setAuthMode]=useState('login');
 const refresh=async()=>{try{setError('');const d=await loadData();setData(d);setProfile(d.users.find(x=>x.id===session?.user?.id)||null)}catch(e){setError(e.message||'โหลดข้อมูลไม่สำเร็จ')}};
 useEffect(()=>{if(!supabase){setError('ยังไม่ได้ตั้งค่า Supabase');setLoading(false);return}
  supabase.auth.getSession().then(async({data})=>{setSession(data.session);if(data.session){try{const d=await loadData();setData(d);setProfile(d.users.find(x=>x.id===data.session.user.id)||null)}catch(e){setError(e.message||'โหลดข้อมูลไม่สำเร็จ')}}setLoading(false)});
  const {data:l}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);if(!s){setProfile(null);setData({users:[],avail:[],dayStatus:[],appointments:[],plans:[],topics:[],duties:[],attendance:[],cleaning:[],checkins:[],settings:[],planMembers:[],appointmentMembers:[],planSlots:[]})}});return()=>l.subscription.unsubscribe()},[]);
 if(loading)return <div className="auth"><div className="auth-card"><div className="brand">chownatui<span>.</span></div><p className="tag">กำลังเชื่อมต่อระบบ...</p></div></div>;
 if(!session||!profile)return <Auth mode={authMode} setMode={setAuthMode} error={error} setError={setError}/>;
 return <Dashboard me={profile} data={data} refresh={refresh} setProfile={setProfile} error={error} logout={async()=>{await supabase.auth.signOut();setSession(null)}}/>;
}

function Auth({mode,setMode,error,setError}){
 const [email,setEmail]=useState(''),[pw,setPw]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 async function submit(e){e.preventDefault();setError('');setMsg('');setBusy(true);try{
  if(mode==='login'){const r=await supabase.auth.signInWithPassword({email,password:pw});if(r.error)throw r.error}
  else {if(!name.trim())throw new Error('กรุณาใส่ชื่อที่จะแสดง');const r=await supabase.auth.signUp({email,password:pw,options:{data:{display_name:name.trim()}}});if(r.error)throw r.error;setMsg(r.data.session?'สมัครสำเร็จ กำลังเข้าสู่ระบบ...':'สมัครสำเร็จ กรุณาตรวจอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ')}
 }catch(e){setError(e.message||'เกิดข้อผิดพลาด')}finally{setBusy(false)}}
 async function resend(){setError('');setMsg('');if(!email)return setError('กรอกอีเมลก่อน');const r=await supabase.auth.resend({type:'signup',email});if(r.error)setError(r.error.message);else setMsg('ส่งอีเมลยืนยันอีกครั้งแล้ว กรุณาเช็ก Spam/Junk ด้วย')}
 return <div className="auth"><div className="auth-card"><div className="brand">chownatui<span>.</span></div><p className="tag">จัดการเวลาของทีมให้ง่ายกว่าเดิม</p>
  <div className="auth-tabs"><button className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>เข้าสู่ระบบ</button><button className={mode==='signup'?'active':''} onClick={()=>{setMode('signup');setError('')}}>สมัครสมาชิก</button></div>
  <form onSubmit={submit}>{mode==='signup'&&<label>ชื่อที่จะแสดง<input value={name} onChange={e=>setName(e.target.value)} placeholder="เช่น กอตอ" required/></label>}
  <label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
  <label>Password<input type="password" value={pw} onChange={e=>setPw(e.target.value)} minLength={6} required/></label>
  {(error||msg)&&<div className={error?'error':'notice'}>{error||msg}</div>}
  <button className="primary wide" disabled={busy}>{busy?'กำลังดำเนินการ...':mode==='login'?'เข้าสู่ระบบ':'สร้างบัญชี'}</button></form>
  {mode==='signup'&&<button className="link wide-link" onClick={resend}>ส่งอีเมลยืนยันอีกครั้ง</button>}
  <small>บัญชีใหม่จะเริ่มต้นเป็นสมาตุ้ย และผู้มีสิทธิ์สามารถกำหนดฝ่าย/ยศภายหลัง</small></div></div>
}

function Avatar({user,className=''}){return user?.avatar_url?<span className={`avatar avatar-frame ${className}`}><img className="avatar-img" style={{'--avatar-scale':user.avatar_scale||1,'--avatar-x':`${user.avatar_x||0}%`,'--avatar-y':`${user.avatar_y||0}%`}} src={user.avatar_url} alt=""/></span>:<div className={`avatar ${className}`}>{user?.display_name?.[0]||'U'}</div>}

function Dashboard({me,data,refresh,setProfile,logout}){
 const [page,setPage]=useState('home'),[date,setDate]=useState(todayISO()),[mobileOpen,setMobileOpen]=useState(false);
 const canDeputy=roleRank[me.role]>=1, canHead=me.role==='head';
 const nav=[
  ['home','หน้าหลัก',HomeIcon],['calendar','ปฏิทิน',CalendarRange],
  ['appointments','นัดหมาย',CalendarDays],['availability','ลงเวลา',Clock3],...(canDeputy?[['attendance','เช็คชื่อ',ClipboardCheck],['cleaning','เวรทำความสะอาด',ClipboardList]]:[]),['members','สมาตุ้ยทั้งหมด',Users],
  ...(canDeputy?[['manage','จัดการตุ้ย',Settings]]:[]),['settings','ตั้งค่า',Settings]
 ];
 const title=nav.find(x=>x[0]===page)?.[1]||'หน้าหลัก';
 const go=p=>{setPage(p);setMobileOpen(false)};
 return <div className="app"><aside><div className="brand side">chownatui<span>.</span></div>{nav.map(([id,t,I])=><button className={page===id?'nav active':'nav'} key={id} onClick={()=>go(id)}><I size={19}/>{t}</button>)}
  <div className="side-bottom"><div className="me"><Avatar user={me}/><div><b>{me.display_name}</b><small>{ROLE_LABEL[me.role]}{me.team?` · ${me.team}`:''}</small></div></div><button className="nav" onClick={logout}><LogOut size={18}/>ออกจากระบบ</button></div></aside>
  <main><header><div><button className="mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)}><Menu/></button><div className="mobile-brand">chownatui<span>.</span></div><h1>{title}</h1></div><div className="header-actions"><button className="icon-btn" onClick={refresh} title="รีเฟรช"><RefreshCw size={17}/></button><button className="icon-btn" onClick={()=>go('settings')}><Settings size={18}/></button></div></header>
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
 return <section><div className="hero"><div><span className="eyebrow">chownatui.</span><h2>สวัสดี {me.display_name} 👋</h2><p>ดูงาน แผนงาน นัดหมาย และเวลาของทีมได้จากที่เดียว</p></div><DatePicker date={date} setDate={setDate}/></div>
  <div className="card"><div className="card-title"><span>📌 นัดหมาย / งาน</span><button className="link" onClick={()=>go('appointments')}>ดูทั้งหมด</button></div>{upcoming.length?<div className="upcoming-list">{upcoming.map(x=>{const diff=Math.ceil((new Date(x.date)-new Date(date))/86400000);return <div className="upcoming-item" key={`${x.kind}-${x.id}`}><div><b>{x.title||x.name}</b><small>{x.kind} · {fmt(x.date)} · {x.start_time?.slice(0,5)||''}{diff>0?` · อีก ${diff} วัน`:diff===0?' · วันนี้':''}</small></div></div>})}</div>:<p className="muted">ยังไม่มีนัดหมายหรือแผนงานที่กำลังจะถึง</p>}</div>
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
 const events=d=>[...data.appointments.filter(x=>x.date===d),...data.plans.filter(x=>x.date===d)];
 return <section><div className="section-top"><div><h2>📅 ปฏิทิน</h2><p>แสดงเฉพาะงาน/นัดหมาย/แผนงานของวันนั้น</p></div><div className="calendar-month-nav"><button onClick={()=>setMonth(m=>{const d=new Date(m+'-01');d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7)})}><ChevronLeft/></button><b>{new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'}).format(new Date(month+'-01'))}</b><button onClick={()=>setMonth(m=>{const d=new Date(m+'-01');d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,7)})}><ChevronRight/></button></div></div>
 <div className="calendar-card"><div className="calendar-weekdays">{['จ','อ','พ','พฤ','ศ','ส','อา'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{cells.map((d,i)=><button key={i} className={`calendar-cell ${!d?'blank':''} ${d===selected?'selected':''}`} disabled={!d} onClick={()=>{setSelected(d);setDate(d)}}>{d&&<><span className="day-number">{+d.slice(8)}</span>{events(d).slice(0,3).map(x=><div className="calendar-event" key={x.id}>{x.title||x.name}</div>)}</>}</button>)}</div></div>
 <div className="card"><div className="section-top"><div><h3>{fmt(selected)}</h3><p>รายการของวันนี้</p></div></div>{events(selected).length?events(selected).map(x=><div className="event-row" key={x.id}><b>{x.title||x.name}</b><span>{x.start_time?.slice(0,5)}{x.end_time?`–${x.end_time.slice(0,5)}`:''}</span><small>{x.notes||x.description||''}</small></div>):<div className="empty">วันนี้ไม่มีงาน</div>}</div>
 </section>
}

function Appointments({me,data,date,setDate,refresh}){
 const canEdit=roleRank[me.role]>=1;const [open,setOpen]=useState(false),[edit,setEdit]=useState(null);
 const appts=data.appointments.filter(x=>x.date===date),plans=data.plans.filter(x=>x.date===date);
 return <section><div className="section-top"><div><h2>📌 นัดหมาย</h2><p>นัดหมายจะเชื่อมกับปฏิทินและแสดงให้ผู้เข้าร่วมเห็น</p></div>{canEdit&&<button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus/>เพิ่มนัดหมาย</button>}</div><DatePicker date={date} setDate={setDate}/>
  <div className="job-list">{appts.map(x=><div className="card event-row" key={x.id}><div><b>{x.title}</b><small>{x.type} · {x.start_time?.slice(0,5)}–{x.end_time?.slice(0,5)}{x.location?` · ${x.location}`:''}</small><p>{x.notes||''}</p><div className="people">{(data.appointmentMembers||[]).filter(m=>m.appointment_id===x.id).map(m=>{const u=data.users.find(u=>u.id===m.user_id);return u?<span key={m.user_id}>{u.display_name}</span>:null})}</div></div>{canEdit&&<div className="actions"><button onClick={()=>{setEdit(x);setOpen(true)}}><Edit3 size={15}/></button><button onClick={async()=>{if(confirm('ลบนัดหมายนี้?')){await supabase.from('appointment_members').delete().eq('appointment_id',x.id);await supabase.from('appointments').delete().eq('id',x.id);refresh()}}}><Trash2 size={15}/></button></div>}</div>)}{!appts.length&&<div className="empty">วันนี้ไม่มีนัดหมาย</div>}
  <div className="section-divider"><b>แผนงานวันนี้</b></div>{plans.map(p=><div className="card event-row" key={p.id}><div><b>{p.title}</b><small>{p.type}{p.team?` · ${p.team}`:''}{p.start_time?` · ${p.start_time.slice(0,5)}–${p.end_time?.slice(0,5)}`:''}</small><p>{p.notes||''}</p></div></div>)}{!plans.length&&<div className="empty">วันนี้ไม่มีแผนงาน</div>}</div>
  {open&&<AppointmentModal me={me} data={data} item={edit} date={date} close={()=>setOpen(false)} refresh={refresh}/>}
 </section>
}

function AppointmentModal({me,data,item,date,close,refresh}){
 const [type,setType]=useState(item?.type||APPOINTMENT_TYPES[0]),[title,setTitle]=useState(item?.title||''),[day,setDay]=useState(item?.date||date),[start,setStart]=useState(item?.start_time?.slice(0,5)||'13:00'),[end,setEnd]=useState(item?.end_time?.slice(0,5)||'16:00'),[loc,setLoc]=useState(item?.location||''),[notes,setNotes]=useState(item?.notes||''),[members,setMembers]=useState([]),[err,setErr]=useState('');
 useEffect(()=>{setMembers((data.appointmentMembers||[]).filter(x=>x.appointment_id===item?.id).map(x=>x.user_id))},[item,data.appointmentMembers]);
 async function save(){if(!title.trim())return setErr('กรุณาใส่ชื่อ');if(timeToMin(start)>=timeToMin(end))return setErr('เวลาไม่ถูกต้อง');
  const payload={type,title:title.trim(),date:day,start_time:start,end_time:end,location:loc||null,notes:notes||null};
  const r=item?await supabase.from('appointments').update(payload).eq('id',item.id).select('id').single():await supabase.from('appointments').insert({...payload,created_by:me.id}).select('id').single();if(r.error)return setErr(r.error.message);const id=item?.id||r.data.id;
  const old=await supabase.from('appointment_members').delete().eq('appointment_id',id);if(old.error)return setErr(old.error.message);if(members.length){const q=await supabase.from('appointment_members').insert(members.map(user_id=>({appointment_id:id,user_id})));if(q.error)return setErr(q.error.message)}await refresh();close()}
 return <Modal title={item?'แก้ไขนัดหมาย':'เพิ่มนัดหมาย'} close={close}>
  <label>ประเภท<select value={type} onChange={e=>setType(e.target.value)}>{APPOINTMENT_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
  <label>ชื่อ/รายละเอียด<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="เช่น ซ้อมเชียร์น้อง ม.2"/></label>
  <label>วันที่<input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label>
  <div className="form-row"><label>เริ่ม<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>สิ้นสุด<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
  <label>สถานที่<input value={loc} onChange={e=>setLoc(e.target.value)}/></label>
  <label>ผู้เข้าร่วม<div className="checklist member-checks">{data.users.map(u=><label className="check" key={u.id}><input type="checkbox" checked={members.includes(u.id)} onChange={()=>setMembers(v=>v.includes(u.id)?v.filter(x=>x!==u.id):[...v,u.id])}/>{u.display_name}{u.team?` · ${u.team}`:''}</label>)}</div></label>
  <label>หมายเหตุ<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="รายละเอียดเพิ่มเติม"/></label>{err&&<div className="error">{err}</div>}<button className="primary wide" onClick={save}><Save/>บันทึก</button>
 </Modal>
}

function PlanManager({me,data,refresh}){
 const can=roleRank[me.role]>=1;const [open,setOpen]=useState(false),[edit,setEdit]=useState(null);const plans=[...data.plans].sort((a,b)=>a.date.localeCompare(b.date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));
 return <div><div className="section-top"><div><h3>แผนงานระยะยาว</h3><p>เรียงตามประเภท ชื่องาน ฝ่าย วันที่ เวลา หัวข้อ และหมายเหตุ</p></div>{can&&<button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus/>เพิ่มแผนงาน</button>}</div><div className="job-list">{plans.map(p=><div className="card plan-card" key={p.id}><div><span className="eyebrow">{p.type}</span><h3>{p.title}</h3><small>{p.team||'ทุกฝ่าย'} · {fmt(p.date)}{p.start_time?` · ${p.start_time.slice(0,5)}–${p.end_time?.slice(0,5)}`:''}</small>{data.topics.filter(t=>t.plan_id===p.id).map(t=><div className="plan-topic" key={t.id}>• {t.title}</div>)}<p>{p.notes||''}</p>{p.type==='ซ้อมเชียร์'&&<div className="people">{data.duties.filter(d=>d.plan_id===p.id).map(d=><span key={d.id}>{d.duty_name}: {d.user_ids?.map(id=>data.users.find(u=>u.id===id)?.display_name).filter(Boolean).join(', ')}</span>)}</div>}</div>{can&&<div className="actions"><button onClick={()=>{setEdit(p);setOpen(true)}}><Edit3 size={15}/></button></div>}</div>)}{!plans.length&&<div className="empty">ยังไม่มีแผนงาน</div>}</div>{open&&<PlanModal me={me} data={data} item={edit} close={()=>setOpen(false)} refresh={refresh}/>}</div>
}

function PlanModal({me,data,item,close,refresh}){
 const [type,setType]=useState(item?.type||PLAN_TYPES[0]),[title,setTitle]=useState(item?.title||''),[team,setTeam]=useState(item?.team||''),[date,setDate]=useState(item?.date||todayISO()),[hasTime,setHasTime]=useState(!!item?.start_time),[start,setStart]=useState(item?.start_time?.slice(0,5)||'13:00'),[end,setEnd]=useState(item?.end_time?.slice(0,5)||'16:00'),[notes,setNotes]=useState(item?.notes||''),[topics,setTopics]=useState([]),[duties,setDuties]=useState([]),[slots,setSlots]=useState([]),[err,setErr]=useState('');
 useEffect(()=>{if(item){setTopics(data.topics.filter(x=>x.plan_id===item.id).map(x=>x.title));setDuties(data.duties.filter(x=>x.plan_id===item.id).map(x=>({duty_name:x.duty_name,user_ids:x.user_ids||[]})));setSlots(data.planSlots?.filter(x=>x.plan_id===item.id).map(x=>({title:x.title,start_time:x.start_time,end_time:x.end_time,notes:x.notes||''}))||[])}else{setTopics([]);setDuties(type==='ซ้อมเชียร์'?[{duty_name:'ประสานงาน',user_ids:[]}]:[]);setSlots([])}},[item,data.topics,data.duties,data.planSlots,type]);
 async function save(){setErr('');if(!title.trim())return setErr('กรุณาใส่ชื่อแผนงาน');if(hasTime&&timeToMin(start)>=timeToMin(end))return setErr('เวลาไม่ถูกต้อง');const payload={type,title:title.trim(),team:team||null,date,start_time:hasTime?start:null,end_time:hasTime?end:null,notes:notes||null,created_by:me.id};try{const r=item?await supabase.from('plans').update(payload).eq('id',item.id).select('id').single():await supabase.from('plans').insert(payload).select('id').single();if(r.error)throw r.error;const id=item?.id||r.data.id;
  await supabase.from('plan_topics').delete().eq('plan_id',id);if(topics.filter(Boolean).length){const q=await supabase.from('plan_topics').insert(topics.filter(Boolean).map((t,i)=>({plan_id:id,title:t,sort_order:i})));if(q.error)throw q.error}
  await supabase.from('plan_duties').delete().eq('plan_id',id);if(type==='ซ้อมเชียร์'){const q=await supabase.from('plan_duties').insert(duties.filter(x=>x.duty_name).map(x=>({plan_id:id,duty_name:x.duty_name,user_ids:x.user_ids})));if(q.error)throw q.error}
  await supabase.from('plan_slots').delete().eq('plan_id',id);if(slots.length){const q=await supabase.from('plan_slots').insert(slots.filter(x=>x.title&&x.start_time&&x.end_time).map(x=>({plan_id:id,...x})));if(q.error)throw q.error}await refresh();close()}catch(e){setErr(e.message||'บันทึกแผนงานไม่สำเร็จ')}}
 return <Modal title={item?'แก้ไขแผนงาน':'เพิ่มแผนงาน'} close={close}>
  <label>ประเภท<select value={type} onChange={e=>{setType(e.target.value);if(e.target.value==='ซ้อมเชียร์'&&!duties.length)setDuties([{duty_name:'ประสานงาน',user_ids:[]}])}}>{PLAN_TYPES.map(x=><option key={x}>{x}</option>)}</select></label>
  <label>ชื่องาน<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="เช่น เตรียมงานเชียร์"/></label>
  <label>ฝ่าย<select value={team} onChange={e=>setTeam(e.target.value)}><option value="">ทุกฝ่าย</option>{TEAMS.map(x=><option key={x}>{x}</option>)}</select></label>
  <label>วันที่<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
  <div className="time-choice"><label className="switch-line"><input type="checkbox" checked={hasTime} onChange={e=>setHasTime(e.target.checked)}/>กำหนดเวลา</label>{hasTime&&<div className="form-row"><label>เวลาเริ่ม<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>จบ<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>}</div>
  <h4>หัวข้อ</h4>{topics.map((x,i)=><div className="inline-input" key={i}><input value={x} onChange={e=>setTopics(t=>t.map((v,j)=>j===i?e.target.value:v))} placeholder="หัวข้อที่ต้องทำ"/><button onClick={()=>setTopics(t=>t.filter((_,j)=>j!==i))}><X/></button></div>)}<button className="secondary" onClick={()=>setTopics(t=>[...t,''])}><Plus/>สร้างหัวข้อ</button>
  {type==='ซ้อมเชียร์'&&<><h4>หน้าที่คน</h4>{duties.map((d,i)=><div className="duty-editor" key={i}><select value={d.duty_name} onChange={e=>setDuties(ds=>ds.map((x,j)=>j===i?{...x,duty_name:e.target.value}:x))}>{DUTIES.map(x=><option key={x}>{x}</option>)}</select><select multiple value={d.user_ids} onChange={e=>setDuties(ds=>ds.map((x,j)=>j===i?{...x,user_ids:[...e.target.selectedOptions].map(o=>o.value)}:x))}>{data.users.map(u=><option key={u.id} value={u.id}>{u.display_name}</option>)}</select><button onClick={()=>setDuties(ds=>ds.filter((_,j)=>j!==i))}><X/></button></div>)}<button className="secondary" onClick={()=>setDuties(ds=>[...ds,{duty_name:'อื่นๆ',user_ids:[]}])}><Plus/>เพิ่มหน้าที่</button><h4>ช่วงเวลาในการทำอะไร</h4>{slots.map((x,i)=><div className="slot-editor" key={i}><input value={x.title} placeholder="ทำอะไร" onChange={e=>setSlots(v=>v.map((z,j)=>j===i?{...z,title:e.target.value}:z))}/><input type="time" value={x.start_time} onChange={e=>setSlots(v=>v.map((z,j)=>j===i?{...z,start_time:e.target.value}:z))}/><input type="time" value={x.end_time} onChange={e=>setSlots(v=>v.map((z,j)=>j===i?{...z,end_time:e.target.value}:z))}/><input value={x.notes} placeholder="หมายเหตุ" onChange={e=>setSlots(v=>v.map((z,j)=>j===i?{...z,notes:e.target.value}:z))}/><button onClick={()=>setSlots(v=>v.filter((_,j)=>j!==i))}><X/></button></div>)}<button className="secondary" onClick={()=>setSlots(v=>[...v,{title:'',start_time:start,end_time:end,notes:''}])}><Plus/>เพิ่มช่วงเวลา</button></>}
  <label>หมายเหตุ<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="เตรียมอุปกรณ์ / สิ่งที่ต้องทำ / หมายเหตุ"/></label>{err&&<div className="error">{err}</div>}<button className="primary wide" onClick={save}><Save/>บันทึก</button>
 </Modal>
}

function Members({me,data}){
 const [q,setQ]=useState('');const users=data.users.filter(u=>u.display_name.toLowerCase().includes(q.toLowerCase()));
 return <section><div className="section-top"><div><h2>👥 สมาตุ้ยทั้งหมด</h2><p>ข้อมูลแต่ละคนพร้อมงานและเวลาว่างของวันที่เลือก</p></div><div className="search"><Search size={17}/><input placeholder="ค้นหา" value={q} onChange={e=>setQ(e.target.value)}/></div></div><div className="member-grid">{users.map(u=><MemberCard key={u.id} user={u} data={data}/>)}</div></section>
}
function MemberCard({user,data}){
 const [date,setDate]=useState(todayISO());const av=data.avail.filter(a=>a.user_id===user.id&&a.date===date);const st=data.dayStatus.find(x=>x.user_id===user.id&&x.date===date)?.status;const appts=(data.appointmentMembers||[]).filter(m=>m.user_id===user.id).map(m=>data.appointments.find(a=>a.id===m.appointment_id)).filter(a=>a?.date===date);const plans=data.plans.filter(p=>p.date===date);
 return <div className="member-card"><div className="member-head"><Avatar user={user} className="big"/><div><h3>{user.display_name}</h3><small>{ROLE_LABEL[user.role]} · {user.team||'ยังไม่เลือกฝ่าย'}</small></div></div><p className="bio">{user.bio||'ยังไม่มีคำแนะนำตัว'}</p><div className="member-label">งาน</div>{appts.length?appts.map(a=><div className="member-job" key={a.id}>{a.title}<small>{a.start_time.slice(0,5)}–{a.end_time.slice(0,5)}</small></div>):<span className="muted">ไม่มีงานในวันที่เลือก</span>}<div className="member-label member-date-row"><span>เวลาว่าง</span><DatePicker compact date={date} setDate={setDate}/></div><div className={`status ${st==='available'?'green':st==='unavailable'?'red':'gray'}`}>{st==='available'?'🟢 ว่าง':st==='unavailable'?'🔴 ไม่ว่าง':'⚪ ยังไม่ลงเวลา'}</div>{av.map(a=><div className="line" key={a.id}><span>{a.start_time.slice(0,5)}–{a.end_time.slice(0,5)}</span></div>)}{plans.length>0&&<div className="member-plan-list">{plans.slice(0,3).map(p=><div key={p.id}>{p.title}</div>)}</div>}</div>
}

function Manage({me,data,refresh,defaultTab}){
 const tabs=[['plans','แผนงานระยะยาว'],['appointments','นัดหมาย'],['people','จัดการสมาชิก'],['roles','ยศและสิทธิ์']];
 const [tab,setTab]=useState(defaultTab);return <section><div className="section-top"><div><h2>⚙️ จัดการตุ้ย</h2><p>{me.role==='head'?'จัดการได้ทุกอย่างรวมถึงยศ': 'เพิ่มงาน แผนงาน และจัดการข้อมูลที่ได้รับอนุญาต'}</p></div></div><div className="seg-tabs manage-tabs">{tabs.map(([id,t])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{t}</button>)}</div>
 {tab==='plans'&&<PlanManager me={me} data={data} refresh={refresh}/>}
 {tab==='appointments'&&<AppointmentsManager me={me} data={data} refresh={refresh}/>}
 {tab==='people'&&<PeopleManager me={me} data={data} refresh={refresh}/>}
 {tab==='roles'&&me.role==='head'&&<RoleManager data={data} refresh={refresh}/>}
 {tab==='roles'&&me.role!=='head'&&<div className="empty">เฉพาะหัวหน้าตุ้ยเท่านั้นที่กำหนดยศได้</div>}
 </section>
}

function AppointmentsManager({me,data,refresh}){const [date,setDate]=useState(todayISO()),[open,setOpen]=useState(false),[edit,setEdit]=useState(null);return <div><div className="section-top"><div><h3>นัดหมาย</h3><p>เพิ่ม แก้ไข และลบรายการนัดหมาย</p></div><button className="primary" onClick={()=>{setEdit(null);setOpen(true)}}><Plus/>เพิ่มนัดหมาย</button></div><DatePicker date={date} setDate={setDate}/>{data.appointments.filter(x=>x.date===date).map(x=><div className="card event-row" key={x.id}><div><b>{x.title}</b><small>{x.type} · {x.start_time.slice(0,5)}–{x.end_time.slice(0,5)}</small><p>{x.notes||''}</p></div><div className="actions"><button onClick={()=>{setEdit(x);setOpen(true)}}><Edit3/></button><button onClick={async()=>{if(confirm('ลบนัดหมายนี้?')){await supabase.from('appointments').delete().eq('id',x.id);refresh()}}}><Trash2/></button></div></div>)}{open&&<AppointmentModal me={me} data={data} item={edit} date={date} close={()=>setOpen(false)} refresh={refresh}/>}</div>}

function AttendanceManager({me,data,refresh}){
 const [date,setDate]=useState(todayISO()),[type,setType]=useState('rehearsal'),[rows,setRows]=useState({}),[note,setNote]=useState({});
 const members=data.checkins;
 useEffect(()=>{const obj={};const notes={};data.attendance.filter(x=>x.date===date&&x.type===type).forEach(x=>{obj[x.member_id]=x.status;notes[x.member_id]=x.note||''});setRows(obj);setNote(notes)},[date,type,data.attendance]);
 async function save(){const payload=members.map(m=>({member_id:m.id,date,type,status:rows[m.id]||ATT_TYPES[type][0],note:note[m.id]||null,checked_by:me.id}));const r=await supabase.from('attendance').upsert(payload,{onConflict:'member_id,date,type'});if(r.error)alert(r.error.message);else refresh()}
 return <div><div className="section-top"><div><h3>เช็คชื่อ</h3><p>เลื่อนรายการลง เช็กสถานะทางขวา แล้วกดบันทึก</p></div><button className="primary" onClick={save}><Save/>บันทึกข้อมูล</button></div><div className="checkin-controls"><label>วันที่<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label><label>ประเภท<select value={type} onChange={e=>setType(e.target.value)}><option value="rehearsal">เช็คชื่อซ้อมน้อง</option><option value="evening">เช็คชื่ออยู่เย็น</option><option value="sleep">เช็คชื่อนอนโรงเรียน</option></select></label></div>
 <div className="attendance-table"><div className="att-head"><span>ลำดับ</span><span>รูป</span><span>ชื่อ-สกุล</span><span>ชั้น</span><span>ชื่อเล่น</span><span>ฝ่าย</span><span>สถานะ</span><span>หมายเหตุ</span></div>{members.map(m=><div className="att-row" key={m.id}><span>{m.sort_no}</span><Avatar user={m} /><div>{m.full_name}</div><span>{m.class_name}</span><span>{m.nickname}</span><span>{m.team}</span><select value={rows[m.id]||ATT_TYPES[type][0]} onChange={e=>setRows(r=>({...r,[m.id]:e.target.value}))}>{ATT_TYPES[type].map(x=><option key={x}>{x}</option>)}</select><input value={note[m.id]||''} onChange={e=>setNote(n=>({...n,[m.id]:e.target.value}))} placeholder="หมายเหตุ (ถ้ามี)"/></div>)}</div><AttendanceStats data={data} members={members}/></div>
}

function AttendanceStats({data,members}){const [date,setDate]=useState(todayISO()),[type,setType]=useState('rehearsal');const rows=data.attendance.filter(x=>x.date===date&&x.type===type);return <div className="card"><div className="section-top"><div><h3>สถิติย้อนหลัง</h3><p>สรุปผลเช็คชื่อของวันที่เลือก</p></div><div className="checkin-toolbar"><DatePicker compact date={date} setDate={setDate}/><label className="compact-field"><select value={type} onChange={e=>setType(e.target.value)}><option value="rehearsal">ซ้อมน้อง</option><option value="evening">อยู่เย็น</option><option value="sleep">นอนโรงเรียน</option></select></label></div></div><div className="chips">{ATT_TYPES[type].map(s=><span className="chip" key={s}>{s}: {rows.filter(x=>x.status===s).length}</span>)}</div></div>}

function CleaningManager({me,data,refresh}){
 const [date,setDate]=useState(todayISO()),[people,setPeople]=useState([]),[rooms,setRooms]=useState([]);const existing=data.cleaning.filter(x=>x.date===date);
 useEffect(()=>{setPeople(existing.flatMap(x=>x.user_ids||[]));setRooms([...new Set(existing.flatMap(x=>x.rooms||[]))])},[date,data.cleaning]);
 async function save(){await supabase.from('cleaning_duties').delete().eq('date',date);const r=await supabase.from('cleaning_duties').insert({date,user_ids:people.slice(0,8),rooms});if(r.error)alert(r.error.message);else refresh()}
 function randomize(){const shuffled=[...data.users].sort(()=>Math.random()-.5).slice(0,8);setPeople(shuffled.map(x=>x.id))}
 const togglePerson=id=>setPeople(cur=>cur.includes(id)?cur.filter(x=>x!==id):(cur.length>=8?cur:[...cur,id]));
 const toggleRoom=room=>setRooms(cur=>cur.includes(room)?cur.filter(x=>x!==room):[...cur,room]);
 return <section><div className="section-top"><div><h2>🧹 เวรทำความสะอาด</h2><p>เลือกคนได้หลายคน สูงสุด 8 คน และเลือกห้องได้หลายห้อง</p></div><button className="primary" onClick={save}><Save/>บันทึกเวร</button></div><DatePicker date={date} setDate={setDate}/><div className="cleaning-picker-grid"><div className="cleaning-picker"><div className="picker-heading"><b>คนทำเวร</b><span>{people.length}/8 คน</span></div><div className="choice-buttons">{data.users.map(u=><button type="button" key={u.id} className={people.includes(u.id)?'choice-chip active':'choice-chip'} onClick={()=>togglePerson(u.id)}>{u.display_name}</button>)}</div></div><div className="cleaning-picker"><div className="picker-heading"><b>ห้อง</b><span>{rooms.length} ห้อง</span></div><div className="choice-buttons">{CLEAN_ROOMS.map(room=><button type="button" key={room} className={rooms.includes(room)?'choice-chip active':'choice-chip'} onClick={()=>toggleRoom(room)}>{room}</button>)}</div></div></div><div className="button-row"><button className="secondary" onClick={randomize}><Shuffle/>สุ่ม 8 คน</button></div><div className="card cleaning-preview"><div className="card-title"><span>เวรวันที่ {fmt(date)}</span><span className="muted">{people.length}/8 คน · {rooms.length} ห้อง</span></div><div className="people">{people.map(id=><span key={id}>{data.users.find(u=>u.id===id)?.display_name}</span>)}</div><p className="muted">{rooms.length?'ห้อง: '+rooms.join(' · '):'ยังไม่ได้เลือกห้อง'}</p></div></section>
}

function PeopleManager({me,data,refresh}){
 const [editing,setEditing]=useState(null),[form,setForm]=useState(null),[file,setFile]=useState(null);function open(u){setEditing(u);setFile(null);setForm({...u})}
 async function save(){let avatar=form.avatar_url||null;if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`member-${form.id}-${Date.now()}.${ext}`;const up=await supabase.storage.from('checkin-avatars').upload(path,file,{upsert:true,contentType:file.type});if(up.error)return alert(up.error.message);avatar=supabase.storage.from('checkin-avatars').getPublicUrl(path).data.publicUrl}const r=await supabase.from('checkin_members').update({full_name:form.full_name,class_name:form.class_name,nickname:form.nickname,team:form.team,linked_user_id:form.linked_user_id||null,avatar_url:avatar}).eq('id',form.id);if(r.error)alert(r.error.message);else{setEditing(null);refresh()}}
 return <div><div className="section-top"><div><h3>ข้อมูลคนเช็คชื่อ</h3><p>หัวหน้าตุ้ย/รองหัวตุ้ยแก้รูป ข้อมูล และเชื่อมบัญชีได้</p></div></div><div className="attendance-table people-admin">{data.checkins.map(m=><div className="att-row" key={m.id}><span>{m.sort_no}</span><Avatar user={m}/><div>{m.full_name}</div><span>{m.class_name}</span><span>{m.nickname}</span><span>{m.team}</span><span>{data.users.find(u=>u.id===m.linked_user_id)?.display_name||'ยังไม่เชื่อม'}</span><button onClick={()=>open(m)}><Edit3/></button></div>)}</div>{editing&&<Modal title="แก้ไขข้อมูลสมาชิกเช็คชื่อ" close={()=>setEditing(null)}><label>ชื่อ-สกุล<input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label><label>ชั้น<input value={form.class_name} onChange={e=>setForm({...form,class_name:e.target.value})}/></label><label>ชื่อเล่น<input value={form.nickname} onChange={e=>setForm({...form,nickname:e.target.value})}/></label><label>ฝ่าย<select value={form.team} onChange={e=>setForm({...form,team:e.target.value})}>{TEAMS.map(x=><option key={x}>{x}</option>)}</select></label><label>รูปภาพ<input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><label>หรือ URL รูปภาพ<input value={form.avatar_url||''} onChange={e=>setForm({...form,avatar_url:e.target.value})} placeholder="https://..."/></label><label>เชื่อมกับบัญชีในเว็บ<select value={form.linked_user_id||''} onChange={e=>setForm({...form,linked_user_id:e.target.value||null})}><option value="">ยังไม่เชื่อม</option>{data.users.map(u=><option key={u.id} value={u.id}>{u.display_name} · {u.email}</option>)}</select></label><button className="primary wide" onClick={save}><Save/>บันทึก</button></Modal>}</div>
}

function RoleManager({data,refresh}){const [busy,setBusy]=useState('');async function setRole(u,role){setBusy(u.id);const r=await supabase.from('profiles').update({role}).eq('id',u.id);if(r.error)alert(r.error.message);else refresh();setBusy('')}return <div><div className="card"><h3>ยศและสิทธิ์</h3><p className="muted">หัวหน้าตุ้ยกำหนดยศได้ · รองหัวตุ้ยจัดการงาน/แผนงาน/เช็คชื่อ/เวร · สมาตุ้ยดูและลงเวลา</p></div>{data.users.map(u=><div className="admin-user" key={u.id}><div className="member-head"><Avatar user={u}/><div><b>{u.display_name}</b><small>{u.email}</small></div></div><select className="role-select" disabled={busy===u.id} value={u.role} onChange={e=>setRole(u,e.target.value)}><option value="member">สมาตุ้ย</option><option value="deputy">รองหัวตุ้ย</option><option value="head">หัวหน้าตุ้ย</option></select></div>)}</div>}

function AvatarCropModal({src,scale,x,y,setScale,setX,setY,onCancel,onConfirm}){
 return <div className="modal-bg crop-modal-bg"><div className="modal crop-modal"><div className="modal-head"><h2>ปรับรูปโปรไฟล์</h2><button onClick={onCancel}><X/></button></div><p className="muted crop-help">ขยับรูปให้พอดีกรอบ แล้วกดใช้รูปนี้</p><div className="crop-stage"><img src={src} alt="ตัวอย่างรูป" style={{transform:`translate(${x}%, ${y}%) scale(${scale})`}}/></div><div className="crop-controls"><div className="crop-direction"><button className="secondary" type="button" onClick={()=>setY(v=>Math.max(-50,v-5))}>↑<span>ขึ้น</span></button><div><button className="secondary" type="button" onClick={()=>setX(v=>Math.max(-50,v-5))}>←<span>ซ้าย</span></button><button className="secondary" type="button" onClick={()=>{setX(0);setY(0)}}><Move/><span>กลาง</span></button><button className="secondary" type="button" onClick={()=>setX(v=>Math.min(50,v+5))}>→<span>ขวา</span></button></div><button className="secondary" type="button" onClick={()=>setY(v=>Math.min(50,v+5))}>↓<span>ลง</span></button></div><div className="crop-zoom"><button className="secondary" type="button" onClick={()=>setScale(v=>Math.max(1,Number((v-.1).toFixed(2))))}><ZoomOut/><span>ซูมออก</span></button><b>{Math.round(scale*100)}%</b><button className="secondary" type="button" onClick={()=>setScale(v=>Math.min(2.5,Number((v+.1).toFixed(2))))}><ZoomIn/><span>ซูมเข้า</span></button></div></div><div className="crop-actions"><button className="secondary" onClick={onCancel}>ยกเลิก</button><button className="primary" onClick={onConfirm}><Check/>ใช้รูปนี้</button></div></div></div>
}

function SettingsPage({me,data,refresh,setProfile}){
 const [name,setName]=useState(me.display_name||''),[bio,setBio]=useState(me.bio||''),[team,setTeam]=useState(me.team||''),[file,setFile]=useState(null),[preview,setPreview]=useState(me.avatar_url||''),[cropOpen,setCropOpen]=useState(false),[cropScale,setCropScale]=useState(me.avatar_scale||1),[cropX,setCropX]=useState(me.avatar_x||0),[cropY,setCropY]=useState(me.avatar_y||0),[msg,setMsg]=useState(''),[err,setErr]=useState('');
 function pickFile(f){if(!f)return;setFile(f);const url=URL.createObjectURL(f);setPreview(url);setCropScale(1);setCropX(0);setCropY(0);setCropOpen(true)}
 function cancelCrop(){setCropOpen(false);setFile(null);setPreview(me.avatar_url||'');setCropScale(me.avatar_scale||1);setCropX(me.avatar_x||0);setCropY(me.avatar_y||0)}
 function confirmCrop(){setCropOpen(false)}
 async function save(){setErr('');setMsg('');try{let avatar=me.avatar_url;if(file){const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${me.id}/avatar-${Date.now()}.${ext}`;const u=await supabase.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type});if(u.error)throw u.error;avatar=supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}const r=await supabase.from('profiles').update({display_name:name.trim(),bio:bio.trim()||null,team:team||null,avatar_url:avatar||null,avatar_scale:cropScale,avatar_x:cropX,avatar_y:cropY}).eq('id',me.id).select().single();if(r.error)throw r.error;setProfile(r.data);await refresh();setFile(null);setMsg('บันทึกเรียบร้อย')}catch(e){setErr(e.message)}}
 return <section><div className="section-top"><div><h2>⚙️ ตั้งค่า</h2><p>แก้ข้อมูลส่วนตัว ฝ่าย และแนะนำตัว</p></div></div><div className="card settings-form-card"><div className="settings-avatar-row"><Avatar user={{...me,avatar_url:preview,avatar_scale:file?cropScale:me.avatar_scale,avatar_x:file?cropX:me.avatar_x,avatar_y:file?cropY:me.avatar_y}} className="profile-avatar"/><div className="settings-avatar-actions"><label className="upload-btn">เปลี่ยนรูป<input type="file" accept="image/*" onChange={e=>pickFile(e.target.files?.[0])}/></label><small className="muted">เลือกรูปแล้วจะมีหน้าปรับตำแหน่งและซูม</small></div></div><div className="settings-fields"><label>ชื่อที่แสดง<input value={name} onChange={e=>setName(e.target.value)} placeholder="กรอกชื่อที่ต้องการให้แสดง"/></label><label>ฝ่าย<select value={team} onChange={e=>setTeam(e.target.value)}><option value="">ยังไม่เลือก</option>{TEAMS.map(x=><option key={x}>{x}</option>)}</select></label><label>แนะนำตัว<textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="เขียนแนะนำตัวสั้นๆ"/></label><div className="settings-role"><span>ยศ</span><b>{ROLE_LABEL[me.role]}</b></div>{err&&<div className="error">{err}</div>}{msg&&<div className="notice">{msg}</div>}<button className="primary settings-save" onClick={save}><Save/>บันทึกการตั้งค่า</button></div></div>{cropOpen&&<AvatarCropModal src={preview} scale={cropScale} x={cropX} y={cropY} setScale={setCropScale} setX={setCropX} setY={setCropY} onCancel={cancelCrop} onConfirm={confirmCrop}/>}</section>}

function Modal({title,close,children}){return <div className="modal-bg" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal"><div className="modal-head"><h2>{title}</h2><button onClick={close}><X/></button></div>{children}</div></div>}

createRoot(document.getElementById('root')).render(<App/>);
