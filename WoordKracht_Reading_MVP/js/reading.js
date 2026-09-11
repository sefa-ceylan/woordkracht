(() => {
  'use strict';

  const STORAGE_KEY = 'wk_reading_mvp_v1';

  const LESSON = {
    id: 'b2-woningmarkt-001',
    level: 'B2',
    title: 'De woningmarkt verandert',
    estimatedMinutes: 6,
    newWords: 8,
    paragraphs: [
      `De Nederlandse woningmarkt staat al jaren <button class="reading-word" data-word="onder druk staan">onder druk</button>. De prijzen van huizen zijn flink gestegen, terwijl het <button class="reading-word" data-word="aanbod">aanbod</button> nog steeds te laag is. Vooral starters hebben moeite om een betaalbare woning te vinden.`,
      `Steeds meer mensen zoeken daarom naar <button class="reading-word" data-word="alternatieven">alternatieven</button>. Sommigen verhuizen naar een andere regio, anderen kiezen ervoor langer te huren. Tegelijkertijd proberen gemeenten en woningcorporaties meer woningen te bouwen, maar nieuwe projecten lopen regelmatig vertraging op.`,
      `Volgens deskundigen zal de markt de komende jaren langzaam <button class="reading-word" data-word="stabiliseren">stabiliseren</button>. Toch blijven hoge bouwkosten, beperkte ruimte en ingewikkelde procedures een <button class="reading-word" data-word="uitdaging">uitdaging</button>. Daardoor is het niet waarschijnlijk dat het woningtekort op korte termijn volledig verdwijnt.`,
      `De situatie vraagt volgens experts om een combinatie van maatregelen. Niet alleen nieuwbouw is nodig; ook bestaande gebouwen kunnen anders worden gebruikt. Denk bijvoorbeeld aan lege kantoorpanden die worden omgebouwd tot woningen. Zo kan het beschikbare <button class="reading-word" data-word="aanbod">aanbod</button> sneller toenemen.`
    ],
    vocab: {
      'onder druk staan': 'in een moeilijke of gespannen situatie verkeren',
      'aanbod': 'de hoeveelheid producten, diensten of woningen die beschikbaar is',
      'alternatieven': 'andere mogelijkheden of keuzes',
      'stabiliseren': 'rustiger en evenwichtiger worden',
      'uitdaging': 'een moeilijke taak of situatie die inspanning vraagt'
    },
    questions: [
      { skill:'Hoofdgedachte', points:20, q:'Wat is de belangrijkste boodschap van de tekst?', options:['De huizenprijzen zullen binnenkort sterk dalen.','De woningmarkt heeft meerdere problemen en vraagt om verschillende oplossingen.','Mensen willen vooral buiten de grote steden wonen.','Gemeenten moeten stoppen met nieuwbouw.'], correct:1, explain:'De tekst beschrijft meerdere oorzaken van de druk op de woningmarkt én verschillende mogelijke oplossingen.' },
      { skill:'Specifieke informatie', points:20, q:'Waarom kiezen sommige mensen ervoor om langer te huren?', options:['Omdat huren altijd goedkoper is.','Omdat er te weinig betaalbare koopwoningen zijn.','Omdat gemeenten dit verplichten.','Omdat woningcorporaties geen huizen meer verkopen.'], correct:1, explain:'In de tekst staat dat vooral starters moeite hebben een betaalbare woning te vinden en daarom naar alternatieven zoeken.' },
      { skill:'Inferentie', points:25, q:'Wat kunnen we uit de tekst afleiden over het woningtekort?', options:['Het probleem kan waarschijnlijk niet met één maatregel worden opgelost.','Het tekort verdwijnt zodra de bouwkosten dalen.','Alle lege kantoren worden binnenkort woningen.','Het probleem speelt alleen in grote steden.'], correct:0, explain:'Er worden meerdere oorzaken en oplossingen genoemd. Dat wijst erop dat één maatregel waarschijnlijk niet voldoende is.' },
      { skill:'Woordenschat', points:15, q:'Wat betekent “onder druk staan” in deze tekst?', options:['Veel aandacht krijgen','In een moeilijke situatie verkeren','Sneller groeien dan verwacht','Door de overheid worden gecontroleerd'], correct:1, explain:'“Onder druk staan” betekent hier dat de woningmarkt in een moeilijke en gespannen situatie verkeert.' },
      { skill:'Schrijversintentie', points:20, q:'Waarom noemt de schrijver het ombouwen van lege kantoorpanden?', options:['Om een concreet voorbeeld van een aanvullende oplossing te geven.','Om te bewijzen dat nieuwbouw niet meer nodig is.','Om te laten zien dat kantoren goedkoper zijn dan woningen.','Om kritiek te geven op mensen die thuiswerken.'], correct:0, explain:'Het voorbeeld laat zien hoe bestaande gebouwen kunnen bijdragen aan meer woonruimte naast nieuwbouw.' }
    ]
  };

  let state = { view:'intro', questionIndex:0, answers:[], startedAt:0, finishedAt:0 };

  function loadProgress(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {completed:0, streak:0, lastDate:null, totalXp:0, skills:{}}; }
    catch { return {completed:0, streak:0, lastDate:null, totalXp:0, skills:{}}; }
  }
  function saveProgress(p){ localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }
  function dayKey(d=new Date()){ return d.toISOString().slice(0,10); }
  function yesterdayKey(){ const d=new Date(); d.setDate(d.getDate()-1); return dayKey(d); }

  function root(){ return document.getElementById('readingApp'); }
  function showReadingTab(){
    if(typeof deactivateAllTabs === 'function') deactivateAllTabs();
    const tab=document.getElementById('tabReading');
    const screen=document.getElementById('readingScreen');
    if(tab) tab.classList.add('active');
    if(screen) screen.classList.add('active');
  }
  function backToCards(){
    if(typeof deactivateAllTabs === 'function') deactivateAllTabs();
    document.getElementById('tabCards')?.classList.add('active');
    document.getElementById('cardsScreen')?.classList.remove('hidden');
  }

  function open(){
    showReadingTab();
    if(state.view === 'intro' || state.view === 'result') renderIntro(); else render();
  }

  function render(){
    if(state.view==='intro') renderIntro();
    if(state.view==='text') renderText();
    if(state.view==='quiz') renderQuestion();
    if(state.view==='result') renderResult();
  }

  function header(step){
    return `<div class="reading-topbar"><button class="reading-back" id="readingBackBtn">← Terug</button><span class="reading-step">${step}</span></div>`;
  }

  function wireBack(){ document.getElementById('readingBackBtn')?.addEventListener('click', backToCards); }

  function renderIntro(){
    state={view:'intro',questionIndex:0,answers:[],startedAt:0,finishedAt:0};
    const p=loadProgress();
    root().innerHTML=`<div class="reading-shell">${header('Vandaag lezen')}
      <div class="reading-panel">
        <div class="reading-meta-row"><span class="reading-level-badge">${LESSON.level}</span><span>⏱ ${LESSON.estimatedMinutes} min · ❓ ${LESSON.questions.length} vragen</span></div>
        <h2 class="reading-title">${LESSON.title}</h2>
        <p style="line-height:1.65;color:#53627a;margin-bottom:18px">Lees de tekst rustig. Tik op gemarkeerde woorden voor uitleg. Daarna krijg je vijf vragen over verschillende leesvaardigheden.</p>
        <div class="reading-stats-grid">
          <div class="reading-stat"><b>${p.streak || 0}🔥</b><span>leesstreak</span></div>
          <div class="reading-stat"><b>${p.completed || 0}</b><span>teksten voltooid</span></div>
          <div class="reading-stat"><b>${p.totalXp || 0}</b><span>reading XP</span></div>
        </div>
        <button class="reading-primary" id="beginReading">Start met lezen →</button>
      </div></div>`;
    wireBack();
    document.getElementById('beginReading').onclick=()=>{state.view='text';state.startedAt=Date.now();renderText();};
  }

  function renderText(){
    root().innerHTML=`<div class="reading-shell">${header('Tekst 1 van 1')}
      <article class="reading-panel">
        <div class="reading-meta-row"><span class="reading-level-badge">${LESSON.level}</span><span>⏱ ± ${LESSON.estimatedMinutes} min</span></div>
        <h2 class="reading-title">${LESSON.title}</h2>
        <div class="reading-copy">${LESSON.paragraphs.map(p=>`<p>${p}</p>`).join('')}</div>
        <div class="reading-tip">💡 <span>Tik op een gemarkeerd woord voor de betekenis.</span></div>
        <button class="reading-primary" id="finishReading">Klaar met lezen →</button>
      </article>
      <div class="reading-word-popover" id="readingWordPopover" hidden><button class="reading-word-close" id="readingWordClose">×</button><b id="readingWordTitle"></b><p id="readingWordMeaning"></p></div>
      </div>`;
    wireBack();
    root().querySelectorAll('.reading-word').forEach(btn=>btn.addEventListener('click',()=>showWord(btn.dataset.word)));
    document.getElementById('readingWordClose')?.addEventListener('click',()=>document.getElementById('readingWordPopover').hidden=true);
    document.getElementById('finishReading').onclick=()=>{state.view='quiz';state.questionIndex=0;renderQuestion();};
  }

  function showWord(word){
    const pop=document.getElementById('readingWordPopover');
    if(!pop) return;
    document.getElementById('readingWordTitle').textContent=word;
    document.getElementById('readingWordMeaning').textContent=LESSON.vocab[word] || 'Betekenis wordt toegevoegd.';
    pop.hidden=false;
  }

  function renderQuestion(){
    const q=LESSON.questions[state.questionIndex];
    const pct=Math.round((state.questionIndex/LESSON.questions.length)*100);
    root().innerHTML=`<div class="reading-shell">${header(`Vraag ${state.questionIndex+1} van ${LESSON.questions.length}`)}
      <div class="reading-progress-track"><div class="reading-progress-fill" style="width:${pct}%"></div></div>
      <div class="reading-panel dark">
        <span class="reading-skill-pill">${q.skill}</span>
        <div class="reading-question">${q.q}</div>
        <div class="reading-options">${q.options.map((o,i)=>`<button class="reading-option" data-answer="${i}"><b>${String.fromCharCode(65+i)}.</b> ${o}</button>`).join('')}</div>
        <div id="readingExplain"></div>
        <button class="reading-primary" id="readingNext" style="display:none">${state.questionIndex===LESSON.questions.length-1?'Bekijk resultaat →':'Volgende →'}</button>
      </div></div>`;
    wireBack();
    root().querySelectorAll('.reading-option').forEach(b=>b.addEventListener('click',()=>chooseAnswer(Number(b.dataset.answer))));
  }

  function chooseAnswer(index){
    const q=LESSON.questions[state.questionIndex];
    if(state.answers[state.questionIndex]!==undefined) return;
    state.answers[state.questionIndex]=index;
    root().querySelectorAll('.reading-option').forEach((b,i)=>{
      b.disabled=true;
      if(i===q.correct) b.classList.add('correct');
      if(i===index && i!==q.correct) b.classList.add('wrong');
    });
    document.getElementById('readingExplain').innerHTML=`<div class="reading-explanation"><b>${index===q.correct?'✅ Goed':'💡 Uitleg'}</b><br>${q.explain}</div>`;
    const next=document.getElementById('readingNext'); next.style.display='block';
    next.onclick=()=>{
      if(state.questionIndex<LESSON.questions.length-1){state.questionIndex++;renderQuestion();}
      else {state.finishedAt=Date.now();state.view='result';finishLesson();renderResult();}
    };
  }

  function scoreData(){
    let points=0; const skills={};
    LESSON.questions.forEach((q,i)=>{
      const ok=state.answers[i]===q.correct;
      if(ok) points+=q.points;
      skills[q.skill]={correct:ok?1:0,total:1,pct:ok?100:0};
    });
    return {points,skills};
  }

  function finishLesson(){
    const p=loadProgress();
    const today=dayKey();
    if(p.lastDate!==today){
      if(p.lastDate===yesterdayKey()) p.streak=(p.streak||0)+1;
      else p.streak=1;
      p.completed=(p.completed||0)+1;
      p.totalXp=(p.totalXp||0)+20+(scoreData().points>=80?5:0)+(scoreData().points===100?5:0);
      p.lastDate=today;
    }
    p.skills=p.skills||{};
    LESSON.questions.forEach((q,i)=>{
      const s=p.skills[q.skill]||{correct:0,total:0};
      s.total+=1; if(state.answers[i]===q.correct) s.correct+=1;
      p.skills[q.skill]=s;
    });
    saveProgress(p);
  }

  function renderResult(){
    const {points}=scoreData(); const p=loadProgress();
    const secs=Math.max(1,Math.round(((state.finishedAt||Date.now())-(state.startedAt||Date.now()))/1000));
    const min=Math.floor(secs/60), sec=String(secs%60).padStart(2,'0');
    const skillRows=LESSON.questions.map((q,i)=>{
      const ok=state.answers[i]===q.correct, pct=ok?100:0;
      return `<div class="reading-skill-row"><span>${q.skill}</span><div class="reading-skill-bar"><i style="width:${pct}%"></i></div><b>${pct}%</b></div>`;
    }).join('');
    const msg=points>=90?'Uitstekend!':points>=75?'Goed gedaan!':points>=60?'Bijna goed!':'Blijf oefenen!';
    root().innerHTML=`<div class="reading-shell">${header('Resultaat')}
      <div class="reading-panel dark">
        <div class="reading-result-hero"><div class="reading-score-ring" style="--score:${points}"><strong>${points}/100</strong></div><h2 style="font-family:'Fredoka';font-size:25px">${msg}</h2><p style="font-size:12px;color:#aebbd0;margin-top:4px">Je hebt de dagelijkse leestraining voltooid.</p></div>
        <div class="reading-stats-grid"><div class="reading-stat"><b>${min}:${sec}</b><span>leestijd + vragen</span></div><div class="reading-stat"><b>${LESSON.newWords}</b><span>nieuwe woorden</span></div><div class="reading-stat"><b>+${20+(points>=80?5:0)+(points===100?5:0)}</b><span>XP verdiend</span></div></div>
        <div class="reading-skill-list">${skillRows}</div>
        <div class="reading-streak-banner">🔥 ${p.streak} dag${p.streak===1?'':'en'} leesstreak</div>
        <button class="reading-primary" id="readingDone">Klaar →</button>
        <button class="reading-secondary" id="readingAgain">Opnieuw oefenen</button>
      </div></div>`;
    wireBack();
    document.getElementById('readingDone').onclick=backToCards;
    document.getElementById('readingAgain').onclick=()=>{state.view='intro';renderIntro();};
  }

  document.addEventListener('DOMContentLoaded',()=>{
    document.getElementById('dailyReadingStartBtn')?.addEventListener('click',open);
  });

  window.WoordKrachtReading={open,reset(){localStorage.removeItem(STORAGE_KEY);renderIntro();}};
})();
