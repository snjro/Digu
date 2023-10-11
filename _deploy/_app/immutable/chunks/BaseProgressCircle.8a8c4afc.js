import{s as H,f as A,a as x,g as E,h as I,d as k,c as U,j as f,i as O,u as j,e as oe,P as X,Q as Z,w as he}from"./scheduler.d16bdadc.js";import{S as Q,i as G,b as T,d as W,m as L,g as te,t as z,c as se,a as v,e as B}from"./index.4f66e2f2.js";import{d as y,N as _e,c as re,r as $,g as ee,a as Se}from"./BaseButton.411e578b.js";import{s as be}from"./storeUserSettings.8972ff17.js";import{e as fe,a as ve}from"./progressRate.711e9bab.js";import{C as pe}from"./CommonChainExplorerLink.1e9a8ae0.js";import{B as le}from"./stores.c7401bf1.js";import{C as ze}from"./CommonSyncStateText.465c22ad.js";function de(s){let e,r;return e=new pe({props:{subdirectory:"block",value:s[1].toString(),textSize:s[2],showCopyButton:!1}}),{c(){T(e.$$.fragment)},l(t){W(e.$$.fragment,t)},m(t,l){L(e,t,l),r=!0},p(t,l){const a={};l&2&&(a.value=t[1].toString()),l&4&&(a.textSize=t[2]),e.$set(a)},i(t){r||(v(e.$$.fragment,t),r=!0)},o(t){z(e.$$.fragment,t),r=!1},d(t){B(e,t)}}}function ke(s){let e,r;return e=new le({props:{textSize:s[2],text:_e}}),{c(){T(e.$$.fragment)},l(t){W(e.$$.fragment,t)},m(t,l){L(e,t,l),r=!0},p(t,l){const a={};l&4&&(a.textSize=t[2]),e.$set(a)},i(t){r||(v(e.$$.fragment,t),r=!0)},o(t){z(e.$$.fragment,t),r=!1},d(t){B(e,t)}}}function we(s){let e,r,t,l,a,i,n,h,u;t=new le({props:{text:s[0],textSize:s[2]}});const _=[ke,de],S=[];function C(g,m){return g[1]===0?0:1}return i=C(s),n=S[i]=_[i](s),{c(){e=A("div"),r=A("div"),T(t.$$.fragment),l=x(),a=A("div"),n.c(),this.h()},l(g){e=E(g,"DIV",{class:!0});var m=I(e);r=E(m,"DIV",{});var d=I(r);W(t.$$.fragment,d),d.forEach(k),l=U(m),a=E(m,"DIV",{class:!0});var P=I(a);n.l(P),P.forEach(k),m.forEach(k),this.h()},h(){f(a,"class",h=y(s[1]===0&&"w-full flex justify-center")),f(e,"class",y("flex","flex-row","justify-between","space-x-3","w-full",""))},m(g,m){O(g,e,m),j(e,r),L(t,r,null),j(e,l),j(e,a),S[i].m(a,null),u=!0},p(g,[m]){const d={};m&1&&(d.text=g[0]),m&4&&(d.textSize=g[2]),t.$set(d);let P=i;i=C(g),i===P?S[i].p(g,m):(te(),z(S[P],1,1,()=>{S[P]=null}),se(),n=S[i],n?n.p(g,m):(n=S[i]=_[i](g),n.c()),v(n,1),n.m(a,null)),(!u||m&2&&h!==(h=y(g[1]===0&&"w-full flex justify-center")))&&f(a,"class",h)},i(g){u||(v(t.$$.fragment,g),v(n),u=!0)},o(g){z(t.$$.fragment,g),z(n),u=!1},d(g){g&&k(e),B(t),S[i].d()}}}function Ve(s,e,r){let{title:t}=e,{value:l}=e,{textSize:a}=e;return s.$$set=i=>{"title"in i&&r(0,t=i.title),"value"in i&&r(1,l=i.value),"textSize"in i&&r(2,a=i.textSize)},[t,l,a]}class ie extends Q{constructor(e){super(),G(this,e,Ve,we,H,{title:0,value:1,textSize:2})}}function Pe(s){let e,r,t,l,a,i,n,h;return r=new ie({props:{title:"start",value:s[0],textSize:s[3]}}),l=new ie({props:{title:s[4]?"current":"curr",value:s[1],textSize:s[3]}}),i=new ie({props:{title:"goal",value:s[2],textSize:s[3]}}),{c(){e=A("div"),T(r.$$.fragment),t=x(),T(l.$$.fragment),a=x(),T(i.$$.fragment),this.h()},l(u){e=E(u,"DIV",{class:!0});var _=I(e);W(r.$$.fragment,_),t=U(_),W(l.$$.fragment,_),a=U(_),W(i.$$.fragment,_),_.forEach(k),this.h()},h(){f(e,"class",n=y("flex","flex-col",s[5][s[3]],""))},m(u,_){O(u,e,_),L(r,e,null),j(e,t),L(l,e,null),j(e,a),L(i,e,null),h=!0},p(u,[_]){const S={};_&1&&(S.value=u[0]),_&8&&(S.textSize=u[3]),r.$set(S);const C={};_&16&&(C.title=u[4]?"current":"curr"),_&2&&(C.value=u[1]),_&8&&(C.textSize=u[3]),l.$set(C);const g={};_&4&&(g.value=u[2]),_&8&&(g.textSize=u[3]),i.$set(g),(!h||_&8&&n!==(n=y("flex","flex-col",u[5][u[3]],"")))&&f(e,"class",n)},i(u){h||(v(r.$$.fragment,u),v(l.$$.fragment,u),v(i.$$.fragment,u),h=!0)},o(u){z(r.$$.fragment,u),z(l.$$.fragment,u),z(i.$$.fragment,u),h=!1},d(u){u&&k(e),B(r),B(l),B(i)}}}function ye(s,e,r){let{startValue:t}=e,{currentValue:l}=e,{goalValue:a}=e,{textSize:i}=e,{fullLength:n}=e;const h={xs:"px-2",sm:"px-3",md:"px-4",lg:"px-5",xl:"px-6","2xl":"px-7","3xl":"px-8","4xl":"px-9","5xl":"px-10"};return s.$$set=u=>{"startValue"in u&&r(0,t=u.startValue),"currentValue"in u&&r(1,l=u.currentValue),"goalValue"in u&&r(2,a=u.goalValue),"textSize"in u&&r(3,i=u.textSize),"fullLength"in u&&r(4,n=u.fullLength)},[t,l,a,i,n,h]}class me extends Q{constructor(e){super(),G(this,e,ye,Pe,H,{startValue:0,currentValue:1,goalValue:2,textSize:3,fullLength:4})}}function Ce(s){let e,r,t,l,a;return r=new le({props:{text:fe(s[0]),textSize:s[1],truncate:!1,colorCategoryFront:"primary",fontMono:!0,appendClass:s[2]}}),l=new le({props:{text:"%",textSize:re(s[1],-3),appendClass:s[2],fontMono:!0}}),{c(){e=A("div"),T(r.$$.fragment),t=x(),T(l.$$.fragment),this.h()},l(i){e=E(i,"DIV",{class:!0});var n=I(e);W(r.$$.fragment,n),t=U(n),W(l.$$.fragment,n),n.forEach(k),this.h()},h(){f(e,"class",y("flex","flex-row","w-full","justify-center","items-end","space-x-0.5"))},m(i,n){O(i,e,n),L(r,e,null),j(e,t),L(l,e,null),a=!0},p(i,[n]){const h={};n&1&&(h.text=fe(i[0])),n&2&&(h.textSize=i[1]),n&4&&(h.appendClass=i[2]),r.$set(h);const u={};n&2&&(u.textSize=re(i[1],-3)),n&4&&(u.appendClass=i[2]),l.$set(u)},i(i){a||(v(r.$$.fragment,i),v(l.$$.fragment,i),a=!0)},o(i){z(r.$$.fragment,i),z(l.$$.fragment,i),a=!1},d(i){i&&k(e),B(r),B(l)}}}function Te(s,e,r){let{progressRate:t}=e,{textSize:l}=e,{isAnimatePulse:a}=e,i;return s.$$set=n=>{"progressRate"in n&&r(0,t=n.progressRate),"textSize"in n&&r(1,l=n.textSize),"isAnimatePulse"in n&&r(3,a=n.isAnimatePulse)},s.$$.update=()=>{s.$$.dirty&8&&r(2,i=a?"animate-pulse":void 0)},[t,l,i,a]}class We extends Q{constructor(e){super(),G(this,e,Te,Ce,H,{progressRate:0,textSize:1,isAnimatePulse:3})}}function ue(s){let e,r,t;return r=new ze({props:{showIcon:s[0].showIcon,colorCategoryFront:s[0].colorCategoryFront,size:s[0].size,syncStateText:s[0].syncStateText}}),{c(){e=A("div"),T(r.$$.fragment),this.h()},l(l){e=E(l,"DIV",{class:!0});var a=I(e);W(r.$$.fragment,a),a.forEach(k),this.h()},h(){f(e,"class",y("w-full","flex","justify-center",""))},m(l,a){O(l,e,a),L(r,e,null),t=!0},p(l,a){const i={};a&1&&(i.showIcon=l[0].showIcon),a&1&&(i.colorCategoryFront=l[0].colorCategoryFront),a&1&&(i.size=l[0].size),a&1&&(i.syncStateText=l[0].syncStateText),r.$set(i)},i(l){t||(v(r.$$.fragment,l),t=!0)},o(l){z(r.$$.fragment,l),t=!1},d(l){l&&k(e),B(r)}}}function Le(s){let e,r,t=s[0]&&ue(s);return{c(){t&&t.c(),e=oe()},l(l){t&&t.l(l),e=oe()},m(l,a){t&&t.m(l,a),O(l,e,a),r=!0},p(l,[a]){l[0]?t?(t.p(l,a),a&1&&v(t,1)):(t=ue(l),t.c(),v(t,1),t.m(e.parentNode,e)):t&&(te(),z(t,1,1,()=>{t=null}),se())},i(l){r||(v(t),r=!0)},o(l){z(t),r=!1},d(l){l&&k(e),t&&t.d(l)}}}function Be(s,e,r){let{syncStateTextLabelProps:t=void 0}=e;return s.$$set=l=>{"syncStateTextLabelProps"in l&&r(0,t=l.syncStateTextLabelProps)},[t]}class je extends Q{constructor(e){super(),G(this,e,Be,Le,H,{syncStateTextLabelProps:0})}}function Ie(s){let e,r,t,l;return e=new We({props:{progressRate:s[0],textSize:s[1],isAnimatePulse:s[3]}}),t=new je({props:{syncStateTextLabelProps:s[2]}}),{c(){T(e.$$.fragment),r=x(),T(t.$$.fragment)},l(a){W(e.$$.fragment,a),r=U(a),W(t.$$.fragment,a)},m(a,i){L(e,a,i),O(a,r,i),L(t,a,i),l=!0},p(a,[i]){const n={};i&1&&(n.progressRate=a[0]),i&2&&(n.textSize=a[1]),i&8&&(n.isAnimatePulse=a[3]),e.$set(n);const h={};i&4&&(h.syncStateTextLabelProps=a[2]),t.$set(h)},i(a){l||(v(e.$$.fragment,a),v(t.$$.fragment,a),l=!0)},o(a){z(e.$$.fragment,a),z(t.$$.fragment,a),l=!1},d(a){a&&k(r),B(e,a),B(t,a)}}}function Re(s,e,r){let{progressRate:t}=e,{percentageSize:l}=e,{syncStateTextLabelProps:a}=e,{isAnimatePulse:i}=e;return s.$$set=n=>{"progressRate"in n&&r(0,t=n.progressRate),"percentageSize"in n&&r(1,l=n.percentageSize),"syncStateTextLabelProps"in n&&r(2,a=n.syncStateTextLabelProps),"isAnimatePulse"in n&&r(3,i=n.isAnimatePulse)},[t,l,a,i]}class Ae extends Q{constructor(e){super(),G(this,e,Re,Ie,H,{progressRate:0,percentageSize:1,syncStateTextLabelProps:2,isAnimatePulse:3})}}function ce(s){let e,r,t;return r=new me({props:{startValue:s[0],currentValue:s[2],goalValue:s[1],textSize:s[3],fullLength:!1}}),{c(){e=A("div"),T(r.$$.fragment),this.h()},l(l){e=E(l,"DIV",{class:!0});var a=I(e);W(r.$$.fragment,a),a.forEach(k),this.h()},h(){f(e,"class",y("w-full","mx-1",""))},m(l,a){O(l,e,a),L(r,e,null),t=!0},p(l,a){const i={};a&1&&(i.startValue=l[0]),a&4&&(i.currentValue=l[2]),a&2&&(i.goalValue=l[1]),a&8&&(i.textSize=l[3]),r.$set(i)},i(l){t||(v(r.$$.fragment,l),t=!0)},o(l){z(r.$$.fragment,l),t=!1},d(l){l&&k(e),B(r)}}}function ge(s){let e,r;return e=new me({props:{startValue:s[0],currentValue:s[2],goalValue:s[1],textSize:s[4],fullLength:!0}}),{c(){T(e.$$.fragment)},l(t){W(e.$$.fragment,t)},m(t,l){L(e,t,l),r=!0},p(t,l){const a={};l&1&&(a.startValue=t[0]),l&4&&(a.currentValue=t[2]),l&2&&(a.goalValue=t[1]),l&16&&(a.textSize=t[4]),e.$set(a)},i(t){r||(v(e.$$.fragment,t),r=!0)},o(t){z(e.$$.fragment,t),r=!1},d(t){B(e,t)}}}function Ee(s){let e,r,t,l,a,i,n,h,u,_,S,C,g,m,d,P,q,D,F,Y,M,N,p,ae,J,b;P=new Ae({props:{progressRate:s[12],percentageSize:re(s[3],5),syncStateTextLabelProps:s[7],isAnimatePulse:s[13]}});let w=s[5]==="inner"&&ce(s),V=s[5]!=="inner"&&s[5]!=="none"&&ge(s);return{c(){e=A("div"),r=X("svg"),t=X("circle"),n=X("circle"),m=X("foreignObject"),d=A("div"),T(P.$$.fragment),q=x(),w&&w.c(),ae=x(),V&&V.c(),this.h()},l(o){e=E(o,"DIV",{class:!0});var c=I(e);r=Z(c,"svg",{viewBox:!0,xmlns:!0,class:!0});var R=I(r);t=Z(R,"circle",{r:!0,cx:!0,cy:!0,fill:!0,stroke:!0,"stroke-width":!0,class:!0}),I(t).forEach(k),n=Z(R,"circle",{r:!0,cx:!0,cy:!0,fill:!0,stroke:!0,"stroke-width":!0,"stroke-dasharray":!0,"stroke-dashoffset":!0,transform:!0,class:!0}),I(n).forEach(k),m=Z(R,"foreignObject",{x:!0,y:!0,width:!0,height:!0});var ne=I(m);d=E(ne,"DIV",{class:!0});var K=I(d);W(P.$$.fragment,K),q=U(K),w&&w.l(K),K.forEach(k),ne.forEach(k),R.forEach(k),ae=U(c),V&&V.l(c),c.forEach(k),this.h()},h(){f(t,"r",s[10]),f(t,"cx",s[9]),f(t,"cy",s[9]),f(t,"fill","transparent"),f(t,"stroke",l=$(ee[s[14]][s[6]].bg)),f(t,"stroke-width",a=s[8].strokeWidth),f(t,"class",i=y(s[16])),f(n,"r",s[10]),f(n,"cx",s[9]),f(n,"cy",s[9]),f(n,"fill","transparent"),f(n,"stroke",h=$(ee[s[14]][s[17]()].bg)),f(n,"stroke-width",u=s[8].strokeWidth),f(n,"stroke-dasharray",_=`${s[11]}px`),f(n,"stroke-dashoffset",S=`${s[15]}px`),f(n,"transform",C=`rotate(-90 ${s[9]} ${s[9]})`),f(n,"class",g=y(s[16])),f(d,"class",D=y("flex","flex-col","justify-center","h-full","w-full",s[8].gapY,"")),f(m,"x",F=s[8].strokeWidth),f(m,"y",Y=s[8].strokeWidth),f(m,"width",M=s[8].svgSize-s[8].strokeWidth*2),f(m,"height",N=s[8].svgSize-s[8].strokeWidth*2),f(r,"viewBox",p=`0 0 ${s[8].svgSize} ${s[8].svgSize}`),f(r,"xmlns","http://www.w3.org/2000/svg"),f(r,"class","max-w-[248px]"),f(e,"class",J=y("flex",s[5]==="right"&&"flex-row",s[5]==="left"&&"flex-row-reverse",s[5]==="bottom"&&"flex-col",s[5]==="top"&&"flex-col-reverse","items-center","justify-center",(s[5]==="right"||s[5]==="left")&&"space-x-3",(s[5]==="top"||s[5]==="bottom")&&"space-y-3","w-full","h-full",s[16],""))},m(o,c){O(o,e,c),j(e,r),j(r,t),j(r,n),j(r,m),j(m,d),L(P,d,null),j(d,q),w&&w.m(d,null),j(e,ae),V&&V.m(e,null),b=!0},p(o,[c]){(!b||c&1024)&&f(t,"r",o[10]),(!b||c&512)&&f(t,"cx",o[9]),(!b||c&512)&&f(t,"cy",o[9]),(!b||c&16448&&l!==(l=$(ee[o[14]][o[6]].bg)))&&f(t,"stroke",l),(!b||c&256&&a!==(a=o[8].strokeWidth))&&f(t,"stroke-width",a),(!b||c&65536&&i!==(i=y(o[16])))&&f(t,"class",i),(!b||c&1024)&&f(n,"r",o[10]),(!b||c&512)&&f(n,"cx",o[9]),(!b||c&512)&&f(n,"cy",o[9]),(!b||c&147456&&h!==(h=$(ee[o[14]][o[17]()].bg)))&&f(n,"stroke",h),(!b||c&256&&u!==(u=o[8].strokeWidth))&&f(n,"stroke-width",u),(!b||c&2048&&_!==(_=`${o[11]}px`))&&f(n,"stroke-dasharray",_),(!b||c&32768&&S!==(S=`${o[15]}px`))&&f(n,"stroke-dashoffset",S),(!b||c&512&&C!==(C=`rotate(-90 ${o[9]} ${o[9]})`))&&f(n,"transform",C),(!b||c&65536&&g!==(g=y(o[16])))&&f(n,"class",g);const R={};c&4096&&(R.progressRate=o[12]),c&8&&(R.percentageSize=re(o[3],5)),c&128&&(R.syncStateTextLabelProps=o[7]),c&8192&&(R.isAnimatePulse=o[13]),P.$set(R),o[5]==="inner"?w?(w.p(o,c),c&32&&v(w,1)):(w=ce(o),w.c(),v(w,1),w.m(d,null)):w&&(te(),z(w,1,1,()=>{w=null}),se()),(!b||c&256&&D!==(D=y("flex","flex-col","justify-center","h-full","w-full",o[8].gapY,"")))&&f(d,"class",D),(!b||c&256&&F!==(F=o[8].strokeWidth))&&f(m,"x",F),(!b||c&256&&Y!==(Y=o[8].strokeWidth))&&f(m,"y",Y),(!b||c&256&&M!==(M=o[8].svgSize-o[8].strokeWidth*2))&&f(m,"width",M),(!b||c&256&&N!==(N=o[8].svgSize-o[8].strokeWidth*2))&&f(m,"height",N),(!b||c&256&&p!==(p=`0 0 ${o[8].svgSize} ${o[8].svgSize}`))&&f(r,"viewBox",p),o[5]!=="inner"&&o[5]!=="none"?V?(V.p(o,c),c&32&&v(V,1)):(V=ge(o),V.c(),v(V,1),V.m(e,null)):V&&(te(),z(V,1,1,()=>{V=null}),se()),(!b||c&65568&&J!==(J=y("flex",o[5]==="right"&&"flex-row",o[5]==="left"&&"flex-row-reverse",o[5]==="bottom"&&"flex-col",o[5]==="top"&&"flex-col-reverse","items-center","justify-center",(o[5]==="right"||o[5]==="left")&&"space-x-3",(o[5]==="top"||o[5]==="bottom")&&"space-y-3","w-full","h-full",o[16],"")))&&f(e,"class",J)},i(o){b||(v(P.$$.fragment,o),v(w),v(V),b=!0)},o(o){z(P.$$.fragment,o),z(w),z(V),b=!1},d(o){o&&k(e),B(P),w&&w.d(),V&&V.d()}}}function De(s,e,r){let t;he(s,be,p=>r(18,t=p));let{startValue:l}=e,{goalValue:a}=e,{currentValue:i}=e,{circleSize:n}=e,{detailsTextSize:h=n}=e,{detailsPosition:u="inner"}=e,{colorCategoryCircleBg:_=Se.progressCircleBg}=e,{syncStateTextLabelProps:S=void 0}=e;const C={xs:{svgSize:75,strokeWidth:4,gapY:"gap-y-0"},sm:{svgSize:125,strokeWidth:8,gapY:"gap-y-0"},md:{svgSize:200,strokeWidth:12,gapY:"gap-y-0.5"},lg:{svgSize:250,strokeWidth:16,gapY:"gap-y-1.5"},xl:{svgSize:300,strokeWidth:20,gapY:"gap-y-1.5"},"2xl":{svgSize:350,strokeWidth:24,gapY:"gap-y-2"},"3xl":{svgSize:400,strokeWidth:28,gapY:"gap-y-2.5"},"4xl":{svgSize:450,strokeWidth:32,gapY:"gap-y-3"},"5xl":{svgSize:500,strokeWidth:38,gapY:"gap-y-3.5"}};let g,m,d,P,q,D,F,Y,M,N;return s.$$set=p=>{"startValue"in p&&r(0,l=p.startValue),"goalValue"in p&&r(1,a=p.goalValue),"currentValue"in p&&r(2,i=p.currentValue),"circleSize"in p&&r(3,n=p.circleSize),"detailsTextSize"in p&&r(4,h=p.detailsTextSize),"detailsPosition"in p&&r(5,u=p.detailsPosition),"colorCategoryCircleBg"in p&&r(6,_=p.colorCategoryCircleBg),"syncStateTextLabelProps"in p&&r(7,S=p.syncStateTextLabelProps)},s.$$.update=()=>{s.$$.dirty&8&&r(8,g=C[n]),s.$$.dirty&256&&r(9,m=g.svgSize/2),s.$$.dirty&768&&r(10,d=m-g.strokeWidth/2),s.$$.dirty&1024&&r(11,P=2*Math.PI*d),s.$$.dirty&262144&&r(14,q=t.themeColor),s.$$.dirty&7&&r(12,D=ve(l,a,i)),s.$$.dirty&6144&&r(15,F=P*(100-D)/100),s.$$.dirty&128&&r(13,Y=(S==null?void 0:S.syncStateText)==="stopping"),s.$$.dirty&8192&&r(16,M=Y?"animate-pulse":void 0),s.$$.dirty&128&&r(17,N=()=>{switch(S==null?void 0:S.syncStateText){case"syncing":return"success";case"stopping":return"secondary";default:return"interactive"}})},[l,a,i,n,h,u,_,S,g,m,d,P,D,Y,q,F,M,N,t]}class He extends Q{constructor(e){super(),G(this,e,De,Ee,H,{startValue:0,goalValue:1,currentValue:2,circleSize:3,detailsTextSize:4,detailsPosition:5,colorCategoryCircleBg:6,syncStateTextLabelProps:7})}}export{He as B,Ae as a};
