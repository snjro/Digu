import{_ as at}from"../chunks/_page.SzlfRTW4.js";import{s as z,l as h,i as j,f as F,k as B,n as v,e as ot,c as ct,b as st,g as ut,O as lt,I as X,L as Y}from"../chunks/scheduler.CDAxP_dO.js";import{S as V,i as E,g as L,d as g,b as R,t as b,c as p,a as C,m as y,e as k,f as Z}from"../chunks/index.C5tY04hK.js";import{c as $,g as tt,B as G,s as T,d as M,h as et,p as it}from"../chunks/stores.DaGaFg9x.js";import{u as mt,s as ft,j as gt,a as bt,n as St}from"../chunks/CommonItemMember.DAycnk9o.js";import{B as dt}from"../chunks/BaseGrid.BuoUMf3S.js";import{b as _t,c as O,n as U}from"../chunks/storeRpcSettings.BR5-jVLy.js";import"../chunks/dbBase.Dq0K4QQ7.js";import{s as D,a as A}from"../chunks/storeSyncStatus.BvxaFNyT.js";import"../chunks/dbSettings.DpToC6M0.js";/* empty css                    */import{c as P}from"../chunks/columnDefChainExplorerLinkByKeyName.DrvOYVEV.js";import{c as N,a as w}from"../chunks/AbiParamsTable.DZmEXRTZ.js";import{C as pt}from"../chunks/CommonOpenLink.CHllafEi.js";import{N as d,b as Ct,c as yt}from"../chunks/storeUserSettings.8mNvglE9.js";import{c as kt}from"../chunks/columnDefAbiParams.BCYYt__L.js";import{c as rt}from"../chunks/columnDefStateMutability.CG5bq9wk.js";import{B as ht}from"../chunks/BaseProgressBarForBlockNumber.Bh8j3WLj.js";import{g as Nt,a as Dt}from"../chunks/dbEventLogsDataHandlersSyncStatusUpdateDbItemSyncStatus.puAkr_kB.js";import{C as Bt,s as wt}from"../chunks/CommonToggleSyncTarget.pojJwu13.js";import{C as Tt}from"../chunks/CommonChainExplorerLink.DDU_lf33.js";import{C as Ft}from"../chunks/CommonSyncStateText.D5f-TdUx.js";function Gt({params:n}){return at({params:n})}const je=Object.freeze(Object.defineProperty({__proto__:null,load:Gt},Symbol.toStringTag,{value:"Module"})),zt=()=>({headerName:"Creation",openByDefault:!1,children:[P("Creation Blocknumber","contractCreationBlockNumber","block",void 0),{field:"contractCreationDatetime",headerName:"Creation Datetime",sortable:!0,editable:!1,cellStyle:N("start"),columnGroupShow:"open"},P("Creation Tx Hash","contractCreationTx","tx","open"),P("Creator Address","contractCreationCreator","address","open")]}),x=T.grid,H=$(""),W=!0,K=!1,jt=n=>({headerName:"Basics",openByDefault:!1,children:[{headerName:"Contract Name",sortable:W,editable:K,cellClass:H,columnGroupShow:void 0,valueGetter:e=>e.data?e.data.contractName:"",cellRenderer:w((e,r)=>{var a;r.data&&new tt({target:e.eGui,props:{text:(a=r.data)==null?void 0:a.contractName,href:`${n}${r.data.contractName}#${_t(mt[0])}`,textSize:x,openNewTab:!1,prefixIcon:{name:"scriptText",size:x}}})})},P("contract address","contractAddress","address","open"),{headerName:"Source URL",sortable:W,editable:K,cellClass:H,columnGroupShow:"open",valueGetter:e=>e.data.contractSourceCodeUrl??d,cellRenderer:w((e,r)=>{var a,s,o;(a=r.data)!=null&&a.contractSourceCodeUrl?new pt({target:e.eGui,props:{text:(s=r.data)==null?void 0:s.contractSourceCodeUrl,href:(o=r.data)==null?void 0:o.contractSourceCodeUrl,textSize:x,openNewTab:!0}}):new G({target:e.eGui,props:{text:d,textSize:x}})})}]}),Vt=n=>({headerName:"Constructor",children:[rt("contractConstructorStateMutability"),kt("contractConstructorInputs","inputs",n,!1)]}),Et=()=>({headerName:"Fallback",children:[rt("contractFallbackStateMutability")]}),q=T.grid,J=(n,t)=>{const e=n==="events"?"contractEventsTotalNumber":"contractFunctionsTotalNumber";return{headerName:`${O(n)}`,children:[{headerName:`Num of ${O(n)}`,sortable:!0,editable:!1,cellStyle:N("end"),columnGroupShow:void 0,valueGetter:a=>a.data?a.data[e]:0,cellRenderer:w((a,s)=>{if(s.data){const o=s.data[e];if(o>0){const l=`${t}${s.data.contractName}/${n}`;new tt({target:a.eGui,props:{text:U(o),href:l,textSize:q,openNewTab:!1}})}else new G({target:a.eGui,props:{text:U(o),textSize:q}})}})}]}};function xt(n){let t,e;return t=new G({props:{text:d,textSize:n[4]}}),{c(){p(t.$$.fragment)},l(r){C(t.$$.fragment,r)},m(r,a){y(t,r,a),e=!0},p:v,i(r){e||(b(t.$$.fragment,r),e=!0)},o(r){g(t.$$.fragment,r),e=!1},d(r){k(t,r)}}}function Pt(n){let t,e,r;return e=new ht({props:{startBlockNumber:n[0].creation.blockNumber,colorCategoryFront:M.gridContainer,colorCategoryBg:M.gridContainer,fetchedBlockNumber:n[3],endBlockNumber:n[2],size:et(n[4],-1),showBlockNumber:!1,shadowBar:!1,processing:n[1].isSyncing,rounded:!0}}),{c(){t=ot("div"),p(e.$$.fragment),this.h()},l(a){t=ct(a,"DIV",{class:!0});var s=st(t);C(e.$$.fragment,s),s.forEach(F),this.h()},h(){ut(t,"class",$("h-full","w-full","flex","items-center"))},m(a,s){j(a,t,s),y(e,t,null),r=!0},p(a,s){const o={};s&1&&(o.startBlockNumber=a[0].creation.blockNumber),s&8&&(o.fetchedBlockNumber=a[3]),s&4&&(o.endBlockNumber=a[2]),s&2&&(o.processing=a[1].isSyncing),e.$set(o)},i(a){r||(b(e.$$.fragment,a),r=!0)},o(a){g(e.$$.fragment,a),r=!1},d(a){a&&F(t),k(e)}}}function vt(n){let t,e,r,a;const s=[Pt,xt],o=[];function l(c,u){return c[3]?0:1}return t=l(n),e=o[t]=s[t](n),{c(){e.c(),r=h()},l(c){e.l(c),r=h()},m(c,u){o[t].m(c,u),j(c,r,u),a=!0},p(c,[u]){let i=t;t=l(c),t===i?o[t].p(c,u):(L(),g(o[i],1,1,()=>{o[i]=null}),R(),e=o[t],e?e.p(c,u):(e=o[t]=s[t](c),e.c()),b(e,1),e.m(r.parentNode,r))},i(c){a||(b(e),a=!0)},o(c){g(e),a=!1},d(c){c&&F(r),o[t].d(c)}}}function Lt(n,t,e){let r,a;B(n,D,f=>e(8,r=f)),B(n,A,f=>e(9,a=f));let{targetChain:s}=t,{targetProject:o}=t,{targetVersion:l}=t,{targetContract:c}=t;const u=T.grid;let i,_,m;return n.$$set=f=>{"targetChain"in f&&e(5,s=f.targetChain),"targetProject"in f&&e(6,o=f.targetProject),"targetVersion"in f&&e(7,l=f.targetVersion),"targetContract"in f&&e(0,c=f.targetContract)},n.$$.update=()=>{n.$$.dirty&544&&e(2,i=a[s.name].latestBlockNumber),n.$$.dirty&481&&e(1,_=r[s.name].subSyncStatuses[o.name].subSyncStatuses[l.name].subSyncStatuses[c.name]),n.$$.dirty&2&&e(3,m=_?_.fetchedBlockNumber:void 0)},[c,_,i,m,u,s,o,l,r,a]}class Rt extends V{constructor(t){super(),E(this,t,Lt,vt,z,{targetChain:5,targetProject:6,targetVersion:7,targetContract:0})}}const At=(n,t,e)=>({headerName:"Progress",sortable:!0,editable:!1,cellStyle:a=>{if(!(a.data&&a.data.contractHasEvent))return N("center")},columnGroupShow:void 0,valueGetter:a=>{const s=a.data.contract.name;let o;D.subscribe(i=>{o=i[n.name].subSyncStatuses[t.name].subSyncStatuses[e.name].subSyncStatuses[s]});let l=0;A.subscribe(i=>{l=i[n.name].latestBlockNumber});const c=a.data.contract.creation.blockNumber;return o?Nt(Dt(c,l,o.fetchedBlockNumber)):d},cellRenderer:w((a,s)=>{new Rt({target:a.eGui,props:{targetChain:n,targetProject:t,targetVersion:e,targetContract:s.data.contract}})})});function It(n){let t,e;return t=new G({props:{text:d,textSize:n[5]}}),{c(){p(t.$$.fragment)},l(r){C(t.$$.fragment,r)},m(r,a){y(t,r,a),e=!0},p:v,i(r){e||(b(t.$$.fragment,r),e=!0)},o(r){g(t.$$.fragment,r),e=!1},d(r){k(t,r)}}}function Mt(n){let t,e;return t=new Bt({props:{targetChain:n[0],targetProject:n[1],targetVersion:n[2],targetContract:n[3],size:et(n[5],-1)}}),{c(){p(t.$$.fragment)},l(r){C(t.$$.fragment,r)},m(r,a){y(t,r,a),e=!0},p(r,a){const s={};a&1&&(s.targetChain=r[0]),a&2&&(s.targetProject=r[1]),a&4&&(s.targetVersion=r[2]),a&8&&(s.targetContract=r[3]),t.$set(s)},i(r){e||(b(t.$$.fragment,r),e=!0)},o(r){g(t.$$.fragment,r),e=!1},d(r){k(t,r)}}}function Ot(n){let t,e,r,a;const s=[Mt,It],o=[];function l(c,u){return c[4]?0:1}return t=l(n),e=o[t]=s[t](n),{c(){e.c(),r=h()},l(c){e.l(c),r=h()},m(c,u){o[t].m(c,u),j(c,r,u),a=!0},p(c,[u]){let i=t;t=l(c),t===i?o[t].p(c,u):(L(),g(o[i],1,1,()=>{o[i]=null}),R(),e=o[t],e?e.p(c,u):(e=o[t]=s[t](c),e.c()),b(e,1),e.m(r.parentNode,r))},i(c){a||(b(e),a=!0)},o(c){g(e),a=!1},d(c){c&&F(r),o[t].d(c)}}}function Ut(n,t,e){let r;B(n,D,i=>e(6,r=i));let{targetChain:a}=t,{targetProject:s}=t,{targetVersion:o}=t,{targetContract:l}=t;const c=T.grid;let u;return n.$$set=i=>{"targetChain"in i&&e(0,a=i.targetChain),"targetProject"in i&&e(1,s=i.targetProject),"targetVersion"in i&&e(2,o=i.targetVersion),"targetContract"in i&&e(3,l=i.targetContract)},n.$$.update=()=>{n.$$.dirty&79&&e(4,u=r[a.name].subSyncStatuses[s.name].subSyncStatuses[o.name].subSyncStatuses[l.name])},[a,s,o,l,u,c,r]}class Ht extends V{constructor(t){super(),E(this,t,Ut,Ot,z,{targetChain:0,targetProject:1,targetVersion:2,targetContract:3})}}const Wt=(n,t,e)=>({headerName:"target",sortable:!0,editable:!1,cellStyle:a=>a.data&&a.data.contractHasEvent?N("start"):N("center"),columnGroupShow:void 0,valueGetter:a=>{let s;const o=a.data.contract.name;return D.subscribe(l=>{s=l[n.name].subSyncStatuses[t.name].subSyncStatuses[e.name].subSyncStatuses[o]}),s?wt(s):d},cellRenderer:w((a,s)=>{new Ht({target:a.eGui,props:{targetChain:n,targetProject:t,targetVersion:e,targetContract:s.data.contract}})})});function Kt(n){let t,e;return t=new G({props:{text:d,textSize:n[2]}}),{c(){p(t.$$.fragment)},l(r){C(t.$$.fragment,r)},m(r,a){y(t,r,a),e=!0},p:v,i(r){e||(b(t.$$.fragment,r),e=!0)},o(r){g(t.$$.fragment,r),e=!1},d(r){k(t,r)}}}function qt(n){let t,e;return t=new Tt({props:{subdirectory:"block",value:n[1].toString(),textSize:n[2]}}),{c(){p(t.$$.fragment)},l(r){C(t.$$.fragment,r)},m(r,a){y(t,r,a),e=!0},p(r,a){const s={};a&2&&(s.value=r[1].toString()),t.$set(s)},i(r){e||(b(t.$$.fragment,r),e=!0)},o(r){g(t.$$.fragment,r),e=!1},d(r){k(t,r)}}}function Jt(n){let t,e,r,a;const s=[qt,Kt],o=[];function l(c,u){return c[0]?0:1}return t=l(n),e=o[t]=s[t](n),{c(){e.c(),r=h()},l(c){e.l(c),r=h()},m(c,u){o[t].m(c,u),j(c,r,u),a=!0},p(c,[u]){let i=t;t=l(c),t===i?o[t].p(c,u):(L(),g(o[i],1,1,()=>{o[i]=null}),R(),e=o[t],e?e.p(c,u):(e=o[t]=s[t](c),e.c()),b(e,1),e.m(r.parentNode,r))},i(c){a||(b(e),a=!0)},o(c){g(e),a=!1},d(c){c&&F(r),o[t].d(c)}}}function nt(n,t,e){return e?n==="Goal"?t:n==="Current"?e.fetchedBlockNumber:e.creationBlockNumber:0}function Qt(n,t,e){let r,a;B(n,D,S=>e(9,r=S)),B(n,A,S=>e(10,a=S));let{targetChain:s}=t,{targetProject:o}=t,{targetVersion:l}=t,{targetContract:c}=t,{headerName:u}=t;const i=T.grid;let _,m,f;return n.$$set=S=>{"targetChain"in S&&e(3,s=S.targetChain),"targetProject"in S&&e(4,o=S.targetProject),"targetVersion"in S&&e(5,l=S.targetVersion),"targetContract"in S&&e(6,c=S.targetContract),"headerName"in S&&e(7,u=S.headerName)},n.$$.update=()=>{n.$$.dirty&1032&&e(8,_=a[s.name].latestBlockNumber),n.$$.dirty&632&&e(0,m=r[s.name].subSyncStatuses[o.name].subSyncStatuses[l.name].subSyncStatuses[c.name]),n.$$.dirty&385&&e(1,f=nt(u,_,m))},[m,f,i,s,o,l,c,u,_,r,a]}class Xt extends V{constructor(t){super(),E(this,t,Qt,Jt,z,{targetChain:3,targetProject:4,targetVersion:5,targetContract:6,headerName:7})}}const I=(n,t,e,r)=>({headerName:r,sortable:!0,editable:!1,cellStyle:s=>s.data&&s.data.contractHasEvent?N("end"):N("center"),columnGroupShow:"open",valueGetter:s=>{const o=s.data.contract,l=lt(D)[n.name].subSyncStatuses[t.name].subSyncStatuses[e.name].subSyncStatuses[o.name];let c=0;A.subscribe(i=>{c=i[n.name].latestBlockNumber});const u=nt(r,c,l);return u===0?d:u.toString()},cellRenderer:w((s,o)=>{new Xt({target:s.eGui,props:{targetChain:n,targetProject:t,targetVersion:e,targetContract:o.data.contract,headerName:r}})})});function Yt(n){let t,e;return t=new G({props:{text:d,textSize:T.grid}}),{c(){p(t.$$.fragment)},l(r){C(t.$$.fragment,r)},m(r,a){y(t,r,a),e=!0},p:v,i(r){e||(b(t.$$.fragment,r),e=!0)},o(r){g(t.$$.fragment,r),e=!1},d(r){k(t,r)}}}function Zt(n){let t,e;return t=new Ft({props:{syncStateText:n[0].syncStateText,size:T.grid,colorCategoryFront:M.gridCell}}),{c(){p(t.$$.fragment)},l(r){C(t.$$.fragment,r)},m(r,a){y(t,r,a),e=!0},p(r,a){const s={};a&1&&(s.syncStateText=r[0].syncStateText),t.$set(s)},i(r){e||(b(t.$$.fragment,r),e=!0)},o(r){g(t.$$.fragment,r),e=!1},d(r){k(t,r)}}}function $t(n){let t,e,r,a;const s=[Zt,Yt],o=[];function l(c,u){return c[0]?0:1}return t=l(n),e=o[t]=s[t](n),{c(){e.c(),r=h()},l(c){e.l(c),r=h()},m(c,u){o[t].m(c,u),j(c,r,u),a=!0},p(c,[u]){let i=t;t=l(c),t===i?o[t].p(c,u):(L(),g(o[i],1,1,()=>{o[i]=null}),R(),e=o[t],e?e.p(c,u):(e=o[t]=s[t](c),e.c()),b(e,1),e.m(r.parentNode,r))},i(c){a||(b(e),a=!0)},o(c){g(e),a=!1},d(c){c&&F(r),o[t].d(c)}}}function te(n,t,e){let r;B(n,D,u=>e(5,r=u));let{targetChain:a}=t,{targetProject:s}=t,{targetVersion:o}=t,{targetContract:l}=t,c;return n.$$set=u=>{"targetChain"in u&&e(1,a=u.targetChain),"targetProject"in u&&e(2,s=u.targetProject),"targetVersion"in u&&e(3,o=u.targetVersion),"targetContract"in u&&e(4,l=u.targetContract)},n.$$.update=()=>{n.$$.dirty&62&&e(0,c=r[a.name].subSyncStatuses[s.name].subSyncStatuses[o.name].subSyncStatuses[l.name])},[c,a,s,o,l,r]}class ee extends V{constructor(t){super(),E(this,t,te,$t,z,{targetChain:1,targetProject:2,targetVersion:3,targetContract:4})}}const re=(n,t,e)=>({headerName:"Current State",sortable:!0,editable:!1,cellStyle:N("center"),columnGroupShow:void 0,valueGetter:a=>{let s,o=d;const l=a.data.contract.name;return D.subscribe(c=>{s=c[n.name].subSyncStatuses[t.name].subSyncStatuses[e.name].subSyncStatuses[l],s&&(o=s.syncStateText)}),o},cellRenderer:w((a,s)=>{new ee({target:a.eGui,props:{targetChain:n,targetProject:t,targetVersion:e,targetContract:s.data.contract}})})}),ne=(n,t,e)=>({headerName:"Sync Status",openByDefault:!1,children:[Wt(n,t,e),re(n,t,e),At(n,t,e),I(n,t,e,"Start"),I(n,t,e,"Current"),I(n,t,e,"Goal")]}),Q=(n,t,e,r,a)=>[jt(r),ne(n,t,e),zt(),J(Ct,r),J(yt,r),Et(),Vt(a)];function ae(n){const t=[];for(const e of n){const r={contract:e,contractName:e.name,contractAddress:e.address,contractSourceCodeUrl:e.sourceCodeUrl,contractCreationBlockNumber:e.creation.blockNumber,contractCreationDatetime:ft(e.creation.timestamp),contractCreationTx:e.creation.tx,contractCreationCreator:e.creation.creator,contractEventsTotalNumber:e.events.abiFragments.length,contractFunctionsTotalNumber:e.functions.abiFragments.length,contractFallbackStateMutability:e.fallback.abiFragment?e.fallback.abiFragment.stateMutability:d,contractConstructorStateMutability:e.construction.abiFragment?e.construction.abiFragment.stateMutability:d,contractConstructorInputs:e.construction.abiFragment.inputs,contractHasEvent:e.events.abiFragments.length>0};t.push(r)}return t}function oe(n){let t,e,r;function a(o){n[6](o)}let s={rows:n[1],paramColumnDefs:Q(n[0].targetChain,n[0].targetProject,n[0].targetVersion,n[3].url.pathname,n[5]()),hasMultipulTabs:!1,exportFilePrefix:"contracts"};return n[2]!==void 0&&(s.isFullScreen=n[2]),t=new dt({props:s}),X.push(()=>Z(t,"isFullScreen",a)),{c(){p(t.$$.fragment)},l(o){C(t.$$.fragment,o)},m(o,l){y(t,o,l),r=!0},p(o,l){const c={};l&2&&(c.rows=o[1]),l&9&&(c.paramColumnDefs=Q(o[0].targetChain,o[0].targetProject,o[0].targetVersion,o[3].url.pathname,o[5]())),!e&&l&4&&(e=!0,c.isFullScreen=o[2],Y(()=>e=!1)),t.$set(c)},i(o){r||(b(t.$$.fragment,o),r=!0)},o(o){g(t.$$.fragment,o),r=!1},d(o){k(t,o)}}}function ce(n){let t,e,r;function a(o){n[7](o)}let s={titleProps:{titleText:n[4](),titleCategoryLabelText:se},$$slots:{PageWrapperContent:[oe]},$$scope:{ctx:n}};return n[2]!==void 0&&(s.isFullScreen=n[2]),t=new gt({props:s}),X.push(()=>Z(t,"isFullScreen",a)),{c(){p(t.$$.fragment)},l(o){C(t.$$.fragment,o)},m(o,l){y(t,o,l),r=!0},p(o,[l]){const c={};l&527&&(c.$$scope={dirty:l,ctx:o}),!e&&l&4&&(e=!0,c.isFullScreen=o[2],Y(()=>e=!1)),t.$set(c)},i(o){r||(b(t.$$.fragment,o),r=!0)},o(o){g(t.$$.fragment,o),r=!1},d(o){k(t,o)}}}const se="Contracts";function ue(n,t,e){let r;B(n,it,m=>e(3,r=m));let{data:a}=t;const s=r.params.projectName_versionName,o=()=>{const m=bt(s);return St(m.projectName,m.versionName)};let l=[];const c=()=>{let m=0;return l.forEach(f=>{f.contractConstructorInputs.length>m&&(m=f.contractConstructorInputs.length)}),m};let u=!1;function i(m){u=m,e(2,u)}function _(m){u=m,e(2,u)}return n.$$set=m=>{"data"in m&&e(0,a=m.data)},n.$$.update=()=>{n.$$.dirty&1&&e(1,l=ae(a.targetVersion.contracts))},[a,l,u,r,o,c,i,_]}class Ve extends V{constructor(t){super(),E(this,t,ue,ce,z,{data:0})}}export{Ve as component,je as universal};
