import{g as z}from"../chunks/functionNameHandler.0bc22bbb.js";import{n as D,d as J,u as K,v as Q,t as R,x as X,C as I,P as Y,i as S,m as Z,T as y}from"../chunks/CommonItemMember.d32f367b.js";import{s as P,a as w,c as v,i as F,d,e as k,p as V,F as B}from"../chunks/scheduler.d16bdadc.js";import{S as T,i as j,b as l,d as $,m as p,a as u,t as g,e as _,f as O,g as x,c as ee}from"../chunks/index.4f66e2f2.js";import{C as te,A as ne}from"../chunks/ContractOverviewBasic.28da3c1f.js";import{s as L,d as M}from"../chunks/BaseButton.411e578b.js";import{B as N}from"../chunks/stores.c7401bf1.js";import{A as re}from"../chunks/AbiParamsTable.6dc83b89.js";async function ae({params:a,parent:t}){const{initializing:n}=await t();if(n)return{};{const e=a.chainName,r=D(a.projectName_versionName).projectName,i=D(a.projectName_versionName).versionName,f=a.contractName,c=z(a.functionName).functionName,o=z(a.functionName).functionSelector,s={chainName:e},m={...s,projectName:r},b={...m,versionName:i},C={...b,contractName:f},A={chainName:e,projectName:r,versionName:i,contractName:f,abiFragmentName:c,functionSelector:o},h=J(s),H=K(m),U=Q(b),q=R(C),E=X(A);return{targetChain:h,targetProject:H,targetVersion:U,targetContract:q,targetFunctionAbiFragment:E}}}const De=Object.freeze(Object.defineProperty({__proto__:null,load:ae},Symbol.toStringTag,{value:"Module"}));function ie(a){let t,n;return t=new N({props:{text:a[0].name,textSize:a[1]}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&1&&(i.text=e[0].name),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function oe(a){let t,n;return t=new N({props:{text:a[0].stateMutability,textSize:a[1]}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&1&&(i.text=e[0].stateMutability),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function se(a){let t,n;return t=new N({props:{text:a[0].selector,textSize:a[1]}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&1&&(i.text=e[0].selector),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function ce(a){let t,n,e,r,i,f;return t=new I({props:{text:"Function Name",$$slots:{default:[ie]},$$scope:{ctx:a}}}),e=new I({props:{text:"State Mutability",$$slots:{default:[oe]},$$scope:{ctx:a}}}),i=new I({props:{text:"Function Selector",$$slots:{default:[se]},$$scope:{ctx:a}}}),{c(){l(t.$$.fragment),n=w(),l(e.$$.fragment),r=w(),l(i.$$.fragment)},l(c){$(t.$$.fragment,c),n=v(c),$(e.$$.fragment,c),r=v(c),$(i.$$.fragment,c)},m(c,o){p(t,c,o),F(c,n,o),p(e,c,o),F(c,r,o),p(i,c,o),f=!0},p(c,[o]){const s={};o&5&&(s.$$scope={dirty:o,ctx:c}),t.$set(s);const m={};o&5&&(m.$$scope={dirty:o,ctx:c}),e.$set(m);const b={};o&5&&(b.$$scope={dirty:o,ctx:c}),i.$set(b)},i(c){f||(u(t.$$.fragment,c),u(e.$$.fragment,c),u(i.$$.fragment,c),f=!0)},o(c){g(t.$$.fragment,c),g(e.$$.fragment,c),g(i.$$.fragment,c),f=!1},d(c){c&&(d(n),d(r)),_(t,c),_(e,c),_(i,c)}}}function fe(a,t,n){let{targetFunctionAbiFragment:e}=t;const r=L.itemMember;return a.$$set=i=>{"targetFunctionAbiFragment"in i&&n(0,e=i.targetFunctionAbiFragment)},[e,r]}class me extends T{constructor(t){super(),j(this,t,fe,ce,P,{targetFunctionAbiFragment:0})}}function ue(a){let t,n;return t=new N({props:{text:`The function has no ${a[0]}.`,italic:!0,textSize:L.itemWarnningMessage}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&1&&(i.text=`The function has no ${e[0]}.`),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function ge(a){let t,n;return t=new re({props:{dialogHeaderText:a[0],paramTypes:a[1],showInputIndexedField:!1}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&1&&(i.dialogHeaderText=e[0]),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function le(a){let t,n,e,r;const i=[ge,ue],f=[];function c(o,s){return o[1].length>0?0:1}return t=c(a),n=f[t]=i[t](a),{c(){n.c(),e=k()},l(o){n.l(o),e=k()},m(o,s){f[t].m(o,s),F(o,e,s),r=!0},p(o,[s]){n.p(o,s)},i(o){r||(u(n),r=!0)},o(o){g(n),r=!1},d(o){o&&d(e),f[t].d(o)}}}function $e(a,t,n){let{targetFunctionAbiFragment:e}=t,{paramIdentifier:r}=t;const i=e[r];return a.$$set=f=>{"targetFunctionAbiFragment"in f&&n(2,e=f.targetFunctionAbiFragment),"paramIdentifier"in f&&n(0,r=f.paramIdentifier)},[r,i,e]}class G extends T{constructor(t){super(),j(this,t,$e,le,P,{targetFunctionAbiFragment:2,paramIdentifier:0})}}function pe(a){let t,n;return t=new me({props:{targetFunctionAbiFragment:a[4]}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&16&&(i.targetFunctionAbiFragment=e[4]),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function _e(a){let t,n;return t=new te({props:{targetChain:a[0],targetProject:a[1],targetVersion:a[2],targetContract:a[3],activateLinkOfContractName:!0}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&1&&(i.targetChain=e[0]),r&2&&(i.targetProject=e[1]),r&4&&(i.targetVersion=e[2]),r&8&&(i.targetContract=e[3]),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function be(a){let t,n;return t=new G({props:{targetFunctionAbiFragment:a[4],paramIdentifier:"inputs"}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&16&&(i.targetFunctionAbiFragment=e[4]),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function Fe(a){let t,n;return t=new G({props:{targetFunctionAbiFragment:a[4],paramIdentifier:"outputs"}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&16&&(i.targetFunctionAbiFragment=e[4]),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function de(a){let t,n,e,r,i,f,c,o;return t=new S({props:{text:"Basic",gridTrack:a[5],$$slots:{default:[pe]},$$scope:{ctx:a}}}),e=new S({props:{text:"Contract",gridTrack:a[5],$$slots:{default:[_e]},$$scope:{ctx:a}}}),i=new S({props:{text:"Inputs",gridTrack:a[6],$$slots:{default:[be]},$$scope:{ctx:a}}}),c=new S({props:{text:"outputs",gridTrack:a[6],$$slots:{default:[Fe]},$$scope:{ctx:a}}}),{c(){l(t.$$.fragment),n=w(),l(e.$$.fragment),r=w(),l(i.$$.fragment),f=w(),l(c.$$.fragment)},l(s){$(t.$$.fragment,s),n=v(s),$(e.$$.fragment,s),r=v(s),$(i.$$.fragment,s),f=v(s),$(c.$$.fragment,s)},m(s,m){p(t,s,m),F(s,n,m),p(e,s,m),F(s,r,m),p(i,s,m),F(s,f,m),p(c,s,m),o=!0},p(s,m){const b={};m&144&&(b.$$scope={dirty:m,ctx:s}),t.$set(b);const C={};m&143&&(C.$$scope={dirty:m,ctx:s}),e.$set(C);const A={};m&144&&(A.$$scope={dirty:m,ctx:s}),i.$set(A);const h={};m&144&&(h.$$scope={dirty:m,ctx:s}),c.$set(h)},i(s){o||(u(t.$$.fragment,s),u(e.$$.fragment,s),u(i.$$.fragment,s),u(c.$$.fragment,s),o=!0)},o(s){g(t.$$.fragment,s),g(e.$$.fragment,s),g(i.$$.fragment,s),g(c.$$.fragment,s),o=!1},d(s){s&&(d(n),d(r),d(f)),_(t,s),_(e,s),_(i,s),_(c,s)}}}function we(a){let t,n;return t=new Y({props:{gridCols:"grid-cols-2",$$slots:{PageWrapperContentBody:[de]},$$scope:{ctx:a}}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,[r]){const i={};r&159&&(i.$$scope={dirty:r,ctx:e}),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function ve(a,t,n){let{targetChain:e}=t,{targetProject:r}=t,{targetVersion:i}=t,{targetContract:f}=t,{targetFunctionAbiFragment:c}=t;const o=M("col-span-full lg:col-span-1"),s=M("col-span-full lg:col-span-1");return a.$$set=m=>{"targetChain"in m&&n(0,e=m.targetChain),"targetProject"in m&&n(1,r=m.targetProject),"targetVersion"in m&&n(2,i=m.targetVersion),"targetContract"in m&&n(3,f=m.targetContract),"targetFunctionAbiFragment"in m&&n(4,c=m.targetFunctionAbiFragment)},[e,r,i,f,c,o,s]}class Ce extends T{constructor(t){super(),j(this,t,ve,we,P,{targetChain:0,targetProject:1,targetVersion:2,targetContract:3,targetFunctionAbiFragment:4})}}function Ae(a){let t,n,e;function r(f){a[4](f)}let i={targetAbi:a[0].targetFunctionAbiFragment,abiFormatType:"json",fragment:!0};return a[2]!==void 0&&(i.isFullScreen=a[2]),t=new ne({props:i}),V.push(()=>O(t,"isFullScreen",r)),{c(){l(t.$$.fragment)},l(f){$(t.$$.fragment,f)},m(f,c){p(t,f,c),e=!0},p(f,c){const o={};c&1&&(o.targetAbi=f[0].targetFunctionAbiFragment),!n&&c&4&&(n=!0,o.isFullScreen=f[2],B(()=>n=!1)),t.$set(o)},i(f){e||(u(t.$$.fragment,f),e=!0)},o(f){g(t.$$.fragment,f),e=!1},d(f){_(t,f)}}}function he(a){let t,n;return t=new Ce({props:{targetChain:a[0].targetChain,targetProject:a[0].targetProject,targetVersion:a[0].targetVersion,targetContract:a[0].targetContract,targetFunctionAbiFragment:a[0].targetFunctionAbiFragment}}),{c(){l(t.$$.fragment)},l(e){$(t.$$.fragment,e)},m(e,r){p(t,e,r),n=!0},p(e,r){const i={};r&1&&(i.targetChain=e[0].targetChain),r&1&&(i.targetProject=e[0].targetProject),r&1&&(i.targetVersion=e[0].targetVersion),r&1&&(i.targetContract=e[0].targetContract),r&1&&(i.targetFunctionAbiFragment=e[0].targetFunctionAbiFragment),t.$set(i)},i(e){n||(u(t.$$.fragment,e),n=!0)},o(e){g(t.$$.fragment,e),n=!1},d(e){_(t,e)}}}function Se(a){let t,n,e,r;const i=[he,Ae],f=[];function c(o,s){return o[1].selected==="Overview"?0:o[1].selected==="ABI"?1:-1}return~(t=c(a))&&(n=f[t]=i[t](a)),{c(){n&&n.c(),e=k()},l(o){n&&n.l(o),e=k()},m(o,s){~t&&f[t].m(o,s),F(o,e,s),r=!0},p(o,s){let m=t;t=c(o),t===m?~t&&f[t].p(o,s):(n&&(x(),g(f[m],1,1,()=>{f[m]=null}),ee()),~t?(n=f[t],n?n.p(o,s):(n=f[t]=i[t](o),n.c()),u(n,1),n.m(e.parentNode,e)):n=null)},i(o){r||(u(n),r=!0)},o(o){g(n),r=!1},d(o){o&&d(e),~t&&f[t].d(o)}}}function ke(a){let t,n,e,r;function i(o){a[5](o)}function f(o){a[6](o)}let c={titleProps:{titleText:a[3],titleCategoryLabelText:W},$$slots:{PageWrapperContent:[Se]},$$scope:{ctx:a}};return a[1]!==void 0&&(c.tabsDefinition=a[1]),a[2]!==void 0&&(c.isFullScreen=a[2]),t=new Z({props:c}),V.push(()=>O(t,"tabsDefinition",i)),V.push(()=>O(t,"isFullScreen",f)),{c(){l(t.$$.fragment)},l(o){$(t.$$.fragment,o)},m(o,s){p(t,o,s),r=!0},p(o,[s]){const m={};s&8&&(m.titleProps={titleText:o[3],titleCategoryLabelText:W}),s&135&&(m.$$scope={dirty:s,ctx:o}),!n&&s&2&&(n=!0,m.tabsDefinition=o[1],B(()=>n=!1)),!e&&s&4&&(e=!0,m.isFullScreen=o[2],B(()=>e=!1)),t.$set(m)},i(o){r||(u(t.$$.fragment,o),r=!0)},o(o){g(t.$$.fragment,o),r=!1},d(o){_(t,o)}}}const W="Function";function Pe(a,t,n){let e,{data:r}=t,i={selected:"Overview",values:y,groupName:"tabGroupFunction"},f=!1;function c(m){f=m,n(2,f)}function o(m){i=m,n(1,i)}function s(m){f=m,n(2,f)}return a.$$set=m=>{"data"in m&&n(0,r=m.data)},a.$$.update=()=>{a.$$.dirty&1&&n(3,e=r.targetFunctionAbiFragment.name)},[r,i,f,e,c,o,s]}class Me extends T{constructor(t){super(),j(this,t,Pe,ke,P,{data:0})}}export{Me as component,De as universal};
