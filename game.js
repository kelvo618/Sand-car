(function(){
'use strict';
var $=function(id){return document.getElementById(id)};
var cv=$('c'),ctx=cv.getContext('2d'),gc=$('gc'),gx=gc.getContext('2d');
var W=360,H=640,RL=60,RR=300,LANE=60,ROW=140,MAXL=100,NCARS=300,GRID=6,PY=H-150;
var ADJ=['Dusty','Rapid','Crimson','Silent','Golden','Wild','Iron','Lunar','Nimble','Scarlet','Turbo','Velvet','Rogue','Solar','Frosty'];
var NOUN=['Falcon','Mustang','Viper','Comet','Badger','Raven','Lynx','Bison','Cobra','Jackal','Panther','Wasp','Mantis','Coyote','Stallion','Hornet','Scorpion','Marlin','Rhino','Phoenix'];
var ORD=['1st','2nd','3rd','4th','5th','6th'];
var SCREENS=['menu','garage','mp','lobby','result'];

function store(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,String(v))}catch(e){return null}}
function clamp(v,a,b){return v<a?a:v>b?b:v}
function hash(a,b){var h=Math.imul(a|0,374761393)+Math.imul(b|0,668265263)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}

// ---------- 300 cars, generated from their number ----------
var carCache={};
function car(i){
  if(carCache[i])return carCache[i];
  var a=hash(i,1)+.2,b=hash(i,2)+.2,c=hash(i,3)+.2,s=a+b+c;
  var p=[a,b,c].map(function(v){return clamp(Math.round(v/s*17),2,9)});
  return carCache[i]={id:i,name:ADJ[i%15]+' '+NOUN[Math.floor(i/15)],hue:Math.round((i*137.508)%360),body:i%3,trim:Math.floor(i/3)%4,spd:p[0],acc:p[1],grip:p[2]};
}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function drawCar(g,cx,cy,c){
  var w=[28,26,32][c.body],h=[50,46,54][c.body],x=cx-w/2,y=cy-h/2;
  g.fillStyle='rgba(0,0,0,.28)';rr(g,x+3,y+4,w,h,7);g.fill();
  g.fillStyle='hsl('+c.hue+',68%,50%)';rr(g,x,y,w,h,7);g.fill();
  g.fillStyle='rgba(255,244,222,.9)';
  if(c.trim===1)g.fillRect(cx-3,y,6,h);
  else if(c.trim===2){g.fillRect(x+3,y,3,h);g.fillRect(x+w-6,y,3,h)}
  else if(c.trim===3)g.fillRect(x+2,y+h-7,w-4,4);
  g.fillStyle='rgba(20,28,40,.85)';
  rr(g,x+4,y+h*.2,w-8,h*.28,3);g.fill();rr(g,x+5,y+h*.72,w-10,h*.16,3);g.fill();
  g.fillStyle='#fff4de';g.fillRect(x+3,y+1,6,4);g.fillRect(x+w-9,y+1,6,4);
}

// ---------- state ----------
var selCar=Math.min(parseInt(store('drCar'))||0,NCARS-1),garageIdx=selCar;
var unlocked=clamp(parseInt(store('drUnlocked'))||1,1,MAXL),selLevel=unlocked,mpLevel=1;
var myName=store('drName')||('Driver'+Math.floor(Math.random()*90+10));
var st='menu',screen='menu',net=null,racers=[],me=null,level=1,seed=1,L=0,tick=0,fc=0,cd=0,flash=0,resDelay=0,idleZ=0,rowCache={};
var keys={},touch=0,specks=[];
for(var i=0;i<40;i++)specks.push({x:Math.random()*W,y:Math.random()*H,s:1+Math.random()*2});

// ---------- screens ----------
function show(name){
  screen=name;
  SCREENS.forEach(function(n){$('s-'+n).classList.toggle('hide',n!==name)});
  $('msg').classList.toggle('hide',!name);
  if(name==='menu')renderMenu();
  if(name==='garage')renderGarage();
  if(name==='lobby')renderLobby();
}
function renderMenu(){
  var c=car(selCar);
  $('mcar').textContent='Your car: #'+(selCar+1)+' '+c.name;
  $('lvlLabel').textContent='Level '+selLevel;
  $('lp').disabled=selLevel<=1;$('ln').disabled=selLevel>=unlocked;
}
function renderGarage(){
  var c=car(garageIdx);
  gx.clearRect(0,0,160,200);gx.save();gx.translate(80,100);gx.scale(2.6,2.6);drawCar(gx,0,0,c);gx.restore();
  $('gname').textContent='#'+(garageIdx+1)+' '+c.name;
  $('b1').style.width=c.spd*11+'%';$('b2').style.width=c.acc*11+'%';$('b3').style.width=c.grip*11+'%';
  $('gsel').textContent=garageIdx===selCar?'Selected':'Use this car';
}
function gStep(d){garageIdx=((garageIdx+d)%NCARS+NCARS)%NCARS;renderGarage()}
function mpStatus(t){$('mpmsg').textContent=t;$('lnote').textContent=t}

// ---------- obstacles (same for everyone: derived from seed) ----------
function row(r){
  if(rowCache[r])return rowCache[r];
  var out=[],dens=Math.min(.35+level*.004,.75),a=hash(seed,r*5+1);
  if(a<dens){
    var n=a<dens*.45?2:1,l1=Math.floor(hash(seed,r*5+2)*4),l2=(l1+1+Math.floor(hash(seed,r*5+3)*3))%4;
    var z=r*ROW+600+hash(seed,r*5+4)*40;
    [l1,l2].slice(0,n).forEach(function(l,k){
      var big=hash(seed,r*5+5+k*1000)<.5;
      out.push({x:RL+LANE/2+l*LANE,z:z,w:big?28:14,h:big?50:14,big:big});
    });
  }
  return rowCache[r]=out;
}
function obsRange(z0,z1){
  var a=Math.max(0,Math.floor((z0-640)/ROW)),b=Math.floor((z1-600)/ROW),out=[];
  for(var r=a;r<=b;r++){var o=row(r);for(var i=0;i<o.length;i++)if(o[i].z>=z0&&o[i].z<=z1&&o[i].z<L-100)out.push(o[i])}
  return out;
}

// ---------- racing ----------
function buildGrid(humans){
  var slots=[0,1,2,3,4,5].sort(function(){return Math.random()-.5}),g=[],k=0;
  humans.forEach(function(h){g.push({id:h.id,name:h.name,car:h.car,slot:slots[k++]})});
  var n=0;
  while(g.length<GRID){var c=Math.floor(Math.random()*NCARS);g.push({id:'ai'+n++,name:car(c).name,car:c,ai:true,slot:slots[k++]})}
  return g;
}
function beginRace(grid,lvl,sd,myId){
  level=lvl;seed=sd;L=15000+lvl*250;rowCache={};racers=[];tick=0;cd=180;flash=0;
  grid.forEach(function(g){
    var s=g.slot,r={id:g.id,name:g.name,car:car(g.car),x:RL+LANE/2+(s%4)*LANE,z:-Math.floor(s/4)*70,v:0,vx:0,fin:null,hit:0,blind:0,lane:null};
    r.tx=r.x;r.tz=r.z;r.tv=0;
    r.mode=g.id===myId?'me':(g.ai&&(!net||net.host)?'sim':'remote');
    racers.push(r);if(r.mode==='me')me=r;
  });
  st='count';show(null);
}
function physics(r,steer){
  var c=r.car,top=(6+c.spd*.95)*(r.mode==='sim'?.82+level*.0016:1),acc=.012+c.acc*.0045,gr=2.2+c.grip*.45;
  r.vx+=(steer*gr-r.vx)*.18;r.x+=r.vx;
  var off=r.x<RL+8||r.x>RR-8;r.x=clamp(r.x,30,W-30);
  var cap=r.fin!=null?3:off?4:top;
  r.v+=(cap-r.v)*(r.v<cap?acc:.06);
  if(r.hit>0)r.hit--;
  var o=obsRange(r.z-60,r.z+60);
  for(var i=0;i<o.length;i++){
    var dx=Math.abs(o[i].x-r.x),dz=Math.abs(o[i].z-r.z);
    if(r.hit===0&&dx<(o[i].w+28)/2-3&&dz<(o[i].h+50)/2-4){r.v*=.4;r.hit=30;r.vx+=(r.x<o[i].x?-1:1)*3;if(r===me)flash=10}
  }
  r.z+=r.v;
  if(r.z>=L&&r.fin==null)r.fin=tick;
}
function aiSteer(r){
  var skill=Math.min(.6+level*.004,1);
  if(r.blind>0){r.blind--;return 0}
  if(Math.random()<(1-skill)*.004)r.blind=25;
  var bad=[false,false,false,false],cur=clamp(Math.round((r.x-RL-LANE/2)/LANE),0,3),best=r.lane==null?cur:r.lane;
  obsRange(r.z+20,r.z+150).forEach(function(o){var l=Math.round((o.x-RL-LANE/2)/LANE);if(l>=0&&l<4)bad[l]=true});
  if(bad[best]){var bd=9;for(var i=0;i<4;i++)if(!bad[i]&&Math.abs(i-cur)<bd){bd=Math.abs(i-cur);best=i}}
  else if(Math.random()<.004){var n=Math.floor(Math.random()*4);if(!bad[n])best=n}
  r.lane=best;
  return clamp((RL+LANE/2+best*LANE-r.x)*.07,-1,1);
}
function ranking(){
  return racers.slice().sort(function(a,b){
    if(a.fin!=null&&b.fin!=null)return a.fin-b.fin;
    if(a.fin!=null)return -1;if(b.fin!=null)return 1;return b.z-a.z;
  });
}
function dir(){
  var d=0;
  if(keys.ArrowLeft||keys.a||keys.A)d--;
  if(keys.ArrowRight||keys.d||keys.D)d++;
  return d||touch;
}

// ---------- results ----------
function renderResult(){
  var rk=ranking(),pos=rk.indexOf(me)+1,ol=$('rlist');
  ol.innerHTML='';
  rk.forEach(function(r,i){
    var li=document.createElement('li');if(r===me)li.className='me';
    var a=document.createElement('span'),b=document.createElement('span');
    a.textContent=(i+1)+'. '+r.name;b.textContent=r.fin!=null?(r.fin/60).toFixed(1)+' s':'racing';
    li.appendChild(a);li.appendChild(b);ol.appendChild(li);
  });
  return pos;
}
function showResult(){
  var pos=renderResult();
  $('rtitle').textContent=pos===1?'You won':'You finished '+ORD[pos-1];
  var adv=!net&&pos<=3&&level<MAXL;
  if(!net&&pos<=3&&level>=unlocked&&level<MAXL){unlocked=level+1;store('drUnlocked',unlocked)}
  $('res1').classList.toggle('hide',!!net);
  $('res1').textContent=adv?'Next level':'Try again';
  $('res1').dataset.adv=adv?'1':'';
  $('res2').textContent=net?'Back to the room':'Menu';
  show('result');
}

// ---------- networking (PeerJS: room code, then peer to peer) ----------
function mkCode(){var a='ABCDEFGHJKLMNPQRSTUVWXYZ',s='';for(var i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)];return s}
function closeNet(){if(net){try{net.peer.destroy()}catch(e){}}net=null}
function sendAll(m){net.conns.forEach(function(c){if(c.open)c.send(m)})}
function removeRacer(id){racers=racers.filter(function(r){return r.id!==id})}
function hostRoom(){
  if(typeof Peer==='undefined'){mpStatus('Online play could not load. Check your connection and reload.');return}
  closeNet();
  var code=mkCode(),peer=new Peer('dustroad-'+code);
  net={peer:peer,host:true,code:code,conns:[],states:{},lobby:[{id:'host',name:myName,car:selCar}]};
  peer.on('open',function(){show('lobby')});
  peer.on('error',function(e){if(e.type==='unavailable-id'){hostRoom();return}mpStatus('Connection problem ('+e.type+'). Try again.');show('mp')});
  peer.on('connection',function(c){
    c.on('open',function(){
      if(st==='count'||st==='race'||net.conns.length>=GRID-1){c.send({t:'full'});setTimeout(function(){c.close()},400);return}
      net.conns.push(c);
    });
    c.on('data',function(d){hostData(c,d)});
    c.on('close',function(){dropPeer(c.peer)});
  });
}
function hostData(c,d){
  if(d.t==='hello'){
    net.lobby=net.lobby.filter(function(p){return p.id!==c.peer});
    net.lobby.push({id:c.peer,name:String(d.name||'Driver').slice(0,12),car:clamp(d.car|0,0,NCARS-1)});
    lobbyBroadcast();
  }else if(d.t==='st')net.states[c.peer]=d;
}
function lobbyBroadcast(){sendAll({t:'lobby',p:net.lobby,lvl:mpLevel});if(screen==='lobby')renderLobby()}
function dropPeer(id){
  if(!net)return;
  net.conns=net.conns.filter(function(c){return c.peer!==id});
  net.lobby=net.lobby.filter(function(p){return p.id!==id});
  delete net.states[id];removeRacer(id);sendAll({t:'left',id:id});
  if(screen==='lobby')lobbyBroadcast();
}
function joinRoom(code){
  if(typeof Peer==='undefined'){mpStatus('Online play could not load. Check your connection and reload.');return}
  closeNet();
  var peer=new Peer();net={peer:peer,host:false,code:code,lobby:[]};
  peer.on('open',function(){
    var c=peer.connect('dustroad-'+code,{reliable:true});net.hc=c;
    var to=setTimeout(function(){if(!c.open){mpStatus('Could not reach room '+code+'.');closeNet()}},10000);
    c.on('open',function(){clearTimeout(to);c.send({t:'hello',name:myName,car:selCar});show('lobby')});
    c.on('data',clientData);
    c.on('close',function(){if(net){mpStatus('The host left the room.');closeNet();st='menu';racers=[];me=null;show('mp')}});
  });
  peer.on('error',function(e){mpStatus(e.type==='peer-unavailable'?'No room with that code.':'Connection problem ('+e.type+').')});
}
function clientData(d){
  if(d.t==='lobby'){net.lobby=d.p;mpLevel=d.lvl;if(screen==='lobby')renderLobby()}
  else if(d.t==='start')beginRace(d.grid,d.lvl,d.seed,net.peer.id);
  else if(d.t==='sts')applyStates(d.s);
  else if(d.t==='left')removeRacer(d.id);
  else if(d.t==='full'){mpStatus('That room is full or already racing.');closeNet();show('mp')}
}
function applyStates(map){
  for(var id in map){
    if(me&&id===me.id)continue;
    var m=map[id];
    for(var i=0;i<racers.length;i++){var r=racers[i];
      if(r.id===id&&r.mode==='remote'){r.tx=m.x;r.tz=m.z;r.tv=m.v;r.fin=m.f==null?null:m.f}}
  }
}
function netTick(){
  if(!net||!me||fc%5)return;
  var mine={x:me.x,z:me.z,v:me.v,f:me.fin};
  if(net.host){
    var s={host:mine};
    for(var id in net.states)s[id]=net.states[id];
    racers.forEach(function(r){if(r.mode==='sim')s[r.id]={x:r.x,z:r.z,v:r.v,f:r.fin}});
    applyStates(net.states);sendAll({t:'sts',s:s});
  }else if(net.hc&&net.hc.open)net.hc.send({t:'st',x:mine.x,z:mine.z,v:mine.v,f:mine.f});
}
function renderLobby(){
  if(!net)return;
  $('rcode').textContent=net.code;
  $('lnote').textContent=net.host?'Friends join with this code. Empty spots are filled with computer drivers.':'Waiting for the host to start the race.';
  var ul=$('plist');ul.innerHTML='';
  net.lobby.forEach(function(p){
    var li=document.createElement('li'),a=document.createElement('span'),b=document.createElement('span');
    a.textContent=p.name+(p.id==='host'?' (host)':'');b.textContent='#'+(p.car+1)+' '+car(p.car).name;
    li.appendChild(a);li.appendChild(b);ul.appendChild(li);
  });
  $('mlvl').textContent='Level '+mpLevel;
  $('lvlRow').classList.toggle('hide',!net.host);$('start').classList.toggle('hide',!net.host);
}

// ---------- update / draw ----------
function update(){
  fc++;
  if(st==='count'){if(--cd<=0)st='race'}
  else if(st==='race'||st==='done'){
    tick++;
    physics(me,me.fin==null?dir():0);
    racers.forEach(function(r){if(r.mode==='sim')physics(r,aiSteer(r))});
  }
  racers.forEach(function(r){
    if(r.mode==='remote'){r.tz+=r.tv;r.x+=(r.tx-r.x)*.3;r.z+=(r.tz-r.z)*.3;r.v=r.tv}
  });
  netTick();
  if(st==='race'&&me.fin!=null){st='done';resDelay=100}
  if(st==='done'){resDelay--;if(resDelay===0)showResult();else if(resDelay<0&&fc%30===0&&screen==='result')renderResult()}
}
function draw(){
  var z=me?me.z:(idleZ+=2);
  ctx.fillStyle='#d8a766';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#c6935a';
  for(var i=0;i<specks.length;i++){var s=specks[i];ctx.fillRect(s.x,(s.y+z*.6)%H,s.s,s.s)}
  ctx.fillStyle='#e8c68e';ctx.fillRect(RL-14,0,14,H);ctx.fillRect(RR,0,14,H);
  ctx.fillStyle='#363b47';ctx.fillRect(RL,0,RR-RL,H);
  ctx.fillStyle='#f4efe6';ctx.fillRect(RL+3,0,3,H);ctx.fillRect(RR-6,0,3,H);
  ctx.fillStyle='rgba(244,239,230,.7)';
  var off=z%60;
  for(var l=1;l<4;l++)for(var y=-60+off;y<H;y+=60)ctx.fillRect(RL+l*LANE-2,y,4,30);
  if(!me){$('hl').textContent='';$('hr').textContent='';return}
  var fy=PY-(L-z);
  if(fy>-30&&fy<H+30){for(var cx=0;cx<RR-RL;cx+=20)for(var k=0;k<2;k++){ctx.fillStyle=((cx/20+k)%2)?'#111':'#f4efe6';ctx.fillRect(RL+cx,fy+k*14-14,20,14)}}
  obsRange(z-(H-PY)-60,z+PY+60).forEach(function(o){
    var y=PY-(o.z-z);
    if(o.big){
      ctx.fillStyle='rgba(0,0,0,.28)';rr(ctx,o.x-11,y-21,28,50,7);ctx.fill();
      ctx.fillStyle='#8a8f98';rr(ctx,o.x-14,y-25,28,50,7);ctx.fill();
      ctx.fillStyle='rgba(20,28,40,.85)';rr(ctx,o.x-10,y-14,20,12,3);ctx.fill();
      ctx.fillStyle=(fc&16)?'#ffb347':'#7a4c10';ctx.fillRect(o.x-13,y+19,6,4);ctx.fillRect(o.x+7,y+19,6,4);
    }else{
      ctx.fillStyle='#ff7a1a';ctx.beginPath();ctx.moveTo(o.x,y-8);ctx.lineTo(o.x+8,y+8);ctx.lineTo(o.x-8,y+8);ctx.fill();
      ctx.fillStyle='#fff4de';ctx.fillRect(o.x-4,y,8,3);
    }
  });
  ctx.font='11px "Trebuchet MS",sans-serif';ctx.textAlign='center';
  racers.slice().sort(function(a,b){return a.z-b.z}).forEach(function(r){
    var y=PY-(r.z-z);if(y<-80||y>H+80)return;
    if(r===me){
      ctx.fillStyle='rgba(255,244,222,.12)';ctx.beginPath();ctx.moveTo(r.x-11,y-25);ctx.lineTo(r.x-20,y-95);ctx.lineTo(r.x+20,y-95);ctx.lineTo(r.x+11,y-25);ctx.fill();
    }
    drawCar(ctx,r.x,y,r.car);
    if(r!==me){ctx.fillStyle='rgba(255,244,222,.95)';ctx.fillText(r.name,r.x,y-34)}
  });
  if(flash>0){ctx.fillStyle='rgba(255,70,50,'+flash/25+')';ctx.fillRect(0,0,W,H);flash--}
  // progress bar with a dot per racer
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,W,6);
  racers.forEach(function(r){ctx.fillStyle=r===me?'#ffb347':'hsl('+r.car.hue+',70%,60%)';ctx.fillRect(clamp(r.z/L,0,1)*(W-6),r===me?0:1,6,r===me?6:4)});
  var rk=ranking();
  $('hl').textContent=ORD[rk.indexOf(me)]+' of '+racers.length;
  $('hr').textContent='Level '+level;
  ctx.fillStyle='#fff4de';ctx.textAlign='left';ctx.font='bold 14px "Trebuchet MS",sans-serif';
  ctx.fillText(Math.round(me.v*18)+' km/h',12,H-14);
  ctx.textAlign='center';ctx.font='bold 96px "Trebuchet MS",sans-serif';ctx.lineWidth=6;ctx.strokeStyle='rgba(0,0,0,.5)';
  var txt=st==='count'?String(Math.ceil(cd/60)):(st==='race'&&tick<45?'Go':'');
  if(txt){ctx.strokeText(txt,W/2,H/2-40);ctx.fillText(txt,W/2,H/2-40)}
}

// ---------- input and buttons ----------
addEventListener('keydown',function(e){keys[e.key]=true;if(e.key.indexOf('Arrow')===0&&st!=='menu')e.preventDefault()});
addEventListener('keyup',function(e){keys[e.key]=false});
function setTouch(e){var r=cv.getBoundingClientRect();touch=(e.clientX-r.left)<r.width/2?-1:1}
cv.addEventListener('pointerdown',function(e){setTouch(e);cv.setPointerCapture(e.pointerId)});
cv.addEventListener('pointermove',function(e){if(touch)setTouch(e)});
['pointerup','pointercancel'].forEach(function(n){cv.addEventListener(n,function(){touch=0})});

function on(id,fn){$(id).addEventListener('click',fn)}
on('lp',function(){selLevel--;renderMenu()});on('ln',function(){selLevel++;renderMenu()});
on('goSolo',function(){
  net=null;
  var g=buildGrid([{id:'me',name:'You',car:selCar}]);
  beginRace(g,selLevel,Math.floor(Math.random()*1e6)+1,'me');
});
on('goGarage',function(){garageIdx=selCar;show('garage')});
on('gp',function(){gStep(-1)});on('gn',function(){gStep(1)});on('gm10',function(){gStep(-10)});on('gp10',function(){gStep(10)});
on('gr',function(){garageIdx=Math.floor(Math.random()*NCARS);renderGarage()});
on('gsel',function(){selCar=garageIdx;store('drCar',selCar);show('menu')});
on('goMp',function(){$('pname').value=myName;mpStatus('Everyone needs this page open. Works on the same WiFi or over the internet.');show('mp')});
$('pname').addEventListener('change',function(){myName=($('pname').value.trim()||myName).slice(0,12);store('drName',myName)});
on('host',function(){myName=($('pname').value.trim()||myName).slice(0,12);store('drName',myName);mpStatus('Creating a room...');hostRoom()});
on('join',function(){
  var c=$('code').value.trim().toUpperCase();
  if(c.length!==4){mpStatus('Enter the 4-letter room code.');return}
  myName=($('pname').value.trim()||myName).slice(0,12);store('drName',myName);mpStatus('Joining '+c+'...');joinRoom(c);
});
on('mpback',function(){closeNet();show('menu')});
on('mlp',function(){if(mpLevel>1){mpLevel--;lobbyBroadcast()}});
on('mln',function(){if(mpLevel<MAXL){mpLevel++;lobbyBroadcast()}});
on('start',function(){
  var g=buildGrid(net.lobby),sd=Math.floor(Math.random()*1e6)+1;
  sendAll({t:'start',grid:g,lvl:mpLevel,seed:sd});
  beginRace(g,mpLevel,sd,'host');
});
on('leave',function(){closeNet();st='menu';racers=[];me=null;show('menu')});
on('res1',function(){
  if($('res1').dataset.adv)selLevel=Math.min(level+1,unlocked);else selLevel=level;
  $('goSolo').click();
});
on('res2',function(){
  if(net){st='menu';racers=[];me=null;show('lobby')}
  else{st='menu';racers=[];me=null;selLevel=Math.min(selLevel,unlocked);show('menu')}
});

show('menu');
(function loop(){update_safe();draw();requestAnimationFrame(loop)})();
function update_safe(){if(me&&st!=='menu')update()}
})();
