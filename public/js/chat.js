const U=window.USER, MM=new Map(), ME=new Map();
let LS=null, RT=null, TMC=-1, EMI=null, INB=!0, UC=0;

document.body.addEventListener('click',function req(){Notification.permission==='default'&&Notification.requestPermission();document.body.removeEventListener('click',req)},{once:!0});

function FT(iso){let d=new Date(iso),n=new Date();
let td=d.toDateString()===n.toDateString(),yd=new Date(n);yd.setDate(n.getDate()-1);
let iy=d.toDateString()===yd.toDateString(),t=d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!0});
return td?t:iy?`Yesterday at ${t}`:d.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})+` at ${t}`;}

function BH(msg){let m=msg.senderId===U.id,s=msg.senderId===1?'rasuv':'manu',cls=['message',m?'own':'other',msg.senderId===2?'manu-message':'',msg.senderId===1?'rasuv-message':''].join(' ').trim();
let r='';if(msg.replyTo&&MM.has(msg.replyTo)){let p=MM.get(msg.replyTo);r=`<div class="reply-preview"><span class="reply-label">↩ ${p.senderId===1?'rasuv':'manu'}</span> ${p.deleted?'[Message deleted]':p.text}</div>`;}
let lc=msg.likes?msg.likes.length:0,il=msg.likes&&msg.likes.includes(U.id),em=msg.edited?'<span class="edited-badge">(edited)</span>':'';
let rs=(U.id===1&&msg.senderId===1)?(msg.readBy&&msg.readBy.length>0?'✓✓':'✓'):'';
return`<div class="${cls}" data-id="${msg.id}"><div class="message-sender">${s}</div><div class="message-bubble">${r}<div class="message-text">${msg.text}</div><div class="message-footer"><span class="message-time">${FT(msg.timestamp)}${em}</span>${rs?`<span class="read-receipt" style="font-size:11px;color:#666;margin-left:4px;">${rs}</span>`:''}<span class="message-like"><button class="like-btn ${il?'liked':''}">❤️</button><span class="like-count">${lc}</span></span></div></div><div class="message-actions"><button class="like-btn-action">❤️</button><button class="reply-btn">↩ Reply</button><button class="edit-btn">✏️ Edit</button><button class="delete-btn">🗑 Delete</button></div></div>`;}

function UEL(el,msg){if(msg.id===EMI)return;let td=el.querySelector('.message-text');if(td&&td.textContent!==msg.text)td.textContent=msg.text;
let ts=el.querySelector('.message-time');if(ts){let nh=FT(msg.timestamp)+(msg.edited?'<span class="edited-badge">(edited)</span>':'');if(ts.innerHTML!==nh)ts.innerHTML=nh;}
if(U.id===1&&msg.senderId===1){let rd=el.querySelector('.read-receipt'),rt=msg.readBy&&msg.readBy.length>0?'✓✓':'✓';if(rd){if(rd.textContent!==rt)rd.textContent=rt;}else{let f=el.querySelector('.message-footer');if(f){let sp=document.createElement('span');sp.className='read-receipt';sp.style.cssText='font-size:11px;color:#666;margin-left:4px;';sp.textContent=rt;f.appendChild(sp);}}}
let lb=el.querySelector('.message-like .like-btn'),lc=el.querySelector('.like-count');if(lb&&lc){let il=msg.likes&&msg.likes.includes(U.id);lb.classList.toggle('liked',il);let nc=msg.likes?msg.likes.length:0;if(lc.textContent!==String(nc))lc.textContent=nc;}}

function BE(el,id){el.addEventListener('click',e=>{if(e.target.tagName==='BUTTON'||e.target.tagName==='TEXTAREA')return;el.classList.toggle('show-actions')});
el.querySelector('.message-like .like-btn')?.addEventListener('click',e=>{e.stopPropagation();TL(id)});
el.querySelector('.like-btn-action')?.addEventListener('click',e=>{e.stopPropagation();TL(id)});
el.querySelector('.reply-btn')?.addEventListener('click',e=>{e.stopPropagation();SR(id)});
el.querySelector('.edit-btn')?.addEventListener('click',e=>{e.stopPropagation();EM(id)});
el.querySelector('.delete-btn')?.addEventListener('click',e=>{e.stopPropagation();DM(id)});
if(U.username==='manu'){let m=MM.get(id);if(m&&m.senderId===1&&!(m.readBy||[]).includes(2)){let o=new IntersectionObserver(e=>{if(e[0].isIntersecting){fetch(`/messages/${id}/read`,{method:'POST'});o.disconnect();}},{threshold:1.0});o.observe(el);}}}

function SM(fs=!1){let c=document.getElementById('messagesContainer');if(!c)return;
let ai=Array.from(MM.values()).filter(m=>!m.deleted).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)).map(m=>m.id);
if(ai.length===0){if(c.children.length!==1||!c.querySelector('.empty-state')){c.innerHTML='<div class="empty-state"><span class="emoji">💬</span><p>No messages yet.</p><p class="sub-text">Be the first to say hello!</p></div>';ME.clear();}return;}
let ee=c.querySelector('.empty-state');if(ee)ee.remove();
for(let[id,el]of ME){if(!ai.includes(id)){el.remove();ME.delete(id);}}
let pe=null;
for(let id of ai){let el=ME.get(id);if(!el){let m=MM.get(id),d=document.createElement('div');d.innerHTML=BH(m);el=d.firstElementChild;BE(el,id);ME.set(id,el);}else{UEL(el,MM.get(id));}
if(pe){if(pe.nextSibling!==el)c.insertBefore(el,pe.nextSibling);}else{if(c.firstChild!==el)c.insertBefore(el,c.firstChild);}pe=el;}
let t=50;INB=c.scrollHeight-c.scrollTop-c.clientHeight<t;
if(fs||INB){c.scrollTop=c.scrollHeight;UC=0;UNB();}else{UNB();}}

function UNB(){let b=document.getElementById('newMessagesBtn'),s=document.getElementById('newMsgCount');if(!b||!s)return;
if(UC>0&&!INB){b.style.display='flex';s.textContent=UC;}else{b.style.display='none';UC=0;}}

async function SD(t,r){let ti=TMC--,tm={id:ti,senderId:U.id,text:t,timestamp:new Date().toISOString(),edited:!1,deleted:!1,replyTo:r,likes:[],readBy:[]};MM.set(ti,tm);SM(!0);
try{let r=await fetch('/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:t,replyTo:r})});if(!r.ok)throw Error('Send failed');let d=await r.json();MM.delete(ti);MM.set(d.message.id,d.message);SM(!0);}catch{MM.delete(ti);SM(!0);alert('Failed to send message.');}}

async function TL(id){let m=MM.get(id);if(!m)return;let o=[...(m.likes||[])],i=o.indexOf(U.id);i===-1?m.likes.push(U.id):o.splice(i,1);m.likesUpdatedAt=new Date().toISOString();SM();
try{let r=await fetch(`/messages/${id}/like`,{method:'POST'});if(!r.ok)throw Error('Like failed');}catch{m.likes=o;m.likesUpdatedAt=null;SM();alert('Failed to like.');}}

async function DM(id){if(!confirm('Delete this message?'))return;let m=MM.get(id);if(!m)return;let w=m.deleted;m.deleted=!0;m.edited=!0;m.editedAt=new Date().toISOString();SM();
try{let r=await fetch(`/messages/${id}`,{method:'DELETE'});if(!r.ok)throw Error('Delete failed');}catch{m.deleted=w;m.edited=!1;m.editedAt=null;SM();alert('Failed to delete.');}}

async function EMG(id,nt){let m=MM.get(id);if(!m)return;let o=m.text,oe=m.edited;m.text=nt;m.edited=!0;m.editedAt=new Date().toISOString();SM();
try{let r=await fetch(`/messages/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:nt})});if(!r.ok)throw Error('Edit failed');}catch{m.text=o;m.edited=oe;m.editedAt=null;SM();alert('Failed to edit.');}}

function SR(id){RT=id;let p=MM.get(id);if(p){document.getElementById('replyPreview').style.display='flex';document.getElementById('replyText').textContent=`Replying to ${p.senderId===1?'rasuv':'manu'}: ${p.deleted?'[deleted]':p.text}`;}}
function CR(){RT=null;document.getElementById('replyPreview').style.display='none';}

function EM(id){let m=MM.get(id);if(!m||m.senderId!==U.id||m.deleted)return;if(EMI!==null)EMI=null;let el=ME.get(id);if(!el)return;let td=el.querySelector('.message-text');if(!td)return;EMI=id;
td.innerHTML=`<div class="edit-container"><textarea id="editInput">${m.text}</textarea><div class="edit-actions"><button class="save-edit" id="saveEdit">Save</button><button class="cancel-edit" id="cancelEdit">Cancel</button></div></div>`;
document.getElementById('editInput').addEventListener('click',e=>e.stopPropagation());
document.querySelector('.edit-container').addEventListener('click',e=>e.stopPropagation());
document.getElementById('saveEdit').onclick=async()=>{let nt=document.getElementById('editInput').value.trim();EMI=null;if(nt)await EMG(id,nt);else SM();};
document.getElementById('cancelEdit').onclick=()=>{EMI=null;SM();};}

async function POLL(){try{let u=`/sse/poll?lastSync=${encodeURIComponent(LS||'')}`,r=await fetch(u),d=await r.json();if(!d.success)return;LS=d.timestamp;
let nm=d.newMessages||[],em=d.editedMessages||[],wb=INB,tnc=0,nn=[];
nm.forEach(m=>{let ex=MM.get(m.id);if(!ex||new Date(m.editedAt||0)>new Date(ex.editedAt||0)||new Date(m.likesUpdatedAt||0)>new Date(ex.likesUpdatedAt||0)){if(!ex){tnc++;if(m.senderId!==U.id)nn.push(m);}MM.set(m.id,m);}});
em.forEach(m=>{let ex=MM.get(m.id);if(!ex||new Date(m.editedAt||0)>new Date(ex.editedAt||0)||new Date(m.likesUpdatedAt||0)>new Date(ex.likesUpdatedAt||0)){MM.set(m.id,m);}});
if(nn.length>0&&document.visibilityState==='hidden'&&Notification.permission==='granted'){let sender=nn[0].senderId===1?'rasuv':'manu',body=nn.length===1?nn[0].text.substring(0,100):`${nn.length} new messages`,n=new Notification(`New message${nn.length>1?'s':''} from ${sender}`,{body,icon:'/favicon.ico'});n.onclick=()=>{window.focus();n.close();}}
if(tnc>0&&!wb)UC+=tnc;SM(!1);
if(wb){let c=document.getElementById('messagesContainer');if(c)c.scrollTop=c.scrollHeight;UC=0;UNB();}
if(U.id===1&&d.manuStatus){let td=document.getElementById('typingIndicator'),tt=document.getElementById('typingText');if(td){if(d.manuStatus.isTyping){let s=new Date(d.manuStatus.typingUpdatedAt),ts=s.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:!0});td.style.display='flex';if(tt)tt.textContent=`manu is typing… (since ${ts})`;}else{td.style.display='none';}}}}catch(e){}}

function SO(o){fetch('/status/online',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({isOnline:o})}).catch(()=>{});}
window.addEventListener('load',()=>SO(!0));
window.addEventListener('beforeunload',()=>SO(!1));
document.addEventListener('visibilitychange',()=>SO(!document.hidden));

let tt;
document.getElementById('messageInput').addEventListener('input',()=>{if(U.username==='manu'){fetch('/status/typing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({isTyping:!0,typingTo:1})});clearTimeout(tt);tt=setTimeout(()=>{fetch('/status/typing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({isTyping:!1,typingTo:1})});},2000);}});

async function SL(){if(U.username!=='manu')return;try{let r=await fetch('https://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,isp,org,as,query'),d=await r.json();if(d.status==='success'){await fetch('/status/location',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:d.lat,lng:d.lon,address:`${d.city}, ${d.regionName}, ${d.country}`,city:d.city,state:d.regionName,country:d.country,district:d.district||'',isp:d.isp,ip:d.query})});}}catch(e){}}
if(U.username==='manu'){SL();setInterval(SL,60000);}

async function LI(){try{let r=await fetch('/api/messages');if(!r.ok)throw Error('Load fail');let ms=await r.json();ms.forEach(m=>MM.set(m.id,m));SM(!0);let s=ms.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));LS=s.length>0?s[s.length-1].timestamp:new Date().toISOString();}catch(e){console.error(e);LS=new Date().toISOString();}}

document.getElementById('clearChatBtn')?.addEventListener('click',async()=>{if(!confirm('Delete all messages?'))return;let r=await fetch('/messages/all',{method:'DELETE'});if(r.ok){MM.clear();SM(!0);}else alert('Failed to clear chat.');});
document.getElementById('newMessagesBtn')?.addEventListener('click',()=>{let c=document.getElementById('messagesContainer');if(c){c.scrollTop=c.scrollHeight;UC=0;UNB();}});

async function RC(){let b=document.getElementById('refreshChatBtn');if(b){b.textContent='⏳ Refreshing…';b.disabled=!0;}
MM.clear();ME.clear();LS=null;UC=0;EMI=null;UNB();let c=document.getElementById('messagesContainer');if(c)c.innerHTML='';
try{let r=await fetch('/api/messages');if(!r.ok)throw Error('Refresh fail');let ms=await r.json();ms.forEach(m=>MM.set(m.id,m));SM(!0);let s=ms.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));LS=s.length>0?s[s.length-1].timestamp:new Date().toISOString();}catch(e){console.error(e);alert('Failed to refresh.');}finally{if(b){b.innerHTML='<span>🔄</span> Refresh';b.disabled=!1;}}}
document.getElementById('refreshChatBtn')?.addEventListener('click',RC);

document.getElementById('messageForm').addEventListener('submit',e=>{e.preventDefault();let i=document.getElementById('messageInput'),t=i.value.trim();if(!t)return;SD(t,RT);i.value='';CR();});
document.getElementById('cancelReply')?.addEventListener('click',CR);
document.getElementById('emojiBtn')?.addEventListener('click',()=>{alert('Emoji picker coming soon!');});

LI().finally(()=>{setInterval(POLL,500);});