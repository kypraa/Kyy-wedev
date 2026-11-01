/* Mode mandiri: kalau tidak berjalan di claude.ai, data disimpan di localStorage browser */
if(!window.claude){(function(){
  function load(k){try{return JSON.parse(localStorage.getItem('pvdb-'+k)||'{}')}catch(e){return {}}}
  function save(k,v){try{localStorage.setItem('pvdb-'+k,JSON.stringify(v))}catch(e){}}
  var subs={};
  function snap(k){var o=load(k);var docs=Object.keys(o).map(function(id){return{id:id,data:function(){return o[id]}}});return{docs:docs,size:docs.length}}
  function notify(k){(subs[k]||[]).forEach(function(f){f(snap(k))})}
  var db={
    collection:function(k){var q={
      doc:function(id){id=id||('l'+Date.now().toString(36)+Math.random().toString(36).slice(2,6));
        return{set:function(d){var o=load(k);o[id]=d;save(k,o);notify(k);return Promise.resolve()},
               delete:function(){var o=load(k);delete o[id];save(k,o);notify(k);return Promise.resolve()}}},
      orderBy:function(){return q},
      onSnapshot:function(f){(subs[k]=subs[k]||[]).push(f);setTimeout(function(){f(snap(k))},0);return function(){}}
    };return q},
    doc:function(p){var s=p.split('/');return db.collection(s[0]).doc(s[1])}
  };
  var dl={save:function(o){var a=document.createElement('a');a.href=URL.createObjectURL(o.data);a.download=o.filename;a.click();return Promise.resolve()}};
  var us={isOwner:function(){return false},id:function(){return Promise.resolve('local')}};
  window.claude={use:function(n){return Promise.resolve(n==='db'?db:n==='downloads'?dl:n==='user'?us:null)}};
})()}
(function(){
  var HASH='08944167d234a9bfe4454b40d77908e7717b1310d0736f46455d06479de4d2a0';
  var CATS={all:'Semua',web:'Website',app:'Aplikasi',api:'Backend / API',lain:'Lainnya'};
  var projects=[],filter='all',editId=null,admin=false,col=null,state='loading';
  var $=function(id){return document.getElementById(id)};
  try{admin=sessionStorage.getItem('pv-admin')==='1'}catch(e){}

  function toast(m){var t=$('toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(function(){t.hidden=true},2500)}
  function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
  function safeUrl(u){try{var x=new URL(u);return(x.protocol==='https:'||x.protocol==='http:')?x.href:''}catch(e){return ''}}
  function sha(t){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)).then(function(b){return Array.prototype.map.call(new Uint8Array(b),function(x){return('0'+x.toString(16)).slice(-2)}).join('')})}
  function fail(e){toast(e&&e.code==='not_granted'?'Gagal menyimpan: hanya pemilik halaman yang boleh mengubah data.':'Gagal menyimpan. Coba lagi.')}

  function syncAdmin(){
    $('login').hidden=admin;$('panel').hidden=!admin;
    $('adminBtn').textContent=admin?'Menu admin (aktif)':'Menu admin';
    if(admin)watchVisitors();
    render();
  }
  function renderChips(){
    var c=$('chips');c.textContent='';
    Object.keys(CATS).forEach(function(k){
      var b=el('button','chip',CATS[k]);b.setAttribute('aria-pressed',String(filter===k));
      b.onclick=function(){filter=k;render()};c.appendChild(b);
    });
  }
  function renderStats(){
    var s=$('stats');s.textContent='';var t={};
    projects.forEach(function(p){p.tech.forEach(function(x){t[x.toLowerCase()]=1})});
    [projects.length+' project',Object.keys(t).length+' teknologi'].forEach(function(x){s.appendChild(el('span','stat',x))});
  }
  function render(){
    renderChips();renderStats();
    var q=$('q').value.trim().toLowerCase(),g=$('grid');g.textContent='';
    var list=projects.filter(function(p){
      if(filter!=='all'&&p.cat!==filter)return false;
      return !q||(p.title+' '+p.desc+' '+p.tech.join(' ')).toLowerCase().indexOf(q)>-1;
    });
    if(!list.length){
      var m=state==='loading'?'Memuat project...':state==='off'?'Data project tidak bisa dimuat. Buka halaman ini dari akun claude.ai yang punya akses.':projects.length?'Tidak ada project yang cocok. Coba kata kunci lain.':'Belum ada project. Admin bisa menambahkannya lewat Menu admin.';
      g.appendChild(el('div','box empty',m));return;
    }
    list.forEach(function(p){
      var c=el('article','box card '+p.cat);if(p.color)c.style.background=p.color;
      c.appendChild(el('span','badge',CATS[p.cat]||'Lainnya'));
      c.appendChild(el('h3',null,p.title));
      c.appendChild(el('p',null,p.desc||'Tanpa deskripsi.'));
      var tg=el('div','tags');p.tech.forEach(function(t){tg.appendChild(el('span','tag',t))});c.appendChild(tg);
      var a=el('div','acts'),u=safeUrl(p.url);
      if(u){var l=el('a','btn','Buka');l.href=u;l.target='_blank';l.rel='noopener noreferrer';a.appendChild(l)}
      if(admin){
        var e=el('button',null,'Edit');e.onclick=function(){startEdit(p.id)};a.appendChild(e);
        var d=el('button',null,'Hapus');d.onclick=function(){
          if(!d.dataset.arm){d.dataset.arm='1';d.textContent='Yakin hapus?';setTimeout(function(){d.dataset.arm='';d.textContent='Hapus'},3000);return}
          col.doc(p.id).delete().then(function(){toast('Project dihapus')}).catch(fail);
        };a.appendChild(d);
      }
      c.appendChild(a);g.appendChild(c);
    });
  }
  function resetForm(){editId=null;$('form').reset();setColor('');$('formTitle').textContent='Tambah project';$('save').textContent='Simpan project'}
  function startEdit(id){
    var p=projects.find(function(x){return x.id===id});if(!p)return;
    editId=id;$('f-title').value=p.title;$('f-desc').value=p.desc;$('f-tech').value=p.tech.join(', ');$('f-url').value=p.url;$('f-cat').value=p.cat;setColor(p.color||'');
    $('formTitle').textContent='Edit project';$('save').textContent='Simpan perubahan';$('cancel').hidden=false;
    openModal();
  }
  function toItem(x,created){
    return{title:String(x.title).slice(0,60),desc:String(x.desc||'').slice(0,300),
      tech:Array.isArray(x.tech)?x.tech.map(String).slice(0,12):[],url:String(x.url||''),cat:CATS[x.cat]?x.cat:'lain',color:COLORS.indexOf(x.color)>-1?x.color:'',createdAt:created||Date.now()};
  }
  $('form').onsubmit=function(ev){
    ev.preventDefault();if(!admin||!col)return;
    var item=toItem({title:$('f-title').value.trim(),desc:$('f-desc').value.trim(),
      tech:$('f-tech').value.split(',').map(function(t){return t.trim()}).filter(Boolean),url:$('f-url').value.trim(),cat:$('f-cat').value,color:curColor});
    if(!item.title)return;
    var old=editId&&projects.find(function(p){return p.id===editId});
    if(old)item.createdAt=old.createdAt;
    var ref=editId?col.doc(editId):col.doc();
    var wasEdit=!!editId;
    ref.set(item).then(function(){toast(wasEdit?'Perubahan disimpan':'Project disimpan');closeModal()}).catch(fail);
  };
  function openModal(){$('modal').hidden=false;$('f-title').focus()}
  function closeModal(){$('modal').hidden=true;resetForm()}
  $('addBtn').onclick=function(){resetForm();openModal()};
  $('closeModal').onclick=closeModal;$('cancel').onclick=closeModal;
  $('modal').onclick=function(e){if(e.target===this)closeModal()};
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('modal').hidden)closeModal()});
  $('q').oninput=render;
  $('adminBtn').onclick=function(){var a=$('admin');a.hidden=!a.hidden;if(!a.hidden)(admin?$('f-title'):$('l-user')).focus()};
  $('closeAdmin').onclick=function(){$('admin').hidden=true};
  $('loginForm').onsubmit=function(ev){
    ev.preventDefault();
    sha($('l-user').value.trim()+':'+$('l-pass').value).then(function(h){
      if(h===HASH){admin=true;try{sessionStorage.setItem('pv-admin','1')}catch(e){}$('err').textContent='';$('loginForm').reset();syncAdmin();toast('Berhasil masuk sebagai admin')}
      else $('err').textContent='Username atau password salah.';
    });
  };
  $('logout').onclick=function(){admin=false;try{sessionStorage.removeItem('pv-admin')}catch(e){}resetForm();$('admin').hidden=true;syncAdmin();toast('Anda sudah keluar')};
  $('export').onclick=function(){
    var b=new Blob([JSON.stringify(projects,null,2)],{type:'application/json'});
    claude.use('downloads').then(function(d){if(d)return d.save({filename:'projects.json',data:b});toast('Ekspor tidak tersedia di tampilan ini')}).catch(function(){});
  };
  $('import').onclick=function(){$('file').click()};
  $('file').onchange=function(){
    var f=this.files[0];if(!f||!col)return;var r=new FileReader();
    r.onload=function(){
      try{
        var d=JSON.parse(r.result);if(!Array.isArray(d))throw 0;var n=0;
        d.forEach(function(x,i){if(x&&typeof x.title==='string'){n++;col.doc().set(toItem(x,Date.now()-i)).catch(fail)}});
        toast(n+' project diimpor');
      }catch(e){toast('File JSON tidak valid')}
    };
    r.readAsText(f);this.value='';
  };
  $('theme').onclick=function(){
    var r=document.documentElement,dark=r.getAttribute('data-theme')==='dark'||(!r.getAttribute('data-theme')&&matchMedia('(prefers-color-scheme: dark)').matches);
    r.setAttribute('data-theme',dark?'light':'dark');
  };

  var mb=$('menuBtn'),mn=$('menu');
  function setMenu(o){mn.hidden=!o;mb.setAttribute('aria-expanded',String(o));mb.textContent=o?'Tutup':'Menu'}
  mb.onclick=function(){setMenu(mn.hidden)};
  var dbP=(window.claude?claude.use('db'):Promise.resolve(null)).catch(function(){return null});
  mn.addEventListener('click',function(e){var t=e.target.closest('a,button');if(!t)return;setMenu(false);if(t.getAttribute('href')==='#projects'&&location.hash==='#projects')route()});
  var VIEWS=['home','about','contact'];
  function route(){
    var raw=location.hash.slice(1),h=raw==='projects'?'home':raw;if(VIEWS.indexOf(h)<0)h='home';
    document.querySelectorAll('[data-view]').forEach(function(n){n.hidden=n.getAttribute('data-view')!==h});
    mn.querySelectorAll('a').forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+(raw==='projects'?raw:h))});
    if(raw==='projects')setTimeout(function(){$('projects').scrollIntoView({behavior:'smooth',block:'start'})},60);else window.scrollTo(0,0);
  }
  window.addEventListener('hashchange',route);route();

  var COLORS=['#8ec5ff','#ff9ecb','#b5f23d','#ffd23f','#ff9f5a','#c9a7ff'],curColor='';
  function setColor(c){curColor=c;document.querySelectorAll('#swatches .sw').forEach(function(b){b.setAttribute('aria-pressed',String((b.getAttribute('data-c')||'')===c))})}
  (function(){
    var w=$('swatches');
    [''].concat(COLORS).forEach(function(c){
      var b=el('button','sw',c?'':'Auto');b.type='button';b.setAttribute('data-c',c);
      if(c)b.style.background=c;else{b.style.width='auto';b.style.padding='0 10px'}
      b.setAttribute('aria-label',c?'Warna '+c:'Warna otomatis sesuai kategori');
      b.onclick=function(){setColor(c)};w.appendChild(b);
    });
    setColor('');
  })();
  var bgm=$('bgm'),mBtn=$('musicBtn'),mStarted=false;
  bgm.volume=0.6;
  function mLabel(){var on=!bgm.paused&&!bgm.muted;$('mtip').hidden=on||userStopped;mBtn.textContent='';mBtn.appendChild(document.createTextNode(on?'⏸':'▶'));mBtn.appendChild(el('span','mtxt',on?'Stop Music':'Play Music'));mBtn.setAttribute('aria-pressed',String(on))}
  function startMusic(){
    try{
      var go=function(){if(!mStarted){bgm.currentTime=50;mStarted=true}var p=bgm.play();if(p&&p.catch)p.catch(function(){})};
      if(bgm.readyState>=1)go();else{bgm.addEventListener('loadedmetadata',go,{once:true});bgm.load()}
    }catch(e){}
  }
  mBtn.onclick=function(){if(bgm.muted){bgm.muted=false;userStopped=false;if(bgm.paused)startMusic();mLabel()}else if(bgm.paused){userStopped=false;startMusic()}else{userStopped=true;bgm.pause()}};
  bgm.addEventListener('play',mLabel);bgm.addEventListener('pause',mLabel);bgm.addEventListener('volumechange',mLabel);
  bgm.addEventListener('ended',function(){bgm.currentTime=50;bgm.play().catch(function(){})});
  
  mLabel();
  var userStopped=false;
  function autoStart(){
    bgm.muted=true;startMusic();
    var arm=function(e){
      if(e.target&&e.target.closest&&e.target.closest('#musicBtn'))return;
      document.removeEventListener('pointerdown',arm);document.removeEventListener('keydown',arm);
      if(!userStopped){bgm.muted=false;if(bgm.paused)startMusic();mLabel()}
    };
    document.addEventListener('pointerdown',arm);document.addEventListener('keydown',arm);
  }
  autoStart();
  var vUnsub=null;
  function watchVisitors(){
    if(!admin||vUnsub)return;
    dbP.then(function(db){
      if(!db||vUnsub)return;
      vUnsub=db.collection('visitors').orderBy('at','desc').onSnapshot(function(s){
        var ul=$('visitors');ul.textContent='';$('vcount').textContent=s.size;
        if(!s.docs.length){ul.appendChild(el('li',null,'Belum ada pengunjung.'));return}
        s.docs.slice(0,50).forEach(function(d){var x=d.data()||{};ul.appendChild(el('li',null,String(x.name||'?')+' - '+new Date(+x.at||0).toLocaleString('id-ID')))});
      },function(){});
    });
  }
  function openGate(){
    var seen=false;try{seen=sessionStorage.getItem('pv-visitor')==='1'}catch(e){}
    if(admin||seen){$('gate').hidden=true;return}
    $('gateMsg').hidden=true;$('gateForm').hidden=false;
    try{$('g-name').value=localStorage.getItem('pv-name')||''}catch(e){}
    $('g-name').focus();
  }
  $('gateForm').onsubmit=function(ev){
    ev.preventDefault();var n=$('g-name').value.trim().slice(0,60);if(!n)return;
    try{startMusic();localStorage.setItem('pv-name',n);sessionStorage.setItem('pv-visitor','1')}catch(e){}
    $('gate').hidden=true;
    Promise.all([dbP,(window.claude?claude.use('user'):Promise.resolve(null))]).then(function(r){
      var db=r[0],u=r[1];if(!db||!u||!u.id)return;
      return u.id().then(function(id){return db.doc('visitors/'+id).set({name:n,at:Date.now()})});
    }).catch(function(){});
  };
  Promise.race([(window.claude?claude.use('user'):Promise.resolve(null)),new Promise(function(r){setTimeout(function(){r(null)},3000)})])
    .then(function(u){if(u&&u.isOwner&&u.isOwner())$('gate').hidden=true;else openGate()}).catch(openGate);

  syncAdmin();
  var timer=setTimeout(function(){if(state==='loading'){state='off';render()}},10000);
  dbP.then(function(db){
    if(!db){clearTimeout(timer);state='off';render();return}
    col=db.collection('projects');
    col.onSnapshot(function(snap){
      clearTimeout(timer);state='ready';
      projects=snap.docs.map(function(d){var x=d.data()||{};
        return{id:d.id,title:String(x.title||'Tanpa judul'),desc:String(x.desc||''),tech:Array.isArray(x.tech)?x.tech.map(String):[],url:String(x.url||''),cat:CATS[x.cat]?x.cat:'lain',color:COLORS.indexOf(x.color)>-1?x.color:'',createdAt:+x.createdAt||0}
      }).sort(function(a,b){return b.createdAt-a.createdAt});
      render();
    },function(){clearTimeout(timer);state='off';render()});
  }).catch(function(){state='off';render()});
})();
