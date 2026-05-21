const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if(e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
}, { threshold: 0.1 });
revealEls.forEach(el => io.observe(el));

const basePrices = { aapl: 14218, tsla: 15577, nvda: 76474, gme: 1108 };
let currentPrices = {...basePrices};
let shares = 0;
let cash = 833000;
let totalInvested = 0;
let avgCost = 0;
function formatMoney(num) {
    return '₹' + num.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}
function jitter(base) { 
    return +(base * (1 + (Math.random()-0.5) * 0.006)).toFixed(2); 
}
function updatePrices() {
  for(const key in currentPrices) {
    currentPrices[key] = jitter(basePrices[key]);
    const el = document.getElementById(key+'-price');
    if(el) { 
        el.textContent = formatMoney(currentPrices[key]); 
        el.className = Math.random() > 0.5 ? 'price-up' : 'price-down'; 
    }
  }
  document.getElementById('exec-price').textContent = formatMoney(currentPrices.aapl);
  updatePortfolio();
}
function updatePortfolio() {
  const currentTotal = cash + (shares * currentPrices.aapl);
  document.getElementById('portfolio-val').textContent = formatMoney(currentTotal);
  document.getElementById('buying-power').textContent = formatMoney(cash);
  document.getElementById('shares-owned').textContent = shares;
  document.getElementById('avg-cost').textContent = formatMoney(avgCost);
}
function addLog(msg, type='info') {
  const log = document.getElementById('ai-log');
  const colors = { warn:'#ff5f57', good:'#28c840', info:'var(--muted)' };
  const div = document.createElement('div');
  div.className = 'ai-msg';
  div.style.borderLeftColor = colors[type];
  div.innerHTML = `<span class="ai-avatar">🤖</span> ${msg}`;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function executeTrade(dir) {
  const price = currentPrices.aapl;
  
  if(dir === 'buy') {
    if(cash < price) { 
        addLog('Insufficient capital. Stop trying to over-leverage a blown account.', 'warn'); 
        return; 
    }
    
    totalInvested = (shares * avgCost) + price;
    cash -= price;
    shares++;
    avgCost = totalInvested / shares;
    
    addLog(`Executed: BUY 1 AAPL @ ${formatMoney(price)}. Avg Cost now ${formatMoney(avgCost)}.`, 'info');
    
  } else if (dir === 'sell') {
    if(shares < 1) { 
        addLog('Error: 0 shares owned. You cannot sell what you do not have.', 'warn'); 
        return; 
    }
    
    cash += price;
    shares--;
    const realizedPnL = price - avgCost;
    
    if (shares === 0) {
        avgCost = 0;
        totalInvested = 0;
    }

    if(realizedPnL < 0) {
        addLog(`Executed: SELL 1 AAPL. Realized Loss: -${formatMoney(Math.abs(realizedPnL))}. Emotional execution. Analyze why you bought high.`, 'warn');
    } else {
        addLog(`Executed: SELL 1 AAPL. Realized Profit: +${formatMoney(realizedPnL)}. Good discipline. Secure the gain.`, 'good');
    }
  }
  updatePortfolio();
}

function resetDemo() {
    shares = 0;
    cash = 833000;
    totalInvested = 0;
    avgCost = 0;
    document.getElementById('ai-log').innerHTML = '';
    addLog('System hard reset. Capital restored. Let\'s see if you can trade without letting emotions ruin it this time.', 'info');
    updatePortfolio();
}

setInterval(updatePrices, 2000);
updatePortfolio();



const apiKey = "AIzaSyAjVqu3ciWxX5o9MpZHJUJlzUg9BD-UV9Q"; 
const geminiModel = "gemini-3-flash-preview";

async function fetchWithBackoff(url, payload, retries = 5) {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(res => setTimeout(res, delays[i]));
    }
  }
}

async function callGemini(prompt, isJson = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: {
      parts: [{ text: "You are Mentor.AI, a disciplined and professional trading mentor. You are direct, honest, calm, and highly educational. You correct mistakes clearly without being rude or hostile. You help users improve their trading psychology, risk management, patience, and execution discipline. You never hype trading or encourage gambling behavior. Your tone is supportive but firm, like a real experienced mentor coaching a beginner. Keep responses concise, realistic, and impactful. Limit responses to 3 sentences maximum." }]
    }
  };

  if (isJson) {
    payload.generationConfig = { responseMimeType: "application/json" };
  }

  try {
    const data = await fetchWithBackoff(url, payload);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return isJson ? JSON.parse(text) : text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
}


function updateRmProgress(step) {
  document.getElementById('rm-p1').className = 'rm-dot ' + (step >= 1 ? (step > 1 ? 'completed' : 'active') : '');
  document.getElementById('rm-p2').className = 'rm-dot ' + (step >= 2 ? (step > 2 ? 'completed' : 'active') : '');
  document.getElementById('rm-p3').className = 'rm-dot ' + (step >= 3 ? 'active' : '');
}

function goToRmTest() {
    document.getElementById('rm-step-1').classList.remove('active');
    document.getElementById('rm-step-2').classList.add('active');
    updateRmProgress(2);
}

async function evaluateRmAnswer() {
    const answer = document.getElementById('rm-answer').value.trim();
    
    
    document.getElementById('rm-step-2').classList.remove('active');
    document.getElementById('rm-analyzing').classList.add('active');
    
    const prompt = `Evaluate this student's answer about the danger of Market Orders on low-liquidity stocks and slippage: "${answer}".
    Create a strict diagnostic response.
    Return ONLY a JSON object with this exact structure:
    {
      "diagnosis": "Short, strict evaluation of their knowledge (e.g., 'Absolute Beginner', 'Emotional', 'Delusional', or 'Competent').",
      "feedback": "1-2 harsh but educational sentences explaining exactly why their answer is right or wrong.",
      "path": [
         {"title": "Step 1 Title", "desc": "Step 1 description"},
         {"title": "Step 2 Title", "desc": "Step 2 description"}
      ]
    }`;

    const result = await callGemini(prompt, true);
    
    if (result && result.diagnosis) {
        document.getElementById('rm-analyzing').classList.remove('active');
        genRoadmapDynamic(result);
        return; // Exit if successful
    }
    
    setTimeout(() => {
      document.getElementById('rm-analyzing').classList.remove('active');
      if(answer.length < 30) {
          genRoadmap('trash');
      } else if (answer.toLowerCase().includes('slippage') || answer.toLowerCase().includes('spread')) {
          genRoadmap('passable');
      } else {
          genRoadmap('halfbaked');
      }
    }, 1800);
}

function genRoadmapDynamic(data) {
    document.querySelectorAll('.rm-step').forEach(s => s.classList.remove('active'));
    document.getElementById('rm-step-3').classList.add('active');
    updateRmProgress(3);
    
    const feedback = document.getElementById('rm-feedback-msg');
    const pathContainer = document.getElementById('rm-dynamic-path');
    
    feedback.innerHTML = `<strong>Diagnosis: ${data.diagnosis}</strong>${data.feedback}`;
    
    let html = '';
    if(data.path && Array.isArray(data.path)) {
        data.path.forEach((step, index) => {
            html += createNode(index + 1, step.title, step.desc);
        });
    }
    pathContainer.innerHTML = html;
}

function genRoadmap(type) {
    document.querySelectorAll('.rm-step').forEach(s => s.classList.remove('active'));
    document.getElementById('rm-step-3').classList.add('active');
    updateRmProgress(3);
    
    const feedback = document.getElementById('rm-feedback-msg');
    const pathContainer = document.getElementById('rm-dynamic-path');
    let html = '';

    if(type === 'noob') {
        feedback.textContent = "Absolute Beginner. At least you're honest. Do not touch real money until you clear these phases.";
        html = `
            ${createNode(1, "Market Mechanics", "Understand what a stock is. Stop treating it like a lottery ticket. Learn bid/ask, liquidity, and volume.")}
            ${createNode(2, "Risk Mathematics", "Learn position sizing. If you risk 50% of your account on one trade, you are a gambler, not a trader.")}
            ${createNode(3, "Simulator Bootcamp", "Spend 30 days on our terminal. Do not proceed until your Discipline Score is above 80.")}
        `;
    } else if (type === 'loser') {
        feedback.textContent = "Emotional Trader. You have the theory, but you lack discipline. Your psychology is your bottleneck.";
        html = `
            ${createNode(1, "Audit Your Losses", "Export your trade history. Identify every trade where you deviated from your plan. Face the numbers.")}
            ${createNode(2, "The Stop-Loss Contract", "Learn to set a hard stop-loss and walk away. Hope is not a risk management strategy.")}
            ${createNode(3, "Behavioral Reprogramming", "Use the Crash Simulator. We will trigger FOMO setups to test if you chase green candles.")}
        `;
    } else if (type === 'trash') {
        feedback.textContent = "Delusional. Your answer was emotional and full of buzzwords, but you missed the core mechanics. You are dangerously misinformed.";
        html = `
            ${createNode(1, "Ego Check", "You don't know what you don't know. Start by reading the 'Mechanics of Order Execution' module.")}
            ${createNode(2, "Market vs Limit Execution", "Learn why a market order on an illiquid stock will destroy your capital via slippage.")}
            ${createNode(3, "Risk to Reward Ratios", "If your slippage eats 20% of your expected profit, your setup is garbage. Learn the math.")}
        `;
    } else if (type === 'halfbaked') {
        feedback.textContent = "Half-Baked. You used a lot of words but missed the core mechanics of slippage. Let's patch your weak points.";
        html = `
            ${createNode(1, "Order Book Dynamics", "Study the Level 2 data. See how wide spreads consume market orders.")}
            ${createNode(2, "Slippage Calculation", "Calculate exact R:R decay based on average daily volume and spread sizes.")}
        `;
    } else if (type === 'passable') {
        feedback.textContent = "Competent. Your answer was solid, but don't get arrogant. Here is your advanced path.";
        html = `
            ${createNode(1, "Advanced Strategy Lab", "Test Mean Reversion vs Trend Following in our Battle Lab under high volatility conditions.")}
            ${createNode(2, "Algorithmic Psychology", "Remove manual execution. Begin building rule-based systems that don't rely on your mood.")}
        `;
    }
    
    pathContainer.innerHTML = html;
}

function createNode(num, title, desc) {
    return `
    <div class="rm-path-item">
        <div class="rm-path-node">${num}</div>
        <div class="rm-path-content">
            <h4>${title}</h4>
            <p>${desc}</p>
        </div>
    </div>`;
}

function resetRoadmap() {
    document.getElementById('rm-answer').value = '';
    document.querySelectorAll('.rm-step').forEach(s => s.classList.remove('active'));
    document.getElementById('rm-analyzing').classList.remove('active');
    document.getElementById('rm-step-1').classList.add('active');
    updateRmProgress(1);
}

function toggleChat() {
    const win = document.getElementById('chat-window');
    win.classList.toggle('open');
    if(win.classList.contains('open')) {
        setTimeout(() => document.getElementById('chat-input').focus(), 100);
    }
}

async function handleChat() {
    const inputField = document.getElementById('chat-input');
    const text = inputField.value.trim();
    if(!text) return;
    
    appendChat(text, 'user');
    inputField.value = '';
    
    const thinkingId = 'think-' + Date.now();
    appendChat('<span style="opacity:0.6; font-style:italic;">Analyzing behavior...</span>', 'ai', thinkingId);
    
    const prompt = `The student says: "${text}".

Respond like a disciplined professional trading mentor.

Be honest and direct, but not insulting or aggressive.

If the user's thinking is weak, explain why clearly and guide them toward better risk management, emotional control, patience, or execution.

Encourage learning and discipline instead of hype.

Keep the response concise and under 3 sentences.`;
    const response = await callGemini(prompt, false);
    
    document.getElementById(thinkingId)?.remove();
    if (response) {
        appendChat(response, 'ai');
        return;
    }
    
  
    setTimeout(() => {
        document.getElementById(thinkingId)?.remove();
        const response = getStrictMentorResponse(text.toLowerCase());
        appendChat(response, 'ai');
    }, 600);
}

function appendChat(msg, sender, id = null) {
    const body = document.getElementById('chat-body');
    const div = document.createElement('div');
    div.className = `chat-bubble chat-${sender}`;
    if (id) div.id = id;
    div.innerHTML = msg;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

function getStrictMentorResponse(input) {
    if(input.includes("lose") || input.includes("losing") || input.includes("loss")) {
        return "Hope is for gamblers. Stop it. Losses are data. Analyze them without emotion. What exactly did you do, and why did it fail?";
    }
    if(input.includes("strategy") || input.includes("plan")) {
        return "Most strategies are half-baked. If you can't write your strategy down in 3 simple rules, you don't have a strategy, you have a guessing game. What are your 3 rules?";
    }
    if(input.includes("profit") || input.includes("win")) {
        return "Good trade — but stay objective. Review whether the profit came from a repeatable setup or just favorable market conditions.";
    }
    if(input.includes("scared") || input.includes("fear") || input.includes("panic")) {
        return "Fear means your position size is too big. Cut your size in half until you can look at the chart without your heart rate spiking. Bulletproof your emotions.";
    }
    return "You're focusing on the wrong thing. Step back and analyze the actual data and decision-making process. What specifically caused the outcome?";
}

function openAuth(type) {
  document.getElementById('authModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchAuth(type);
}

function closeAuth() {
  document.getElementById('authModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function switchAuth(type) {
  const isLogin = type === 'login';
  
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-signup').classList.toggle('active', !isLogin);
  
  document.getElementById('form-login').classList.toggle('active', isLogin);
  document.getElementById('form-signup').classList.toggle('active', !isLogin);
  
  document.getElementById('auth-title').textContent = isLogin ? 'Access Terminal' : 'Initialize Protocol';
  document.getElementById('auth-subtitle').textContent = isLogin ? 'Stop lurking. Face the market.' : 'Commit to the process. No excuses.';
}

function handleAuthSubmit(type) {
  const formId = `#form-${type}`;
  const btn = document.querySelector(`${formId} .auth-submit`);
  const originalText = btn.textContent;
  
  let userName = "Trader";
  if(type === 'signup') {
    const nameInput = document.querySelector(`${formId} input[type="text"]`);
    if(nameInput && nameInput.value) userName = nameInput.value.split(' ')[0];
  }
  
  btn.textContent = 'Authenticating...';
  btn.style.opacity = '0.7';
  
  
  setTimeout(() => {
    btn.textContent = 'Access Granted.';
    btn.style.background = 'var(--green)';
    
    setTimeout(() => {
      closeAuth();
      btn.textContent = originalText;
      btn.style.background = '';
      btn.style.opacity = '1';
      document.querySelector(formId).reset();
      
      document.getElementById('auth-buttons').style.display = 'none';
      document.getElementById('user-menu').style.display = 'flex';
      document.getElementById('user-greeting').textContent = `OP: ${userName}`;
      
      addLog(`Trader authenticated via ${type}. Engine active. Let's see your execution.`, 'good');
    }, 800);
  }, 1200);
}

function handleLogout() {
  document.getElementById('auth-buttons').style.display = 'flex';
  document.getElementById('user-menu').style.display = 'none';
  addLog('Session terminated. You logged out. Running away from the market?', 'warn');
}
document.querySelectorAll('.auth-input').forEach(input=>{
  input.addEventListener('focus',()=>{
    input.parentElement.style.transform='translateY(-2px)';
  });

  input.addEventListener('blur',()=>{
    input.parentElement.style.transform='translateY(0px)';
  });
});

function toggleFaq(el) {
  const item = el.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if(!isOpen) item.classList.add('open');
}
function subscribeNewsletter() {
  const email = document.getElementById('nl-email').value;
  if(!email.includes('@')) { alert('Please enter a valid email.'); return; }
  document.getElementById('nl-success').style.display = 'block';
  document.getElementById('nl-email').value = '';
}


const features = [
  {
    icon: '📈', title: 'Virtual Trading Engine', badge: 'Core Module', badgeColor: 'plan-free',
    tagline: 'Practice buying and selling stocks with ₹8,33,000 in virtual cash — zero real risk.',
    desc: 'The Virtual Trading Engine replicates a real brokerage experience—live simulated prices, dynamic cost basis tracking, and portfolio tracking—so you build muscle memory before investing a single real rupee.',
    capabilities: ['Dynamic Avg Cost Basis calculation', 'Set limit orders and stop-losses', 'Track real-time P&L', 'Simulate multiple portfolios'],
    benefits: ['Build trading habits without financial risk', 'Understand order types before going live', 'Gain confidence before opening a broker account'],
    demo: '🖥 Demo Preview: Scroll up to the Execution Terminal. Select a stock, enter quantity, and hit BUY. Watch your portfolio update instantly.',
    plans: ['plan-free|Free', 'plan-pro|Professional', 'plan-ent|Enterprise']
  },
  {
    icon: '⚗️', title: 'Strategy Battle Lab', badge: 'Pro Feature', badgeColor: 'plan-pro',
    tagline: 'Run two trading strategies head-to-head and see which one wins — with data.',
    desc: 'The Strategy Battle Lab lets you define two different trading approaches and simulate both on the same market data simultaneously. See which strategy generates better returns, lower drawdowns, and more consistent wins.',
    capabilities: ['Define custom rules for Strategy A vs Strategy B', 'Run both on the same market period', 'Compare ROI, max drawdown, Sharpe ratio'],
    benefits: ['Stop guessing which strategy "feels" better', 'Learn risk-adjusted returns vs raw profit', 'Build a data-driven investment thesis'],
    demo: '⚔️ Example Battle: "Buy every Monday" vs "Buy on RSI dip below 30" — run both on NIFTY50. See which outperforms.',
    plans: ['plan-pro|Professional', 'plan-ent|Enterprise']
  },
  {
    icon: '🎯', title: 'Market Crash Simulator', badge: 'Pro Feature', badgeColor: 'plan-pro',
    tagline: 'Experience a 2008-style crash or COVID meltdown — and learn how YOU respond.',
    desc: 'Most traders never know how they\'ll behave in a crash until it\'s too late. The Crash Simulator recreates historical market collapses and drops you into them in real time. Your job: survive without panic selling.',
    capabilities: ['Replay 6 historical crash scenarios', 'Trade in real-time as the crash unfolds', 'See your Discipline Score drop under pressure'],
    benefits: ['Build emotional resilience', 'Learn the difference between rebalancing and panic', 'Create a crash playbook'],
    demo: '📉 Scenario: It\'s March 2020. COVID hits. NIFTY drops 38% in 40 days. Can you hold? Or will you sell at the bottom?',
    plans: ['plan-pro|Professional', 'plan-ent|Enterprise']
  },
  {
    icon: '📊', title: 'Portfolio Intelligence', badge: 'Analytics Suite', badgeColor: 'plan-pro',
    tagline: 'See your portfolio the way professional fund managers see theirs.',
    desc: 'Transforms your simulated trades into actionable analytics. Understand your actual exposure — sector concentration, asset correlation, risk-adjusted return, and how your portfolio stacks up against benchmarks.',
    capabilities: ['Asset allocation pie chart', 'Risk vs Return scatter plot per holding', 'Compare performance vs NIFTY benchmark'],
    benefits: ['Understand concentration risk', 'Learn what "diversified" actually means', 'See if your returns justify the risk'],
    demo: '📊 Insight Example: Portfolio Intelligence flags your 68% IT exposure as high sector concentration risk.',
    plans: ['plan-pro|Professional', 'plan-ent|Enterprise']
  },
  {
    icon: '🌐', title: 'Market Intelligence', badge: 'Research Tool', badgeColor: 'plan-pro',
    tagline: 'Stay macro-aware with news sentiment, sector trends, and market breadth data.',
    desc: 'Market Intelligence aggregates sector performance data, FII/DII flows, sentiment indicators, and trending stocks so you always know what the broader market is doing and why.',
    capabilities: ['NIFTY sector heatmap', 'FII/DII flow tracker', 'News sentiment score per sector'],
    benefits: ['Learn to read the market, not just your stocks', 'Understand how macro events move sectors', 'Stop trading in a vacuum'],
    demo: '🌐 Live Intelligence: FIIs bought ₹3,240 Cr in Banking. Market breadth shows 73% advancing. Sentiment: Bullish.',
    plans: ['plan-pro|Professional', 'plan-ent|Enterprise']
  },
  {
    icon: '🧠', title: 'Strict AI Auditing', badge: '★ Core Feature', badgeColor: 'plan-pro',
    tagline: 'The AI that watches your emotions, not just your profits.',
    desc: 'The AI Behavioral Engine analyzes every trade you make and detects psychological patterns that cause real-world losses—FOMO buying, panic selling, overtrading. It does not sugarcoat its findings.',
    capabilities: ['Detects cognitive biases in real time', 'FOMO alert when you chase green candles', 'Panic sell detection during drawdowns'],
    benefits: ['Treats psychology as a risk factor', 'Builds self-awareness that carries into real markets', 'Reduces common retail losses'],
    demo: '🧠 Example: You bought a stock after it spiked 8%. AI flags "Emotional execution: FOMO Buy." Discipline Score drops 4 points.',
    plans: ['plan-pro|Professional', 'plan-ent|Enterprise']
  },
  {
    icon: '⚖️', title: 'Discipline Score', badge: 'Behavioral Metric', badgeColor: 'plan-pro',
    tagline: 'A single number that tells you how good a trader you actually are.',
    desc: 'Profit is not the best measure of a good trader—discipline is. The Discipline Score tracks how consistently you follow your own rules, cut losses, avoid emotional trades, and stick to your strategy.',
    capabilities: ['Real-time score updated after every trade', 'Breakdown by loss discipline, sizing, frequency', 'Score comparison with platform average'],
    benefits: ['Focuses you on process, not just outcome', 'Gamifies good behaviour and rewards consistency', 'Provides a benchmark to improve against'],
    demo: '⚖️ Score Breakdown: Loss Discipline 62/100. Emotional Control 71/100. Overall: 73. Target: 85+ to unlock Elite badge.',
    plans: ['plan-pro|Professional', 'plan-ent|Enterprise']
  },
  {
    icon: '🛣️', title: 'Diagnostic Roadmaps', badge: 'Personalised AI', badgeColor: 'plan-pro',
    tagline: 'Stop guessing what you need to learn. Get interrogated by AI.',
    desc: 'The AI doesn\'t just give you a generic tutorial. It asks you hard questions to expose your weak points, then generates a custom, step-by-step syllabus to patch those specific vulnerabilities.',
    capabilities: ['Interactive knowledge interrogation', 'Identifies half-baked understanding', 'Generates a strict step-by-step learning path'],
    benefits: ['Saves time by skipping what you already know', 'Forces you to confront your knowledge gaps', 'Provides an actionable path forward'],
    demo: '🛣️ Example: Scroll up to the "Diagnostic Protocol" section and attempt Level 2 to see the interrogation engine.',
    plans: ['plan-pro|Professional', 'plan-ent|Enterprise']
  },
  {
    icon: '🎓', title: 'Learning Hub', badge: 'Education Centre', badgeColor: 'plan-free',
    tagline: 'From absolute zero to market-ready — structured, practical, and free to start.',
    desc: 'A full financial education portal built for investors. Covers everything from basic mechanics to advanced psychology. Lessons are bite-sized, followed by quizzes, and tied to simulation exercises.',
    capabilities: ['45+ structured lessons', 'Interactive quizzes after every lesson', 'Glossary of 200+ Indian market terms'],
    benefits: ['Free beginner path covers 80% of what retail investors need', 'Learn at your own pace', 'Ties directly into the simulator'],
    demo: '🎓 Module Preview: Lesson 7: "Why Retail Investors Panic." 8 min read + 5-question quiz + linked simulation exercise.',
    plans: ['plan-free|Free (Beginner Path)', 'plan-pro|Professional (Full Path)', 'plan-ent|Enterprise']
  }
];

let currentFeat = 0;

function openFeature(idx) {
  currentFeat = idx;
  renderFeatModal();
  document.getElementById('featModalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeFeatModal() {
  document.getElementById('featModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function navigateFeature(dir) {
  currentFeat = (currentFeat + dir + features.length) % features.length;
  renderFeatModal();
}

function renderFeatModal() {
  const f = features[currentFeat];
  document.getElementById('fmIcon').textContent = f.icon;
  document.getElementById('fmTitle').textContent = f.title;
  document.getElementById('fmTagline').textContent = f.tagline;
  document.getElementById('fmDesc').textContent = f.desc;
  document.getElementById('fmDemo').textContent = f.demo;
  document.getElementById('fmCounter').textContent = (currentFeat+1) + ' / ' + features.length;

  const badge = document.getElementById('fmBadge');
  badge.textContent = f.badge;
  badge.className = 'feat-modal-badge ' + (f.badgeColor === 'plan-pro' ? 'plan-pro' : f.badgeColor === 'plan-ent' ? 'plan-ent' : 'plan-free');

  const caps = document.getElementById('fmCapabilities');
  caps.innerHTML = f.capabilities.map(c => `<li>${c}</li>`).join('');
  const bens = document.getElementById('fmBenefits');
  bens.innerHTML = f.benefits.map(b => `<li>${b}</li>`).join('');

  const plans = document.getElementById('fmPlans');
  plans.innerHTML = f.plans.map(p => {
    const [cls, label] = p.split('|');
    return `<span class="plan-pill ${cls}">${label}</span>`;
  }).join(' ');
}
