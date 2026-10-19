/* CyberSA Learn central research tracking client */
(function () {
  const API = '/api';
  const TOKEN_KEY = 'cybersaAuthToken';
  const USER_KEY = 'cybersaLearner';
  const MODS = {
    'module1.html': { id: 'M1', title: 'Phishing & Social Engineering' },
    'module2.html': { id: 'M2', title: 'Cybercrimes Act 2021 & POPIA' },
    'module3.html': { id: 'M3', title: 'Password Security & Authentication' },
    'module4.html': { id: 'M4', title: 'Safe Internet & Social Media Use' },
    'module5.html': { id: 'M5', title: 'Cyber Attack Awareness' }
  };
  const MODULE_SEQUENCE = Object.entries(MODS);
  const page = location.pathname.split('/').pop() || 'index.html';
  const mod = MODS[page];

  const token = () => localStorage.getItem(TOKEN_KEY);
  const authHeaders = () => token() ? { Authorization: `Bearer ${token()}` } : {};
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));

  async function api(path, options = {}) {
    const headers = { ...(options.headers || {}), ...authHeaders() };
    if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API}${path}`, { ...options, headers });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || `Request failed (${res.status})`);
    return res.status === 204 ? null : res.json();
  }

  function ensureStyles() {
    if (document.getElementById('cs-track-style')) return;
    const s = document.createElement('style'); s.id = 'cs-track-style';
    s.textContent = `
      #cs-modal{position:fixed;inset:0;background:rgba(34,33,58,.28);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}
      #cs-modal .box{max-width:480px;width:100%;background:#fff;border:1px solid #E4E2EE;border-radius:16px;padding:28px;box-shadow:0 24px 70px rgba(34,33,58,.18)}
      #cs-modal h2{color:#22213A;margin:0 0 8px;font-size:22px}#cs-modal p{color:#6B6B85;font-size:13px;line-height:1.6;margin:0 0 18px}
      #cs-modal label{display:block;color:#22213A;font-size:12px;font-weight:600;margin:12px 0 6px}#cs-modal input{width:100%;padding:11px 12px;border-radius:8px;border:1px solid #E4E2EE;background:#fff;color:#22213A;font:inherit}
      #cs-modal button,#cs-recovery button{width:100%;margin-top:18px;padding:11px;border:0;border-radius:8px;background:#4C5FD5;color:#fff;font-weight:700;cursor:pointer}
      #cs-modal .cs-switch{display:block;width:100%;margin-top:14px;padding:10px;text-align:center;color:#4C5FD5;font:600 13px Inter,sans-serif;background:#F5F4FF;border:1px solid #DCD8F2;border-radius:8px;cursor:pointer}#cs-modal .cs-switch:hover{background:#EDEAFB}#cs-recovery{position:fixed;inset:0;background:rgba(34,33,58,.28);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:10000;padding:18px}#cs-recovery .box{max-width:500px;width:100%;background:#fff;border:1px solid #E4E2EE;border-radius:16px;padding:28px;box-shadow:0 24px 70px rgba(34,33,58,.18)}#cs-recovery h2{margin:0 0 10px;color:#22213A}#cs-recovery p{color:#6B6B85;font-size:13px;line-height:1.6}#cs-recovery input{width:100%;margin-top:12px;padding:12px;border:1px solid #E4E2EE;border-radius:8px;font:700 18px monospace;letter-spacing:1px;color:#22213A}
      .cs-user{color:#4C5FD5;font-weight:600}.cs-feedback{margin:28px 0;padding:22px;background:#FAF9FB;border:1px solid #E4E2EE;border-radius:12px}.cs-feedback h3{margin:0 0 6px;color:#22213A}.cs-feedback p{color:#6B6B85;font-size:13px}
      .cs-feedback select,.cs-feedback textarea{width:100%;margin-top:8px;background:#fff;color:#22213A;border:1px solid #E4E2EE;border-radius:8px;padding:10px;font:inherit}.cs-feedback textarea{min-height:90px;resize:vertical}.cs-feedback button{margin-top:12px;padding:10px 18px;border:0;border-radius:7px;background:#4C5FD5;color:#fff;font-weight:700}
      .cs-user-menu{position:relative;display:inline-block}.cs-user-menu>summary{list-style:none;cursor:pointer;border:1px solid #E4E2EE;background:#fff;color:#22213A;border-radius:8px;padding:8px 11px;font-size:12px}.cs-user-menu>summary::-webkit-details-marker{display:none}.cs-user-menu>summary:hover{border-color:#C8C5E8;color:#4C5FD5}.cs-user-menu-items{position:absolute;right:0;top:calc(100% + 7px);z-index:1000;min-width:190px;padding:6px;background:#fff;border:1px solid #E4E2EE;border-radius:10px;box-shadow:0 10px 28px rgba(34,33,58,.14)}.cs-user-menu-items a,.cs-user-menu-items button{display:block;width:100%;padding:10px;border:0;border-radius:6px;background:#fff;color:#22213A;text-align:left;text-decoration:none;font:12px Inter,sans-serif;cursor:pointer}.cs-user-menu-items a:hover,.cs-user-menu-items button:hover{background:#F5F4FF;color:#4C5FD5}.cs-logout{border:1px solid #E4E2EE;background:#fff;color:#22213A;border-radius:7px;padding:7px 10px;font-size:11px;cursor:pointer}.cs-logout:hover{border-color:#C8C5E8;color:#4C5FD5}
      .topic-link.active{color:#2E9B6F!important}.topic-link.active .dot{background:#2E9B6F!important}
      .cs-home-progress{margin:0 0 20px;padding:20px 22px;border:1px solid #E4E2EE;border-radius:14px;background:#fff}.cs-home-progress-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.cs-home-progress h3{margin:0;color:#22213A;font-size:16px}.cs-home-progress-count{color:#4C5FD5;font-size:14px;font-weight:700;white-space:nowrap}.cs-home-progress-track{height:8px;margin:13px 0 15px;background:#EDEAFB;border-radius:99px;overflow:hidden}.cs-home-progress-fill{height:100%;background:#4C5FD5;border-radius:99px;transition:width .25s}.cs-home-progress-list{display:flex;flex-wrap:wrap;gap:8px}.cs-home-progress-item{padding:6px 10px;border:1px solid #E4E2EE;border-radius:999px;color:#6B6B85;font-size:11px}.cs-home-progress-item.done{background:#EAF7F1;border-color:#C8E5D8;color:#247A57}.cs-home-progress-item.next{border-color:#C8C5E8;color:#4C5FD5;font-weight:600}
      .module-card.cs-module-locked{opacity:.62;cursor:not-allowed}.module-card.cs-module-locked:hover{transform:none;box-shadow:none;border-color:#E4E2EE}.cs-module-lock{padding:24px;border:1px solid #E4E2EE;border-radius:14px;background:#fff;color:#22213A}.cs-module-lock p{margin:10px 0 18px;color:#6B6B85;line-height:1.6}.cs-module-lock a{display:inline-block;margin-right:10px;padding:10px 14px;border-radius:8px;background:#4C5FD5;color:#fff;text-decoration:none;font-weight:600}.cs-module-lock a.secondary{background:#F5F4FF;color:#4C5FD5;border:1px solid #DCD8F2}
    `; document.head.appendChild(s);
  }

  function showLogin() {
    ensureStyles();
    if (document.getElementById('cs-modal')) return;
    const m = document.createElement('div'); m.id = 'cs-modal';
    m.innerHTML = `<div class="box"><h2>Welcome to CyberSA Learn</h2><div id="cs-create-panel"><p>New here? Create a learner record. You’ll receive a participant ID and recovery code to save.</p><label for="cs-name">Full Name</label><input id="cs-name" placeholder="Your name" autocomplete="name" required aria-describedby="cs-name-error"><p id="cs-name-error" role="alert" style="display:none;margin:7px 0 0;color:#B42318;font-size:12px">Please enter your name to create a learner record.</p><button id="cs-start">Create Learner Record</button><button type="button" class="cs-switch" id="cs-show-login">Returning Learner? Sign In With Your Participant ID</button></div><div id="cs-login-panel" style="display:none"><p>Enter the participant ID and recovery code you saved earlier to continue your existing learner record.</p><p id="cs-login-error" role="alert" aria-live="polite" style="display:none;margin:0 0 14px;padding:10px 12px;border:1px solid #F1B9B5;border-radius:8px;background:#FFF4F2;color:#A52A22;font-size:13px;line-height:1.5"></p><label for="cs-participant-id">Participant ID</label><input id="cs-participant-id" placeholder="CS-0001" autocomplete="username" aria-describedby="cs-login-error"><label for="cs-recovery-code">Recovery Code</label><input id="cs-recovery-code" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autocomplete="one-time-code" aria-describedby="cs-login-error"><button id="cs-login">Sign In</button><button type="button" class="cs-switch" id="cs-show-create">New Learner? Create a Learner Record</button></div><p style="margin:20px 0 0;text-align:center"><a href="dashboard.html" style="color:#4C5FD5;font-size:13px;font-weight:600">Researcher Sign In →</a></p></div>`;
    document.body.appendChild(m);
    document.getElementById('cs-show-login').onclick = () => { document.getElementById('cs-create-panel').style.display='none'; document.getElementById('cs-login-panel').style.display='block'; };
    document.getElementById('cs-show-create').onclick = () => { document.getElementById('cs-login-panel').style.display='none'; document.getElementById('cs-create-panel').style.display='block'; };
    ['cs-participant-id', 'cs-recovery-code'].forEach(id => document.getElementById(id).addEventListener('input', () => {
      const error = document.getElementById('cs-login-error');
      error.style.display='none'; error.textContent='';
      document.getElementById('cs-participant-id').removeAttribute('aria-invalid');
      document.getElementById('cs-recovery-code').removeAttribute('aria-invalid');
    }));
    document.getElementById('cs-name').addEventListener('input', () => {
      const field = document.getElementById('cs-name');
      const error = document.getElementById('cs-name-error');
      if (field.value.trim()) { error.style.display='none'; field.removeAttribute('aria-invalid'); }
    });
    document.getElementById('cs-start').onclick = async () => {
      const nameField = document.getElementById('cs-name');
      const nameError = document.getElementById('cs-name-error');
      const name = nameField.value.trim();
      if (!name) { nameError.style.display='block'; nameField.setAttribute('aria-invalid','true'); nameField.focus(); return; }
      nameError.style.display='none'; nameField.removeAttribute('aria-invalid');
      const button = document.getElementById('cs-start'); button.disabled = true; button.textContent = 'Creating learner record...';
      try {
        const user = await api('/learners', { method:'POST', body: JSON.stringify({ name }) });
        localStorage.setItem(TOKEN_KEY, user.token); localStorage.setItem(USER_KEY, user.participant_id); m.remove();
        showRecoveryCode(user.recovery_code, () => location.reload());
      } catch (e) { button.disabled = false; button.textContent = 'Start Learning'; alert(e.message); }
    };
    document.getElementById('cs-login').onclick = async () => {
      const button=document.getElementById('cs-login');button.disabled=true;button.textContent='Signing in...';
      try {
        const user=await api('/learners/session',{method:'POST',body:JSON.stringify({participant_id:document.getElementById('cs-participant-id').value.trim(),recovery_code:document.getElementById('cs-recovery-code').value.trim()})});
        localStorage.setItem(TOKEN_KEY,user.token);localStorage.setItem(USER_KEY,user.participant_id);location.reload();
      } catch(e) {
        button.disabled=false;button.textContent='Sign In';
        const error=document.getElementById('cs-login-error');
        error.textContent=e.message==='Participant ID or recovery code is incorrect' ? 'Participant ID or recovery code is incorrect. Check both and try again.' : e.message;
        error.style.display='block';
        document.getElementById('cs-participant-id').setAttribute('aria-invalid','true');
        document.getElementById('cs-recovery-code').setAttribute('aria-invalid','true');
      }
    };
  }

  function showResearcherError() {
    const reason = new URLSearchParams(location.search).get('researcherError');
    if (!reason) return;
    const messages = {
      invalid: 'Researcher sign-in failed. The password was incorrect. Please try again.',
      unavailable: 'Researcher sign-in failed because the server could not be reached. Check that CyberSA is running, then try again.'
    };
    const message = messages[reason];
    if (message) {
      const notice = document.createElement('div');
      notice.setAttribute('role', 'alert');
      notice.setAttribute('aria-live', 'assertive');
      notice.textContent = message;
      notice.style.cssText = 'margin:14px 0;padding:12px 14px;border:1px solid #F1B9B5;border-radius:9px;background:#FFF4F2;color:#A52A22;font-size:13px;line-height:1.5';
      const box = document.querySelector('#cs-modal .box');
      if (box) box.querySelector('h2').insertAdjacentElement('afterend', notice);
      else document.querySelector('.topbar')?.insertAdjacentElement('afterend', notice);
    }
    history.replaceState(null, '', location.pathname + location.hash);
  }

  function showRecoveryCode(code, onContinue=()=>{}) {
    ensureStyles();
    const modal=document.createElement('div');modal.id='cs-recovery';
    modal.innerHTML=`<div class="box"><h2>Save Your Recovery Code</h2><p>This code lets you return to <strong>${esc(localStorage.getItem(USER_KEY))}</strong> and its saved progress. It is shown only now. Save it somewhere private; anyone with your participant ID and code can access this learner record.</p><input id="cs-recovery-value" value="${esc(code)}" readonly aria-label="Recovery Code"><button id="cs-copy-code" type="button">Copy Recovery Code</button><button id="cs-saved-code" type="button">I’ve saved it. Continue</button></div>`;
    document.body.appendChild(modal);
    document.getElementById('cs-copy-code').onclick=async()=>{const field=document.getElementById('cs-recovery-value');try{await navigator.clipboard.writeText(code);document.getElementById('cs-copy-code').textContent='Copied';}catch{field.select();document.execCommand('copy');document.getElementById('cs-copy-code').textContent='Copied';}};
    document.getElementById('cs-saved-code').onclick=()=>{modal.remove();onContinue();};
  }

  async function ensureRecoveryCode() {
    try {
      const status=await api('/recovery-code');
      if(!status.has_recovery_code){const issued=await api('/recovery-code',{method:'POST',body:'{}'});if(issued.recovery_code)showRecoveryCode(issued.recovery_code);}
    } catch(e) { console.error('Could not check learner recovery code',e); }
  }

  async function currentUser() { if (!token()) return null; try { return await api('/me'); } catch { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); return null; } }

  function renderUser(user) {
    if (!user) return;
    document.querySelectorAll('.student').forEach(e => { e.textContent = user.name ? `${user.name} · ${user.participant_id}` : user.participant_id; e.classList.add('cs-user'); });
    const label = document.getElementById('participant-label'); if (label) label.textContent = user.name ? `${user.name} · ${user.participant_id}` : `Participant ${user.participant_id}`;
    document.querySelectorAll('.topbar-right,.top-actions').forEach(e => {
      let wrap=e.querySelector('.cs-user-menu');
      if(!wrap){wrap=document.createElement('details');wrap.className='cs-user-menu';wrap.innerHTML='<summary>Menu</summary><div class="cs-user-menu-items"></div>';e.appendChild(wrap);}
      const menuItems=wrap.querySelector('.cs-user-menu-items');
      let research=e.querySelector('a[href="dashboard.html"]');
      if(research&&research.parentElement!==menuItems)menuItems.appendChild(research);
      if(!research){research=document.createElement('a');research.href='dashboard.html';research.textContent='Researcher Area';menuItems.appendChild(research);}
      research.className='cs-menu-link';
      if (wrap.querySelector('.cs-logout')) return;
      const recovery = document.createElement('button'); recovery.className = 'cs-logout'; recovery.textContent = 'Replace Recovery Code';
      recovery.onclick = async () => {
        const modal=document.createElement('div');modal.id='cs-recovery-confirm';
        modal.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(34,33,58,.35);display:grid;place-items:center;padding:20px';
        modal.innerHTML=`<div role="dialog" aria-modal="true" aria-labelledby="cs-recovery-confirm-title" style="background:#fff;border:1px solid #E4E2EE;border-radius:14px;padding:24px;max-width:460px;width:100%;box-shadow:0 20px 60px #22213A33"><h2 id="cs-recovery-confirm-title" style="margin:0 0 10px;font-size:20px">Replace Recovery Code?</h2><p style="color:#6B6B85;font-size:13px;line-height:1.6">This replaces the code for <strong>${esc(user.participant_id)}</strong>. The same learner record and progress stay in place. The old code will stop working.</p><p id="cs-recovery-confirm-error" role="alert" style="display:none;color:#B42318;font-size:12px"></p><div style="display:flex;gap:9px;justify-content:flex-end;margin-top:16px"><button class="cs-logout" id="cs-recovery-cancel" type="button">Cancel</button><button class="cs-logout" id="cs-recovery-confirm-button" type="button" style="background:#4C5FD5;color:#fff;border-color:#4C5FD5;font-weight:700">Replace Code</button></div></div>`;
        document.body.appendChild(modal);
        modal.querySelector('#cs-recovery-cancel').onclick=()=>modal.remove();
        modal.querySelector('#cs-recovery-confirm-button').onclick=async event=>{
          const button=event.currentTarget,error=modal.querySelector('#cs-recovery-confirm-error');button.disabled=true;button.textContent='Replacing…';
          try { const result=await api('/recovery-code/rotate',{method:'POST',body:'{}'});modal.remove();showRecoveryCode(result.recovery_code); }
          catch(e) { error.textContent=e.message;error.style.display='block';button.disabled=false;button.textContent='Replace Code'; }
        };
      };
      const out = document.createElement('button'); out.className = 'cs-logout'; out.textContent = 'Log Out';
      out.onclick = async () => {
        try { await api('/logout',{method:'POST',body:'{}'}); } catch {}
        localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); location.href = 'index.html';
      };
      menuItems.appendChild(recovery); menuItems.appendChild(out);
    });
  }

  function showModuleAssessmentScore(score) {
    const label = document.querySelector('.progress-label span:last-child');
    const fill = document.querySelector('.progress-fill');
    if (label) label.textContent = score == null ? 'Not Assessed' : `${score}%`;
    if (fill) fill.style.width = `${score == null ? 0 : Math.max(0, Math.min(100, score))}%`;
  }

  function showPostAssessmentNextStep(container) {
    if (!container || document.getElementById('cs-post-assessment-next-step')) return;
    const nextStep = document.createElement('section');
    nextStep.id = 'cs-post-assessment-next-step';
    nextStep.setAttribute('aria-labelledby', 'cs-post-assessment-title');
    nextStep.style.cssText = 'margin:24px 0;padding:22px 24px;border:2px solid #4C5FD5;border-radius:14px;background:#F5F4FF';
    nextStep.innerHTML = '<h2 id="cs-post-assessment-title" style="margin:0 0 7px;font-size:19px;color:#22213A">All Five Module Checks Passed. Take Your Post-Assessment.</h2><p style="margin:0 0 15px;color:#6B6B85;line-height:1.6">You have completed the module knowledge checks. The final assessment is your next step.</p><a href="post-assessment.html" style="display:inline-block;padding:11px 16px;border-radius:8px;background:#4C5FD5;color:#fff;text-decoration:none;font-weight:700">Start post-assessment →</a>';
    container.insertAdjacentElement('afterend', nextStep);
  }

  function renderHomeProgress(saved) {
    const host = document.querySelector('.section-head');
    if (!host) return;
    const completedModules = new Set(saved.completed_modules || []);
    const postScores = saved.post_assessment_scores || [];
    const postComplete = postScores.some(score => Number(score) >= 70);
    const milestones = [
      ['M1', 'Module 1'], ['M2', 'Module 2'], ['M3', 'Module 3'],
      ['M4', 'Module 4'], ['M5', 'Module 5']
    ];
    const doneCount = completedModules.size + (postComplete ? 1 : 0);
    const allModulesComplete = milestones.every(([id]) => completedModules.has(id));
    const nextIndex = milestones.findIndex(([id]) => !completedModules.has(id));
    const nextIsPost = nextIndex === -1 && !postComplete;
    const items = milestones.map(([id, title]) => {
      const done = completedModules.has(id);
      const next = !done && nextIndex !== -1 && milestones[nextIndex][0] === id;
      return `<span class="cs-home-progress-item${done ? ' done' : next ? ' next' : ''}">${done ? '✓ ' : ''}${title}${done ? ' · Completed' : next ? ' · Next up' : ''}</span>`;
    });
    items.push(`<span class="cs-home-progress-item${postComplete ? ' done' : nextIsPost ? ' next' : ''}">${postComplete ? '✓ ' : ''}Post-Assessment${postComplete ? ' · Completed' : nextIsPost ? ' · Next up' : ''}</span>`);
    let card = document.getElementById('cs-home-progress');
    if (!card) {
      card = document.createElement('section');
      card.id = 'cs-home-progress';
      card.className = 'cs-home-progress';
      card.setAttribute('aria-label', 'Course progress');
      host.insertAdjacentElement('afterend', card);
    }
    const finalStep = allModulesComplete
      ? postComplete
        ? '<a href="certificate.html" style="display:inline-block;margin-top:16px;padding:10px 14px;border-radius:8px;background:#4C5FD5;color:#fff;text-decoration:none;font-weight:700">Download Your Certificate</a>'
        : '<a href="post-assessment.html" style="display:inline-block;margin-top:16px;padding:10px 14px;border-radius:8px;background:#4C5FD5;color:#fff;text-decoration:none;font-weight:700">Take Your Post-Assessment to Unlock Your Certificate</a>'
      : '';
    card.innerHTML = `<div class="cs-home-progress-head"><h3>Your Course Progress</h3><span class="cs-home-progress-count">${doneCount} of 6 Completed</span></div><div class="cs-home-progress-track" role="progressbar" aria-label="Course completion" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${doneCount}"><div class="cs-home-progress-fill" style="width:${Math.round(doneCount / 6 * 100)}%"></div></div><div class="cs-home-progress-list">${items.join('')}</div>${finalStep}`;
  }

  function renderModuleAvailability(saved) {
    const completed = new Set(saved.completed_modules || []);
    document.querySelectorAll('.module-card[href^="module"]').forEach((card, index) => {
      const [pageName, module] = MODULE_SEQUENCE[index] || [];
      if (!pageName || !module) return;
      const firstMissing = MODULE_SEQUENCE.slice(0, index).find(([, earlier]) => !completed.has(earlier.id));
      const locked = Boolean(firstMissing);
      card.classList.toggle('cs-module-locked', locked);
      card.setAttribute('aria-disabled', String(locked));
      if (locked) {
        card.tabIndex = -1;
        card.title = `Pass ${firstMissing[1].title} before opening this module.`;
        const action = card.querySelector('.start');
        if (action) action.textContent = `Locked · Pass ${firstMissing[1].id} first`;
        if (!card.dataset.lockHandler) {
          card.addEventListener('click', event => {
            if (card.getAttribute('aria-disabled') === 'true') event.preventDefault();
          });
          card.dataset.lockHandler = 'true';
        }
      } else {
        card.removeAttribute('tabindex');
        card.removeAttribute('title');
        const action = card.querySelector('.start');
        if (action) action.textContent = completed.has(module.id) ? 'Review module →' : 'Open module →';
      }
    });
  }

  async function enforceModuleAccess() {
    const index = MODULE_SEQUENCE.findIndex(([file]) => file === page);
    if (index <= 0) return true;
    try {
      const saved = await api('/progress');
      const completed = new Set(saved.completed_modules || []);
      const firstMissing = MODULE_SEQUENCE.slice(0, index).find(([, earlier]) => !completed.has(earlier.id));
      if (!firstMissing) return true;
      const main = document.querySelector('.main');
      if (main) {
        const [requiredPage, requiredModule] = firstMissing;
        main.innerHTML = `<section class="cs-module-lock" role="status"><h1>This Module Is Locked</h1><p>Pass ${esc(requiredModule.title)} with at least 70% to unlock this module. You can retry that knowledge check as many times as you need.</p><a href="${requiredPage}">Return to ${esc(requiredModule.title)}</a><a class="secondary" href="index.html">Back to Home</a></section>`;
      }
      return false;
    } catch (e) {
      console.error('Could not check module prerequisites', e);
      location.href = 'index.html';
      return false;
    }
  }

  async function showPostAssessmentIfReady(user) {
    if (!user) return;
    try {
      const saved = await api('/progress');
      if (page === 'index.html') { renderHomeProgress(saved); renderModuleAvailability(saved); }
      const scores = saved.assessment_scores || {};
      const allPassed = ['M1', 'M2', 'M3', 'M4', 'M5'].every(id => Number(scores[id]) >= 70);
      if (!allPassed) return;
      if (page === 'index.html') showPostAssessmentNextStep(document.querySelector('.section-head'));
      if (page === 'module5.html') showPostAssessmentNextStep(document.getElementById('quiz-result'));
    } catch (e) { console.error('Could not check module assessment completion', e); }
  }

  async function trackModule(user) {
    if (!mod || !user) return;
    let max = 0;
    try {
      const saved = await api('/progress');
      max = Number(saved.module_progress?.[mod.id] || 0);
      showModuleAssessmentScore(saved.assessment_scores?.[mod.id] ?? null);
    } catch { showModuleAssessmentScore(null); }
    const send = p => {
      max = Math.max(max, p);
      return api('/activity', { method:'POST', headers:{'X-Module-Id':mod.id}, body:JSON.stringify({progress:max}) }).catch(()=>{});
    };
    if (max < 1) send(1);
    addEventListener('scroll', () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      const p = h > 0 ? Math.min(99, Math.round((scrollY + innerHeight) / document.documentElement.scrollHeight * 100)) : 99;
      if (p > max) send(p);
    }, { passive:true });
  }

  function trackTopics() {
    const links = [...document.querySelectorAll('.topic-link[href^="#"]')];
    const items = links.map(link => ({ link, section: document.getElementById(decodeURIComponent(link.hash.slice(1))) })).filter(item => item.section);
    if (!items.length) return;
    const update = () => {
      let current = items[0];
      for (const item of items) {
        if (item.section.getBoundingClientRect().top <= 180) current = item;
      }
      for (const item of items) {
        item.link.classList.toggle('active', item === current);
        item.link.classList.remove('done');
      }
    };
    for (const item of items) item.link.addEventListener('click', () => {
      for (const other of items) other.link.classList.toggle('active', other === item);
    });
    addEventListener('scroll', update, { passive:true });
    addEventListener('hashchange', update);
    update();
  }

  function collectAnswers() {
    const answers = {};
    document.querySelectorAll('.quiz-q').forEach((q, i) => {
      const checked = q.querySelector('input:checked'); answers[`q${i+1}`] = checked ? checked.value : null;
    });
    return answers;
  }

  function showFeedback() {
    if (document.getElementById('cs-feedback')) return;
    ensureStyles();
    const sec = document.createElement('div'); sec.id = 'cs-feedback'; sec.className = 'cs-feedback';
    sec.innerHTML = `<h3>Module Feedback</h3><p>Your assessment has been recorded. Please give a quick rating and optional comment for the research evaluation.</p><label>How Useful Was This Module?</label><select id="cs-rating"><option value="5">5 - Very useful</option><option value="4">4 - Useful</option><option value="3">3 - Neutral</option><option value="2">2 - Not very useful</option><option value="1">1 - Not useful</option></select><textarea id="cs-comment" placeholder="What did you find useful, confusing, or worth improving?"></textarea><button id="cs-send">Submit Feedback</button>`;
    (document.getElementById('quiz') || document.querySelector('.main'))?.appendChild(sec);
    document.getElementById('cs-send').onclick = async () => {
      const button = document.getElementById('cs-send'); button.disabled = true;
      try { await api('/feedback', {method:'POST', body:JSON.stringify({module_id:mod.id, rating:+document.getElementById('cs-rating').value, comment:document.getElementById('cs-comment').value.trim()})}); sec.innerHTML='<h3>Thank You</h3><p>Your feedback has been recorded for the research evaluation.</p>'; }
      catch(e){ button.disabled=false; alert(e.message); }
    };
  }

  function patchQuiz() {
    if (!mod || typeof window.checkQuiz !== 'function' || window.__csPatched) return false;
    const original = window.checkQuiz;
    window.checkQuiz = function() {
      original();
      setTimeout(async () => {
        const result = document.getElementById('quiz-result'); const txt = result?.textContent || '';
        const match = txt.match(/(\d+)\/(\d+)\s*\((\d+)%\)/); if (!match) return;
        const score = +match[1], total = +match[2], percentage = +match[3];
        showModuleAssessmentScore(percentage);
        try {
          await api('/attempts', {method:'POST', body:JSON.stringify({module_id:mod.id, score, total, percentage, answers:collectAnswers(), attempt_type:'knowledge_check'} )});
          showFeedback();
          if (mod.id === 'M5' && percentage >= 70) showPostAssessmentIfReady(await currentUser());
        }
        catch(e) { console.error(e); alert('Your quiz was displayed, but the research record could not be saved. Please check that the CyberSA server is running.'); }
      }, 50);
    };
    window.__csPatched = true; return true;
  }

  async function init() {
    ensureStyles();
    if (page === 'index.html' || mod || page === 'post-assessment.html') {
      const user = await currentUser();
      if (!user) showLogin(); else {
        renderUser(user); ensureRecoveryCode();
        const canOpen = mod ? await enforceModuleAccess() : true;
        if (canOpen) {
          trackModule(user);
          if (mod) trackTopics();
          if (page === 'index.html' || page === 'module5.html') showPostAssessmentIfReady(user);
          const timer=setInterval(()=>{if(patchQuiz()) clearInterval(timer)},100);
        }
      }
    }
    showResearcherError();
  }
  window.addEventListener('pageshow', event => {
    if (event.persisted && page === 'index.html') {
      currentUser().then(user => user && showPostAssessmentIfReady(user));
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
