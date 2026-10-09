const el=id=>document.getElementById(id),storageKey='tigalapan_preview_session';
let token=sessionStorage.getItem(storageKey)||'',requestCounter=0;
const base=String(window.STOCK_CONFIG?.supabaseUrl||'').replace(/\/$/,'');
function message(text){el('message').textContent=text;}
function clearSession(){++requestCounter;token='';sessionStorage.removeItem(storageKey);el('dashboard').hidden=true;el('login-section').hidden=false;el('store-rows').replaceChildren();el('recent-rows').replaceChildren();}
function busy(value){document.querySelectorAll('button,#dashboard select').forEach(b=>b.disabled=value);}
async function api(action,body={}){
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)||base==='https://PROJECT.supabase.co')throw Error('URL project belum diisi pada config.js.');
 const r=await fetch(base+'/functions/v1/stock-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...body}),signal:AbortSignal.timeout(65000)});
 const data=await r.json();
 if(!data.ok){if(data.code==='INVALID_SESSION'||(r.status===401&&action!=='LOGIN'))clearSession();throw Error(data.error||'Permintaan gagal.');}
 return data.data;
}
function options(select,items,valueKey,labelKey,placeholder){const selected=select.value;select.replaceChildren(new Option(placeholder,''));for(const item of items){const value=typeof item==='object'?String(item[valueKey]):String(item);const label=typeof item==='object'?String(item[labelKey]||value):value;select.add(new Option(label,value));}if([...select.options].some(o=>o.value===selected))select.value=selected;else if(selected)select.add(new Option(selected,selected,true,true));}
function tableRows(target,rows,keys){target.replaceChildren();for(const row of rows){const tr=document.createElement('tr');for(const key of keys){const td=document.createElement('td');td.textContent=String(row[key]??'');tr.append(td);}target.append(tr);}if(!rows.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=keys.length;td.textContent='Tidak ada data pada filter ini.';tr.append(td);target.append(tr);}}
function setAccount(data){token=data.token;sessionStorage.setItem(storageKey,token);el('account-name').textContent=data.bootstrap.user.NAME||data.bootstrap.user.USERNAME;el('account-role').textContent=data.bootstrap.user.ROLE;el('login-section').hidden=true;el('dashboard').hidden=false;}
async function dashboard(){
 const id=++requestCounter;busy(true);message('Memuat dashboard…');
 for(const key of ['total-so','stores-so','authorized-stores'])el(key).textContent='—';
 el('status-cards').replaceChildren();el('store-rows').replaceChildren();el('recent-rows').replaceChildren();
 const filters={storeId:el('store-filter').value,status:el('status-filter').value,year:el('year-filter').value};
 try{const data=await api('DASHBOARD',{token,filters});if(id!==requestCounter)return;
  el('total-so').textContent=String(data.summary.totalSo);el('stores-so').textContent=String(data.summary.storesWithSo);el('authorized-stores').textContent=String(data.summary.authorizedStores);
  options(el('store-filter'),data.facets.stores,'storeId','storeName','Semua toko dalam akses saya');options(el('status-filter'),data.facets.statuses,'','','Semua status');options(el('year-filter'),data.facets.years,'','','Semua tahun');
  el('status-cards').replaceChildren();for(const row of data.byStatus){const box=document.createElement('div'),label=document.createElement('span'),number=document.createElement('strong');box.className='status-item';label.textContent=row.status;number.textContent=String(row.total);box.append(label,number);el('status-cards').append(box);}if(!data.byStatus.length)el('status-cards').textContent='Tidak ada data pada filter ini.';
  tableRows(el('store-rows'),data.byStore,['storeName','total']);tableRows(el('recent-rows'),data.recentSo,['soNumber','storeName','soType','status']);
  el('source-info').textContent='Revision salinan: '+data.source.revision+' • Data pada salinan; belum ada sinkronisasi atau penyimpanan operasional pada preview.';message('');
 }catch(error){if(id===requestCounter)message(error.message);}finally{if(id===requestCounter)busy(false);}
}
el('login-form').addEventListener('submit',async event=>{event.preventDefault();busy(true);message('Memeriksa akun…');try{const data=await api('LOGIN',{username:el('username').value,password:el('password').value});setAccount(data);await dashboard();}catch(error){message(error.message);}finally{el('password').value='';busy(false);}});
el('apply').addEventListener('click',dashboard);el('reset').addEventListener('click',()=>{for(const id of ['store-filter','status-filter','year-filter'])el(id).value='';dashboard();});
el('logout').addEventListener('click',async()=>{busy(true);try{await api('LOGOUT',{token});clearSession();message('Anda sudah keluar.');}catch(error){message(error.message);}finally{busy(false);}});
if(token){busy(true);api('RESUME',{token}).then(data=>{setAccount(data);return dashboard();}).catch(error=>{clearSession();message(error.message);}).finally(()=>busy(false));}
