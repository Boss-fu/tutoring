import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'}
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {status, headers:{...cors,'Content-Type':'application/json'}})
const env = (name:string) => { const value=Deno.env.get(name); if(!value) throw new Error(`Missing ${name}`); return value }
const b64url = (bytes:Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
const fromB64url = (value:string) => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0))

async function cryptoKey(){return crypto.subtle.importKey('raw',new TextEncoder().encode(env('GMAIL_TOKEN_ENCRYPTION_KEY')).slice(0,32),{name:'AES-GCM'},false,['encrypt','decrypt'])}
async function encrypt(value:string){const iv=crypto.getRandomValues(new Uint8Array(12)),data=new TextEncoder().encode(value),out=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await cryptoKey(),data));return b64url(new Uint8Array([...iv,...out]))}
async function decrypt(value:string){const all=fromB64url(value),iv=all.slice(0,12),data=all.slice(12);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},await cryptoKey(),data))}
async function tokenRequest(params:Record<string,string>){const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});const data=await r.json();if(!r.ok)throw new Error(data.error_description||data.error||'Google token request failed');return data}
async function gmail(access:string,path:string){const r=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{Authorization:`Bearer ${access}`}});const data=await r.json();if(!r.ok)throw new Error(data.error?.message||'Gmail request failed');return data}
function attachments(part:any, out:any[]=[]){if(part?.filename&&part?.body?.attachmentId&&/\.(pdf|png|jpe?g)$/i.test(part.filename))out.push({id:part.body.attachmentId,name:part.filename,mime:part.mimeType||'application/octet-stream'});for(const child of part?.parts||[])attachments(child,out);return out}

Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  const url=new URL(req.url),service=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'))
  try{
    if(url.searchParams.get('callback')==='1'){
      const state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||''
      const {data:row}=await service.from('gmail_oauth_states').select('*').eq('state',state).gt('expires_at',new Date().toISOString()).maybeSingle()
      if(!row||!code)return Response.redirect('https://bossfu-tutoring.vercel.app/gmail-connected.html?status=error',302)
      const redirect=env('GMAIL_OAUTH_REDIRECT_URI'),tokens=await tokenRequest({code,client_id:env('GMAIL_CLIENT_ID'),client_secret:env('GMAIL_CLIENT_SECRET'),redirect_uri:redirect,grant_type:'authorization_code'})
      if(!tokens.refresh_token)throw new Error('Google 未回傳 refresh token，請撤銷舊授權後重試。')
      const profile=await gmail(tokens.access_token,'profile')
      await service.from('gmail_payroll_connections').upsert({user_id:row.user_id,refresh_token_encrypted:await encrypt(tokens.refresh_token),gmail_address:profile.emailAddress,updated_at:new Date().toISOString()})
      await service.from('gmail_oauth_states').delete().eq('state',state)
      return Response.redirect('https://bossfu-tutoring.vercel.app/gmail-connected.html?status=success',302)
    }
    const auth=req.headers.get('Authorization')||'',userClient=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:auth}}}),{data:{user}}=await userClient.auth.getUser()
    if(!user)return json({error:'unauthorized'},401)
    const body=await req.json().catch(()=>({})),action=body.action||'import'
    if(action==='connect'){
      const state=crypto.randomUUID()+crypto.randomUUID(),expires=new Date(Date.now()+10*60*1000).toISOString();await service.from('gmail_oauth_states').insert({state,user_id:user.id,expires_at:expires})
      const q=new URLSearchParams({client_id:env('GMAIL_CLIENT_ID'),redirect_uri:env('GMAIL_OAUTH_REDIRECT_URI'),response_type:'code',scope:'https://www.googleapis.com/auth/gmail.readonly',access_type:'offline',prompt:'consent',state})
      return json({authorization_url:'https://accounts.google.com/o/oauth2/v2/auth?'+q})
    }
    if(action==='mark_imported'){
      await service.from('gmail_payroll_imports').upsert({user_id:user.id,gmail_message_id:body.message_id,attachment_id:body.attachment_id,attachment_name:body.filename})
      return json({ok:true})
    }
    const {data:conn}=await service.from('gmail_payroll_connections').select('*').eq('user_id',user.id).maybeSingle();if(!conn)return json({error:'gmail_not_connected'},409)
    const tokens=await tokenRequest({refresh_token:await decrypt(conn.refresh_token_encrypted),client_id:env('GMAIL_CLIENT_ID'),client_secret:env('GMAIL_CLIENT_SECRET'),grant_type:'refresh_token'}),access=tokens.access_token
    const month=String(body.month||new Date().toISOString().slice(0,7)),[year,mon]=month.split('-').map(Number),after=new Date(year,mon-1,1),before=new Date(year,mon,15),sender=Deno.env.get('PAYROLL_GMAIL_QUERY')||'',query=`after:${Math.floor(after.getTime()/1000)} before:${Math.floor(before.getTime()/1000)} has:attachment ("薪資單" OR "薪資明細") ${sender}`.trim()
    const list=await gmail(access,'messages?maxResults=20&q='+encodeURIComponent(query));for(const item of list.messages||[]){const msg=await gmail(access,'messages/'+item.id+'?format=full'),files=attachments(msg.payload);for(const file of files){const {data:done}=await service.from('gmail_payroll_imports').select('gmail_message_id').eq('user_id',user.id).eq('gmail_message_id',item.id).eq('attachment_id',file.id).maybeSingle();if(done)continue;const attachment=await gmail(access,`messages/${item.id}/attachments/${file.id}`),headers=Object.fromEntries((msg.payload?.headers||[]).map((h:any)=>[h.name,h.value]));return json({found:true,message_id:item.id,attachment_id:file.id,filename:file.name,mime_type:file.mime,data:attachment.data,subject:headers.Subject||'',from:headers.From||'',date:headers.Date||''})}}
    return json({found:false,message:'目前沒有尚未匯入的薪資單'})
  }catch(error){console.error(error);return json({error:error instanceof Error?error.message:String(error)},500)}
})
