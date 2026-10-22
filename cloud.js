/* Optional Supabase sync. No API keys are bundled. Never use a service-role key in the browser. */
(() => {
 'use strict';
 const SETTINGS_KEY='unityield-cloud-config-v1'; // Preserve existing cloud connection settings after rebranding.
 let config={url:'',key:'',email:''};try{config={...config,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}catch(e){}
 let client=null,session=null,ready=false,statusMessage=config.url?'Configured · sign in to sync':'Not configured · data stays in this browser';
 let saveTimer=null,pendingData=null,doingSave=false,queue=false,lastSaved='';
 let callbacks={onRemote:()=>false,onStatus:()=>{},onError:()=>{}};
 function status(){callbacks.onStatus({connected:!!session&&ready,message:statusMessage,url:config.url,key:config.key,email:config.email});}
 function getStatus(){return {connected:!!session&&ready,message:statusMessage,url:config.url,key:config.key,email:config.email,authenticated:!!session};}
 function notifyError(e){statusMessage='Cloud error: '+(e?.message||String(e));callbacks.onError(statusMessage);status();}
 async function configure(url,key,email=''){
   const parsed=new URL(url);if(parsed.protocol!=='https:')throw new Error('A secure HTTPS Supabase URL is required.');
   if(!key||key.length<20)throw new Error('Enter the public anon / publishable API key.');
   config={url:parsed.origin,key:key.trim(),email:email||config.email};localStorage.setItem(SETTINGS_KEY,JSON.stringify(config));
   client=null;session=null;ready=false;return init();
 }
 async function init(onCallbacks){
   if(onCallbacks)callbacks={...callbacks,...onCallbacks};if(!config.url||!config.key){status();return;}
   try {
    // Loaded only when a user opts into third-party cloud storage.
    const {createClient}=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    client=createClient(config.url,config.key,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true},global:{headers:{'X-Client-Info':'estatedock-pms/1.0'}}});
    const {data,error}=await client.auth.getSession();if(error)throw error;
    session=data.session;if(session){statusMessage='Signed in · checking cloud workspace';status();await initialSync();}
    else {statusMessage='Configured · sign in to sync';status();}
    client.auth.onAuthStateChange((event,newSession)=>{
      const wasSignedIn=!!session;session=newSession;
      if(event==='SIGNED_OUT'){ready=false;statusMessage='Signed out · local only';status();}
      else if(event==='SIGNED_IN'&&!wasSignedIn){statusMessage='Signed in · checking cloud workspace';status();setTimeout(()=>initialSync(),0);}
    });
   }catch(e){notifyError(e);}
 }
 async function initialSync(){
   if(!client||!session)return;
   try {
    const {data,error}=await client.from('workspaces').select('data,updated_at').eq('user_id',session.user.id).maybeSingle();if(error)throw error;
    if(data?.data){const accepted=callbacks.onRemote(data.data);if(accepted){ready=true;statusMessage='Cloud sync active';}
       else {ready=false;statusMessage='Cloud data available · choose download or upload';}}
    else {ready=true;statusMessage='Cloud sync active · creating workspace';status();const data=callbacks.getLocal?.();if(data)await upload(data);}
    status();
   }catch(e){notifyError(e);}
 }
 async function sendLink(email){if(!client)throw new Error('Save your Supabase configuration first.');if(!email||!email.includes('@'))throw new Error('Enter a valid email.');config.email=email;localStorage.setItem(SETTINGS_KEY,JSON.stringify(config));const redirectTo=location.origin+location.pathname;
 const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});if(error)throw error;statusMessage='Sign-in email sent · open it to continue';status();}
 async function signOut(){if(client){const {error}=await client.auth.signOut();if(error)throw error;}session=null;ready=false;statusMessage='Signed out · local only';status();}
 async function upload(data){if(!client||!session)throw new Error('Sign in before uploading.');if(doingSave){pendingData=data;queue=true;return;}
   doingSave=true;try{const {error}=await client.from('workspaces').upsert({user_id:session.user.id,data,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;
    ready=true;statusMessage='Cloud sync active · saved';lastSaved=new Date().toISOString();status();}
   catch(e){notifyError(e);throw e;}finally{doingSave=false;if(queue){queue=false;const next=pendingData;pendingData=null;if(next)await upload(next);}}
 }
 async function download(){if(!client||!session)throw new Error('Sign in before downloading.');const {data,error}=await client.from('workspaces').select('data').eq('user_id',session.user.id).maybeSingle();if(error)throw error;if(!data?.data)throw new Error('No cloud workspace found.');const accepted=callbacks.onRemote(data.data,true);if(accepted){ready=true;statusMessage='Cloud sync active · downloaded';status();}return accepted;}
 function scheduleSave(db){if(!session||!ready)return;pendingData=JSON.parse(JSON.stringify(db));clearTimeout(saveTimer);saveTimer=setTimeout(()=>{const latest=pendingData;pendingData=null;if(latest)upload(latest).catch(()=>{});},850);}
 function setReady(v){ready=!!v;status();}
 window.CloudSync={init,configure,sendLink,signOut,upload,download,scheduleSave,getStatus,setReady};
})();
