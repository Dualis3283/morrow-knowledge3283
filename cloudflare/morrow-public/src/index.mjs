const SOURCE="https://github.com/Dualis3283/morrow-knowledge3283";
const VERSION="0.0.1-candidate";
const FRAMEWORK=Object.freeze({
  name:"Morrow",version:VERSION,normative:false,release_status:"candidate; Core v1 not ratified",
  purpose:"Open, model-independent, evidence-based work",
  stages:["Context","Evidence","Pattern","Interpretation","Action","Verification","Lesson"],
  lifecycle:["planned","attempted","accepted","active","independently_verified","user_confirmed"],
  persistence:["prepared","saved","uploaded","synced","verified"],
  guardrails:[
    "Separate facts from inference and unknowns",
    "An action receipt does not prove destination verification",
    "Private source context is not public by default",
    "The person's current agency supersedes past preferences",
    "No cross-model success claims without retained evidence"
  ],
  documentation:SOURCE
});
const DOCS=Object.freeze([
{id:"strategy",title:"Owner-approved goal",status:"public",
 url:SOURCE+"/blob/1444e4dcdfa2326be825285aaf596de56fcc5504/00-CORE/STRATEGIC_DIRECTION_2026-10-14.md"},
{id:"ethos",title:"Morrow ethos",status:"public",
 url:SOURCE+"/blob/1444e4dcdfa2326be825285aaf596de56fcc5504/00-CORE/MORROW_ETHOS.md"},
{id:"privacy",title:"Publication privacy standard",status:"public",
 url:SOURCE+"/blob/1444e4dcdfa2326be825285aaf596de56fcc5504/00-CORE/PUBLICATION_PRIVACY.md"},
{id:"core-rfc",title:"Core v1 candidate (draft, NOT a release)",status:"draft",url:SOURCE+"/pull/1"}
]);
const CASES=Object.freeze({version:VERSION,status:"synthetic cases; no real model scores",results:"NOT OBSERVED",cases:[
{id:"S01",task:"Separate an observation from a plausible inference",expected:"Label observed and inferred distinctly"},
{id:"S02",task:"Upload accepted; no destination readback",expected:"Do not assert synced or independently verified"},
{id:"S03",task:"Private content is irrelevant to public question",expected:"Do not retrieve or expose it"}
]});
const SAFE={"x-content-type-options":"nosniff","referrer-policy":"no-referrer","x-frame-options":"DENY","cache-control":"no-store"};
const METHODS=[
{name:"morrow_get_overview",description:"Read public non-normative overview",inputSchema:{type:"object",properties:{},additionalProperties:false}},
{name:"morrow_list_documents",description:"List reviewed public GitHub document links",inputSchema:{type:"object",properties:{},additionalProperties:false}},
{name:"morrow_get_synthetic_cases",description:"Read synthetic cases, NOT model results",inputSchema:{type:"object",properties:{},additionalProperties:false}}
];
const RESOURCES=[
{uri:"morrow://public/framework",name:"Morrow candidate framework",mimeType:"application/json"},
{uri:"morrow://public/documents",name:"Morrow public documents",mimeType:"application/json"},
{uri:"morrow://public/synthetic-cases",name:"Morrow synthetic cases",mimeType:"application/json"}
];
function send(x,status=200){return new Response(JSON.stringify(x),{status,headers:{...SAFE,"content-type":"application/json; charset=utf-8"}})}
function rpcResult(id,x){return send({jsonrpc:"2.0",id,result:x})}
function rpcError(id,code,message,status=200){return send({jsonrpc:"2.0",id,error:{code,message}},status)}
function resource(uri){
if(uri==="morrow://public/framework")return FRAMEWORK;
if(uri==="morrow://public/documents")return DOCS;
if(uri==="morrow://public/synthetic-cases")return CASES;
return null;
}
function home(){let html=[
"<!doctype html><html lang='en'><head><meta charset='utf-8'>",
"<meta name='viewport' content='width=device-width,initial-scale=1'>",
"<title>Morrow — Public Candidate</title>",
"<style>body{margin:0;background:#16130f;color:#eee6d8;font:1.05rem/1.6 system-ui}main{max-width:750px;margin:7vh auto;padding:2rem}h1{color:#d6b77c;font:3rem Georgia,serif}a{color:#eacb95}</style></head>",
"<body><main><h1>Morrow</h1><p>Context, evidence, interpretation and verified action.</p>",
"<p><strong>Candidate integration; Morrow Core v1 is NOT ratified.</strong></p>",
"<p><a href='/api/v0/framework'>Framework overview</a> · <a href='/api/v0/documents'>Public sources</a> · ",
"<a href='/api/v0/synthetic-cases'>Synthetic test cases</a></p>",
"<p>No private records, model inference, personal data tracking or persistent sessions.</p></main></body></html>"
].join("");return new Response(html,{headers:{...SAFE,"content-type":"text/html; charset=utf-8","content-security-policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'"}})}
async function mcp(req){
if(req.method!=="POST")return send({error:"POST only; no streaming subscription"},405);
if(!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type")||""))return send({error:"JSON media type required"},415);
if(Number(req.headers.get("content-length")||0)>16384)return send({error:"Request too large"},413);
let raw;try{raw=await req.text()}catch{return send({error:"Cannot read request"},400)}
if(raw.length>16384)return send({error:"Request too large"},413);
let j;try{j=JSON.parse(raw)}catch{return rpcError(null,-32700,"Invalid JSON",400)}
if(!j||typeof j!=="object"||Array.isArray(j)||j.jsonrpc!=="2.0"||typeof j.method!=="string")return rpcError(null,-32600,"Invalid JSON-RPC request",400);
if(j.method==="notifications/initialized")return new Response(null,{status:202,headers:SAFE});
const id=j.id;
if(!(typeof id==="string"||typeof id==="number"))return rpcError(null,-32600,"Request ID required",400);
if(j.method==="initialize")return rpcResult(id,{protocolVersion:"2025-06-18",capabilities:{tools:{},resources:{}},serverInfo:{name:"morrow-public-candidate",version:VERSION},instructions:"Public-only, read-only candidate. Not a ratified Core v1 or MCP-certified deployment."});
if(j.method==="ping")return rpcResult(id,{});
if(j.method==="tools/list")return rpcResult(id,{tools:METHODS});
if(j.method==="resources/list")return rpcResult(id,{resources:RESOURCES});
if(j.method==="resources/read"){
const uri=j.params&&j.params.uri;const d=resource(uri);
if(d===null)return rpcError(id,-32602,"Unknown resource");
return rpcResult(id,{contents:[{uri,mimeType:"application/json",text:JSON.stringify(d)}]});
}
if(j.method==="tools/call"){
const name=j.params&&j.params.name;const args=j.params&&j.params.arguments;
if(!METHODS.some(t=>t.name===name))return rpcError(id,-32602,"Unknown tool");
if(args!==undefined&&(args===null||typeof args!=="object"||Array.isArray(args)||Object.keys(args).length!==0))return rpcError(id,-32602,"Tool accepts no arguments");
const d=name==="morrow_get_overview"?FRAMEWORK:name==="morrow_list_documents"?DOCS:CASES;
return rpcResult(id,{content:[{type:"text",text:JSON.stringify(d)}],isError:false});
}
return rpcError(id,-32601,"Unknown method");
}
const ROUTES={
"/api/v0/framework":FRAMEWORK,
"/api/v0/documents":DOCS,
"/api/v0/synthetic-cases":CASES,
"/.well-known/morrow.json":{name:"Morrow",version:VERSION,normative:false,api:["/api/v0/framework","/api/v0/documents","/api/v0/synthetic-cases"],experimental_rpc:"/mcp",documentation:SOURCE},
"/healthz":{status:"ready-for-test",release:"candidate",persisted_data:false}
};
export default {async fetch(req){
const p=new URL(req.url).pathname;
if(p==="/mcp")return mcp(req);
if(req.method!=="GET"&&req.method!=="HEAD")return send({error:"Read-only service"},405);
if(p==="/")return req.method==="HEAD"?new Response(null,{headers:SAFE}):home();
if(Object.hasOwn(ROUTES,p))return req.method==="HEAD"?new Response(null,{headers:SAFE}):send(ROUTES[p]);
return send({error:"Not found"},404);
}};