var Vt=Object.defineProperty;var Yt=(e,t,s)=>t in e?Vt(e,t,{enumerable:!0,configurable:!0,writable:!0,value:s}):e[t]=s;var Me=(e,t,s)=>(Yt(e,typeof t!="symbol"?t+"":t,s),s);import{s as V,o as ct,e as Re,a as K,c as Ie,b as Ae,d as q,f as O,g as Zt,i as D,h as Be,u as ut,p as ft,q as gt,y as ne,a9 as ce,a7 as qe,n as $e,a3 as ye,a5 as ht,F as Qt,G as en,H as tn,aa as dt,l as z,ab as pt,a4 as nn,C as sn,ac as rn,k as an,I as on,L as ln,j as cn}from"./scheduler.CDAxP_dO.js";import{S as Y,i as Z,c as R,a as I,m as A,t as j,d as T,e as $,f as un,g as bt,b as mt}from"./index.C5tY04hK.js";import{P as fn,B as gn,o as hn}from"./BaseDialog.Bh0imB0a.js";import{c as we,x as dn,l as _t,m as pn,k as bn,s as he,b as mn,d as Et,o as _n,u as En,B as wn,e as Je}from"./stores.DaGaFg9x.js";import{s as yn,P as jn}from"./CommonItemMember.DAycnk9o.js";import{a as xn,S as Tn,b as ue,B as Sn}from"./SequenceBodyCell.BcBT5Y-E.js";import{s as Nn,N as se}from"./storeUserSettings.8mNvglE9.js";import{j as Mn,c as Ce}from"./storeRpcSettings.BR5-jVLy.js";function kn(e){let t,s,n,i;const l=e[3].default,r=ct(l,e,e[2],null);return n=new fn({props:{functionBarDefinition:e[0]}}),{c(){t=Re("div"),r&&r.c(),s=K(),R(n.$$.fragment),this.h()},l(a){t=Ie(a,"DIV",{class:!0});var o=Ae(t);r&&r.l(o),s=q(o),I(n.$$.fragment,o),o.forEach(O),this.h()},h(){Zt(t,"class",we("flex-initial","w-full","flex","flex-row","items-center",e[1](),"space-x-3","pb-1.5","pr-3"))},m(a,o){D(a,t,o),r&&r.m(t,null),Be(t,s),A(n,t,null),i=!0},p(a,[o]){r&&r.p&&(!i||o&4)&&ut(r,l,a,a[2],i?gt(l,a[2],o,null):ft(a[2]),null);const u={};o&1&&(u.functionBarDefinition=a[0]),n.$set(u)},i(a){i||(j(r,a),j(n.$$.fragment,a),i=!0)},o(a){T(r,a),T(n.$$.fragment,a),i=!1},d(a){a&&O(t),r&&r.d(a),$(n)}}}function On(e,t,s){let{$$slots:n={},$$scope:i}=t,{functionBarDefinition:l}=t;const r=()=>{switch(l.horizontalAlignment){case"start":return"justify-start";case"between":return"justify-between";default:return"justify-end"}};return e.$$set=a=>{"functionBarDefinition"in a&&s(0,l=a.functionBarDefinition),"$$scope"in a&&s(2,i=a.$$scope)},[l,r,i,n]}class _r extends Y{constructor(t){super(),Z(this,t,On,kn,V,{functionBarDefinition:0})}}const Rn={csv:{mimeType:"text/csv"},json:{mimeType:"application/json"},txt:{mimeType:"text/plain"}};function Er(e,t,s){const n=new Blob([e],{type:Rn[s].mimeType}),i=document.createElement("a"),l=URL.createObjectURL(n);i.href=l,i.download=t,document.body.appendChild(i),i.click(),setTimeout(()=>{document.body.removeChild(i),window.URL.revokeObjectURL(l)},0)}function wr(e,t,s){const n=ee(t.chainName),i=ee(t.projectName_versionName),l=ee(t.contractName),r=ee(t.eventName),a=ee(t.functionName),o=ee(yn());return`${e}${n}${i}${l}${r}${a}${o}.${s}`}function ee(e){return e?`-${e}`:""}class In{constructor(t="div"){Me(this,"eGui");Me(this,"value");this.eGui=document.createElement(t),this.eGui.style.display="flex",this.eGui.style.flexDirection="row",this.eGui.style.height="100%",this.eGui.style.alignItems="center"}init(t){this.value=t.value,this.createComponent(t)}getGui(){return this.eGui}refresh(t){return this.value=t.value,this.eGui.innerHTML="",!0}}function An(e){class t extends In{createComponent(n){e(this,n)}}return t}const wt=(e="start")=>({display:"flex","justify-content":e==="center"?e:`flex-${e}`});function yt(e){return e instanceof Map?e.clear=e.delete=e.set=function(){throw new Error("map is read-only")}:e instanceof Set&&(e.add=e.clear=e.delete=function(){throw new Error("set is read-only")}),Object.freeze(e),Object.getOwnPropertyNames(e).forEach(t=>{const s=e[t],n=typeof s;(n==="object"||n==="function")&&!Object.isFrozen(s)&&yt(s)}),e}class Ve{constructor(t){t.data===void 0&&(t.data={}),this.data=t.data,this.isMatchIgnored=!1}ignoreMatch(){this.isMatchIgnored=!0}}function jt(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;")}function G(e,...t){const s=Object.create(null);for(const n in e)s[n]=e[n];return t.forEach(function(n){for(const i in n)s[i]=n[i]}),s}const $n="</span>",Ye=e=>!!e.scope,Cn=(e,{prefix:t})=>{if(e.startsWith("language:"))return e.replace("language:","language-");if(e.includes(".")){const s=e.split(".");return[`${t}${s.shift()}`,...s.map((n,i)=>`${n}${"_".repeat(i+1)}`)].join(" ")}return`${t}${e}`};class Bn{constructor(t,s){this.buffer="",this.classPrefix=s.classPrefix,t.walk(this)}addText(t){this.buffer+=jt(t)}openNode(t){if(!Ye(t))return;const s=Cn(t.scope,{prefix:this.classPrefix});this.span(s)}closeNode(t){Ye(t)&&(this.buffer+=$n)}value(){return this.buffer}span(t){this.buffer+=`<span class="${t}">`}}const Ze=(e={})=>{const t={children:[]};return Object.assign(t,e),t};class De{constructor(){this.rootNode=Ze(),this.stack=[this.rootNode]}get top(){return this.stack[this.stack.length-1]}get root(){return this.rootNode}add(t){this.top.children.push(t)}openNode(t){const s=Ze({scope:t});this.add(s),this.stack.push(s)}closeNode(){if(this.stack.length>1)return this.stack.pop()}closeAllNodes(){for(;this.closeNode(););}toJSON(){return JSON.stringify(this.rootNode,null,4)}walk(t){return this.constructor._walk(t,this.rootNode)}static _walk(t,s){return typeof s=="string"?t.addText(s):s.children&&(t.openNode(s),s.children.forEach(n=>this._walk(t,n)),t.closeNode(s)),t}static _collapse(t){typeof t!="string"&&t.children&&(t.children.every(s=>typeof s=="string")?t.children=[t.children.join("")]:t.children.forEach(s=>{De._collapse(s)}))}}class Dn extends De{constructor(t){super(),this.options=t}addText(t){t!==""&&this.add(t)}startScope(t){this.openNode(t)}endScope(){this.closeNode()}__addSublanguage(t,s){const n=t.root;s&&(n.scope=`language:${s}`),this.add(n)}toHTML(){return new Bn(this,this.options).value()}finalize(){return this.closeAllNodes(),!0}}function fe(e){return e?typeof e=="string"?e:e.source:null}function xt(e){return Q("(?=",e,")")}function vn(e){return Q("(?:",e,")*")}function Ln(e){return Q("(?:",e,")?")}function Q(...e){return e.map(s=>fe(s)).join("")}function Hn(e){const t=e[e.length-1];return typeof t=="object"&&t.constructor===Object?(e.splice(e.length-1,1),t):{}}function ve(...e){return"("+(Hn(e).capture?"":"?:")+e.map(n=>fe(n)).join("|")+")"}function Tt(e){return new RegExp(e.toString()+"|").exec("").length-1}function Pn(e,t){const s=e&&e.exec(t);return s&&s.index===0}const Un=/\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;function Le(e,{joinWith:t}){let s=0;return e.map(n=>{s+=1;const i=s;let l=fe(n),r="";for(;l.length>0;){const a=Un.exec(l);if(!a){r+=l;break}r+=l.substring(0,a.index),l=l.substring(a.index+a[0].length),a[0][0]==="\\"&&a[1]?r+="\\"+String(Number(a[1])+i):(r+=a[0],a[0]==="("&&s++)}return r}).map(n=>`(${n})`).join(t)}const Fn=/\b\B/,St="[a-zA-Z]\\w*",He="[a-zA-Z_]\\w*",Nt="\\b\\d+(\\.\\d+)?",Mt="(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",kt="\\b(0b[01]+)",Gn="!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~",zn=(e={})=>{const t=/^#![ ]*\//;return e.binary&&(e.begin=Q(t,/.*\b/,e.binary,/\b.*/)),G({scope:"meta",begin:t,end:/$/,relevance:0,"on:begin":(s,n)=>{s.index!==0&&n.ignoreMatch()}},e)},ge={begin:"\\\\[\\s\\S]",relevance:0},Wn={scope:"string",begin:"'",end:"'",illegal:"\\n",contains:[ge]},Xn={scope:"string",begin:'"',end:'"',illegal:"\\n",contains:[ge]},Kn={begin:/\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/},xe=function(e,t,s={}){const n=G({scope:"comment",begin:e,end:t,contains:[]},s);n.contains.push({scope:"doctag",begin:"[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",end:/(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,excludeBegin:!0,relevance:0});const i=ve("I","a","is","so","us","to","at","if","in","it","on",/[A-Za-z]+['](d|ve|re|ll|t|s|n)/,/[A-Za-z]+[-][a-z]+/,/[A-Za-z][a-z]{2,}/);return n.contains.push({begin:Q(/[ ]+/,"(",i,/[.]?[:]?([.][ ]|[ ])/,"){3}")}),n},qn=xe("//","$"),Jn=xe("/\\*","\\*/"),Vn=xe("#","$"),Yn={scope:"number",begin:Nt,relevance:0},Zn={scope:"number",begin:Mt,relevance:0},Qn={scope:"number",begin:kt,relevance:0},es={scope:"regexp",begin:/\/(?=[^/\n]*\/)/,end:/\/[gimuy]*/,contains:[ge,{begin:/\[/,end:/\]/,relevance:0,contains:[ge]}]},ts={scope:"title",begin:St,relevance:0},ns={scope:"title",begin:He,relevance:0},ss={begin:"\\.\\s*"+He,relevance:0},rs=function(e){return Object.assign(e,{"on:begin":(t,s)=>{s.data._beginMatch=t[1]},"on:end":(t,s)=>{s.data._beginMatch!==t[1]&&s.ignoreMatch()}})};var Ee=Object.freeze({__proto__:null,APOS_STRING_MODE:Wn,BACKSLASH_ESCAPE:ge,BINARY_NUMBER_MODE:Qn,BINARY_NUMBER_RE:kt,COMMENT:xe,C_BLOCK_COMMENT_MODE:Jn,C_LINE_COMMENT_MODE:qn,C_NUMBER_MODE:Zn,C_NUMBER_RE:Mt,END_SAME_AS_BEGIN:rs,HASH_COMMENT_MODE:Vn,IDENT_RE:St,MATCH_NOTHING_RE:Fn,METHOD_GUARD:ss,NUMBER_MODE:Yn,NUMBER_RE:Nt,PHRASAL_WORDS_MODE:Kn,QUOTE_STRING_MODE:Xn,REGEXP_MODE:es,RE_STARTERS_RE:Gn,SHEBANG:zn,TITLE_MODE:ts,UNDERSCORE_IDENT_RE:He,UNDERSCORE_TITLE_MODE:ns});function is(e,t){e.input[e.index-1]==="."&&t.ignoreMatch()}function as(e,t){e.className!==void 0&&(e.scope=e.className,delete e.className)}function os(e,t){t&&e.beginKeywords&&(e.begin="\\b("+e.beginKeywords.split(" ").join("|")+")(?!\\.)(?=\\b|\\s)",e.__beforeBegin=is,e.keywords=e.keywords||e.beginKeywords,delete e.beginKeywords,e.relevance===void 0&&(e.relevance=0))}function ls(e,t){Array.isArray(e.illegal)&&(e.illegal=ve(...e.illegal))}function cs(e,t){if(e.match){if(e.begin||e.end)throw new Error("begin & end are not supported with match");e.begin=e.match,delete e.match}}function us(e,t){e.relevance===void 0&&(e.relevance=1)}const fs=(e,t)=>{if(!e.beforeMatch)return;if(e.starts)throw new Error("beforeMatch cannot be used with starts");const s=Object.assign({},e);Object.keys(e).forEach(n=>{delete e[n]}),e.keywords=s.keywords,e.begin=Q(s.beforeMatch,xt(s.begin)),e.starts={relevance:0,contains:[Object.assign(s,{endsParent:!0})]},e.relevance=0,delete s.beforeMatch},gs=["of","and","for","in","not","or","if","then","parent","list","value"],hs="keyword";function Ot(e,t,s=hs){const n=Object.create(null);return typeof e=="string"?i(s,e.split(" ")):Array.isArray(e)?i(s,e):Object.keys(e).forEach(function(l){Object.assign(n,Ot(e[l],t,l))}),n;function i(l,r){t&&(r=r.map(a=>a.toLowerCase())),r.forEach(function(a){const o=a.split("|");n[o[0]]=[l,ds(o[0],o[1])]})}}function ds(e,t){return t?Number(t):ps(e)?0:1}function ps(e){return gs.includes(e.toLowerCase())}const Qe={},J=e=>{console.error(e)},et=(e,...t)=>{console.log(`WARN: ${e}`,...t)},te=(e,t)=>{Qe[`${e}/${t}`]||(console.log(`Deprecated as of ${e}. ${t}`),Qe[`${e}/${t}`]=!0)},je=new Error;function Rt(e,t,{key:s}){let n=0;const i=e[s],l={},r={};for(let a=1;a<=t.length;a++)r[a+n]=i[a],l[a+n]=!0,n+=Tt(t[a-1]);e[s]=r,e[s]._emit=l,e[s]._multi=!0}function bs(e){if(Array.isArray(e.begin)){if(e.skip||e.excludeBegin||e.returnBegin)throw J("skip, excludeBegin, returnBegin not compatible with beginScope: {}"),je;if(typeof e.beginScope!="object"||e.beginScope===null)throw J("beginScope must be object"),je;Rt(e,e.begin,{key:"beginScope"}),e.begin=Le(e.begin,{joinWith:""})}}function ms(e){if(Array.isArray(e.end)){if(e.skip||e.excludeEnd||e.returnEnd)throw J("skip, excludeEnd, returnEnd not compatible with endScope: {}"),je;if(typeof e.endScope!="object"||e.endScope===null)throw J("endScope must be object"),je;Rt(e,e.end,{key:"endScope"}),e.end=Le(e.end,{joinWith:""})}}function _s(e){e.scope&&typeof e.scope=="object"&&e.scope!==null&&(e.beginScope=e.scope,delete e.scope)}function Es(e){_s(e),typeof e.beginScope=="string"&&(e.beginScope={_wrap:e.beginScope}),typeof e.endScope=="string"&&(e.endScope={_wrap:e.endScope}),bs(e),ms(e)}function ws(e){function t(r,a){return new RegExp(fe(r),"m"+(e.case_insensitive?"i":"")+(e.unicodeRegex?"u":"")+(a?"g":""))}class s{constructor(){this.matchIndexes={},this.regexes=[],this.matchAt=1,this.position=0}addRule(a,o){o.position=this.position++,this.matchIndexes[this.matchAt]=o,this.regexes.push([o,a]),this.matchAt+=Tt(a)+1}compile(){this.regexes.length===0&&(this.exec=()=>null);const a=this.regexes.map(o=>o[1]);this.matcherRe=t(Le(a,{joinWith:"|"}),!0),this.lastIndex=0}exec(a){this.matcherRe.lastIndex=this.lastIndex;const o=this.matcherRe.exec(a);if(!o)return null;const u=o.findIndex((S,E)=>E>0&&S!==void 0),m=this.matchIndexes[u];return o.splice(0,u),Object.assign(o,m)}}class n{constructor(){this.rules=[],this.multiRegexes=[],this.count=0,this.lastIndex=0,this.regexIndex=0}getMatcher(a){if(this.multiRegexes[a])return this.multiRegexes[a];const o=new s;return this.rules.slice(a).forEach(([u,m])=>o.addRule(u,m)),o.compile(),this.multiRegexes[a]=o,o}resumingScanAtSamePosition(){return this.regexIndex!==0}considerAll(){this.regexIndex=0}addRule(a,o){this.rules.push([a,o]),o.type==="begin"&&this.count++}exec(a){const o=this.getMatcher(this.regexIndex);o.lastIndex=this.lastIndex;let u=o.exec(a);if(this.resumingScanAtSamePosition()&&!(u&&u.index===this.lastIndex)){const m=this.getMatcher(0);m.lastIndex=this.lastIndex+1,u=m.exec(a)}return u&&(this.regexIndex+=u.position+1,this.regexIndex===this.count&&this.considerAll()),u}}function i(r){const a=new n;return r.contains.forEach(o=>a.addRule(o.begin,{rule:o,type:"begin"})),r.terminatorEnd&&a.addRule(r.terminatorEnd,{type:"end"}),r.illegal&&a.addRule(r.illegal,{type:"illegal"}),a}function l(r,a){const o=r;if(r.isCompiled)return o;[as,cs,Es,fs].forEach(m=>m(r,a)),e.compilerExtensions.forEach(m=>m(r,a)),r.__beforeBegin=null,[os,ls,us].forEach(m=>m(r,a)),r.isCompiled=!0;let u=null;return typeof r.keywords=="object"&&r.keywords.$pattern&&(r.keywords=Object.assign({},r.keywords),u=r.keywords.$pattern,delete r.keywords.$pattern),u=u||/\w+/,r.keywords&&(r.keywords=Ot(r.keywords,e.case_insensitive)),o.keywordPatternRe=t(u,!0),a&&(r.begin||(r.begin=/\B|\b/),o.beginRe=t(o.begin),!r.end&&!r.endsWithParent&&(r.end=/\B|\b/),r.end&&(o.endRe=t(o.end)),o.terminatorEnd=fe(o.end)||"",r.endsWithParent&&a.terminatorEnd&&(o.terminatorEnd+=(r.end?"|":"")+a.terminatorEnd)),r.illegal&&(o.illegalRe=t(r.illegal)),r.contains||(r.contains=[]),r.contains=[].concat(...r.contains.map(function(m){return ys(m==="self"?r:m)})),r.contains.forEach(function(m){l(m,o)}),r.starts&&l(r.starts,a),o.matcher=i(o),o}if(e.compilerExtensions||(e.compilerExtensions=[]),e.contains&&e.contains.includes("self"))throw new Error("ERR: contains `self` is not supported at the top-level of a language.  See documentation.");return e.classNameAliases=G(e.classNameAliases||{}),l(e)}function It(e){return e?e.endsWithParent||It(e.starts):!1}function ys(e){return e.variants&&!e.cachedVariants&&(e.cachedVariants=e.variants.map(function(t){return G(e,{variants:null},t)})),e.cachedVariants?e.cachedVariants:It(e)?G(e,{starts:e.starts?G(e.starts):null}):Object.isFrozen(e)?G(e):e}var js="11.9.0";class xs extends Error{constructor(t,s){super(t),this.name="HTMLInjectionError",this.html=s}}const ke=jt,tt=G,nt=Symbol("nomatch"),Ts=7,At=function(e){const t=Object.create(null),s=Object.create(null),n=[];let i=!0;const l="Could not find the language '{}', did you forget to load/include a language module?",r={disableAutodetect:!0,name:"Plain text",contains:[]};let a={ignoreUnescapedHTML:!1,throwUnescapedHTML:!1,noHighlightRe:/^(no-?highlight)$/i,languageDetectRe:/\blang(?:uage)?-([\w-]+)\b/i,classPrefix:"hljs-",cssSelector:"pre code",languages:null,__emitter:Dn};function o(c){return a.noHighlightRe.test(c)}function u(c){let h=c.className+" ";h+=c.parentNode?c.parentNode.className:"";const _=a.languageDetectRe.exec(h);if(_){const y=U(_[1]);return y||(et(l.replace("{}",_[1])),et("Falling back to no-highlight mode for this block.",c)),y?_[1]:"no-highlight"}return h.split(/\s+/).find(y=>o(y)||U(y))}function m(c,h,_){let y="",M="";typeof h=="object"?(y=c,_=h.ignoreIllegals,M=h.language):(te("10.7.0","highlight(lang, code, ...args) has been deprecated."),te("10.7.0",`Please use highlight(code, options) instead.
https://github.com/highlightjs/highlight.js/issues/2277`),M=c,y=h),_===void 0&&(_=!0);const v={code:y,language:M};pe("before:highlight",v);const F=v.result?v.result:S(v.language,v.code,_);return F.code=v.code,pe("after:highlight",F),F}function S(c,h,_,y){const M=Object.create(null);function v(f,g){return f.keywords[g]}function F(){if(!p.keywords){k.addText(x);return}let f=0;p.keywordPatternRe.lastIndex=0;let g=p.keywordPatternRe.exec(x),b="";for(;g;){b+=x.substring(f,g.index);const w=H.case_insensitive?g[0].toLowerCase():g[0],C=v(p,w);if(C){const[P,qt]=C;if(k.addText(b),b="",M[w]=(M[w]||0)+1,M[w]<=Ts&&(_e+=qt),P.startsWith("_"))b+=g[0];else{const Jt=H.classNameAliases[P]||P;L(g[0],Jt)}}else b+=g[0];f=p.keywordPatternRe.lastIndex,g=p.keywordPatternRe.exec(x)}b+=x.substring(f),k.addText(b)}function be(){if(x==="")return;let f=null;if(typeof p.subLanguage=="string"){if(!t[p.subLanguage]){k.addText(x);return}f=S(p.subLanguage,x,!0,Ke[p.subLanguage]),Ke[p.subLanguage]=f._top}else f=ie(x,p.subLanguage.length?p.subLanguage:null);p.relevance>0&&(_e+=f.relevance),k.__addSublanguage(f._emitter,f.language)}function B(){p.subLanguage!=null?be():F(),x=""}function L(f,g){f!==""&&(k.startScope(g),k.addText(f),k.endScope())}function Ge(f,g){let b=1;const w=g.length-1;for(;b<=w;){if(!f._emit[b]){b++;continue}const C=H.classNameAliases[f[b]]||f[b],P=g[b];C?L(P,C):(x=P,F(),x=""),b++}}function ze(f,g){return f.scope&&typeof f.scope=="string"&&k.openNode(H.classNameAliases[f.scope]||f.scope),f.beginScope&&(f.beginScope._wrap?(L(x,H.classNameAliases[f.beginScope._wrap]||f.beginScope._wrap),x=""):f.beginScope._multi&&(Ge(f.beginScope,g),x="")),p=Object.create(f,{parent:{value:p}}),p}function We(f,g,b){let w=Pn(f.endRe,b);if(w){if(f["on:end"]){const C=new Ve(f);f["on:end"](g,C),C.isMatchIgnored&&(w=!1)}if(w){for(;f.endsParent&&f.parent;)f=f.parent;return f}}if(f.endsWithParent)return We(f.parent,g,b)}function Gt(f){return p.matcher.regexIndex===0?(x+=f[0],1):(Ne=!0,0)}function zt(f){const g=f[0],b=f.rule,w=new Ve(b),C=[b.__beforeBegin,b["on:begin"]];for(const P of C)if(P&&(P(f,w),w.isMatchIgnored))return Gt(g);return b.skip?x+=g:(b.excludeBegin&&(x+=g),B(),!b.returnBegin&&!b.excludeBegin&&(x=g)),ze(b,f),b.returnBegin?0:g.length}function Wt(f){const g=f[0],b=h.substring(f.index),w=We(p,f,b);if(!w)return nt;const C=p;p.endScope&&p.endScope._wrap?(B(),L(g,p.endScope._wrap)):p.endScope&&p.endScope._multi?(B(),Ge(p.endScope,f)):C.skip?x+=g:(C.returnEnd||C.excludeEnd||(x+=g),B(),C.excludeEnd&&(x=g));do p.scope&&k.closeNode(),!p.skip&&!p.subLanguage&&(_e+=p.relevance),p=p.parent;while(p!==w.parent);return w.starts&&ze(w.starts,f),C.returnEnd?0:g.length}function Xt(){const f=[];for(let g=p;g!==H;g=g.parent)g.scope&&f.unshift(g.scope);f.forEach(g=>k.openNode(g))}let me={};function Xe(f,g){const b=g&&g[0];if(x+=f,b==null)return B(),0;if(me.type==="begin"&&g.type==="end"&&me.index===g.index&&b===""){if(x+=h.slice(g.index,g.index+1),!i){const w=new Error(`0 width match regex (${c})`);throw w.languageName=c,w.badRule=me.rule,w}return 1}if(me=g,g.type==="begin")return zt(g);if(g.type==="illegal"&&!_){const w=new Error('Illegal lexeme "'+b+'" for mode "'+(p.scope||"<unnamed>")+'"');throw w.mode=p,w}else if(g.type==="end"){const w=Wt(g);if(w!==nt)return w}if(g.type==="illegal"&&b==="")return 1;if(Se>1e5&&Se>g.index*3)throw new Error("potential infinite loop, way more iterations than matches");return x+=b,b.length}const H=U(c);if(!H)throw J(l.replace("{}",c)),new Error('Unknown language: "'+c+'"');const Kt=ws(H);let Te="",p=y||Kt;const Ke={},k=new a.__emitter(a);Xt();let x="",_e=0,X=0,Se=0,Ne=!1;try{if(H.__emitTokens)H.__emitTokens(h,k);else{for(p.matcher.considerAll();;){Se++,Ne?Ne=!1:p.matcher.considerAll(),p.matcher.lastIndex=X;const f=p.matcher.exec(h);if(!f)break;const g=h.substring(X,f.index),b=Xe(g,f);X=f.index+b}Xe(h.substring(X))}return k.finalize(),Te=k.toHTML(),{language:c,value:Te,relevance:_e,illegal:!1,_emitter:k,_top:p}}catch(f){if(f.message&&f.message.includes("Illegal"))return{language:c,value:ke(h),illegal:!0,relevance:0,_illegalBy:{message:f.message,index:X,context:h.slice(X-100,X+100),mode:f.mode,resultSoFar:Te},_emitter:k};if(i)return{language:c,value:ke(h),illegal:!1,relevance:0,errorRaised:f,_emitter:k,_top:p};throw f}}function E(c){const h={value:ke(c),illegal:!1,relevance:0,_top:r,_emitter:new a.__emitter(a)};return h._emitter.addText(c),h}function ie(c,h){h=h||a.languages||Object.keys(t);const _=E(c),y=h.filter(U).filter(Fe).map(B=>S(B,c,!1));y.unshift(_);const M=y.sort((B,L)=>{if(B.relevance!==L.relevance)return L.relevance-B.relevance;if(B.language&&L.language){if(U(B.language).supersetOf===L.language)return 1;if(U(L.language).supersetOf===B.language)return-1}return 0}),[v,F]=M,be=v;return be.secondBest=F,be}function ae(c,h,_){const y=h&&s[h]||_;c.classList.add("hljs"),c.classList.add(`language-${y}`)}function oe(c){let h=null;const _=u(c);if(o(_))return;if(pe("before:highlightElement",{el:c,language:_}),c.dataset.highlighted){console.log("Element previously highlighted. To highlight again, first unset `dataset.highlighted`.",c);return}if(c.children.length>0&&(a.ignoreUnescapedHTML||(console.warn("One of your code blocks includes unescaped HTML. This is a potentially serious security risk."),console.warn("https://github.com/highlightjs/highlight.js/wiki/security"),console.warn("The element with unescaped HTML:"),console.warn(c)),a.throwUnescapedHTML))throw new xs("One of your code blocks includes unescaped HTML.",c.innerHTML);h=c;const y=h.textContent,M=_?m(y,{language:_,ignoreIllegals:!0}):ie(y);c.innerHTML=M.value,c.dataset.highlighted="yes",ae(c,_,M.language),c.result={language:M.language,re:M.relevance,relevance:M.relevance},M.secondBest&&(c.secondBest={language:M.secondBest.language,relevance:M.secondBest.relevance}),pe("after:highlightElement",{el:c,result:M,text:y})}function d(c){a=tt(a,c)}const N=()=>{W(),te("10.6.0","initHighlighting() deprecated.  Use highlightAll() now.")};function de(){W(),te("10.6.0","initHighlightingOnLoad() deprecated.  Use highlightAll() now.")}let le=!1;function W(){if(document.readyState==="loading"){le=!0;return}document.querySelectorAll(a.cssSelector).forEach(oe)}function Bt(){le&&W()}typeof window<"u"&&window.addEventListener&&window.addEventListener("DOMContentLoaded",Bt,!1);function Dt(c,h){let _=null;try{_=h(e)}catch(y){if(J("Language definition for '{}' could not be registered.".replace("{}",c)),i)J(y);else throw y;_=r}_.name||(_.name=c),t[c]=_,_.rawDefinition=h.bind(null,e),_.aliases&&Ue(_.aliases,{languageName:c})}function vt(c){delete t[c];for(const h of Object.keys(s))s[h]===c&&delete s[h]}function Lt(){return Object.keys(t)}function U(c){return c=(c||"").toLowerCase(),t[c]||t[s[c]]}function Ue(c,{languageName:h}){typeof c=="string"&&(c=[c]),c.forEach(_=>{s[_.toLowerCase()]=h})}function Fe(c){const h=U(c);return h&&!h.disableAutodetect}function Ht(c){c["before:highlightBlock"]&&!c["before:highlightElement"]&&(c["before:highlightElement"]=h=>{c["before:highlightBlock"](Object.assign({block:h.el},h))}),c["after:highlightBlock"]&&!c["after:highlightElement"]&&(c["after:highlightElement"]=h=>{c["after:highlightBlock"](Object.assign({block:h.el},h))})}function Pt(c){Ht(c),n.push(c)}function Ut(c){const h=n.indexOf(c);h!==-1&&n.splice(h,1)}function pe(c,h){const _=c;n.forEach(function(y){y[_]&&y[_](h)})}function Ft(c){return te("10.7.0","highlightBlock will be removed entirely in v12.0"),te("10.7.0","Please use highlightElement now."),oe(c)}Object.assign(e,{highlight:m,highlightAuto:ie,highlightAll:W,highlightElement:oe,highlightBlock:Ft,configure:d,initHighlighting:N,initHighlightingOnLoad:de,registerLanguage:Dt,unregisterLanguage:vt,listLanguages:Lt,getLanguage:U,registerAliases:Ue,autoDetection:Fe,inherit:tt,addPlugin:Pt,removePlugin:Ut}),e.debugMode=function(){i=!1},e.safeMode=function(){i=!0},e.versionString=js,e.regex={concat:Q,lookahead:xt,either:ve,optional:Ln,anyNumberOfTimes:vn};for(const c in Ee)typeof Ee[c]=="object"&&yt(Ee[c]);return Object.assign(e,Ee),e},re=At({});re.newInstance=()=>At({});var Ss=re;re.HighlightJS=re;re.default=re;const st=dn(Ss);function Ns(e){let t;return{c(){t=Qt(e[0])},l(s){t=en(s,e[0])},m(s,n){D(s,t,n)},p(s,n){n&1&&tn(t,s[0])},d(s){s&&O(t)}}}function Ms(e){let t,s;return{c(){t=new dt(!1),s=z(),this.h()},l(n){t=pt(n,!1),s=z(),this.h()},h(){t.a=s},m(n,i){t.m(e[1],n,i),D(n,s,i)},p(n,i){i&2&&t.p(n[1])},d(n){n&&(O(s),t.d())}}}function ks(e){let t,s;function n(o,u){return o[1]?Ms:Ns}let i=n(e),l=i(e),r=[{"data-language":e[2]},e[4]],a={};for(let o=0;o<r.length;o+=1)a=ne(a,r[o]);return{c(){t=Re("pre"),s=Re("code"),l.c(),this.h()},l(o){t=Ie(o,"PRE",{"data-language":!0});var u=Ae(t);s=Ie(u,"CODE",{});var m=Ae(s);l.l(m),m.forEach(O),u.forEach(O),this.h()},h(){ce(s,"hljs",!0),qe(t,a),ce(t,"langtag",e[3]),ce(t,"svelte-1w9vok",!0)},m(o,u){D(o,t,u),Be(t,s),l.m(s,null)},p(o,[u]){i===(i=n(o))&&l?l.p(o,u):(l.d(1),l=i(o),l&&(l.c(),l.m(s,null))),qe(t,a=_t(r,[u&4&&{"data-language":o[2]},u&16&&o[4]])),ce(t,"langtag",o[3]),ce(t,"svelte-1w9vok",!0)},i:$e,o:$e,d(o){o&&O(t),l.d()}}}function Os(e,t,s){const n=["code","highlighted","languageName","langtag"];let i=ye(t,n),{code:l}=t,{highlighted:r}=t,{languageName:a="plaintext"}=t,{langtag:o=!1}=t;return e.$$set=u=>{t=ne(ne({},t),ht(u)),s(4,i=ye(t,n)),"code"in u&&s(0,l=u.code),"highlighted"in u&&s(1,r=u.highlighted),"languageName"in u&&s(2,a=u.languageName),"langtag"in u&&s(3,o=u.langtag)},[l,r,a,o,i]}class Rs extends Y{constructor(t){super(),Z(this,t,Os,ks,V,{code:0,highlighted:1,languageName:2,langtag:3})}}const Is=e=>({highlighted:e&8}),rt=e=>({highlighted:e[3]});function As(e){let t,s;const n=[e[4],{languageName:e[0].name},{langtag:e[2]},{highlighted:e[3]},{code:e[1]}];let i={};for(let l=0;l<n.length;l+=1)i=ne(i,n[l]);return t=new Rs({props:i}),{c(){R(t.$$.fragment)},l(l){I(t.$$.fragment,l)},m(l,r){A(t,l,r),s=!0},p(l,r){const a=r&31?_t(n,[r&16&&pn(l[4]),r&1&&{languageName:l[0].name},r&4&&{langtag:l[2]},r&8&&{highlighted:l[3]},r&2&&{code:l[1]}]):{};t.$set(a)},i(l){s||(j(t.$$.fragment,l),s=!0)},o(l){T(t.$$.fragment,l),s=!1},d(l){$(t,l)}}}function $s(e){let t;const s=e[6].default,n=ct(s,e,e[5],rt),i=n||As(e);return{c(){i&&i.c()},l(l){i&&i.l(l)},m(l,r){i&&i.m(l,r),t=!0},p(l,[r]){n?n.p&&(!t||r&40)&&ut(n,s,l,l[5],t?gt(s,l[5],r,Is):ft(l[5]),rt):i&&i.p&&(!t||r&31)&&i.p(l,t?r:-1)},i(l){t||(j(i,l),t=!0)},o(l){T(i,l),t=!1},d(l){i&&i.d(l)}}}function Cs(e,t,s){const n=["language","code","langtag"];let i=ye(t,n),{$$slots:l={},$$scope:r}=t,{language:a}=t,{code:o}=t,{langtag:u=!1}=t;const m=nn();let S="";return sn(()=>{S&&m("highlight",{highlighted:S})}),e.$$set=E=>{t=ne(ne({},t),ht(E)),s(4,i=ye(t,n)),"language"in E&&s(0,a=E.language),"code"in E&&s(1,o=E.code),"langtag"in E&&s(2,u=E.langtag),"$$scope"in E&&s(5,r=E.$$scope)},e.$$.update=()=>{e.$$.dirty&3&&(st.registerLanguage(a.name,a.register),s(3,S=st.highlight(o,{language:a.name}).value))},[a,o,u,S,i,r,l]}class Bs extends Y{constructor(t){super(),Z(this,t,Cs,$s,V,{language:0,code:1,langtag:2})}}const Ds=Bs;function vs(e){const t={className:"attr",begin:/"(\\.|[^\\"\r\n])*"(?=\s*:)/,relevance:1.01},s={match:/[{}[\],:]/,className:"punctuation",relevance:0},n=["true","false","null"],i={scope:"literal",beginKeywords:n.join(" ")};return{name:"JSON",keywords:{literal:n},contains:[t,s,e.QUOTE_STRING_MODE,i,e.C_NUMBER_MODE,e.C_LINE_COMMENT_MODE,e.C_BLOCK_COMMENT_MODE],illegal:"\\S"}}const Ls={name:"json",register:vs},Hs=Ls,Ps=`<style>pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}
/*!
  Theme: GitHub
  Description: Light theme as seen on github.com
  Author: github.com
  Maintainer: @Hirse
  Updated: 2021-05-15

  Outdated base version: https://github.com/primer/github-syntax-light
  Current colors taken from GitHub's CSS
*/.hljs{color:#24292e;background:#ffffff}.hljs-doctag,
.hljs-keyword,
.hljs-meta .hljs-keyword,
.hljs-template-tag,
.hljs-template-variable,
.hljs-type,
.hljs-variable.language_{color:#d73a49}.hljs-title,
.hljs-title.class_,
.hljs-title.class_.inherited__,
.hljs-title.function_{color:#6f42c1}.hljs-attr,
.hljs-attribute,
.hljs-literal,
.hljs-meta,
.hljs-number,
.hljs-operator,
.hljs-variable,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-id{color:#005cc5}.hljs-regexp,
.hljs-string,
.hljs-meta .hljs-string{color:#032f62}.hljs-built_in,
.hljs-symbol{color:#e36209}.hljs-comment,
.hljs-code,
.hljs-formula{color:#6a737d}.hljs-name,
.hljs-quote,
.hljs-selector-tag,
.hljs-selector-pseudo{color:#22863a}.hljs-subst{color:#24292e}.hljs-section{color:#005cc5;font-weight:bold}.hljs-bullet{color:#735c0f}.hljs-emphasis{color:#24292e;font-style:italic}.hljs-strong{color:#24292e;font-weight:bold}.hljs-addition{color:#22863a;background-color:#f0fff4}.hljs-deletion{color:#b31d28;background-color:#ffeef0}</style>`,Us=Ps,Fs=`<style>pre code.hljs{display:block;overflow-x:auto;padding:1em}code.hljs{padding:3px 5px}
/*!
  Theme: GitHub Dark
  Description: Dark theme as seen on github.com
  Author: github.com
  Maintainer: @Hirse
  Updated: 2021-05-15

  Outdated base version: https://github.com/primer/github-syntax-dark
  Current colors taken from GitHub's CSS
*/.hljs{color:#c9d1d9;background:#0d1117}.hljs-doctag,
.hljs-keyword,
.hljs-meta .hljs-keyword,
.hljs-template-tag,
.hljs-template-variable,
.hljs-type,
.hljs-variable.language_{color:#ff7b72}.hljs-title,
.hljs-title.class_,
.hljs-title.class_.inherited__,
.hljs-title.function_{color:#d2a8ff}.hljs-attr,
.hljs-attribute,
.hljs-literal,
.hljs-meta,
.hljs-number,
.hljs-operator,
.hljs-variable,
.hljs-selector-attr,
.hljs-selector-class,
.hljs-selector-id{color:#79c0ff}.hljs-regexp,
.hljs-string,
.hljs-meta .hljs-string{color:#a5d6ff}.hljs-built_in,
.hljs-symbol{color:#ffa657}.hljs-comment,
.hljs-code,
.hljs-formula{color:#8b949e}.hljs-name,
.hljs-quote,
.hljs-selector-tag,
.hljs-selector-pseudo{color:#7ee787}.hljs-subst{color:#c9d1d9}.hljs-section{color:#1f6feb;font-weight:bold}.hljs-bullet{color:#f2cc60}.hljs-emphasis{color:#c9d1d9;font-style:italic}.hljs-strong{color:#c9d1d9;font-weight:bold}.hljs-addition{color:#aff5b4;background-color:#033a16}.hljs-deletion{color:#ffdcd7;background-color:#67060c}</style>`,Gs=Fs;function zs(e){let t,s,n,i,l;return i=new Ds({props:{language:e[4][e[0]],class:we("w-full","min-w-fit","whitespace-pre-wrap",bn[he.abiJsonText]),code:e[1],style:we(`--base-highlight-background-color:${e[3]};`)}}),{c(){t=new dt(!1),s=z(),n=K(),R(i.$$.fragment),this.h()},l(r){const a=rn("svelte-1jdmv60",document.head);t=pt(a,!1),s=z(),a.forEach(O),n=q(r),I(i.$$.fragment,r),this.h()},h(){t.a=s},m(r,a){t.m(e[2],document.head),Be(document.head,s),D(r,n,a),A(i,r,a),l=!0},p(r,[a]){(!l||a&4)&&t.p(r[2]);const o={};a&1&&(o.language=r[4][r[0]]),a&2&&(o.code=r[1]),a&8&&(o.style=we(`--base-highlight-background-color:${r[3]};`)),i.$set(o)},i(r){l||(j(i.$$.fragment,r),l=!0)},o(r){T(i.$$.fragment,r),l=!1},d(r){r&&(t.d(),O(n)),O(s),$(i,r)}}}function Ws(e,t,s){let n;an(e,Nn,S=>s(7,n=S));let{targetLanguageName:i}=t,{code:l}=t,r,a;const o={json:Hs};let u,m;return e.$$set=S=>{"targetLanguageName"in S&&s(0,i=S.targetLanguageName),"code"in S&&s(1,l=S.code)},e.$$.update=()=>{e.$$.dirty&128&&s(5,r=n.themeColor),e.$$.dirty&32&&s(2,a=r==="light"?Us:Gs),e.$$.dirty&32&&s(6,u=mn[r][Et.itemGroupContent].bg),e.$$.dirty&64&&s(3,m=_n(u))},[i,l,a,m,o,r,u,n]}class Xs extends Y{constructor(t){super(),Z(this,t,Ws,zs,V,{targetLanguageName:0,code:1})}}function Ks(e){let t,s;return t=new Xs({props:{targetLanguageName:"json",code:e[2]}}),{c(){R(t.$$.fragment)},l(n){I(t.$$.fragment,n)},m(n,i){A(t,n,i),s=!0},p(n,i){const l={};i&4&&(l.code=n[2]),t.$set(l)},i(n){s||(j(t.$$.fragment,n),s=!0)},o(n){T(t.$$.fragment,n),s=!1},d(n){$(t,n)}}}function qs(e){let t,s;return t=new jn({props:{hasMultipulTabs:!1,slot:"dialogBody",$$slots:{PageWrapperContentBody:[Ks]},$$scope:{ctx:e}}}),{c(){R(t.$$.fragment)},l(n){I(t.$$.fragment,n)},m(n,i){A(t,n,i),s=!0},p(n,i){const l={};i&68&&(l.$$scope={dirty:i,ctx:n}),t.$set(l)},i(n){s||(j(t.$$.fragment,n),s=!0)},o(n){T(t.$$.fragment,n),s=!1},d(n){$(t,n)}}}function Js(e){let t,s,n,i,l;t=new En({props:{iconName:Vs,size:he.abiParamsTable,label:"View",noPadding:!0,shadowEffect:!1,prefixIcon:!0,popupEffect:!1,colorCategoryFront:"interactive"}}),t.$on("click",e[3]);function r(o){e[5](o)}let a={headerText:`Components of ${e[0]}`,headerIconName:void 0,$$slots:{dialogBody:[qs]},$$scope:{ctx:e}};return e[1]!==void 0&&(a.dialogElement=e[1]),n=new gn({props:a}),on.push(()=>un(n,"dialogElement",r)),{c(){R(t.$$.fragment),s=K(),R(n.$$.fragment)},l(o){I(t.$$.fragment,o),s=q(o),I(n.$$.fragment,o)},m(o,u){A(t,o,u),D(o,s,u),A(n,o,u),l=!0},p(o,[u]){const m={};u&1&&(m.headerText=`Components of ${o[0]}`),u&68&&(m.$$scope={dirty:u,ctx:o}),!i&&u&2&&(i=!0,m.dialogElement=o[1],ln(()=>i=!1)),n.$set(m)},i(o){l||(j(t.$$.fragment,o),j(n.$$.fragment,o),l=!0)},o(o){T(t.$$.fragment,o),T(n.$$.fragment,o),l=!1},d(o){o&&O(s),$(t,o),$(n,o)}}}const Vs="loupe";function Ys(e,t,s){let n,{dialogHeaderText:i}=t,{components:l}=t,r;function a(){hn(r)}function o(u){r=u,s(1,r)}return e.$$set=u=>{"dialogHeaderText"in u&&s(0,i=u.dialogHeaderText),"components"in u&&s(4,l=u.components)},e.$$.update=()=>{e.$$.dirty&16&&s(2,n=Mn(l))},[i,r,n,a,l,o]}class $t extends Y{constructor(t){super(),Z(this,t,Ys,Js,V,{dialogHeaderText:0,components:4})}}function Ct(e,t){return e.data?e.data[t]:[]}function Zs(e,t,s,n){const i=Ct(e,t)[s];return!i||i[n]===null?se:i[n].toString()}const Oe=(e,t,s)=>({headerName:Ce(s),sortable:!0,editable:!1,cellStyle:wt(s==="name"?"start":"center"),columnGroupShow:s==="name"?void 0:"open",valueGetter:n=>Zs(n,e,t,s)}),yr=(e,t,s,n)=>[Oe(e,n,"name"),...t?[Oe(e,n,"indexed")]:[],Oe(e,n,"type"),{headerName:Ce("components"),sortable:!0,editable:!1,cellStyle:wt("center"),columnGroupShow:"open",valueGetter:l=>{const r=it(l,e,n);return r?JSON.stringify(r):se},cellRenderer:An((l,r)=>{const a=it(r,e,n);a?new $t({target:l.eGui,props:{dialogHeaderText:Ce(s),components:a}}):new wn({target:l.eGui,props:{text:se,textSize:he.grid}})})}];function it(e,t,s){const i=Ct(e,t)[s];return Pe(i)}function Pe(e){if(e){if(e.components!==null)return e.components;if(e.arrayChildren!==null)return Pe(e.arrayChildren)}}function at(e){let t,s;return t=new ue({props:{text:e[0].indexed?"true":"false",align:"center",textSize:e[4]}}),{c(){R(t.$$.fragment)},l(n){I(t.$$.fragment,n)},m(n,i){A(t,n,i),s=!0},p(n,i){const l={};i&1&&(l.text=n[0].indexed?"true":"false"),t.$set(l)},i(n){s||(j(t.$$.fragment,n),s=!0)},o(n){T(t.$$.fragment,n),s=!1},d(n){$(t,n)}}}function Qs(e){let t,s;return t=new ue({props:{text:se,align:"center",textSize:e[4]}}),{c(){R(t.$$.fragment)},l(n){I(t.$$.fragment,n)},m(n,i){A(t,n,i),s=!0},p:$e,i(n){s||(j(t.$$.fragment,n),s=!0)},o(n){T(t.$$.fragment,n),s=!1},d(n){$(t,n)}}}function er(e){let t,s;return t=new ue({props:{align:"center",textSize:e[4],$$slots:{default:[tr]},$$scope:{ctx:e}}}),{c(){R(t.$$.fragment)},l(n){I(t.$$.fragment,n)},m(n,i){A(t,n,i),s=!0},p(n,i){const l={};i&66&&(l.$$scope={dirty:i,ctx:n}),t.$set(l)},i(n){s||(j(t.$$.fragment,n),s=!0)},o(n){T(t.$$.fragment,n),s=!1},d(n){$(t,n)}}}function tr(e){let t,s;return t=new $t({props:{dialogHeaderText:e[1],components:e[5]}}),{c(){R(t.$$.fragment)},l(n){I(t.$$.fragment,n)},m(n,i){A(t,n,i),s=!0},p(n,i){const l={};i&2&&(l.dialogHeaderText=n[1]),t.$set(l)},i(n){s||(j(t.$$.fragment,n),s=!0)},o(n){T(t.$$.fragment,n),s=!1},d(n){$(t,n)}}}function nr(e){let t,s,n,i,l,r,a,o,u,m,S;t=new Tn({props:{rowIndex:e[3],textSize:e[4],colorCategoryBorder:Et.itemMemberTableBorder}}),n=new ue({props:{text:e[0].name?e[0].name:se,align:"left",textSize:e[4]}}),l=new ue({props:{text:e[0].type,align:"center",textSize:e[4]}});let E=e[2]&&at(e);const ie=[er,Qs],ae=[];function oe(d,N){return d[5]?0:1}return o=oe(e),u=ae[o]=ie[o](e),{c(){R(t.$$.fragment),s=K(),R(n.$$.fragment),i=K(),R(l.$$.fragment),r=K(),E&&E.c(),a=K(),u.c(),m=z()},l(d){I(t.$$.fragment,d),s=q(d),I(n.$$.fragment,d),i=q(d),I(l.$$.fragment,d),r=q(d),E&&E.l(d),a=q(d),u.l(d),m=z()},m(d,N){A(t,d,N),D(d,s,N),A(n,d,N),D(d,i,N),A(l,d,N),D(d,r,N),E&&E.m(d,N),D(d,a,N),ae[o].m(d,N),D(d,m,N),S=!0},p(d,N){const de={};N&8&&(de.rowIndex=d[3]),t.$set(de);const le={};N&1&&(le.text=d[0].name?d[0].name:se),n.$set(le);const W={};N&1&&(W.text=d[0].type),l.$set(W),d[2]?E?(E.p(d,N),N&4&&j(E,1)):(E=at(d),E.c(),j(E,1),E.m(a.parentNode,a)):E&&(bt(),T(E,1,1,()=>{E=null}),mt()),u.p(d,N)},i(d){S||(j(t.$$.fragment,d),j(n.$$.fragment,d),j(l.$$.fragment,d),j(E),j(u),S=!0)},o(d){T(t.$$.fragment,d),T(n.$$.fragment,d),T(l.$$.fragment,d),T(E),T(u),S=!1},d(d){d&&(O(s),O(i),O(r),O(a),O(m)),$(t,d),$(n,d),$(l,d),E&&E.d(d),ae[o].d(d)}}}function sr(e){let t,s;return t=new xn({props:{$$slots:{default:[nr]},$$scope:{ctx:e}}}),{c(){R(t.$$.fragment)},l(n){I(t.$$.fragment,n)},m(n,i){A(t,n,i),s=!0},p(n,[i]){const l={};i&79&&(l.$$scope={dirty:i,ctx:n}),t.$set(l)},i(n){s||(j(t.$$.fragment,n),s=!0)},o(n){T(t.$$.fragment,n),s=!1},d(n){$(t,n)}}}function rr(e,t,s){let{paramType:n}=t,{dialogHeaderText:i}=t,{showInputIndexedField:l}=t,{rowIndex:r}=t;const a=he.abiParamsTable,o=Pe(n);return e.$$set=u=>{"paramType"in u&&s(0,n=u.paramType),"dialogHeaderText"in u&&s(1,i=u.dialogHeaderText),"showInputIndexedField"in u&&s(2,l=u.showInputIndexedField),"rowIndex"in u&&s(3,r=u.rowIndex)},[n,i,l,r,a,o]}class ir extends Y{constructor(t){super(),Z(this,t,rr,sr,V,{paramType:0,dialogHeaderText:1,showInputIndexedField:2,rowIndex:3})}}function ot(e,t,s){const n=e.slice();return n[5]=t[s],n[7]=s,n}function lt(e){let t,s;return t=new ir({props:{paramType:e[5],dialogHeaderText:e[1],showInputIndexedField:e[2],rowIndex:e[7]}}),{c(){R(t.$$.fragment)},l(n){I(t.$$.fragment,n)},m(n,i){A(t,n,i),s=!0},p(n,i){const l={};i&1&&(l.paramType=n[5]),i&2&&(l.dialogHeaderText=n[1]),i&4&&(l.showInputIndexedField=n[2]),t.$set(l)},i(n){s||(j(t.$$.fragment,n),s=!0)},o(n){T(t.$$.fragment,n),s=!1},d(n){$(t,n)}}}function ar(e){let t,s,n=Je(e[0]),i=[];for(let r=0;r<n.length;r+=1)i[r]=lt(ot(e,n,r));const l=r=>T(i[r],1,1,()=>{i[r]=null});return{c(){for(let r=0;r<i.length;r+=1)i[r].c();t=z()},l(r){for(let a=0;a<i.length;a+=1)i[a].l(r);t=z()},m(r,a){for(let o=0;o<i.length;o+=1)i[o]&&i[o].m(r,a);D(r,t,a),s=!0},p(r,a){if(a&7){n=Je(r[0]);let o;for(o=0;o<n.length;o+=1){const u=ot(r,n,o);i[o]?(i[o].p(u,a),j(i[o],1)):(i[o]=lt(u),i[o].c(),j(i[o],1),i[o].m(t.parentNode,t))}for(bt(),o=n.length;o<i.length;o+=1)l(o);mt()}},i(r){if(!s){for(let a=0;a<n.length;a+=1)j(i[a]);s=!0}},o(r){i=i.filter(Boolean);for(let a=0;a<i.length;a+=1)T(i[a]);s=!1},d(r){r&&O(t),cn(i,r)}}}function or(e){let t,s;return t=new Sn({props:{tableHeaderCellProps:e[4](),textSize:e[3],numOfTableRows:e[0].length,$$slots:{tableBody:[ar]},$$scope:{ctx:e}}}),{c(){R(t.$$.fragment)},l(n){I(t.$$.fragment,n)},m(n,i){A(t,n,i),s=!0},p(n,[i]){const l={};i&1&&(l.numOfTableRows=n[0].length),i&263&&(l.$$scope={dirty:i,ctx:n}),t.$set(l)},i(n){s||(j(t.$$.fragment,n),s=!0)},o(n){T(t.$$.fragment,n),s=!1},d(n){$(t,n)}}}function lr(e,t,s){let{paramTypes:n}=t,{dialogHeaderText:i}=t,{showInputIndexedField:l}=t;const r=he.abiParamsTable,a=()=>{let o=[{text:"Name",align:"left",textSize:r},{text:"Type",align:"center",textSize:r},{text:"Indexed",align:"center",textSize:r},{text:"Components",align:"center",textSize:r}];return l||o.splice(2,1),o};return e.$$set=o=>{"paramTypes"in o&&s(0,n=o.paramTypes),"dialogHeaderText"in o&&s(1,i=o.dialogHeaderText),"showInputIndexedField"in o&&s(2,l=o.showInputIndexedField)},[n,i,l,r,a]}class jr extends Y{constructor(t){super(),Z(this,t,lr,or,V,{paramTypes:0,dialogHeaderText:1,showInputIndexedField:2})}}export{jr as A,Xs as B,Er as E,_r as P,An as a,Ct as b,wt as c,yr as d,wr as g};
