const el=id=>document.getElementById(id),storageKey='tigalapan_preview_session';
let listNext=null,detailNext=null,selectedSo='',detailRequest=0;
let token=sessionStorage.getItem(storageKey)||'',requestCounter=0;
const base=String(window.STOCK_CONFIG?.supabaseUrl||'').replace(/\/$/,'');
function message(text){el('message').textContent=text;}
function resetDetail(){++detailRequest;selectedSo='';detailNext=null;el('so-detail').hidden=true;el('detail-rows').replaceChildren();}
function clearSession(){resetDetail();el('so-list-rows').replaceChildren();++requestCounter;token='';sessionStorage.removeItem(storageKey);el('dashboard').hidden=true;el('login-section').hidden=false;el('store-rows').replaceChildren();el('recent-rows').replaceChildren();}
function busy(value){document.querySelectorAll('button,#dashboard select').forEach(b=>b.disabled=value);if(!value){el('so-next').disabled=listNext===null;el('detail-next').disabled=detailNext===null;}}
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
 const id=++requestCounter;resetDetail();el('so-list-rows').replaceChildren();listNext=null;busy(true);message('Memuat dashboard…');
 for(const key of ['total-so','stores-so','authorized-stores'])el(key).textContent='—';
 el('status-cards').replaceChildren();el('store-rows').replaceChildren();el('recent-rows').replaceChildren();
 const filters={storeId:el('store-filter').value,status:el('status-filter').value,year:el('year-filter').value};
 try{const data=await api('DASHBOARD',{token,filters});if(id!==requestCounter)return;
  el('total-so').textContent=String(data.summary.totalSo);el('stores-so').textContent=String(data.summary.storesWithSo);el('authorized-stores').textContent=String(data.summary.authorizedStores);
  options(el('store-filter'),data.facets.stores,'storeId','storeName','Semua toko dalam akses saya');options(el('status-filter'),data.facets.statuses,'','','Semua status');options(el('year-filter'),data.facets.years,'','','Semua tahun');
  el('status-cards').replaceChildren();for(const row of data.byStatus){const box=document.createElement('div'),label=document.createElement('span'),number=document.createElement('strong');box.className='status-item';label.textContent=row.status;number.textContent=String(row.total);box.append(label,number);el('status-cards').append(box);}if(!data.byStatus.length)el('status-cards').textContent='Tidak ada data pada filter ini.';
  tableRows(el('store-rows'),data.byStore,['storeName','total']);tableRows(el('recent-rows'),data.recentSo,['soNumber','storeName','soType','status']);
  el('source-info').textContent='Revision salinan: '+data.source.revision+' • Data pada salinan; belum ada sinkronisasi atau penyimpanan operasional pada preview.';await loadSoList(0,id);if(id===requestCounter)message('');
 }catch(error){if(id===requestCounter)message(error.message);}finally{if(id===requestCounter)busy(false);}
}
el('login-form').addEventListener('submit',async event=>{event.preventDefault();busy(true);message('Memeriksa akun…');try{const data=await api('LOGIN',{username:el('username').value,password:el('password').value});setAccount(data);await dashboard();}catch(error){message(error.message);}finally{el('password').value='';busy(false);}});
el('apply').addEventListener('click',dashboard);el('reset').addEventListener('click',()=>{for(const id of ['store-filter','status-filter','year-filter'])el(id).value='';dashboard();});
el('logout').addEventListener('click',async()=>{busy(true);try{await api('LOGOUT',{token});clearSession();message('Anda sudah keluar.');}catch(error){message(error.message);}finally{busy(false);}});
if(token){busy(true);api('RESUME',{token}).then(data=>{setAccount(data);return dashboard();}).catch(error=>{clearSession();message(error.message);}).finally(()=>busy(false));}

function currentFilters(){return {storeId:el('store-filter').value,status:el('status-filter').value,year:el('year-filter').value};}
async function loadSoList(cursor=0,id=requestCounter){
 const data=await api('SO_LIST',{token,filters:currentFilters(),cursor,limit:50});if(id!==requestCounter)return;
 listNext=data.nextCursor;el('so-list-info').textContent='Total '+data.total+' SO pada filter ini • '+data.items.length+' baris pada halaman ini. Urutan baris sumber.';
 const target=el('so-list-rows');target.replaceChildren();
 for(const item of data.items){const tr=document.createElement('tr');for(const key of ['soNumber','storeName','soType','status']){const td=document.createElement('td');td.textContent=String(item[key]??'');tr.append(td);}const td=document.createElement('td'),button=document.createElement('button');button.textContent='Buka';button.addEventListener('click',()=>openSo(item.soId,0));td.append(button);tr.append(td);target.append(tr);}
 if(!data.items.length)tableRows(target,[],['soNumber','storeName','soType','status','detail']);
}
async function changeList(cursor){const id=requestCounter;busy(true);message('Memuat daftar SO…');try{await loadSoList(cursor,id);if(id===requestCounter)message('');}catch(e){if(id===requestCounter)message(e.message);}finally{busy(false);}}
async function openSo(soId,cursor=0){
 const id=requestCounter,detailId=++detailRequest;selectedSo=soId;detailNext=null;busy(true);el('so-detail').hidden=true;el('detail-rows').replaceChildren();message('Memuat detail SKU…');
 try{const data=await api('SO_DETAIL',{token,soId,cursor,limit:100});if(id!==requestCounter||detailId!==detailRequest)return;
  detailNext=data.nextCursor;el('detail-title').textContent='Detail '+data.header.soNumber+' • '+data.header.storeName;
  el('detail-info').textContent='Total '+data.totalRows+' baris SKU aktif • '+data.items.length+' baris pada halaman ini.';
  const rows=data.items.map(x=>({...x,...Object.fromEntries(['warehouseQty','displayQty','rejectQty','reserveQty','countTotal'].map(k=>[k,x[k]===null||x[k]===undefined||String(x[k]).trim()===''?'—':String(x[k])]))}));
  tableRows(el('detail-rows'),rows,['skuCode','barcode','productName','warehouseQty','displayQty','rejectQty','reserveQty','countTotal','countStatus']);el('so-detail').hidden=false;message('');el('so-detail').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){if(id===requestCounter&&detailId===detailRequest)message(e.message);}finally{busy(false);}
}
el('so-first').addEventListener('click',()=>changeList(0));el('so-next').addEventListener('click',()=>{if(listNext!==null)changeList(listNext);});
el('detail-first').addEventListener('click',()=>openSo(selectedSo,0));el('detail-next').addEventListener('click',()=>{if(detailNext!==null)openSo(selectedSo,detailNext);});el('detail-close').addEventListener('click',resetDetail);
