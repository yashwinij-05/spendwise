(() => {
  "use strict";
  const BUDGET = 10000;
  const DAYS = 30;
  const COLORS = { Food:"#36c88a", Travel:"#8973ed", Shopping:"#ff9c7a", Bills:"#f4c96b", Subscriptions:"#55b5d9", Health:"#f17b9a", Other:"#9aa6b8" };
  const ICONS = { Food:"☕", Travel:"↗", Shopping:"◇", Bills:"▤", Subscriptions:"◷", Health:"＋", Other:"•" };
  const DEFAULT_COMMITMENTS = [
    { id: "c1", name:"Phone & internet", amount:599, due:"Day 5", icon:"⌁" },
    { id: "c2", name:"Monthly subscription", amount:299, due:"Day 12", icon:"◷" },
    { id: "c3", name:"Travel pass", amount:650, due:"Day 15", icon:"↗" },
    { id: "c4", name:"Emergency buffer", amount:452, due:"Set aside", icon:"✦" }
  ];
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const money = n => "₹" + Math.round(n).toLocaleString("en-IN");
  const safeNumber = (value, min=0, max=1000000) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : min;
  };
  const cleanText = value => String(value ?? "").replace(/[<>]/g, "").trim().slice(0, 60);
  const defaultState = () => ({
    transactions: [],
    commitments: DEFAULT_COMMITMENTS.map(x => ({...x})),
    goal: { name:"Little safety net", target:2000, saved:0 },
    day: 1
  });
  let state = loadState();
  let stagedCommitments = [];
  let toastTimer;

  function loadState() {
    try {
      const raw = localStorage.getItem("spendwise-state-v1");
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.commitments) || !parsed.goal) return defaultState();
      return {
        transactions: parsed.transactions.filter(t => t && typeof t.id === "string").map(t => ({
          id:t.id, name:cleanText(t.name), amount:safeNumber(t.amount,1), category:COLORS[t.category]?t.category:"Other",
          essential:Boolean(t.essential), date:cleanText(t.date), createdAt:safeNumber(t.createdAt,0)
        })),
        commitments: parsed.commitments.filter(c => c && typeof c.id === "string").map(c => ({
          id:c.id, name:cleanText(c.name), amount:safeNumber(c.amount), due:cleanText(c.due || "Upcoming"), icon:cleanText(c.icon || "◷")
        })),
        goal:{ name:cleanText(parsed.goal.name || "Savings goal"), target:safeNumber(parsed.goal.target,100,1000000), saved:safeNumber(parsed.goal.saved,0,1000000) },
        day:safeNumber(parsed.day,1,30)
      };
    } catch { return defaultState(); }
  }
  function saveState() {
    try { localStorage.setItem("spendwise-state-v1", JSON.stringify(state)); }
    catch { showToast("Browser storage is unavailable. Your changes may not persist."); }
  }
  const spent = () => state.transactions.filter(t=>!t.income).reduce((sum,t)=>sum+t.amount,0);
  const incomeTotal = () => state.transactions.filter(t=>t.income).reduce((sum,t)=>sum+t.amount,0);
  const commitments = () => state.commitments.reduce((sum,c)=>sum+c.amount,0);
  const balance = () => BUDGET + incomeTotal() - spent();
  const availableAfterCommitments = () => balance() - commitments();
  const daysRemaining = () => Math.max(1, DAYS - state.day + 1);
  const dailyAllowance = () => Math.floor(Math.max(0, availableAfterCommitments()) / daysRemaining());
  const projectedBalance = () => BUDGET - commitments() - spent() - Math.max(0, dailyAllowance()) * Math.max(0, daysRemaining()-1);
  function score() {
    const available = availableAfterCommitments();
    const ratio = BUDGET > 0 ? available / BUDGET : 0;
    const overspend = Math.max(0, -available);
    return Math.max(0, Math.min(100, Math.round(55 + ratio*40 - overspend/BUDGET*60 - (spent()/BUDGET)*12)));
  }
  function risk() {
    const avail = availableAfterCommitments();
    const perDay = avail / daysRemaining();
    if (avail < 0 || perDay < 75) return "high";
    if (perDay < 150 || spent()/BUDGET > .45) return "medium";
    return "low";
  }
  function healthText(s) {
    if (s >= 80) return ["Looking healthy","Your plan has room to breathe. Keep it steady."];
    if (s >= 60) return ["Needs a little care","You're still in control. A small adjustment can help."];
    if (s >= 40) return ["Getting tight","Your current plan may run short. Review optional spending."];
    return ["Time to reset","Your plan is under pressure. Prioritize essentials and adjust commitments."];
  }
  function showToast(message) {
    const el=$("#toast"); el.textContent=message; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2800);
  }
  function element(tag, className, text) {
    const el=document.createElement(tag); if(className) el.className=className; if(text!==undefined) el.textContent=text; return el;
  }
  function render() {
    renderSummary(); renderSpending(); renderHealth(); renderTransactions(); renderCommitments(); renderGoal();
  }
  function renderSummary() {
    const current=balance(), used=Math.max(0,spent()), committed=commitments(), available=availableAfterCommitments();
    $("#balanceValue").replaceChildren(document.createTextNode(money(current)));
    const cents=element("span","balance-decimal",".00"); $("#balanceValue").append(cents);
    $("#balanceBar").style.width=`${Math.max(0,Math.min(100,current/BUDGET*100))}%`;
    $("#spentLabel").textContent=money(used); $("#committedLabel").textContent=money(committed);
    $("#dailyAllowance").textContent=money(dailyAllowance()); $("#daysLeft").textContent=`${daysRemaining()} day${daysRemaining()===1?"":"s"}`;
    $("#dailyTrend").textContent=available<0?"OVER BUDGET":dailyAllowance()<150?"SPEND MINDFULLY":"PLAN AHEAD";
    $("#dailyTrend").className=`trend ${available<0?"":dailyAllowance()<150?"":"neutral"}`;
    $("#pageCrumb").textContent=({overview:"Overview",activity:"Transactions",goals:"Savings goals",simulator:"What-if lab"})[activeView]||"Overview";
    $("#greeting").innerHTML = "Make your money <span>make sense.</span>";
  }
  function renderSpending() {
    const sums={}; state.transactions.forEach(t=>sums[t.category]=(sums[t.category]||0)+t.amount);
    const entries=Object.entries(sums).sort((a,b)=>b[1]-a[1]); const total=spent();
    $("#donutTotal").textContent=money(total);
    let angle=0; const parts=entries.map(([cat,val])=>{const start=angle; angle+=total?val/total*360:0; return `${COLORS[cat]} ${start}deg ${angle}deg`;});
    $("#spendingDonut").style.background=entries.length?`conic-gradient(${parts.join(",")})`:"conic-gradient(#e9edf4 0deg 360deg)";
    const legend=$("#categoryLegend"); legend.replaceChildren();
    if(!entries.length) legend.append(element("div","empty-state","Your spending breakdown will show up here."));
    entries.slice(0,5).forEach(([cat,val])=>{
      const row=element("div","legend-row"); const dot=element("span","legend-color"); dot.style.background=COLORS[cat];
      row.append(dot,element("span","legend-name",cat),element("b","legend-amount",money(val))); legend.append(row);
    });
    $("#spendingInsight").textContent=total===0?"Every rupee has a job. Give yours one.":total>BUDGET*.35?"Spending is moving quickly. Check your daily allowance.":"Nice tracking. Small check-ins keep surprises away.";
  }
  function renderHealth() {
    const s=score(), r=risk(), forecast=projectedBalance(), text=healthText(s);
    $("#healthScore").textContent=s; $("#scoreRing").style.background=`conic-gradient(${s>=70?"#36c88a":s>=45?"#f4bd4f":"#f17c71"} 0deg ${s*3.6}deg,#edf0f4 ${s*3.6}deg 360deg)`;
    $("#healthLabel").textContent=text[0]; $("#healthDescription").textContent=text[1];
    $("#riskLabel").textContent=r==="low"?"Low risk":r==="medium"?"Medium risk":"High risk";
    $("#riskDot").className=`risk-indicator ${r}`;
    $("#forecastValue").textContent=money(forecast); $("#forecastArrow").textContent=forecast>=0?"↗":"↘"; $("#forecastArrow").style.color=forecast>=0?"#31bd82":"#e4776d";
    const rec=$("#healthRecommendation"); rec.replaceChildren();
    const icon=element("span","",r==="low"?"✦":"!"); const p=element("p");
    const b=element("b","",r==="low"?"Smart move":r==="medium"?"Worth a pause":"Protect your essentials");
    p.append(b,document.createElement("br"),document.createTextNode(r==="low"?"Your commitments are covered. Keep optional spending intentional.":r==="medium"?"Try lowering optional spending to protect your daily allowance.":"Your current plan may exceed available funds. Rework non-essential costs."));
    rec.append(icon,p);
    rec.className=`health-recommendation ${r==="low"?"":r==="medium"?"warning":"danger"}`;
  }
  function renderTransactions() {
    const container=$("#recentTransactions"); container.replaceChildren();
    const list=[...state.transactions].sort((a,b)=>b.createdAt-a.createdAt);
    if(!list.length) { const empty=element("div","empty-transactions"); empty.append(element("div","","↗"),element("b","","No spending yet"),element("span","","Add your first expense to get started.")); container.append(empty); return; }
    list.slice(0,4).forEach(t=>container.append(transactionRow(t)));
  }
  function transactionRow(t) {
    const row=element("div","transaction-row"); const icon=element("div","transaction-icon",""+(ICONS[t.category]||"•")); icon.style.background=(COLORS[t.category]||COLORS.Other)+"20"; icon.style.color=COLORS[t.category]||COLORS.Other;
    const copy=element("div","transaction-copy"); copy.append(element("b","",t.name),element("small","",`${t.category} · ${t.date}${t.essential?" · Essential":""}`));
    const amount=element("span","transaction-amount",`${t.income?"+":"−"}${money(t.amount)}`); amount.style.color=t.income?"#27ad77":""; amount.setAttribute("aria-label",`${t.income?"Income":"Spent"} ${money(t.amount)}`);
    const del=element("button","delete-transaction","×"); del.type="button"; del.setAttribute("aria-label",`Delete ${t.name}`); del.addEventListener("click",()=>{state.transactions=state.transactions.filter(x=>x.id!==t.id);saveState();render();showToast("Expense removed.");});
    row.append(icon,copy,amount,del); return row;
  }
  function renderCommitments() {
    const container=$("#commitmentList"); container.replaceChildren();
    state.commitments.slice(0,4).forEach(c=>{
      const row=element("div","commitment-row"); row.append(element("div","commitment-icon",c.icon||"◷"));
      const copy=element("div","commitment-copy"); copy.append(element("b","",c.name),element("small","",c.due||"Upcoming"));
      row.append(copy,element("span","commitment-amount",money(c.amount))); container.append(row);
    });
    if(!state.commitments.length) container.append(element("div","empty-state","No commitments yet. Add any upcoming bills."));
    $("#commitmentTotal").textContent=money(commitments());
  }
  function renderGoal() {
    const target=Math.max(1,state.goal.target), saved=state.goal.saved, pct=Math.min(100,Math.round(saved/target*100));
    $("#savingsValue").innerHTML=""; $("#savingsValue").append(document.createTextNode(money(saved)+" "));
    const small=element("small","",`/ ${money(target)}`); $("#savingsValue").append(small);
    $("#goalBar").style.width=`${pct}%`; $("#goalPercent").textContent=`${pct}%`;
    $("#savingsTrend").textContent=pct>=100?"GOAL REACHED":pct>0?"IN PROGRESS":"START SMALL";
    $("#savingsTrend").className=`trend ${pct>0?"positive":"neutral"}`;
  }
  let activeView="overview";
  function navigate(view) {
    activeView=view;
    $$(".nav-item").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===view));
    $("#pageCrumb").textContent=({overview:"Overview",activity:"Transactions",goals:"Savings goals",simulator:"What-if lab"})[view]||"Overview";
    if(view==="activity") { $("#recentTransactions").scrollIntoView({behavior:"smooth",block:"center"}); $("#expenseDialog").showModal(); }
    if(view==="goals") $("#goalsDialog").showModal();
    if(view==="simulator") openSimulator();
    if(view==="overview") window.scrollTo({top:0,behavior:"smooth"});
  }
  function openExpense() { $("#expenseForm").reset(); $("#expenseDialog").showModal(); $("#expenseName").focus(); }
  function openSimulator() { updateSimulation(); $("#simulatorDialog").showModal(); }
  function scenario() {
    const amount=safeNumber($("#simAmount").value,100,4000), type=$("#simType").value;
    const sign=type==="income"||type==="subscription"?1:-1;
    const adjustedBalance=balance()+amount*sign;
    const adjustedAvailable=adjustedBalance-commitments();
    const daily=Math.floor(Math.max(0,adjustedAvailable)/daysRemaining());
    const forecast=adjustedBalance-commitments()-Math.max(0,daily)*(daysRemaining()-1);
    const currentScore=score();
    const projectedScore=Math.max(0,Math.min(100,Math.round(currentScore+(sign>0?1:-1)*Math.min(18,amount/150))));
    return {amount,type,sign,adjustedBalance,daily,forecast,healthDelta:projectedScore-currentScore,adjustedAvailable};
  }
  function updateSimulation() {
    const sc=scenario(), typeLabel={purchase:"Purchase",emergency:"Unexpected expense",subscription:"Subscription cancellation",income:"Extra income"};
    $("#simAmountLabel").textContent=money(sc.amount);
    $("#simBalance").textContent=money(sc.adjustedBalance); $("#simDaily").textContent=money(sc.daily); $("#simForecast").textContent=money(sc.forecast);
    $("#simHealth").textContent=`${sc.healthDelta>0?"+":""}${sc.healthDelta} points`;
    const verdict=$("#scenarioVerdict"); verdict.className="scenario-verdict";
    verdict.replaceChildren(); const icon=element("span","","✦"); const p=element("p");
    let msg;
    if(sc.adjustedAvailable<0){verdict.classList.add("danger");msg=`This ${typeLabel[sc.type].toLowerCase()} leaves you ${money(Math.abs(sc.adjustedAvailable))} short after commitments. Consider a smaller amount.`;}
    else if(sc.daily<150){verdict.classList.add("warning");msg=`This leaves about ${money(sc.daily)} per day. You may want to protect more of your budget.`;}
    else msg=`After this ${typeLabel[sc.type].toLowerCase()}, your plan has about ${money(sc.daily)} per day available after commitments.`;
    p.textContent=msg+" Preview only — nothing has changed yet."; verdict.append(icon,p);
    $("#applySimulation").textContent=sc.type==="subscription"?"Apply cancellation":sc.type==="income"?"Add income":"Apply decision";
  }
  function applyScenario() {
    const sc=scenario(); const name=cleanText($("#simDescription").value)||"Simulated decision";
    if(sc.type==="subscription") {
      if(!state.commitments.length){showToast("No commitment to cancel. Add one first.");return;}
      const index=state.commitments.findIndex(c=>c.name.toLowerCase().includes("subscription"));
      if(index>=0) state.commitments.splice(index,1);
      else {const biggest=state.commitments.reduce((a,b)=>a.amount>b.amount?a:b);state.commitments=state.commitments.filter(c=>c.id!==biggest.id);}
      showToast("Commitment cancelled in your plan.");
    } else if(sc.type==="income") {
      state.transactions.push({id:crypto.randomUUID(),name:name||"Extra income",amount:sc.amount,category:"Other",essential:false,date:"Today · Income",createdAt:Date.now(),income:true});
      // Income is stored separately in state so spending totals remain correct.
      state.transactions[state.transactions.length-1].income=true;
      showToast("Income added to your plan.");
    } else {
      const category=sc.type==="emergency"?"Health":"Shopping";
      state.transactions.push({id:crypto.randomUUID(),name,amount:sc.amount,category,essential:sc.type==="emergency",date:"Today",createdAt:Date.now(),income:false});
      showToast(sc.type==="emergency"?"Unexpected expense added.":"Decision added to your spending plan.");
    }
    $("#simulatorDialog").close();saveState();render();
  }
  function bindEvents() {
    $$(".nav-item").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.view)));
    $$("[data-go]").forEach(btn=>btn.addEventListener("click",()=>navigate(btn.dataset.go)));
    $("#addExpenseTop").addEventListener("click",openExpense);
    $("#expenseForm").addEventListener("submit",e=>{
      e.preventDefault(); const name=cleanText($("#expenseName").value), amount=safeNumber($("#expenseAmount").value,1,100000);
      if(!name||amount<1){showToast("Enter a name and a valid amount.");return;}
      if(amount>Math.max(0,balance())) { if(!confirm("This expense is larger than your current balance. Add it anyway?")) return; }
      state.transactions.push({id:crypto.randomUUID(),name,amount,category:$("#expenseCategory").value,essential:$("#expenseEssential").checked,date:"Today",createdAt:Date.now()});
      saveState();render();$("#expenseDialog").close();showToast("Expense saved. Your budget is updated.");
    });
    $$("[data-close]").forEach(btn=>btn.addEventListener("click",()=>$("#"+btn.dataset.close).close()));
    $("#trySimulation").addEventListener("click",openSimulator);
    $("#simType").addEventListener("change",()=>{
      const defaults={purchase:["New sneakers",1500],emergency:["Unexpected expense",1000],subscription:["Monthly subscription",299],income:["Freelance payment",1000]};
      const d=defaults[$("#simType").value];$("#simDescription").value=d[0];$("#simAmount").value=d[1];updateSimulation();
    });
    $("#simAmount").addEventListener("input",updateSimulation);
    $("#applySimulation").addEventListener("click",applyScenario);
    $("#manageCommitments").addEventListener("click",()=>{
      stagedCommitments=state.commitments.map(c=>({...c}));renderEditableCommitments();$("#commitmentsDialog").showModal();
    });
    $("#addCommitment").addEventListener("click",()=>{
      const name=cleanText($("#commitmentName").value),amount=safeNumber($("#commitmentAmount").value,1,100000);
      if(!name||amount<1){showToast("Enter a commitment name and amount.");return;}
      stagedCommitments.push({id:crypto.randomUUID(),name,amount,due:"Upcoming",icon:"◷"});
      $("#commitmentName").value="";$("#commitmentAmount").value="";renderEditableCommitments();
    });
    $("#commitmentForm").addEventListener("submit",e=>{
      e.preventDefault();state.commitments=stagedCommitments.map(c=>({...c}));saveState();render();$("#commitmentsDialog").close();showToast("Commitments updated.");
    });
    $("#goalForm").addEventListener("submit",e=>{
      e.preventDefault();const target=safeNumber($("#goalTargetInput").value,100,1000000),saved=safeNumber($("#goalSavedInput").value,0,1000000);
      if(saved>target&&!confirm("Your saved amount is above the target. Keep it anyway?"))return;
      state.goal={name:cleanText($("#goalNameInput").value)||"Savings goal",target,saved};saveState();render();$("#goalsDialog").close();showToast("Savings goal updated.");
    });
    $("#savingsValue").addEventListener("click",()=>{});
    $("#resetBtn").addEventListener("click",()=>{if(confirm("Reset all demo expenses, goals, and commitments?")){state=defaultState();saveState();render();showToast("Demo data reset.");}});
    [$("#expenseDialog"),$("#simulatorDialog"),$("#commitmentsDialog"),$("#goalsDialog")].forEach(d=>d.addEventListener("click",e=>{if(e.target===d)d.close();}));
    document.addEventListener("keydown",e=>{if(e.key==="Escape")return;});
  }
  function renderEditableCommitments() {
    const container=$("#editableCommitments");container.replaceChildren();
    stagedCommitments.forEach(c=>{
      const row=element("div","editable-commitment");row.append(element("span","",c.name));
      const input=document.createElement("input");input.type="number";input.min="0";input.max="100000";input.value=c.amount;input.setAttribute("aria-label",`${c.name} amount`);
      input.addEventListener("change",()=>{c.amount=safeNumber(input.value,0,100000);});row.append(input);
      const del=element("button","","×");del.type="button";del.setAttribute("aria-label",`Remove ${c.name}`);del.addEventListener("click",()=>{stagedCommitments=stagedCommitments.filter(x=>x.id!==c.id);renderEditableCommitments();});row.append(del);container.append(row);
    });
  }
  bindEvents();render();
})();