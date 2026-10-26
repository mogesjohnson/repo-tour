// Render the tour as one self-contained HTML file (inline CSS, data and a
// small highlighter, nothing fetched at view time) and as Markdown.
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const FENCE = { JavaScript: 'js', TypeScript: 'ts', Python: 'python', Go: 'go', Rust: 'rust', Ruby: 'ruby', Markdown: 'md',
  JSON: 'json', YAML: 'yaml', TOML: 'toml', shell: 'sh', 'React JSX': 'jsx', 'React TSX': 'tsx', Java: 'java', 'C#': 'cs' };
const LABEL = { overview: 'Overview', agent: 'Agent file', config: 'Config', entry: 'Entry point', module: 'Key module', ci: 'CI', docs: 'Docs' };

export function renderMarkdown(tour, { snippetLines = 12 } = {}) {
  const out = [`# Tour of ${tour.name}`, '', `${tour.steps.length} stop${tour.steps.length === 1 ? '' : 's'}, picked from ${tour.total} files by [repo-tour](https://github.com/mogesjohnson/repo-tour).`, ''];
  tour.steps.forEach((s, i) => {
    out.push(`## ${i + 1}. \`${s.file}\` (${LABEL[s.category] || s.category})`, '', s.caption, '');
    const lines = s.code.split('\n');
    const shown = lines.slice(0, snippetLines).join('\n').replace(/```/g, '`\u200b``');
    out.push('```' + (FENCE[s.language] || ''), shown, '```', '');
    if (lines.length > snippetLines) out.push(`<sub>First ${snippetLines} of ${lines.length} lines.</sub>`, '');
  });
  return out.join('\n');
}

const CSS = `*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;background:#0f1720;color:#e6edf3;display:grid;grid-template-columns:260px 1fr;height:100vh}
nav{background:#111c27;border-right:1px solid #22303d;overflow:auto;padding:16px 8px}nav h1{font-size:16px;margin:0 8px 12px}nav ol{list-style:none;margin:0;padding:0}
nav button{all:unset;display:block;width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;cursor:pointer;font-size:13px;color:#9fb1c2;word-break:break-all}
nav button[aria-current=true]{background:#1f6feb33;color:#fff}nav small{display:block;font-size:11px;color:#6e8396;text-transform:uppercase;letter-spacing:.05em}
main{display:flex;flex-direction:column;min-width:0;height:100vh}header{padding:18px 24px 12px;border-bottom:1px solid #22303d}
.path{font:600 18px ui-monospace,SFMono-Regular,Menlo,monospace}.badge{display:inline-block;font-size:11px;padding:2px 8px;border-radius:99px;background:#238636;margin-left:8px;vertical-align:middle}
.caption{margin:10px 0 0;font-size:17px;max-width:70em;color:#d3dde6}.bar{height:3px;background:#22303d}.bar i{display:block;height:100%;background:#2f81f7;transition:width .3s}
pre{margin:0;flex:1;overflow:auto;padding:16px 0;font:13.5px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;counter-reset:l}
pre span.l{display:block;padding:0 24px 0 64px;position:relative;white-space:pre}pre span.l::before{counter-increment:l;content:counter(l);position:absolute;left:0;width:48px;text-align:right;color:#4b5d6e}
.k{color:#ff7b72}.s{color:#a5d6ff}.c{color:#8b949e;font-style:italic}.n{color:#79c0ff}.h{color:#ffa657;font-weight:600}.f{color:#d2a8ff}
footer{display:flex;gap:8px;align-items:center;padding:10px 24px;border-top:1px solid #22303d}footer button{font:inherit;padding:8px 16px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#e6edf3;cursor:pointer}
footer span{margin-left:auto;color:#6e8396;font-size:13px}@media(max-width:760px){body{grid-template-columns:1fr}nav{display:none}}`;

// Tiny regex highlighter: comments, strings, numbers, keywords, headings.
const HL = `const KW=/^(import|from|export|default|const|let|var|function|return|if|else|for|while|class|new|async|await|def|try|except|catch|finally|throw|raise|with|as|in|of|yield|lambda|pub|fn|struct|impl|use|mod|package|func|type|interface|enum|true|false|null|None|True|False|undefined|this|self|extends|static|public|private|elif|not|and|or|is|match|case|break|continue|switch)$/;
function hl(code,lang){const e=s=>s.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
if(lang==='Markdown')return code.split('\\n').map(l=>/^#{1,6}\\s/.test(l)?'<span class=h>'+e(l)+'</span>':/^\\s*([-*]|\\d+\\.)\\s/.test(l)?e(l).replace(/^(\\s*(?:[-*]|\\d+\\.))/,'<span class=k>$1</span>'):e(l).replace(/(\`[^\`]+\`)/g,'<span class=s>$1</span>'));
const hash=/^(Python|shell|YAML|TOML|Ruby|Makefile|Dockerfile|text)$/.test(lang);
const re=new RegExp((hash?'(#.*)':'(\\\\/\\\\/.*|\\\\/\\\\*[\\\\s\\\\S]*?\\\\*\\\\/)')+'|("(?:\\\\\\\\.|[^"\\\\\\\\\\\\n])*"|\\'(?:\\\\\\\\.|[^\\'\\\\\\\\\\\\n])*\\'|\`(?:\\\\\\\\.|[^\`\\\\\\\\])*\`)|(\\\\b\\\\d[\\\\d_.]*\\\\b)|([A-Za-z_$][\\\\w$]*)(?=\\\\s*\\\\()|([A-Za-z_$][\\\\w$]*)','g');
const W=(k,t)=>e(t).split('\\n').map(x=>'<span class='+k+'>'+x+'</span>').join('\\n');let out='',last=0;code.replace(re,(m,c,s,n,f,w,i)=>{out+=e(code.slice(last,i));last=i+m.length;
out+=c?W('c',c):s?W('s',s):n?'<span class=n>'+n+'</span>':f?(KW.test(f)?'<span class=k>'+f+'</span>':'<span class=f>'+f+'</span>'):KW.test(w)?'<span class=k>'+w+'</span>':w;return m});
out+=e(code.slice(last));return out.split('\\n')}`;

const APP = `const T=JSON.parse(document.getElementById('data').textContent);let i=0;const $=s=>document.querySelector(s);
const L=${JSON.stringify(LABEL)};
$('#steps').innerHTML=T.steps.map((s,n)=>'<li><button data-n='+n+'><small>'+(n+1)+'. '+(L[s.category]||s.category)+'</small>'+s.file.replace(/[&<]/g,c=>c=='&'?'&amp;':'&lt;')+'</button></li>').join('');
function go(n){i=Math.max(0,Math.min(T.steps.length-1,n));const s=T.steps[i];$('.path').textContent=s.file;$('.badge').textContent=L[s.category]||s.category;
$('.caption').innerHTML=s.caption.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])).replace(/\`([^\`]+)\`/g,'<code>$1</code>').replace(/\\*\\*([^*]+)\\*\\*/g,'<b>$1</b>');
$('pre').innerHTML=hl(s.code,s.language).map(l=>'<span class=l>'+(l||' ')+'</span>').join('');$('pre').scrollTop=0;
$('#count').textContent=(i+1)+' / '+T.steps.length;$('.bar i').style.width=((i+1)/T.steps.length*100)+'%';
document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.n==i));history.replaceState(null,'','#'+(i+1))}
$('#steps').onclick=e=>{const b=e.target.closest('button');if(b)go(+b.dataset.n)};$('#prev').onclick=()=>go(i-1);$('#next').onclick=()=>go(i+1);
addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' ')go(i+1);if(e.key==='ArrowLeft')go(i-1)});
addEventListener('hashchange',()=>go((parseInt(location.hash.slice(1))||1)-1));window.tour={go,count:T.steps.length};go((parseInt(location.hash.slice(1))||1)-1);
const ap=new URLSearchParams(location.search).get('autoplay');if(ap){setInterval(()=>go(i+1<T.steps.length?i+1:0),(+ap||5)*1000)}`;

export function renderHtml(tour) {
  const data = JSON.stringify(tour).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tour of ${esc(tour.name)}</title><style>${CSS}</style></head>
<body><nav><h1>Tour of ${esc(tour.name)}</h1><ol id="steps"></ol></nav>
<main><header><span class="path"></span><span class="badge"></span><p class="caption"></p></header><div class="bar"><i></i></div><pre></pre>
<footer><button id="prev">← Prev</button><button id="next">Next →</button><span id="count"></span></footer></main>
<script type="application/json" id="data">${data}</script>
<script>${HL}
${APP}</script></body></html>
`;
}
