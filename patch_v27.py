from pathlib import Path
p=Path('/tmp/chv26/src/main.jsx')
s=p.read_text()
# constants/version
s=s.replace("const POSITION_ROLES=['ประธานเชียร์','รองประธานเชียร์','ประธานฝ่ายโค้ด','รองประธานฝ่ายโค้ด','ประธานฝ่ายเทคนิค','รองประธานฝ่ายเทคนิค','ประธานฝ่ายอุปกรณ์','รองประธานฝ่ายอุปกรณ์','ประธานฝ่ายโลจิสติกส์','รองประธานฝ่ายโลจิสติกส์','ประธานฝ่ายลีดเดอร์','รองประธานลีดเดอร์','ศิษย์เก่า'];\n", "const DEPARTMENT_POSITIONS=['ประธานเชียร์','รองประธานเชียร์','ประธานฝ่ายโค้ด','รองประธานฝ่ายโค้ด','ประธานฝ่ายเทคนิค','รองประธานฝ่ายเทคนิค','ประธานฝ่ายอุปกรณ์','รองประธานฝ่ายอุปกรณ์','ประธานฝ่ายโลจิสติกส์','รองประธานฝ่ายโลจิสติกส์','รองประธานลีดเดอร์','ประธานฝ่ายลีดเดอร์','ศิษย์เก่า'];\nconst POSITION_TEAM={\n 'ประธานฝ่ายโค้ด':'โค้ด','รองประธานฝ่ายโค้ด':'โค้ด',\n 'ประธานฝ่ายเทคนิค':'เทคนิค','รองประธานฝ่ายเทคนิค':'เทคนิค',\n 'ประธานฝ่ายอุปกรณ์':'อุปกรณ์','รองประธานฝ่ายอุปกรณ์':'อุปกรณ์',\n 'ประธานฝ่ายโลจิสติกส์':'โลจิสติกส์','รองประธานฝ่ายโลจิสติกส์':'โลจิสติกส์',\n 'ประธานฝ่ายลีดเดอร์':'ลีดเดอร์','รองประธานลีดเดอร์':'ลีดเดอร์'\n};\nconst SPECIAL_POSITIONS=new Set(['ประธานเชียร์','รองประธานเชียร์']);\n")
s=s.replace("select('id,email,display_name,role,custom_role_id,team,avatar_url", "select('id,email,display_name,role,custom_role_id,department_position,team,avatar_url")
s=s.replace('<div className="brand side">CHOWNATUI <small className="app-version">v.2.6</small></div>', '<div className="brand side">CHOWNATUI <small className="app-version">v.2.7</small></div>')
# dashboard user label: position first if exists
s=s.replace("<small>{roleLabel(me,data)}{me.team?` · ${me.team}`:''}</small>", "<small>{me.department_position||roleLabel(me,data)}{me.team?` · ${me.team}`:''}</small>")
# CalendarPage replace whole function
start=s.index('function CalendarPage(')
end=s.index('\nfunction Appointments(', start)
new_calendar=r'''function CalendarPage({me,data,date,setDate}){
 const [month,setMonth]=useState(date.slice(0,7));const [selected,setSelected]=useState(date);
 const cells=useMemo(()=>{const [y,m]=month.split('-').map(Number),first=new Date(y,m-1,1),last=new Date(y,m,0).getDate(),off=(first.getDay()+6)%7,a=Array(off).fill(null);for(let i=1;i<=last;i++)a.push(`${month}-${String(i).padStart(2,'0')}`);while(a.length%7)a.push(null);return a},[month]);
 const events=d=>[
  ...data.appointments.filter(x=>inDateRange(x,d)).map(x=>({...x,kind:'appointment'})),
  ...data.plans.filter(x=>inDateRange(x,d)).map(x=>({...x,kind:'plan'}))
 ];
 const peopleFor=x=>{const ids=x.kind==='appointment'?(data.appointmentMembers||[]).filter(m=>m.appointment_id===x.id).map(m=>m.user_id):(data.planMembers||[]).filter(m=>m.plan_id===x.id).map(m=>m.user_id);return ids.map(id=>data.users.find(u=>u.id===id)).filter(Boolean)};
 const topicsFor=x=>x.kind==='plan'?(data.topics||[]).filter(t=>t.plan_id===x.id).map(t=>t.title).filter(Boolean):[];
 return <section><div className="section-top"><div><h2>📅 ปฏิทิน</h2><p>แสดงเฉพาะงาน/นัดหมาย/แผนงานของวันนั้น</p></div><div className="calendar-month-nav"><button onClick={()=>setMonth(m=>{const d=new Date(m+'-01');d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7)})}><ChevronLeft/></button><b>{new Intl.DateTimeFormat('th-TH',{month:'long',year:'numeric'}).format(new Date(month+'-01'))}</b><button onClick={()=>setMonth(m=>{const d=new Date(m+'-01');d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,7)})}><ChevronRight/></button></div></div>
 <div className="calendar-card"><div className="calendar-weekdays">{['จ','อ','พ','พฤ','ศ','ส','อา'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{cells.map((d,i)=><button key={i} className={`calendar-cell ${!d?'blank':''} ${d===selected?'selected':''}`} disabled={!d} onClick={()=>{setSelected(d);setDate(d)}}>{d&&<><span className="day-number">{+d.slice(8)}</span>{events(d).slice(0,3).map(x=>{const diff=dayDiff(d,todayISO());return <div className={`calendar-event ${urgencyClass(diff)}`} key={`${x.kind}-${x.id}`}>{x.title||x.name}</div>})}</>}</button>)}</div></div>
 <div className="card calendar-today-card"><div className="section-top"><div><h3>{fmt(selected)}</h3><p>รายการวันนี้</p></div></div>{events(selected).length? <div className="calendar-detail-list">{events(selected).map(x=>{const people=peopleFor(x),topics=topicsFor(x),diff=dayDiff(selected,todayISO());return <div className={`calendar-detail-item urgency-card ${urgencyClass(diff)}`} key={`${x.kind}-${x.id}`}><div className="calendar-detail-head"><div><span className="eyebrow">{x.kind==='appointment'?'นัดหมาย':'แผนงาน'}{x.type?` · ${x.type}`:''}</span><h3>{x.title||x.name}</h3></div><span className="urgency-inline">{urgencyText(diff)}</span></div><div className="calendar-detail-meta">{x.start_time?`เวลา ${x.start_time.slice(0,5)}${x.end_time?`–${x.end_time.slice(0,5)}`:''}`:''}{x.team?` · ฝ่าย ${x.team}`:''}{x.end_date&&x.end_date!==x.date?` · ${rangeText(x)}`:''}</div>{topics.length>0&&<div className="calendar-detail-section"><b>หัวข้อ</b><div className="detail-chips">{topics.map((t,i)=><span key={i}>{t}</span>)}</div></div>}<div className="calendar-detail-section"><b>ใครทำ</b>{people.length?<div className="people">{people.map(u=><span key={u.id}>{u.display_name}</span>)}</div>:<small className="muted">ไม่ได้ระบุผู้รับผิดชอบ</small>}</div><div className="calendar-detail-section"><b>หมายเหตุ</b><p>{x.notes||'ไม่มีหมายเหตุ'}</p></div></div>})}</div>:<div className="empty">วันนี้ไม่มีงาน</div>}</div>
 </section>
}
'''
s=s[:start]+new_calendar+s[end:]
# Members replace
start=s.index('function Members(')
end=s.index('\nfunction AttendanceManager(', start)
new_members=r'''function Members({me,data}){
 const [dates,setDates]=useState({}),[filter,setFilter]=useState('all');
 const teams=useMemo(()=>data.teamOptions?.length?data.teamOptions.map(x=>x.name):DEFAULT_TEAMS,[data.teamOptions]);
 const checkinByUser=useMemo(()=>{const m=new Map();(data.checkins||[]).forEach(x=>{if(x.linked_user_id)m.set(x.linked_user_id,x)});return m},[data.checkins]);
 const positionRank=u=>{const p=u.department_position;if(p==='ประธานเชียร์')return 0;if(p==='รองประธานเชียร์')return 1;if(p?.startsWith('ประธานฝ่าย'))return 2;if(p?.startsWith('รองประธานฝ่าย')||p==='รองประธานลีดเดอร์')return 3;const idx=teams.indexOf(u.team);return idx>=0?4+idx:99};
 const displayName=u=>checkinByUser.get(u.id)?.full_name||u.display_name||'ยังไม่มีชื่อ';
 const rows=useMemo(()=>data.users.filter(u=>filter==='all'||u.team===filter).sort((a,b)=>positionRank(a)-positionRank(b)||displayName(a).localeCompare(displayName(b),'th')),[data.users,filter,teams,checkinByUser]);
 const birthdayText=b=>b?new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'long',year:'numeric'}).format(new Date(b+'T00:00:00')):'ยังไม่ได้ระบุ';
 return <section><div className="section-top"><div><h2>👥 สมาตุ้ยทั้งหมด</h2><p>ข้อมูลสมาชิกจากบัญชีในเว็บและข้อมูลที่เชื่อมกับฐานข้อมูลเช็คชื่อ</p></div></div><div className="member-team-filter"><button className={filter==='all'?'active':''} onClick={()=>setFilter('all')}>ทั้งหมด</button>{teams.map(t=><button key={t} className={filter===t?'active':''} onClick={()=>setFilter(t)}>{t}</button>)}</div><div className="member-grid">{rows.map(u=>{const d=dates[u.id]||todayISO();const slots=data.avail.filter(a=>a.user_id===u.id&&a.date===d);const c=checkinByUser.get(u.id);return <div className="member-card" key={u.id}><div className="member-head"><Avatar user={{...u,display_name:displayName(u),avatar_url:c?.avatar_url||u.avatar_url}}/><div><h3>{displayName(u)}</h3><small>{u.department_position||'สมาตุ้ย'}{u.team?` · ${u.team}`:''}</small></div></div><div className="member-info-grid"><div><span>ชั้น</span><b>{c?.class_name||'ยังไม่เชื่อม'}</b></div><div><span>ชื่อเล่น</span><b>{c?.nickname||'—'}</b></div><div><span>วันเกิด</span><b>{birthdayText(u.birthday)}</b></div></div>{u.bio&&<p className="bio">{u.bio}</p>}<div className="member-date"><label>วันที่<input type="date" value={d} onChange={e=>setDates(v=>({...v,[u.id]:e.target.value}))}/></label></div><div className="line"><span>●</span><b>{slots.length?slots.map(x=>`${x.start_time.slice(0,5)}–${x.end_time.slice(0,5)}`).join(' · '):'ยังไม่ได้ลงเวลาว่าง'}</b></div></div>})}</div>{!rows.length&&<div className="empty">ยังไม่มีสมาชิกในฝ่ายนี้</div>}</section>
}
'''
s=s[:start]+new_members+s[end:]
# RoleManager replace
start=s.index('function RoleManager(')
end=s.index('\nfunction AvatarCropModal(', start)
new_role=r'''function RoleManager({data,refresh}){
 const [busy,setBusy]=useState(''); const [name,setName]=useState(''); const [editing,setEditing]=useState(null); const [positionBusy,setPositionBusy]=useState('');
 const builtins=[['member','สมาตุ้ย','ดูข้อมูลและลงเวลาของตัวเอง'],['deputy','รองหัวตุ้ย','เพิ่มงาน แผนงาน เช็คชื่อ และเวร'],['head','หัวหน้าตุ้ย','จัดการทุกอย่าง รวมถึงฝ่ายและยศ'],['teacher','อาจารย์ตุ้ย','ทำและดูได้ทุกอย่างเหมือนหัวหน้าตุ้ย']];
 async function setRole(u,value){setBusy(u.id);try{let payload={custom_role_id:null,role:value};if(value.startsWith('custom:')){payload={role:'member',custom_role_id:value.slice(7)}}const r=await supabase.from('profiles').update(payload).eq('id',u.id);if(r.error)throw r.error;await refresh()}catch(e){alert(e.message||'เปลี่ยนยศไม่สำเร็จ')}finally{setBusy('')}}
 async function setPosition(u,value){setPositionBusy(u.id);try{const payload={department_position:value||null,...(POSITION_TEAM[value]?{team:POSITION_TEAM[value]}:{})};const r=await supabase.from('profiles').update(payload).eq('id',u.id);if(r.error)throw r.error;await refresh()}catch(e){alert(e.message||'เปลี่ยนตำแหน่งฝ่ายไม่สำเร็จ')}finally{setPositionBusy('')}}
 async function saveCustom(){const n=name.trim();if(!n)return;if(data.customRoles?.some(r=>r.name.toLowerCase()===n.toLowerCase()&&r.id!==editing?.id))return alert('มียศนี้อยู่แล้ว');const r=editing?await supabase.from('custom_roles').update({name:n}).eq('id',editing.id):await supabase.from('custom_roles').insert({name:n});if(r.error)alert(r.error.message);else{setName('');setEditing(null);refresh()}}
 async function removeCustom(r){if(!confirm(`ลบยศ “${r.name}” ? สมาชิกที่ใช้ยศนี้จะกลับเป็นสมาตุ้ย`))return;const q=await supabase.from('custom_roles').delete().eq('id',r.id);if(q.error)alert(q.error.message);else refresh()}
 return <div className="role-page">
  <div className="role-intro"><div className="role-intro-icon"><Shield/></div><div><h3>ยศและสิทธิ์</h3><p>ยศระบบใช้สำหรับกำหนดสิทธิ์การใช้งาน ส่วนประธานเชียร์/รองประธานเชียร์/ประธานฝ่าย/รองประธานฝ่ายเป็น “ตำแหน่งฝ่าย” แยกออกจากยศ</p></div></div>
  <div className="role-cards">{builtins.map(([id,label,desc])=><div key={id}><b>{label}</b><span>{desc}</span></div>)}</div>
  <div className="manage-box"><h3>เพิ่ม / แก้ไขยศกำหนดเอง</h3><div className="inline-form"><input value={name} onChange={e=>setName(e.target.value)} placeholder="เช่น สต๊าฟ, ที่ปรึกษา"/><button className="primary" onClick={saveCustom}>{editing?'บันทึกการแก้ไข':'เพิ่มยศ'}</button>{editing&&<button className="secondary" onClick={()=>{setEditing(null);setName('')}}>ยกเลิก</button>}</div>
   <div className="option-list">{(data.customRoles||[]).map(r=><div className="option-row" key={r.id}><b>{r.name}</b><div className="actions"><button onClick={()=>{setEditing(r);setName(r.name)}}><Edit3 size={15}/></button><button onClick={()=>removeCustom(r)}><Trash2 size={15}/></button></div></div>)}{!data.customRoles?.length&&<div className="muted">ยังไม่มียศกำหนดเอง</div>}</div>
  </div>
  <div className="manage-box"><div className="section-top"><div><h3>ตำแหน่งฝ่าย</h3><p>เฉพาะหัวหน้าตุ้ยและอาจารย์ตุ้ยสามารถกำหนดตำแหน่งฝ่ายได้</p></div></div><div className="role-list">{data.users.map(u=><div className="role-user" key={`position-${u.id}`}><div className="role-user-info"><Avatar user={u}/><div><b>{u.display_name}</b><small>{u.team||'ยังไม่เลือกฝ่าย'} · {roleLabel(u,data)}</small></div></div><select className="role-select" disabled={positionBusy===u.id} value={u.department_position||''} onChange={e=>setPosition(u,e.target.value)}><option value="">ไม่มีตำแหน่งฝ่าย</option>{DEPARTMENT_POSITIONS.map(p=><option key={p} value={p}>{p}</option>)}</select></div>)}</div></div>
  <div className="role-list">{data.users.map(u=>{const selected=u.custom_role_id?`custom:${u.custom_role_id}`:`builtin:${u.role}`;return <div className="role-user" key={u.id}><div className="role-user-info"><Avatar user={u}/><div><b>{u.display_name}</b><small>{u.team||'ยังไม่เลือกฝ่าย'} · {u.email}</small></div></div><select className="role-select" disabled={busy===u.id} value={selected} onChange={e=>setRole(u,e.target.value.replace(/^builtin:/,''))}><option value="builtin:member">สมาตุ้ย</option><option value="builtin:deputy">รองหัวตุ้ย</option><option value="builtin:head">หัวหน้าตุ้ย</option><option value="builtin:teacher">อาจารย์ตุ้ย</option>{(data.customRoles||[]).map(r=><option key={r.id} value={`custom:${r.id}`}>{r.name}</option>)}</select></div>})}</div>
 </div>
}
'''
s=s[:start]+new_role+s[end:]
p.write_text(s)
