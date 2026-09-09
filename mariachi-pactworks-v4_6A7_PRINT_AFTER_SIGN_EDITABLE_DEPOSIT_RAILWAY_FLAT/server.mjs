
import http from 'node:http';
import {createReadStream, existsSync, statSync} from 'node:fs';
import {join, extname, normalize} from 'node:path';
import {createHash, randomBytes} from 'node:crypto';

const PORT=Number(process.env.PORT||3000);
const SITE_ROOT=process.env.SITE_ROOT||'/srv';
const SUPABASE_URL=(process.env.SUPABASE_URL||'https://rssklnlnztiktldxmyxl.supabase.co').replace(/\/$/,'');
const SERVICE_ROLE=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const PUBLISHABLE=process.env.SUPABASE_PUBLISHABLE_KEY||'';
const ORG_ID=process.env.PACTWORKS_ORG_ID||'';
const PUBLIC_BASE=(process.env.PUBLIC_SITE_URL||'').replace(/\/$/,'');
const RESEND_KEY=process.env.RESEND_API_KEY||'';
const EMAIL_FROM=process.env.CONTRACT_EMAIL_FROM||'';
const DB_SCHEMA=process.env.PACTWORKS_DB_SCHEMA||'pactworks';

function json(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(data))}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>2_000_000)throw Error('Request too large')}return s?JSON.parse(s):{}}
function hashToken(token){return createHash('sha256').update(String(token)).digest('hex')}
function comparableContractPayload(payload){
  // issuedAt changes every time the browser regenerates the same frozen contract.
  // It must not force a new contract version. All substantive contract fields remain compared.
  const copy=JSON.parse(JSON.stringify(payload||{}));
  delete copy.issuedAt;
  return JSON.stringify(copy);
}
function safeToken(v){return /^[A-Za-z0-9_-]{32,160}$/.test(String(v||''))?String(v):''}
function mime(p){return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp'})[extname(p).toLowerCase()]||'application/octet-stream'}

async function sb(path,{method='GET',payload,prefer='return=representation'}={}){
  if(!SERVICE_ROLE)throw Error('Hosted contract backend is not configured: SUPABASE_SERVICE_ROLE_KEY missing');
  const r=await fetch(SUPABASE_URL+'/rest/v1/'+path,{
    method,
    headers:{
      apikey:SERVICE_ROLE,authorization:'Bearer '+SERVICE_ROLE,
      'content-type':'application/json',
      'accept-profile':DB_SCHEMA,'content-profile':DB_SCHEMA,
      ...(prefer?{prefer}:{})
    },
    body:payload===undefined?undefined:JSON.stringify(payload)
  });
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok)throw Error(`Supabase ${r.status}: ${typeof data==='string'?data:JSON.stringify(data)}`);
  return data;
}
function membershipValue(row,names){
  for(const name of names){
    if(row && Object.prototype.hasOwnProperty.call(row,name))return row[name];
  }
  return undefined;
}
async function pactworksAdminMembership(userId){
  if(!ORG_ID)throw Error('PACTWORKS_ORG_ID missing');

  // Read only PactWorks organization membership rows server-side, then fail
  // closed unless this authenticated user is an active owner/admin for ORG_ID.
  const rows=await sb('organization_members?select=*&limit=5000');
  if(!Array.isArray(rows))return null;

  for(const row of rows){
    const org=membershipValue(row,['org_id','organization_id']);
    const uid=membershipValue(row,['user_id','member_user_id','auth_user_id','account_user_id']);
    if(String(org||'')!==String(ORG_ID)||String(uid||'')!==String(userId||''))continue;

    const role=String(membershipValue(row,['role','member_role','organization_role'])||'').toLowerCase();
    const statusRaw=membershipValue(row,['status','membership_status']);
    const activeRaw=membershipValue(row,['active','is_active','enabled']);
    const status=statusRaw===undefined?'active':String(statusRaw||'').toLowerCase();
    const active=activeRaw===undefined?true:Boolean(activeRaw);

    if(active && ['active','enabled','approved','current'].includes(status) && ['owner','admin'].includes(role)){
      return {row,role,status};
    }
  }
  return null;
}
async function adminUser(req){
  const auth=String(req.headers.authorization||'');
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!token)throw Object.assign(Error('Admin sign-in required'),{status:401});

  const r=await fetch(SUPABASE_URL+'/auth/v1/user',{
    headers:{apikey:PUBLISHABLE||SERVICE_ROLE,authorization:'Bearer '+token}
  });
  if(!r.ok)throw Object.assign(Error('Admin session is invalid or expired'),{status:401});

  const u=await r.json();
  if(!u?.id)throw Object.assign(Error('Admin user not found'),{status:401});

  const membership=await pactworksAdminMembership(u.id);
  if(!membership){
    throw Object.assign(Error('Active PactWorks owner/admin membership required'),{status:403});
  }
  return {...u,pactworksMembership:{role:membership.role,status:membership.status}};
}
async function insertEvent(id,type,actor,payload={},actorUserId=null){
  try{await sb('hosted_contract_events',{method:'POST',payload:{hosted_contract_id:id,event_type:type,actor_type:actor,actor_user_id:actorUserId,payload}})}catch(e){console.error('event insert failed',e.message)}
}
async function sendContractEmail({to,name,link,business,contractId}){
  if(!RESEND_KEY||!EMAIL_FROM||!to)return {status:'not_configured'};
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:'Bearer '+RESEND_KEY,'content-type':'application/json'},body:JSON.stringify({
    from:EMAIL_FROM,to:[to],subject:`${business||'Mariachi Hermanos Azteca'} — review and sign your contract`,
    html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto"><h2>Review and sign your mariachi contract</h2><p>Hello ${String(name||'').replace(/[<>&]/g,'')},</p><p>Your contract ${String(contractId||'').replace(/[<>&]/g,'')} is ready.</p><p><a style="display:inline-block;background:#691628;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold" href="${link}">Review & sign contract</a></p><p>This secure link opens only the customer contract page. Payment is currently handled through Zelle and must be verified by the mariachi before the date becomes reserved.</p></div>`
  })});
  if(!r.ok)return {status:'error',detail:await r.text()};
  return {status:'sent',detail:await r.json()};
}
function publicRow(row){
  const p=row.contract_payload||{},payment=p.payment||{};
  return {
    id:row.id,contractExternalId:row.contract_external_id,contractVersion:row.contract_version,
    status:row.status,clientName:row.client_name,contract:p,
    signedAt:row.signed_at,paymentChoice:row.payment_choice,paymentAmount:row.payment_amount,
    paymentStatus:row.payment_status,reservationStatus:row.reservation_status,
    zelle:{name:payment.zelleName||'',handle:payment.zelleHandle||'',memo:payment.memo||'',receiptPhone:payment.receiptPhone||p.business?.phone||''},
    expiresAt:row.expires_at
  }
}
async function getByToken(token){
  const rows=await sb('hosted_contracts?token_hash=eq.'+encodeURIComponent(hashToken(token))+'&select=*');
  const row=Array.isArray(rows)?rows[0]:null;
  if(!row)throw Object.assign(Error('Signing link not found'),{status:404});
  if(new Date(row.expires_at)<new Date()||row.status==='revoked')throw Object.assign(Error('Signing link expired or revoked'),{status:410});
  return row;
}
async function api(req,res,url){
  if(req.method==='GET'&&url.pathname==='/api/health')return json(res,200,{ok:true,service:'PactWorks Hosted Contract Portal',configured:!!(SERVICE_ROLE&&PUBLISHABLE&&ORG_ID)});

  if(req.method==='POST'&&url.pathname==='/api/hosted-contracts'){
    const u=await adminUser(req);const b=await body(req);
    if(!ORG_ID)throw Error('PACTWORKS_ORG_ID missing');
    if(!b.contractExternalId||!b.contractPayload)throw Object.assign(Error('contractExternalId and contractPayload required'),{status:400});
    const token=randomBytes(32).toString('base64url'),tokenHash=hashToken(token);
    const version=Math.max(1,Number(b.contractVersion||1));
    const externalId=String(b.contractExternalId);
    const existingRows=await sb(`hosted_contracts?org_id=eq.${encodeURIComponent(ORG_ID)}&contract_external_id=eq.${encodeURIComponent(externalId)}&contract_version=eq.${version}&limit=1&select=*`);
    const existing=Array.isArray(existingRows)?existingRows[0]:null;
    let row;
    if(existing){
      if(existing.signed_at||['signed','payment_declared','confirmed'].includes(existing.status)){
        throw Object.assign(Error('This contract version has already been signed. Create a new contract version before issuing another signing link.'),{status:409});
      }
      if(comparableContractPayload(existing.contract_payload)!==comparableContractPayload(b.contractPayload)){
        throw Object.assign(Error('This contract version changed after its hosted copy was created. Save it as a new contract version before issuing a new link.'),{status:409});
      }
      const refreshed=await sb(`hosted_contracts?id=eq.${encodeURIComponent(existing.id)}&org_id=eq.${encodeURIComponent(ORG_ID)}`,{method:'PATCH',payload:{
        token_hash:tokenHash,client_name:String(b.clientName||''),client_email:String(b.clientEmail||''),client_phone:String(b.clientPhone||''),
        status:'sent',expires_at:new Date(Date.now()+30*24*60*60*1000).toISOString()
      }});
      row=Array.isArray(refreshed)?refreshed[0]:refreshed;
      await insertEvent(row.id,'hosted_link_refreshed','admin',{contractExternalId:externalId},u.id);
    }else{
      const rows=await sb('hosted_contracts',{method:'POST',payload:{
        org_id:ORG_ID,contract_external_id:externalId,contract_version:version,
        token_hash:tokenHash,client_name:String(b.clientName||''),client_email:String(b.clientEmail||''),client_phone:String(b.clientPhone||''),
        contract_payload:b.contractPayload,status:'sent',created_by:u.id
      }});
      row=Array.isArray(rows)?rows[0]:rows;
      await insertEvent(row.id,'hosted_link_created','admin',{contractExternalId:externalId},u.id);
    }
    const base=PUBLIC_BASE||(`http://${req.headers.host}`);
    const link=base+'/sign/'+encodeURIComponent(token);
    const email=await sendContractEmail({to:b.clientEmail,name:b.clientName,link,business:b.contractPayload?.business?.name,contractId:b.contractExternalId});
    if(email.status==='sent')await insertEvent(row.id,'signing_email_sent','system',{to:b.clientEmail});
    return json(res,201,{ok:true,id:row.id,link,emailStatus:email.status});
  }

  const publicGet=url.pathname.match(/^\/api\/hosted-contracts\/token\/([^/]+)$/);
  if(req.method==='GET'&&publicGet){
    const token=safeToken(decodeURIComponent(publicGet[1]));if(!token)throw Object.assign(Error('Invalid signing token'),{status:400});
    const row=await getByToken(token);
    if(row.status==='sent'){await sb('hosted_contracts?id=eq.'+row.id,{method:'PATCH',payload:{status:'viewed'}});await insertEvent(row.id,'contract_viewed','client',{})}
    return json(res,200,{ok:true,hosted:publicRow({...row,status:row.status==='sent'?'viewed':row.status})});
  }

  const sign=url.pathname.match(/^\/api\/hosted-contracts\/token\/([^/]+)\/sign$/);
  if(req.method==='POST'&&sign){
    const token=safeToken(decodeURIComponent(sign[1]));if(!token)throw Object.assign(Error('Invalid signing token'),{status:400});
    const row=await getByToken(token);const b=await body(req);
    if(!b.legalName||b.accepted!==true)throw Object.assign(Error('Legal name and acceptance are required'),{status:400});
    const acceptance={legalName:String(b.legalName),accepted:true,signatureDataUrl:String(b.signatureDataUrl||''),statements:Array.isArray(b.statements)?b.statements:[],signedAt:new Date().toISOString()};
    const updated=await sb('hosted_contracts?id=eq.'+row.id,{method:'PATCH',payload:{status:'signed',acceptance,signed_at:acceptance.signedAt}});
    await insertEvent(row.id,'contract_signed','client',{legalName:acceptance.legalName});
    return json(res,200,{ok:true,hosted:publicRow(Array.isArray(updated)?updated[0]:updated)});
  }

  const declare=url.pathname.match(/^\/api\/hosted-contracts\/token\/([^/]+)\/declare-zelle$/);
  if(req.method==='POST'&&declare){
    const token=safeToken(decodeURIComponent(declare[1]));if(!token)throw Object.assign(Error('Invalid signing token'),{status:400});
    const row=await getByToken(token);if(!row.signed_at)throw Object.assign(Error('Sign the contract first'),{status:409});
    const b=await body(req),total=Number(row.contract_payload?.agreement?.total||0),deposit=Number(row.contract_payload?.agreement?.deposit||0);
    const minimum=Math.max(0,Math.min(deposit,total));
    let choice='deposit',amount=minimum;
    if(b.choice==='full'){choice='full';amount=total}
    else if(b.choice==='custom'){
      const requested=Number(b.amount);
      if(!Number.isFinite(requested))throw Object.assign(Error('Enter a valid Zelle payment amount'),{status:400});
      if(requested<minimum)throw Object.assign(Error('Payment amount cannot be less than the required deposit'),{status:400});
      if(requested>total)throw Object.assign(Error('Payment amount cannot exceed the contract total'),{status:400});
      amount=Math.round(requested*100)/100;
      if(Math.abs(amount-minimum)<0.005)choice='deposit';
      else if(Math.abs(amount-total)<0.005)choice='full';
      else choice='custom';
    }
    const updated=await sb('hosted_contracts?id=eq.'+row.id,{method:'PATCH',payload:{
      status:'payment_declared',payment_choice:choice,payment_amount:amount,payment_method:'Zelle',
      payment_status:'client_declared_sent',payment_declared_at:new Date().toISOString(),payment_reference:String(b.reference||'')
    }});
    await insertEvent(row.id,'zelle_payment_declared','client',{choice,amount,reference:String(b.reference||'')});
    return json(res,200,{ok:true,hosted:publicRow(Array.isArray(updated)?updated[0]:updated)});
  }

  const adminStatus=url.pathname.match(/^\/api\/hosted-contracts\/admin\/([^/]+)$/);
  if(req.method==='GET'&&adminStatus){
    const u=await adminUser(req);const ext=decodeURIComponent(adminStatus[1]);
    const rows=await sb(`hosted_contracts?org_id=eq.${encodeURIComponent(ORG_ID)}&contract_external_id=eq.${encodeURIComponent(ext)}&order=contract_version.desc&limit=1&select=*`);
    return json(res,200,{ok:true,hosted:Array.isArray(rows)&&rows[0]?rows[0]:null,viewer:u.id});
  }


  const depositUpdate=url.pathname.match(/^\/api\/hosted-contracts\/([^/]+)\/required-deposit$/);
  if(req.method==='PATCH'&&depositUpdate){
    const u=await adminUser(req),id=decodeURIComponent(depositUpdate[1]),b=await body(req);
    const rows=await sb('hosted_contracts?id=eq.'+encodeURIComponent(id)+'&org_id=eq.'+encodeURIComponent(ORG_ID)+'&select=*');
    const row=Array.isArray(rows)?rows[0]:null;
    if(!row)throw Object.assign(Error('Hosted contract not found'),{status:404});
    if(row.signed_at||['signed','payment_declared','confirmed'].includes(row.status)){
      throw Object.assign(Error('Signed hosted contracts cannot be rewritten. Create a new signing version after changing the required deposit.'),{status:409});
    }
    const amount=Math.round(Number(b.amount)*100)/100;
    const payload=structuredClone(row.contract_payload||{});
    const total=Number(payload?.agreement?.total||0);
    if(!Number.isFinite(amount)||amount<0)throw Object.assign(Error('Required deposit must be a valid non-negative amount'),{status:400});
    if(Number.isFinite(total)&&amount>total)throw Object.assign(Error('Required deposit cannot exceed the contract total'),{status:400});
    payload.agreement=payload.agreement||{};
    payload.agreement.deposit=amount;
    payload.agreement.balance=Math.max(0,total-amount);
    const updated=await sb(
      'hosted_contracts?id=eq.'+encodeURIComponent(id)+'&org_id=eq.'+encodeURIComponent(ORG_ID),
      {method:'PATCH',payload:{contract_payload:payload}}
    );
    await insertEvent(row.id,'required_deposit_updated','admin',{amount},u.id);
    return json(res,200,{ok:true,hosted:Array.isArray(updated)?updated[0]:updated});
  }

  const verify=url.pathname.match(/^\/api\/hosted-contracts\/([^/]+)\/verify-zelle$/);
  if(req.method==='POST'&&verify){
    const u=await adminUser(req),id=decodeURIComponent(verify[1]),b=await body(req);
    const rows=await sb('hosted_contracts?id=eq.'+encodeURIComponent(id)+'&org_id=eq.'+encodeURIComponent(ORG_ID)+'&select=*');const row=Array.isArray(rows)?rows[0]:null;
    if(!row)throw Object.assign(Error('Hosted contract not found'),{status:404});
    if(row.payment_status!=='client_declared_sent')throw Object.assign(Error('Client has not declared a Zelle payment yet'),{status:409});
    const updated=await sb('hosted_contracts?id=eq.'+encodeURIComponent(id),{method:'PATCH',payload:{
      status:'confirmed',payment_status:'verified',payment_verified_at:new Date().toISOString(),payment_verified_by:u.id,
      payment_reference:String(b.reference||row.payment_reference||''),reservation_status:'reserved'
    }});
    await insertEvent(id,'zelle_payment_verified','admin',{amount:row.payment_amount,reference:String(b.reference||'')},u.id);
    return json(res,200,{ok:true,hosted:Array.isArray(updated)?updated[0]:updated});
  }

  return false;
}
function serve(req,res,url){
  let pathname=decodeURIComponent(url.pathname);
  if(/^\/sign\/[^/]+\/?$/.test(pathname))pathname='/sign/index.html';
  if(pathname.endsWith('/'))pathname+='index.html';
  let local=normalize(join(SITE_ROOT,pathname));
  if(!local.startsWith(normalize(SITE_ROOT)))return json(res,403,{error:'Forbidden'});
  if(!existsSync(local)||!statSync(local).isFile())local=join(SITE_ROOT,'404.html');
  if(!existsSync(local))return json(res,404,{error:'Not found'});
  res.writeHead(200,{'content-type':mime(local),'cache-control':extname(local)==='.html'?'no-store':'public, max-age=300'});
  createReadStream(local).pipe(res);
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);
  try{
    if(url.pathname.startsWith('/api/')){
      const handled=await api(req,res,url);if(handled!==false)return;
      return json(res,404,{error:'API route not found'});
    }
    return serve(req,res,url)
  }catch(e){console.error(e);return json(res,e.status||500,{error:e.message||'Server error'})}
});
server.listen(PORT,'0.0.0.0',()=>console.log(`PactWorks hosted portal listening on ${PORT}`));
