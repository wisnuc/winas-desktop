(function(window){var svgSprite='<svg><symbol id="icon-menu" viewBox="0 0 1024 1024"><path d="M128 768h256v-85.333333H128v85.333333zM128 256v85.333333h768V256H128z m0 298.666667h512v-85.333334H128v85.333334z" fill="" ></path></symbol><symbol id="icon-window-close" viewBox="0 0 1024 1024"><path d="M810.666667 273.493333L750.506667 213.333333 512 451.84 273.493333 213.333333 213.333333 273.493333 451.84 512 213.333333 750.506667 273.493333 810.666667 512 572.16 750.506667 810.666667 810.666667 750.506667 572.16 512z" fill="" ></path></symbol><symbol id="icon-window-full" viewBox="0 0 1024 1024"><path d="M810.666667 128H213.333333c-46.933333 0-85.333333 38.4-85.333333 85.333333v597.333334c0 46.933333 38.4 85.333333 85.333333 85.333333h597.333334c46.933333 0 85.333333-38.4 85.333333-85.333333V213.333333c0-46.933333-38.4-85.333333-85.333333-85.333333z m0 682.666667H213.333333V213.333333h597.333334v597.333334z" fill="" ></path></symbol><symbol id="icon-window-normal" viewBox="0 0 1024 1024"><path d="M810.666667 256H213.333333c-46.933333 0-85.333333 38.4-85.333333 85.333333v341.333334c0 46.933333 38.4 85.333333 85.333333 85.333333h597.333334c46.933333 0 85.333333-38.4 85.333333-85.333333V341.333333c0-46.933333-38.4-85.333333-85.333333-85.333333z m0 426.666667H213.333333V341.333333h597.333334v341.333334z" fill="" ></path></symbol><symbol id="icon-window-mini" viewBox="0 0 1024 1024"><path d="M810.666667 554.666667H213.333333v-85.333334h597.333334v85.333334z" fill="" ></path></symbol><symbol id="icon-logo" viewBox="0 0 1024 1024"><path d="M512 0C758.675064 0 958.638298 195.082894 958.638298 435.744681s-199.963234 435.744681-446.638298 435.744681S65.361702 676.406468 65.361702 435.744681 265.324936 0 512 0z" fill="#00695C" ></path><path d="M409.425702 1004.260766c0.152511-5.337872 0.021787-10.653957 0.021787-15.534298l-0.326808-23.050894c0-34.728851 1.481532-69.23983-0.283234-103.598297-4.836766-94.229787-13.333787-187.609872-52.420085-275.978894-17.865532-40.437106-31.242894-83.249021-42.22366-126.104511-20.436426-79.610553-4.313872-157.042383 26.711149-230.617872 17.625872-41.809702 62.725447-43.770553 91.441021-8.693106 3.420596 4.161362 13.420936 18.845957 15.20749 21.678297 18.606298 29.630638 49.304511 35.317106 83.161872 35.033873 7.778043-0.065362 10.436085 0.043574 23.31234 0.130723 30.109957 0.196085 50.589957-8.954553 65.427064-33.879149 4.684255-7.865191 10.915404-14.989617 17.190128-21.765447 17.560511-18.867745 57.452936-23.79166 73.706213 10.218213 25.99217 54.359149 28.192681 110.374128 16.253276 168.066724-8.998128 43.530894-19.172766 87.083574-7.625532 131.769191 6.078638 23.552 18.998468 41.526468 42.201873 51.548596 102.094979 44.053787 149.700085 128.130723 172.249872 230.443574 3.115574 14.205277 14.183489 79.436255 18.519149 183.557447" fill="#FFFFFF" ></path></symbol><symbol id="icon-arrow-down" viewBox="0 0 1024 1024"><path d="M298.666667 426.666667l213.333333 213.333333 213.333333-213.333333z" fill="" ></path></symbol><symbol id="icon-backup" viewBox="0 0 1024 1024"><path d="M170.666667 256h768V170.666667H170.666667c-46.933333 0-85.333333 38.4-85.333334 85.333333v469.333333H0v128h597.333333v-128H170.666667V256z m810.666666 85.333333h-256c-23.466667 0-42.666667 19.2-42.666666 42.666667v426.666667c0 23.466667 19.2 42.666667 42.666666 42.666666h256c23.466667 0 42.666667-19.2 42.666667-42.666666V384c0-23.466667-19.2-42.666667-42.666667-42.666667z m-42.666666 384h-170.666667v-298.666666h170.666667v298.666666z" fill="" ></path></symbol><symbol id="icon-share-selected" viewBox="0 0 1024 1024"><path d="M853.333333 256h-341.333333l-85.333333-85.333333H170.666667c-46.933333 0-84.906667 38.4-84.906667 85.333333L85.333333 768c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V341.333333c0-46.933333-38.4-85.333333-85.333334-85.333333z m-213.333333 128c46.933333 0 85.333333 38.4 85.333333 85.333333s-38.4 85.333333-85.333333 85.333334-85.333333-38.4-85.333333-85.333334 38.4-85.333333 85.333333-85.333333z m170.666667 341.333333h-341.333334v-42.666666c0-56.746667 113.92-85.333333 170.666667-85.333334s170.666667 28.586667 170.666667 85.333334v42.666666z" fill="" ></path></symbol><symbol id="icon-transfer" viewBox="0 0 1024 1024"><path d="M682.666667 725.76V426.666667h-85.333334v299.093333h-128L640 896l170.666667-170.24h-128zM384 128L213.333333 298.24h128V597.333333h85.333334V298.24h128L384 128z" fill="" ></path></symbol><symbol id="icon-search" viewBox="0 0 1024 1024"><path d="M661.333333 597.333333h-33.706666l-11.946667-11.52A276.096 276.096 0 0 0 682.666667 405.333333 277.333333 277.333333 0 1 0 405.333333 682.666667c68.693333 0 131.84-25.173333 180.48-66.986667l11.52 11.946667v33.706666l213.333334 212.906667L874.24 810.666667l-212.906667-213.333334z m-256 0C299.093333 597.333333 213.333333 511.573333 213.333333 405.333333S299.093333 213.333333 405.333333 213.333333 597.333333 299.093333 597.333333 405.333333 511.573333 597.333333 405.333333 597.333333z" fill="" ></path></symbol><symbol id="icon-account" viewBox="0 0 1024 1024"><path d="M511.93604 1024C229.449972 1024 0.159956 794.646008 0.159956 512.063976 0.159956 229.481944 229.449972 0.127952 511.93604 0.127952c282.518056 0 511.808072 229.353992 511.808072 511.936024 0 282.582032-229.290016 511.936024-511.808072 511.936024z m0-102.393602c95.196301 0 182.715482-32.755717 252.321379-88.062977-21.495939-46.062726-156.101462-91.101837-252.321379-91.101837S281.654396 787.480695 259.646649 833.543421A403.624641 403.624641 0 0 0 511.93604 921.606398z m0-819.084844C286.260668 102.521554 102.52157 286.29264 102.52157 512.063976c0 93.181057 31.7321 178.653005 83.936524 247.267275 73.188554-89.086593 250.753967-119.283269 325.477946-119.283269 74.723979 0 252.321379 30.196676 325.509934 119.283269A407.079345 407.079345 0 0 0 921.382498 512.063976c0-225.771336-183.739098-409.542422-409.446458-409.542422zM511.93604 563.244783a178.684993 178.684993 0 0 1-179.132825-179.164813A178.716981 178.716981 0 0 1 511.93604 204.883169c99.290766 0 179.132825 79.874047 179.132825 179.196801A178.684993 178.684993 0 0 1 511.93604 563.244783z m0-255.968012a76.707235 76.707235 0 0 0-76.771211 76.803199c0 42.48007 34.291141 76.771211 76.771211 76.771211 42.48007 0 76.771211-34.291141 76.771211-76.771211A76.707235 76.707235 0 0 0 511.93604 307.276771z" fill="#607D8B" ></path></symbol><symbol id="icon-share" viewBox="0 0 1024 1024"><path d="M853.333333 256h-341.333333l-85.333333-85.333333H170.666667c-46.933333 0-84.906667 38.4-84.906667 85.333333L85.333333 768c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V341.333333c0-46.933333-38.4-85.333333-85.333334-85.333333z m0 512H170.666667V256h220.586666l85.333334 85.333333H853.333333v426.666667z m-213.333333-213.333333c46.933333 0 85.333333-38.4 85.333333-85.333334s-38.4-85.333333-85.333333-85.333333-85.333333 38.4-85.333333 85.333333 38.4 85.333333 85.333333 85.333334z m-170.666667 170.666666h341.333334v-42.666666c0-56.746667-113.92-85.333333-170.666667-85.333334s-170.666667 28.586667-170.666667 85.333334v42.666666z" fill="" ></path></symbol><symbol id="icon-folder-outline" viewBox="0 0 1024 1024"><path d="M391.253333 256l85.333334 85.333333H853.333333v426.666667H170.666667V256h220.586666M426.666667 170.666667H170.666667c-46.933333 0-84.906667 38.4-84.906667 85.333333L85.333333 768c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V341.333333c0-46.933333-38.4-85.333333-85.333334-85.333333h-341.333333l-85.333333-85.333333z" fill="" ></path></symbol><symbol id="icon-add" viewBox="0 0 1353 1024"><path d="M585.142857 395.366795h-189.776062v189.776062h-63.258687v-189.776062h-189.776062v-63.258687h189.776062v-189.776062h63.258687v189.776062h189.776062v63.258687z" fill="#00695C" ></path></symbol><symbol id="icon-album" viewBox="0 0 1024 1024"><path d="M853.333333 170.666667v512H341.333333V170.666667h512m0-85.333334H341.333333c-46.933333 0-85.333333 38.4-85.333333 85.333334v512c0 46.933333 38.4 85.333333 85.333333 85.333333h512c46.933333 0 85.333333-38.4 85.333334-85.333333V170.666667c0-46.933333-38.4-85.333333-85.333334-85.333334z m-362.666666 412.586667l72.106666 96.426667 105.813334-132.266667L810.666667 640H384zM85.333333 256v597.333333c0 46.933333 38.4 85.333333 85.333334 85.333334h597.333333v-85.333334H170.666667V256H85.333333z" fill="" ></path></symbol><symbol id="icon-device" viewBox="0 0 1024 1024"><path d="M682.666667 179.2c64 0 128 25.6 179.2 72.533333l34.133333-34.133333C836.266667 157.866667 759.466667 128 682.666667 128s-153.6 29.866667-213.333334 89.6l34.133334 34.133333C554.666667 204.8 618.666667 179.2 682.666667 179.2z m-140.8 106.666667l34.133333 34.133333c29.866667-29.866667 68.266667-42.666667 106.666667-42.666667s76.8 12.8 106.666666 42.666667l34.133334-34.133333c-38.4-38.4-89.6-59.733333-140.8-59.733334s-102.4 21.333333-140.8 59.733334zM810.666667 554.666667h-85.333334V384h-85.333333v170.666667H213.333333c-46.933333 0-85.333333 38.4-85.333333 85.333333v170.666667c0 46.933333 38.4 85.333333 85.333333 85.333333h597.333334c46.933333 0 85.333333-38.4 85.333333-85.333333v-170.666667c0-46.933333-38.4-85.333333-85.333333-85.333333z m0 256H213.333333v-170.666667h597.333334v170.666667zM256 682.666667h85.333333v85.333333H256z m149.333333 0h85.333334v85.333333h-85.333334z m149.333334 0h85.333333v85.333333h-85.333333z" fill="" ></path></symbol><symbol id="icon-folder" viewBox="0 0 1024 1024"><path d="M426.666667 170.666667H170.666667c-46.933333 0-84.906667 38.4-84.906667 85.333333L85.333333 768c0 46.933333 38.4 85.333333 85.333334 85.333333h682.666666c46.933333 0 85.333333-38.4 85.333334-85.333333V341.333333c0-46.933333-38.4-85.333333-85.333334-85.333333h-341.333333l-85.333333-85.333333z" fill="" ></path></symbol><symbol id="icon-album-selected" viewBox="0 0 1024 1024"><path d="M938.666667 682.666667V170.666667c0-46.933333-38.4-85.333333-85.333334-85.333334H341.333333c-46.933333 0-85.333333 38.4-85.333333 85.333334v512c0 46.933333 38.4 85.333333 85.333333 85.333333h512c46.933333 0 85.333333-38.4 85.333334-85.333333z m-469.333334-170.666667l86.613334 115.626667L682.666667 469.333333l170.666666 213.333334H341.333333l128-170.666667zM85.333333 256v597.333333c0 46.933333 38.4 85.333333 85.333334 85.333334h597.333333v-85.333334H170.666667V256H85.333333z" fill="" ></path></symbol></svg>';var script=function(){var scripts=document.getElementsByTagName("script");return scripts[scripts.length-1]}();var shouldInjectCss=script.getAttribute("data-injectcss");var ready=function(fn){if(document.addEventListener){if(~["complete","loaded","interactive"].indexOf(document.readyState)){setTimeout(fn,0)}else{var loadFn=function(){document.removeEventListener("DOMContentLoaded",loadFn,false);fn()};document.addEventListener("DOMContentLoaded",loadFn,false)}}else if(document.attachEvent){IEContentLoaded(window,fn)}function IEContentLoaded(w,fn){var d=w.document,done=false,init=function(){if(!done){done=true;fn()}};var polling=function(){try{d.documentElement.doScroll("left")}catch(e){setTimeout(polling,50);return}init()};polling();d.onreadystatechange=function(){if(d.readyState=="complete"){d.onreadystatechange=null;init()}}}};var before=function(el,target){target.parentNode.insertBefore(el,target)};var prepend=function(el,target){if(target.firstChild){before(el,target.firstChild)}else{target.appendChild(el)}};function appendSvg(){var div,svg;div=document.createElement("div");div.innerHTML=svgSprite;svgSprite=null;svg=div.getElementsByTagName("svg")[0];if(svg){svg.setAttribute("aria-hidden","true");svg.style.position="absolute";svg.style.width=0;svg.style.height=0;svg.style.overflow="hidden";prepend(svg,document.body)}}if(shouldInjectCss&&!window.__iconfont__svg__cssinject__){window.__iconfont__svg__cssinject__=true;try{document.write("<style>.svgfont {display: inline-block;width: 1em;height: 1em;fill: currentColor;vertical-align: -0.1em;font-size:16px;}</style>")}catch(e){console&&console.log(e)}}ready(appendSvg)})(window)