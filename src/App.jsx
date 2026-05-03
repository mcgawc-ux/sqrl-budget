import { useState, useEffect, useRef } from "react";

const FONT_LINK = `https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap`;

const FULL_LOGO = "/full-logo.png";
const ICON_LOGO = "/dashboard-icon.png";

// ─── Splash Screen ────────────────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1600);
    const t2 = setTimeout(() => onDone(), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  return (
    <div style={{
      position:"fixed", inset:0, background:"#F5F1EB",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:9999, transition:"opacity 0.5s ease",
      opacity: fading ? 0 : 1, pointerEvents:"none",
    }}>
      <img src={FULL_LOGO} alt="SQRL" style={{
        width:"54%", maxWidth:240,
        opacity: fading ? 0 : 1,
        transition:"opacity 0.4s ease",
      }}/>
    </div>
  );
}

// ─── Period Helpers ────────────────────────────────────────────────────────────
function getPeriodStart(interval, customDays, anchor) {
  const now = new Date();
  if (interval === "daily") {
    const d = new Date(now); d.setHours(0,0,0,0); return d.toISOString();
  }
  if (interval === "weekly") {
    const d = new Date(now); d.setHours(0,0,0,0); d.setDate(d.getDate()-d.getDay()); return d.toISOString();
  }
  if (interval === "monthly") {
    const d = new Date(now); d.setHours(0,0,0,0); d.setDate(1); return d.toISOString();
  }
  if (interval === "custom") {
    const days = Math.max(parseInt(customDays)||30, 1);
    const base = anchor ? new Date(anchor) : new Date(now.getFullYear(), now.getMonth(), 1);
    const elapsed = Math.floor((now - base) / (86400000 * days));
    const d = new Date(base); d.setDate(d.getDate() + elapsed * days); d.setHours(0,0,0,0);
    return d.toISOString();
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function intervalLabel(interval, customDays) {
  if (interval === "custom") return `Every ${customDays||30}d`;
  return interval.charAt(0).toUpperCase() + interval.slice(1);
}

function uid() { return "x" + Math.random().toString(36).slice(2,10); }
function fmt(n) {
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(n);
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const N = Date.now();
const DEFAULT_CATS = [
  {id:"c1",name:"Groceries",    budget:400,interval:"weekly", customDays:null,anchor:new Date(N-86400000*3).toISOString()},
  {id:"c2",name:"Dining",       budget:200,interval:"weekly", customDays:null,anchor:new Date(N-86400000*3).toISOString()},
  {id:"c3",name:"Transport",    budget:150,interval:"monthly",customDays:null,anchor:new Date(N-86400000*10).toISOString()},
  {id:"c4",name:"Discretionary",budget:300,interval:"monthly",customDays:null,anchor:new Date(N-86400000*10).toISOString()},
];
const DEFAULT_TXN = {
  c1:[
    {id:"t1",amount:67.40,desc:"Trader Joe's",  date:new Date(N-86400000*1).toISOString()},
    {id:"t2",amount:23.10,desc:"Farmers market",date:new Date(N-86400000*3).toISOString()},
    {id:"t3",amount:88.75,desc:"Whole Foods",   date:new Date(N-86400000*5).toISOString()},
  ],
  c2:[
    {id:"t4",amount:45.00,desc:"Le Bernardin",  date:new Date(N-86400000*2).toISOString()},
    {id:"t5",amount:18.50,desc:"Lunch",          date:new Date(N-86400000*4).toISOString()},
  ],
  c3:[{id:"t6",amount:32.00,desc:"Monthly pass", date:new Date(N-86400000*1).toISOString()}],
  c4:[
    {id:"t7",amount:55.00, desc:"Books",         date:new Date(N-86400000*2).toISOString()},
    {id:"t8",amount:120.00,desc:"Running shoes", date:new Date(N-86400000*6).toISOString()},
  ],
};
function loadStorage(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; }
}
const INIT_CATS = loadStorage("sqrl_cats", DEFAULT_CATS);
const INIT_TXN  = loadStorage("sqrl_txns", DEFAULT_TXN);

// ─── Budget Math ──────────────────────────────────────────────────────────────
function currentTxns(catId, allTxns, cat) {
  const ps = getPeriodStart(cat.interval, cat.customDays, cat.anchor);
  return (allTxns[catId]||[]).filter(t => t.date >= ps);
}
function spentAmt(catId, allTxns, cat) {
  return currentTxns(catId,allTxns,cat).reduce((s,t)=>s+t.amount,0);
}
function effectiveBudget(cat, rollover) {
  return cat.budget + (rollover[cat.id]?.amount||0);
}
function remainingAmt(cat, allTxns, rollover) {
  return effectiveBudget(cat,rollover) - spentAmt(cat.id,allTxns,cat);
}
function pctSpent(cat, allTxns, rollover) {
  const eb = effectiveBudget(cat,rollover); if(eb<=0)return 1;
  return Math.min(Math.max(spentAmt(cat.id,allTxns,cat)/eb,0),1);
}

// ─── Ring ─────────────────────────────────────────────────────────────────────
function Ring({progress,size=52,stroke=3}) {
  const r=(size-stroke*2)/2, circ=2*Math.PI*r;
  const color=progress>=1?"#C0392B":progress>0.75?"#D97706":"#1A1A1A";
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E0DBD3" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ*(1-progress)} strokeLinecap="round"
        style={{transition:"stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1),stroke 0.3s"}}/>
    </svg>
  );
}

// ─── Swipeable Row ────────────────────────────────────────────────────────────
function SwipeRow({txn, onDelete}) {
  const [ox, setOx] = useState(0);
  const [active, setActive] = useState(false);
  const sx = useRef(null);
  const THRESH = 80;
  return (
    <div style={{position:"relative",overflow:"hidden",borderBottom:"1px solid #E8E4DC"}}>
      <div style={{position:"absolute",right:0,top:0,bottom:0,width:100,background:"#C0392B",
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.14em",
          textTransform:"uppercase",color:"#fff"}}>Delete</span>
      </div>
      <div
        onTouchStart={e=>{sx.current=e.touches[0].clientX;setActive(true);}}
        onTouchMove={e=>{if(sx.current===null)return;const d=e.touches[0].clientX-sx.current;if(d<0)setOx(Math.max(d,-110));}}
        onTouchEnd={()=>{if(ox<-THRESH)onDelete();else setOx(0);setActive(false);sx.current=null;}}
        style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          padding:"14px 24px",background:"#F5F1EB",
          transform:`translateX(${ox}px)`,
          transition:active?"none":"transform 0.25s cubic-bezier(0.4,0,0.2,1)"}}>
        <div>
          <div style={{fontSize:14,fontWeight:400,color:"#1A1A1A",marginBottom:2}}>{txn.desc}</div>
          <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"#AAA",letterSpacing:"0.06em"}}>
            {fmtDate(txn.date)}
          </div>
        </div>
        <div style={{fontSize:15,fontWeight:500,color:"#1A1A1A",fontVariantNumeric:"tabular-nums"}}>
          −{fmt(txn.amount)}
        </div>
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────
const OVL={position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:200,
  display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(2px)"};
const SHT={background:"#F5F1EB",width:"100%",maxWidth:390,borderRadius:"16px 16px 0 0",
  padding:"0 0 44px",boxShadow:"0 -8px 40px rgba(0,0,0,0.12)",
  animation:"slideUp 0.28s cubic-bezier(0.32,0.72,0,1)",maxHeight:"92vh",overflowY:"auto"};
const HDL={width:36,height:4,background:"#D6D0C8",borderRadius:2,margin:"12px auto 20px"};
const MLBL={fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:"0.16em",textTransform:"uppercase",color:"#888"};
const LBL={...MLBL,fontSize:10,color:"#AAA",display:"block",marginBottom:8};
const TINPUT={fontSize:15,fontFamily:"'Outfit',sans-serif",fontWeight:400,color:"#1A1A1A",
  border:"none",borderBottom:"1px solid #D6D0C8",background:"transparent",outline:"none",
  width:"100%",paddingBottom:8,letterSpacing:"-0.01em"};
const BPRIM={width:"100%",padding:"16px",background:"#1A1A1A",color:"#F5F1EB",
  border:"none",borderRadius:4,fontSize:13,fontFamily:"'DM Mono',monospace",
  letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer"};
const BSEC={width:"100%",padding:"14px",background:"transparent",color:"#888",
  border:"1px solid #D6D0C8",borderRadius:4,fontSize:11,fontFamily:"'DM Mono',monospace",
  letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",display:"block"};

// ─── Category Editor ──────────────────────────────────────────────────────────
function CatEditor({cat, onSave, onDelete, onClose}) {
  const isNew = !cat.id;
  const [name, setName]           = useState(cat.name||"");
  const [budget, setBudget]       = useState(cat.budget?String(cat.budget):"");
  const [interval, setInterval]   = useState(cat.interval||"monthly");
  const [customDays, setCustomDays] = useState(cat.customDays||"30");
  const INTERVALS = ["daily","weekly","monthly","custom"];

  function save() {
    if(!name.trim()||!parseFloat(budget))return;
    onSave({id:cat.id||uid(),name:name.trim(),budget:parseFloat(budget),
      interval,customDays:interval==="custom"?customDays:null,
      anchor:cat.anchor||new Date().toISOString()});
  }

  return (
    <div style={OVL} onClick={onClose}>
      <div style={SHT} onClick={e=>e.stopPropagation()}>
        <div style={HDL}/>
        <div style={{padding:"0 24px 16px",borderBottom:"1px solid #D6D0C8"}}>
          <div style={MLBL}>{isNew?"New category":"Edit category"}</div>
        </div>
        <div style={{padding:"20px 24px 0"}}>
          <label style={LBL}>Category name</label>
          <input style={{...TINPUT,marginBottom:20}} placeholder="e.g. Groceries"
            value={name} onChange={e=>setName(e.target.value)} autoFocus/>

          <label style={LBL}>Budget amount</label>
          <div style={{display:"flex",alignItems:"center",borderBottom:"2px solid #1A1A1A",paddingBottom:6,marginBottom:22}}>
            <span style={{fontSize:26,fontWeight:300,color:"#888",marginRight:4}}>$</span>
            <input style={{fontSize:30,fontWeight:300,fontFamily:"'Outfit',sans-serif",color:"#1A1A1A",
              border:"none",background:"transparent",outline:"none",width:"100%",letterSpacing:"-0.02em"}}
              type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0.00"
              value={budget}
              onChange={e=>{ const v=e.target.value; if(/^\d*\.?\d*$/.test(v)) setBudget(v); }}/>
          </div>

          <label style={LBL}>Reset interval</label>
          <div style={{display:"flex",gap:6,marginBottom:interval==="custom"?14:24}}>
            {INTERVALS.map(iv=>(
              <button key={iv} onClick={()=>setInterval(iv)} style={{
                flex:1,padding:"9px 4px",border:"1px solid",
                borderColor:interval===iv?"#1A1A1A":"#D6D0C8",
                background:interval===iv?"#1A1A1A":"transparent",
                color:interval===iv?"#F5F1EB":"#888",
                borderRadius:3,cursor:"pointer",fontSize:9,
                fontFamily:"'DM Mono',monospace",letterSpacing:"0.1em",textTransform:"uppercase"}}>
                {iv}
              </button>
            ))}
          </div>

          {interval==="custom"&&(
            <div style={{marginBottom:24}}>
              <label style={LBL}>Days per period</label>
              <div style={{display:"flex",alignItems:"center",gap:10,
                borderBottom:"1px solid #D6D0C8",paddingBottom:6}}>
                <input style={{fontSize:22,fontWeight:300,fontFamily:"'Outfit',sans-serif",
                  color:"#1A1A1A",border:"none",background:"transparent",outline:"none",
                  width:72,letterSpacing:"-0.01em"}}
                  type="text" inputMode="numeric" pattern="[0-9]*" placeholder="30"
                  value={customDays}
                  onChange={e=>{ const v=e.target.value; if(/^\d*$/.test(v)) setCustomDays(v); }}/>
                <span style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"#AAA",
                  letterSpacing:"0.1em",textTransform:"uppercase"}}>days</span>
              </div>
            </div>
          )}

          <button style={BPRIM} onClick={save}>{isNew?"Create category":"Save changes"}</button>
          {!isNew&&onDelete&&(
            <button style={{...BSEC,color:"#C0392B",borderColor:"rgba(192,57,43,0.2)",marginTop:8}}
              onClick={onDelete}>Delete category</button>
          )}
          <button style={{...BSEC,marginTop:8}} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function BudgetApp() {
  const [splashDone, setSplashDone] = useState(false);
  const [cats,    setCats]    = useState(INIT_CATS);
  const [txns,    setTxns]    = useState(INIT_TXN);
  const [rollover,setRollover]= useState(loadStorage("sqrl_rollover", {}));
  const [view,    setView]    = useState("dashboard");
  const [activeId,setActiveId]= useState(null);
  const [amount,  setAmount]  = useState("");
  const [desc,    setDesc]    = useState("");
  const [sort,    setSort]    = useState("date");
  const [pressed, setPressed] = useState(null);
  const [editCat, setEditCat] = useState(null);

  const activeCat = cats.find(c=>c.id===activeId);

  // ── Fonts & keyframes ──
  useEffect(()=>{
    const FONT_LINK = `https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap`;
    if(!document.getElementById("bf-font")){
      const l=document.createElement("link");l.id="bf-font";l.rel="stylesheet";l.href=FONT_LINK;
      document.head.appendChild(l);
    }
    if(!document.getElementById("bf-kf")){
      const s=document.createElement("style");s.id="bf-kf";
      s.textContent=`
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        input::placeholder{color:#CCC}
        *{box-sizing:border-box;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:0}
      `;
      document.head.appendChild(s);
    }
  },[]);

  // ── Rollover engine ──
  useEffect(()=>{
    setRollover(prev=>{
      const next={...prev};
      let changed=false;
      cats.forEach(cat=>{
        const ps=getPeriodStart(cat.interval,cat.customDays,cat.anchor);
        const stored=next[cat.id];
        if(!stored||stored.periodStart!==ps){
          let leftover=0;
          if(stored){
            const prevSpent=(txns[cat.id]||[])
              .filter(t=>t.date>=stored.periodStart&&t.date<ps)
              .reduce((s,t)=>s+t.amount,0);
            const prevBudget=cat.budget+(stored.amount||0);
            leftover=Math.max(prevBudget-prevSpent,0);
          }
          next[cat.id]={periodStart:ps,amount:leftover};
          changed=true;
        }
      });
      return changed?next:prev;
    });
  },[cats]);

  const totalRemaining=cats.reduce((s,c)=>s+remainingAmt(c,txns,rollover),0);
  const todayStr=new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase();

  function openExpense(id){setActiveId(id);setAmount("");setDesc("");setView("expense");}
  function openDetail(id){setActiveId(id);setSort("date");setView("detail");}

  function addExpense(){
    const n=parseFloat(amount);if(!n||n<=0)return;
    const t={id:uid(),amount:n,desc:desc.trim()||"Expense",date:new Date().toISOString()};
    setTxns(prev=>({...prev,[activeId]:[t,...(prev[activeId]||[])]}));
    setView("dashboard");
  }

  function deleteTxn(catId,txnId){
    setTxns(prev=>({...prev,[catId]:(prev[catId]||[]).filter(t=>t.id!==txnId)}));
  }

  function resetCat(id){
    const cat=cats.find(c=>c.id===id);
    const ps=getPeriodStart(cat.interval,cat.customDays,cat.anchor);
    setTxns(prev=>({...prev,[id]:(prev[id]||[]).filter(t=>t.date<ps)}));
    setRollover(prev=>({...prev,[id]:{periodStart:ps,amount:0}}));
    setView("dashboard");
  }

  function saveCat(data){
    const isNew=!cats.find(c=>c.id===data.id);
    if(isNew){setCats(p=>[...p,data]);setTxns(p=>({...p,[data.id]:[]}))}
    else setCats(p=>p.map(c=>c.id===data.id?data:c));
    setEditCat(null);
  }

  function deleteCat(id){
    setCats(p=>p.filter(c=>c.id!==id));
    setTxns(p=>{const n={...p};delete n[id];return n;});
    setRollover(p=>{const n={...p};delete n[id];return n;});
    setEditCat(null);setView("dashboard");
  }

  function sortedTxns(catId,cat){
    const list=[...currentTxns(catId,txns,cat)];
    return sort==="amount"?list.sort((a,b)=>b.amount-a.amount):list.sort((a,b)=>new Date(b.date)-new Date(a.date));
  }

  return (
    <div style={{fontFamily:"'Outfit',sans-serif",background:"#F5F1EB",minHeight:"100vh",
      display:"flex",justifyContent:"center"}}>

      {/* ── SPLASH ── */}
      {!splashDone && <SplashScreen onDone={()=>setSplashDone(true)}/>}

      <div style={{width:"100%",maxWidth:390,background:"#F5F1EB",minHeight:"100vh",position:"relative"}}>

        {/* HEADER */}
        <div style={{padding:"52px 24px 20px",borderBottom:"1px solid #D6D0C8"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
            {/* Icon in corner */}
            <img src={ICON_LOGO} alt="SQRL" style={{width:28,height:28,objectFit:"contain"}}/>
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"#AAA",letterSpacing:"0.1em"}}>
                {todayStr}
              </span>
              <button onClick={()=>setEditCat({})}
                style={{display:"flex",alignItems:"center",gap:5,
                  background:"#1A1A1A",border:"none",borderRadius:20,cursor:"pointer",
                  padding:"7px 13px 7px 10px",lineHeight:1}}>
                <span style={{fontSize:16,color:"#F5F1EB",lineHeight:1,marginTop:-1}}>+</span>
                <span style={{fontSize:10,fontFamily:"'DM Mono',monospace",letterSpacing:"0.12em",
                  textTransform:"uppercase",color:"#F5F1EB"}}>New</span>
              </button>
            </div>
          </div>
          <div style={{marginTop:20}}>
            <div style={{fontSize:12,color:"#888",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>
              Total remaining
            </div>
            <div style={{fontSize:38,fontWeight:300,letterSpacing:"-0.02em",lineHeight:1,
              color:totalRemaining<0?"#C0392B":"#1A1A1A"}}>
              {fmt(totalRemaining)}
            </div>
          </div>
        </div>

        {/* CATEGORY LIST */}
        <div style={{paddingBottom:100}}>
          {cats.length===0&&(
            <div style={{padding:"52px 24px",textAlign:"center"}}>
              <div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"#CCC",
                letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:20}}>
                No categories yet
              </div>
              <button style={{...BPRIM,maxWidth:220,margin:"0 auto"}} onClick={()=>setEditCat({})}>
                Create first category
              </button>
            </div>
          )}
          {cats.map(cat=>{
            const rem=remainingAmt(cat,txns,rollover);
            const p=pctSpent(cat,txns,rollover);
            const ro=rollover[cat.id]?.amount||0;
            return (
              <div key={cat.id}>
                <div style={{display:"flex",alignItems:"center",padding:"18px 24px",gap:16,
                  cursor:"pointer",userSelect:"none",WebkitTapHighlightColor:"transparent",
                  background:pressed===cat.id?"#EDE9E1":"transparent",transition:"background 0.12s"}}
                  onPointerDown={()=>setPressed(cat.id)}
                  onPointerUp={()=>{setPressed(null);openDetail(cat.id);}}
                  onPointerLeave={()=>setPressed(null)}>
                  <Ring progress={p}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:15,fontWeight:500,color:"#1A1A1A",letterSpacing:"-0.01em",
                      marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {cat.name}
                    </div>
                    <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"#AAA",
                      letterSpacing:"0.1em",textTransform:"uppercase",display:"flex",gap:8,flexWrap:"wrap"}}>
                      <span>{intervalLabel(cat.interval,cat.customDays)} · {fmt(cat.budget)}</span>
                      {ro>0&&<span style={{color:"#4A7C59"}}>+{fmt(ro)} rollover</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:17,fontWeight:400,letterSpacing:"-0.02em",
                      fontVariantNumeric:"tabular-nums",color:rem<0?"#C0392B":"#1A1A1A"}}>
                      {fmt(rem)}
                    </div>
                    <div style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"#AAA",
                      letterSpacing:"0.06em",marginTop:2}}>
                      {fmt(spentAmt(cat.id,txns,cat))} spent
                    </div>
                  </div>
                </div>
                <div style={{height:1,background:"#D6D0C8",margin:"0 24px"}}/>
              </div>
            );
          })}
        </div>

        {/* FAB */}
        <button onClick={()=>{setActiveId(null);setView("choose");}}
          style={{position:"fixed",bottom:32,left:"50%",transform:"translateX(-50%)",
            width:56,height:56,borderRadius:"50%",background:"#1A1A1A",color:"#F5F1EB",
            border:"none",fontSize:26,cursor:"pointer",display:"flex",alignItems:"center",
            justifyContent:"center",boxShadow:"0 4px 20px rgba(0,0,0,0.18)",zIndex:100}}>
          +
        </button>

        {/* CHOOSE CATEGORY */}
        {view==="choose"&&(
          <div style={OVL} onClick={()=>setView("dashboard")}>
            <div style={SHT} onClick={e=>e.stopPropagation()}>
              <div style={HDL}/>
              <div style={{padding:"0 24px 14px",borderBottom:"1px solid #D6D0C8"}}>
                <div style={MLBL}>Add expense to</div>
              </div>
              {cats.map(cat=>(
                <div key={cat.id}>
                  <div style={{display:"flex",alignItems:"center",padding:"15px 24px",gap:14,cursor:"pointer"}}
                    onClick={()=>openExpense(cat.id)}>
                    <Ring progress={pctSpent(cat,txns,rollover)} size={40} stroke={2.5}/>
                    <div style={{flex:1,fontSize:15,fontWeight:500,color:"#1A1A1A"}}>{cat.name}</div>
                    <div style={{fontSize:15,fontVariantNumeric:"tabular-nums",
                      color:remainingAmt(cat,txns,rollover)<0?"#C0392B":"#1A1A1A"}}>
                      {fmt(remainingAmt(cat,txns,rollover))}
                    </div>
                  </div>
                  <div style={{height:1,background:"#D6D0C8",margin:"0 24px"}}/>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* EXPENSE ENTRY */}
        {view==="expense"&&activeCat&&(
          <div style={OVL} onClick={()=>setView("dashboard")}>
            <div style={SHT} onClick={e=>e.stopPropagation()}>
              <div style={HDL}/>
              <div style={{padding:"0 24px 16px",borderBottom:"1px solid #D6D0C8"}}>
                <div style={MLBL}>New expense</div>
                <div style={{fontSize:22,fontWeight:500,color:"#1A1A1A",letterSpacing:"-0.02em",marginTop:4}}>
                  {activeCat.name}
                </div>
              </div>
              <div style={{padding:"20px 24px 0"}}>
                <label style={LBL}>Amount</label>
                <div style={{display:"flex",alignItems:"center",borderBottom:"2px solid #1A1A1A",
                  marginBottom:20,paddingBottom:6}}>
                  <span style={{fontSize:28,fontWeight:300,color:"#888",marginRight:4}}>$</span>
                  <input style={{fontSize:32,fontWeight:300,fontFamily:"'Outfit',sans-serif",
                    color:"#1A1A1A",border:"none",background:"transparent",outline:"none",
                    width:"100%",letterSpacing:"-0.02em"}}
                    type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*" placeholder="0.00"
                    value={amount}
                    onChange={e=>{ const v=e.target.value; if(/^\d*\.?\d*$/.test(v)) setAmount(v); }}
                    autoFocus/>
                </div>
                <label style={LBL}>Description (optional)</label>
                <input style={{...TINPUT,marginBottom:28}} type="text" placeholder="What was this for?"
                  value={desc} onChange={e=>setDesc(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&addExpense()}/>
                <button style={BPRIM} onClick={addExpense}>Record expense</button>
                <button style={{...BSEC,marginTop:10}} onClick={()=>setView("dashboard")}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* DETAIL SHEET */}
        {view==="detail"&&activeCat&&(
          <div style={OVL} onClick={()=>setView("dashboard")}>
            <div style={SHT} onClick={e=>e.stopPropagation()}>
              <div style={HDL}/>
              <div style={{padding:"0 24px 16px",borderBottom:"1px solid #D6D0C8"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={MLBL}>{intervalLabel(activeCat.interval,activeCat.customDays)} budget</div>
                    <div style={{fontSize:22,fontWeight:500,color:"#1A1A1A",letterSpacing:"-0.02em",marginTop:4}}>
                      {activeCat.name}
                    </div>
                  </div>
                  <button onClick={()=>{setEditCat(activeCat);setView("dashboard");}}
                    style={{background:"none",border:"none",cursor:"pointer",padding:"4px 0",
                      fontSize:11,fontFamily:"'DM Mono',monospace",letterSpacing:"0.12em",
                      textTransform:"uppercase",color:"#AAA",marginTop:4}}>
                    Edit
                  </button>
                </div>
              </div>

              <div style={{padding:"16px 24px",borderBottom:"1px solid #D6D0C8"}}>
                {(rollover[activeId]?.amount||0)>0&&(
                  <div style={{display:"flex",alignItems:"center",marginBottom:10,
                    padding:"7px 10px",background:"rgba(74,124,89,0.08)",borderRadius:3}}>
                    <span style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.12em",
                      textTransform:"uppercase",color:"#4A7C59"}}>
                      ↩ {fmt(rollover[activeId].amount)} carried forward from last period
                    </span>
                  </div>
                )}
                <div style={{height:3,background:"#E0DBD3",borderRadius:2,overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",borderRadius:2,
                    width:`${Math.min(pctSpent(activeCat,txns,rollover)*100,100)}%`,
                    background:pctSpent(activeCat,txns,rollover)>=1?"#C0392B"
                      :pctSpent(activeCat,txns,rollover)>0.75?"#D97706":"#1A1A1A",
                    transition:"width 0.55s cubic-bezier(0.4,0,0.2,1)"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,
                  fontFamily:"'DM Mono',monospace",color:"#AAA",letterSpacing:"0.06em"}}>
                  <span>{fmt(spentAmt(activeId,txns,activeCat))} spent</span>
                  <span style={{color:remainingAmt(activeCat,txns,rollover)<0?"#C0392B":"inherit",fontWeight:500}}>
                    {fmt(remainingAmt(activeCat,txns,rollover))} left
                  </span>
                  <span>{fmt(effectiveBudget(activeCat,rollover))} total</span>
                </div>
              </div>

              <div style={{display:"flex",gap:6,padding:"10px 24px",borderBottom:"1px solid #D6D0C8",
                justifyContent:"space-between"}}>
                <div style={{display:"flex",gap:6}}>
                  {["date","amount"].map(m=>(
                    <button key={m} onClick={()=>setSort(m)} style={{fontSize:9,
                      fontFamily:"'DM Mono',monospace",letterSpacing:"0.14em",textTransform:"uppercase",
                      padding:"5px 10px",border:"1px solid",
                      borderColor:sort===m?"#1A1A1A":"#D6D0C8",
                      background:sort===m?"#1A1A1A":"transparent",
                      color:sort===m?"#F5F1EB":"#AAA",borderRadius:2,cursor:"pointer"}}>{m}</button>
                  ))}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{setView("expense");setAmount("");setDesc("");}}
                    style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.14em",
                      textTransform:"uppercase",padding:"5px 10px",border:"1px solid #1A1A1A",
                      background:"transparent",color:"#1A1A1A",borderRadius:2,cursor:"pointer"}}>
                    + Add
                  </button>
                  <button onClick={()=>resetCat(activeId)}
                    style={{fontSize:9,fontFamily:"'DM Mono',monospace",letterSpacing:"0.14em",
                      textTransform:"uppercase",padding:"5px 10px",
                      border:"1px solid rgba(192,57,43,0.25)",
                      background:"transparent",color:"#C0392B",borderRadius:2,cursor:"pointer"}}>
                    Reset
                  </button>
                </div>
              </div>

              <div style={{maxHeight:300,overflowY:"auto"}}>
                {sortedTxns(activeId,activeCat).length===0?(
                  <div style={{padding:"32px 24px",textAlign:"center",fontSize:12,
                    fontFamily:"'DM Mono',monospace",color:"#BBB",letterSpacing:"0.08em"}}>
                    No expenses this period
                  </div>
                ):(
                  sortedTxns(activeId,activeCat).map(txn=>(
                    <SwipeRow key={txn.id} txn={txn} onDelete={()=>deleteTxn(activeId,txn.id)}/>
                  ))
                )}
              </div>
              <div style={{padding:"8px 24px 0",fontSize:9,fontFamily:"'DM Mono',monospace",
                color:"#CCC",letterSpacing:"0.08em",textAlign:"center"}}>
                ← swipe left to delete
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY EDITOR */}
        {editCat!==null&&(
          <CatEditor
            cat={editCat}
            onSave={saveCat}
            onDelete={editCat.id?()=>deleteCat(editCat.id):null}
            onClose={()=>setEditCat(null)}
          />
        )}
      </div>
    </div>
  );
}
