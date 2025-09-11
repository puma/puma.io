; 'use strict';

var t2GA;

if ( /github\.io/i.test(location.hostname) ) {
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','https://www.google-analytics.com/analytics.js','t2GA');
}

/*
if ('ontouchstart' in document.documentElement) {
  window.onerror = function (msg, url, lineNo, columnNo, error) {
      var string = msg.toLowerCase(),
          substring = "script error";

      if (/script error/i.test(string)) {
          alert('Script Error: See Browser Console for Detail');
      } else {
          var message =
              "Message: " + msg    +   "\nURL: "  + url +
              "\nLine: "  + lineNo + "\nColumn: " + columnNo +
              "\nError object: "   + JSON.stringify(error);
          alert(message);
      }
      return false;
  };
};
*/

/* This is an immediate function that wraps everything.  It initializes all of
 * the app constants and variables, and hooks window.onDOMContentLoaded to
 * {eDOMContent}. Inside of it the Panes module is defined, also an immediate
 * function.
 *
 * Many functions accept a content parameter.  On first load, this is the main
 * document div#content element.  After that, the parameter is the div#content
 * element in the documentFragment from the XHR request.  This is done so that
 * all document modifications / additions are done **before** the element
 * replaces the document element.  Simply put, faster rendering.
 * @js_module_new App
 */
(function(_t2Info, undefined) {

var t2GAInit = false;

if (t2GA instanceof Function) {
  t2GA( 'create', 'UA-79746991-1', 'auto');
  t2GA( 'set', 'anonymizeIp', true);
  t2GAInit = true;
};

//{ Constants

/*### Constants */
var ST_VERS = '0.6.0',  // state version (local storage object)
    VERSION = '0.7.0';

/*#### Window Metrics */
var SML_MED = 110  ,    // char width 0 to 1 type
    MED_LRG = 160  ,    // char width 1 to 2 type
    ZOOM    =  95.0,    // char width for touch device zoom
    FS      =  15.0;    // default fontSize px30em

/*#### Size Metrics */
var  FLT_TOP =  4.4,      // Top of Floating Pane    em
     FLT_HGT =  4.8;      // Top + bottom (0.4 em)   em
     WAIT_NO_TOUCH = 6.0  // Wait indicator          em
     WAIT_TOUCH    = 9.0  // Wait indicator          em

/*#### CSS Class Names */
var CN_CLICKED = 'clicked', // used for 'clicked' highlight
    CN_HIDDEN  = 'h',       // used with summaries, lists, & header buttons
    CN_VISIBLE = 'o',
    CN_WAIT    = 'w',       // shows wait cursor
    CN_BTN_VIS  = 'vis';    // Used with button elements

/*#### Text Strings */
var T_VIEW_SRC = 'view source',
    T_HIDE_SRC = 'hide source';

/*#### clickedBy enumeration */
var CB_CONTENT   = 0,
    CB_OBJ_PATH  = 1,
    CB_LIST      = 2,
    CB_TOC       = 3,
    CB_POP_STATE = 4;

/*#### Valid List search characters */
var RE_LIST_SEARCH = /[a-z0-9$!%&\*\+\-\/<=>\?\[\]\^_\|\~]/i;

/*#### Pane Button ids */
var HDR_PANE_BTNS  = ['list_vis', 'toc_vis'];

/*#### Pane KeyDown Test */
var WIN_PANE_KD    = 'cdlmpst'; // C-lass D-oc L-ist M-ethod P-roperties S-earch T-OC

//}

/*  t2Info.CSEP   t2Info.ISEP   */

//{ Variables

/*### Variables */
var storage,  // set to localStorage, then sessionStorage
    state;    // Display state object

/*#### General Window Metrics & Data */
var cS = null,
    eContent,               // main content element
    winHeight = 0,          // current window height
    winWidth = 0,           // current window width
    fwHdrHgt = 0,
    winResizeTmrId = null,  // SetTimeout id for window.onresize
    winType = -1,           // 0 narrow, 1 medium, 2 wide
    winTitle = '',      // Title from <head><title>, used in history
    e25vh,              // 25vh wide the element
    px30em   = 0.0,     // 30em wide px
    px50Char = 0.0,     // 50 monospaced characters wide px
    waitWidth;          // width of wait indicator

/*#### Clicked and Navigation */
var aDOMCur = document.createElement('a'),  // current window.location
    aDOMNext = document.createElement('a'), // next window.location
    clickedBy = -1,  // source of navigation click
    eContentClicked, // Element that is highlighted in main document
    clickedTop = 0,  // screenY coordinate of click (or clicked item)
    oXHRDoc,         // xhr object currently retrieving document
    oCSSRuleTable;

/*#### App State */
var isHttp = /^http(s)?:/.test(window.location.protocol),
    isFirstLoad = true,
    isGetElByIdInDocFrag = ('getElementById' in document.createDocumentFragment()),
    isServer = false,
    isTouch = ('ontouchstart' in document.documentElement),
    isVHBad = false,        // iOS Safari 100vh != innerHeight
    isWinHistory = ('history' in window) && ('pushState' in window.history) &&
      (window.history.pushState instanceof Function),
    isWinKPTimeOut = false,  // used to debounce long key presses
    isZoomed = false;        // Touch devices will zoom via FontSize

/*#### Lib Info */
var elLibFooter;

/*#### Debug flags & Objects */
var dbgDocTiming   = false, // logs doc load timing info to console, dbgDocLoad
    dbgDoc         = false, // logs doc info to console, dbgDocInfo
    dbgListCalls   = false, // logs list function calls
    dbgListTiming  = false, // logs list load timing info to console, dbgListLoad
    dbgListSplit   = false,
    dbgSearchLoad  = false,
    dbgSearchSplit = false,
    dbgYDebug      = false,  // use y_debug element
    oDbgDoc   = {},
    oDbgList  = {};

/*#### Objects created by Pane module */
var oPane, oList, oToc;

var LS_XHR_LOAD = 0,
    LS_RENDER = 1;

/* t2Opts (t2 Options) holds data from YARD and customization data */
  var docLoadState = { xhr: null, cbFunc: null, url: '', state: null },
      t2Opts = { NSEP: '', customHeaderId: '' };

//}

/* This code controls the 'List' and 'TOC' panes.  Exported functions are
 * detailed in the {__loadPublicState} function, which loads oPane, oList, & oToc.
 * All exported functions have an underscore in their name.
 *
 * Three objects are exported:
 * * oPane - functions that are common to (or affect) both oList & oToc
 * * oList - functions & properties specific to the 'List' pane
 * * oToc  - functions & properties specific to the 'TOC' pane
 *
 * The functions are grouped and named the same.
 * @js_module_new Panes
 */
(function() {

//{ Pane Constants

/*### Constants
 *#### Class Names */
var CN_DOCKED   = 'd',         // Used with nav & toc div elements (the panes)
    CN_FLOATING = 'f',
    CN_TOUCH    = ' t',
    CN_CLOSED   = 'yl_closed'; // Used on list li elements that have buttons

/*#### Size Metrics - oList & oToc */
var LIST_MIN = 18.0     , // List pane min width      em
    LIST_MAX = 40.0     , // List pane max width      em
    LIST_HDR =  5.866667, // List pane header height  em
     TOC_MIN = 18.0     , // as above, but oToc
     TOC_MAX = 30.0     ,
     TOC_HDR =  4.00    ,
     H_CLS   =  1.8667  ; // Height Class & oToc Item em

/*#### .type enumeration */
var LIST_CLASS     = 0,
    LIST_METHOD    = 1,
    LIST_EXCEPTION = 2,
    LIST_PROPERTY  = 3,
    LIST_FILE      = 4,
    LIST_UNKNOWN   = 5,
    // array must match enum, see listGetInfo
    LIST_ENUM = ['class', 'method', 'exception', 'property', 'file', 'Unknown'];

/*#### TOC Generate Strings & RegEx */
var RE_METH_CLS  = /-class_method$/,
    RE_METH_INST = /-instance_method$/;

//}

//{ Pane Variables

/*### Variables
 *#### Resizers start data */
var resizerStWid = 0,  // starting pane width
    resizerStX   = 0;  // mouseDown or TouchStart screenX

/*#### Metrics */
var winFloatingTop; // screenY of floating windows

/*#### List Search & Load */
var listLastSearchText = '',   // used for search cancel
    listPath           = '',   // base path for list files
    listCurPN          = null, // pathName of current list

    oListData = {},       // data about lists, key is url
    oLoad     = {},       // object to pass to listLoadSplit
    oSearches = [];       // array of search objects

/*#### TOC Search & Load */
var tocLastSearchText = '',  // used for search cancel
    tocSearchInfo = [],
    re_csep = t2Info.CSEP.replace(/([\?*+^|\.\$\[\]\(\)\{\}])/g, "\\$1"),
    re_isep = t2Info.ISEP.replace(/([\?*+^|\.\$\[\]\(\)\{\}])/g, "\\$1"),
    re_meth_sep = new RegExp('^(' + re_csep + '|' + re_isep + ')');

//}

//{ @!group Public Interface

/* Binds reSize event handlers to oList & oToc
 * @param me [oList, oToc] this object
 */
function __bind(me) {
  me.resizeMD = resizeMD.bind(me);
  me.resizeMM = resizeMM.bind(me);
  me.resizeMU = resizeMU.bind(me);

  if (isTouch) {
    me.resizeTS = resizeTS.bind(me);
    me.resizeTM = resizeTM.bind(me);
    me.resizeTE = resizeTE.bind(me);
  }
};

/* Initialization - Loads public function properties into oList, oPane, and oToc,
 * loads state from storage.
 * @note This is loaded before the DOMContentLoaded event
 */
function __loadPublicState() {
  var version = '';

  try { storage = window.localStorage; } catch (e) {
    try { storage = window.sessionStorage; } catch (e) { };
  }

  if (storage && storage.yardState) {
    state = JSON.parse(storage.yardState);
    if (state.showSource === undefined)
      state.showSource = false;
    version = (state.version !== undefined ? state.version : '');
  }
  if (ST_VERS > version) {
    state = {
               'version': ST_VERS,
     'overviewCollapsed': false,
    'relationsCollapsed': false,
      'summaryCollapsed': false,
            'showSource': false,
              'fontSize': '15px',
           'fontSizeSet': null,
               'display': [
        { 'list': { 'docked': false , 'vis': true  , 'width': 0 },
          'toc' : { 'docked': false , 'vis': false , 'width': 0 } },

        { 'widthDocked': 0,
          'list': { 'docked': true  , 'vis': true  , 'width': 0 },
          'toc' : { 'docked': true  , 'vis': false , 'width': 0 } },

        { 'list': { 'docked': true  , 'vis': true  , 'width': 0 },
          'toc' : { 'docked': true  , 'vis': true  , 'width': 0 } }
      ]
    };
    Object.seal(state);
    if (storage) storage.yardState = JSON.stringify(state);
  }

  oPane = {
    firstDOMLoad: _FirstDOMLoad,     // called by eDOMContent (first load)
         mainClk: pane_MainClk,      // called by clkHdrBtn
          mainKD: pane_MainKD,       // called by winKeyDown
          locSet: pane_LocSet        // called by domLayout
  };

  /* e element
   * s style
   * d state array item
   */
  oList = { e: null, s: null, d: null, bVis: null, nav: null,
           clickedA: null, clickedLI: null, clickedLIOld: null, items: null,
           isOpenClose: false,
             hdrHeight: 0,
            type: LIST_UNKNOWN,
         itemQty: 0,
     itemsSearch: 0,
        itemsVis: 0,
        keyPress: list_KeyPress,     // for single key list scroll
            load: list_Load,         // called to navigate to new list
     showClicked: list_ShowClicked   // called by gotoHash & xhrCBDoc
  };

  oToc = { e: null, s: null, d: null, bVis: null, nav: null,
           clickedA: null, clickedLI: null, clickedLIOld: null, items: null,
           isOpenClose: false,
             hdrHeight: 0,
          searchInfo: null,
      floatingOffset: null,
        generate: toc_Generate,      // called by addContent
     showClicked: toc_ShowClicked    // called by gotoHash
  };

  oLoad.isRunning = false;
  oLoad.cancel    = false;

  __bind(oList);
  __bind(oToc);
  Object.seal(oPane);
  Object.seal(oList);
  Object.seal(oToc);
  __bind = undefined;
};

//} @!endgroup

//{ @!group FirstDOMLoad Functions

/* Called **only** on first YARD document load
 * @param [Boolean, nil] hookEvents true for events only
 */
function _FirstDOMLoad(hookEvents) {
  if (hookEvents) {
    _HookEvents();
    _HookEvents  = undefined;
  } else {
    _CheckState();
    _SetDOMProps();
    _CheckState  = undefined;
    _SetDOMProps = undefined;
  };
}

/* Checks width's in state, intializes hdrHeights */
function _CheckState() {
  var em = px30em / 30.0,
      st,
      writeState = false;

  winFloatingTop  = FLT_TOP  * em;
  oList.hdrHeight = LIST_HDR * em;
   oToc.hdrHeight = TOC_HDR  * em;

  // seemed to be a good width...
  em = (0.6667 * px50Char).toFixed(0);

  // set up state with DOM measurement
  for (var i = 0; i < 3; i++) {
    st = state.display[i];
    if (st.list.width === 0) {
      st.list.width = em;
      writeState = true;
    }
    if (st.toc.width === 0) {
      st.toc.width = em;
      writeState = true;
    }
  }
  if (state.display[1].widthDocked === 0) {
    st.widthDocked = em;
    writeState = true;
  }
  if (writeState && storage)
    storage.yardState = JSON.stringify(state);
}

/* Hooks oList & oToc events on first load */
function _HookEvents() {
  var el = _id('list_search_text');
  el.tabIndex = 1;
  el.addEventListener('keypress', listSearchKP , false);
  el.addEventListener('input'   , listSearchChg, false);

  el = _id('toc_search_text');
  el.tabIndex = 2;
  el.addEventListener('keypress', tocSearchKP , false);
  el.addEventListener('input'   , tocSearchChg, false);

  _id('list_header').addEventListener('click', listClkHeader, false);
  _id('toc_header' ).addEventListener('click',  tocClkHeader, false);

  oList.nav.addEventListener('click', paneClk.bind(oList), false);
   oToc.nav.addEventListener('click', paneClk.bind(oToc) , false);

  _id('list_sizer').addEventListener('mousedown',  oList.resizeMD, false);
  _id('toc_sizer' ).addEventListener('mousedown',   oToc.resizeMD, false);

  if (isTouch) {
    _id('list_sizer').addEventListener('touchstart', oList.resizeTS, false);
    _id('toc_sizer' ).addEventListener('touchstart',  oToc.resizeTS, false);
  }
}

/* Loads properties of oList & oToc releated to elements on first load */
function _SetDOMProps() {
  oList.e     = _id('y_list');
  oList.s     = _id('y_list').style;
//  oList.bVis  = _id('list_vis');
  oList.nav   = _id('list_nav');
  oList.items = _id('list_items');

  oToc.e     = _id('y_toc');
  oToc.s     = _id('y_toc').style;
//  oToc.bVis  = _id('toc_vis');
  oToc.nav   = _id('toc_nav');
  oToc.items = _id('toc_items');
}

//} @!endgroup

//{ @!group oPane Functions

/* Only called by domLayout, sets panes to state of state[winType]
 * @param winTypeLast [Integer] previous winType (-1 on init)
 */
function pane_LocSet(winTypeLast) {
  cS = state.display[winType];
  oList.d = cS.list;
  oToc.d  = cS.toc;
  paneLocSet(oList, winTypeLast);
  paneLocSet(oToc , winTypeLast);
}

/* Called when a button in the main header is clicked
 * @param id [String] id of the clicked button
 */
function pane_MainClk(id) {
  // IE11 var oMe = id.startsWith('list') ? oList : oToc;
  var oMe = /^list/.test(id) ? oList : oToc;
//  if ( id.endsWith('float') ) {
  if ( /float$/.test(id) ) {
    oMe.d.docked = false;
    paneShow(oMe);
  } else if ( /dock$/.test(id) ) {
    oMe.d.docked = true;
    paneShow(oMe);
  } else if ( /vis$/.test(id) ) {
    if (oMe.d.vis) paneHide(oMe);
    else           paneShow(oMe);
  }
}

/* Called when a key is pressed, from winKeyDown
 * @param key [String] key pressed
 */
function pane_MainKD(key, which) {

  // Escape key
  if (which === 27) {
    listSearchClear();
    return;
  }

  if (WIN_PANE_KD.indexOf(key) < 0) return;
  switch (key) {
  case 'c':
    listGoto('class');
    break;
  case 'd':
    listGoto('doc');
    break;
  case 'l':
    if (oList.d.vis) paneHide(oList);
    else             paneShow(oList);
    break;
  case 'm':
    listGoto('method');
    break;
  case 'p':
    listGoto('properties');
    break;
  case 's':
    if (!oList.d.vis) paneShow(oList);
    _id('list_search_text').focus();
    break;
  case 't':
    if (oToc.d.vis) paneHide(oToc);
    else            paneShow(oToc);
    break;
  }
}

/* @!visibility private */

/* Event handler for pane list click, bound to oList or oToc in paneHookEvents */
function paneClk(e) {
  var tgt = e.target,
      eA,
      eLI,
      isList = (this === oList),
      cancel = false,
      t;

  settingsCheck();  // close settings window
  if (tgt.tagName === 'NAV' && tgt.classList.contains('y_nav')) return;

  eLI = getPrntByIO(tgt, HTMLLIElement);

  if (dbgListCalls) console.log("paneClk eLI\n" + eLI);

  // clicked button of an open/close node, or an exception 'group' node
  if ( (tgt instanceof HTMLButtonElement) ||
    (tgt instanceof HTMLDivElement && !tgt.querySelector('a')) ) {

    // close or open clicked node only
    if (!e.ctrlKey) { eLI.classList.toggle(CN_CLOSED);

    // close or open clicked node along with all children
    } else {
      var nl = eLI.querySelectorAll("li > div");
      if ( eLI.classList.contains(CN_CLOSED) ) {
        eLI.classList.remove(CN_CLOSED);
        for (var i = 0, el; el = nl[i]; i++) {
          el.parentElement.classList.remove(CN_CLOSED);
        };
      } else {
        eLI.classList.add(CN_CLOSED);
        for (var i = 0, el; el = nl[i]; i++) {
          el.parentElement.classList.add(CN_CLOSED);
        };
      };
    };
    if (isList && this.isOpenClose) listEvenOdd();
    cancel = true;

  // clicked a document link
  } else if ( eLI && ( eA = eLI.querySelector('a, div > a') ) && !e.ctrlKey) {
    if (this.clickedLIOld) this.clickedLIOld.classList.remove(CN_CLICKED);
    this.clickedLIOld = this.clickedLI;
    clickedTop = eLI.getBoundingClientRect().top - fwHdrHgt;
    if (!isList) clickedTop -= 1.0;   // bottom-border in TOC
    this.clickedLI = eLI;
    this.clickedA = eA;
    clickedBy = ( isList ? CB_LIST : CB_TOC );

    if (eA.hash !== '') {
      // craziness for IE11 handling of anchor elements properties
      t = eA.href.slice( eA.href.search(/[^:/]\//) + 1, eA.href.length - eA.hash.length);
      if (t !== window.location.pathname) {
        gotoDoc(eA.pathname + '#' + decodeURIComponent(eA.hash.replace(/%-/, '%25-')).slice(1));
      } else {
        aDOMNext.href = eA.href
        gotoHash();
      }
    } else if ( !/\/#$/.test(eA.href) ) {
      t = eA.getAttribute('href');
      if ( /^\//.test(t) ) gotoDoc(t);
      else                 gotoDoc("/" + t);
    }
    cancel = true;
  };
  if (cancel) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
}

/* Hides a pane
 * @param me [oList, oToc]
 */
function paneHide(me) {
  me.bVis.className = CN_HIDDEN;
  me.d.vis = false;
  me.e.classList.add(CN_HIDDEN);
  updateCSS();
  if (storage) storage.yardState = JSON.stringify(state);
}

/* Sets location of panes, only called by pane_LocSet
 * @param me [oList, oToc]
 * @param winTypeLast [Integer] previous winType, -1 on first load
 */
function paneLocSet(me, winTypeLast) {
  var isDocked = me.d.docked,
      prevSt = winTypeLast >= 0 ? state.display[winTypeLast] : null,
      cnLoc = isDocked ? CN_DOCKED : CN_FLOATING,
      meLast = isFirstLoad || (me === oList ? prevSt.list : prevSt.toc),
      dChng  = isFirstLoad || (me.d.docked !== meLast.docked);

  if (dChng) {
    cnLoc = isDocked ? CN_DOCKED : CN_FLOATING;
    me.e.className = cnLoc + (isTouch ? CN_TOUCH : '');
  }
  if (me.d.vis) {
    me.e.classList.remove(CN_HIDDEN);
    if (me.bVis) me.bVis.className = CN_BTN_VIS;
  } else {
    me.e.classList.add(CN_HIDDEN);
    if (me.bVis) me.bVis.className = CN_HIDDEN;
  }
  if (isDocked) {
    me.s.width = ( winType === 1 ? cS.widthDocked : me.d.width ) + 'px';
  } else {
    me.s.width = '';
  }

}

/* Makes a pane list item visible.  Only called by paneScrollTo.
 * @param prnt [HTMLElement] item to make visible
 * @return [Boolean] true any items were 'opened' to show the item
 */
function paneOpenToItem(prnt) {
  var notFirst = false,
      heightChanged = false,
      open = [];

  do {
    if (prnt instanceof HTMLLIElement) {
      if (notFirst) {
        if ( prnt.classList.contains(CN_CLOSED) ) {
          open.push(prnt);
        }
      } else notFirst = true;
    }
    prnt = prnt.parentElement;
  }
  while (prnt instanceof HTMLUListElement || prnt instanceof HTMLOListElement || prnt instanceof HTMLLIElement);

  if (open.length > 0) {
    heightChanged = true;
    for (var i = 0, el; el = open[i]; i++) { el.classList.remove(CN_CLOSED); }
  }
  return heightChanged;
}

/* Called if a Pane global 'minus' (close) or 'plus' (open) button is clicked.
 * @param me [oList, oToc] pane to change
 * @param isOpen [Boolean]
 */
function paneOC(me, isOpen) {
  var isList = (me === oList),
      qsa = isList ? 'li > ul' : 'li > ol',
      nl = me.items.querySelectorAll(qsa);

  if (isOpen) {
    for (var i = 0, el; el = nl[i]; i++) {
      el.parentElement.classList.remove(CN_CLOSED);
    }
  } else {
    for (var i = 0, el; el = nl[i]; i++) {
      el.parentElement.classList.add(CN_CLOSED);
    };
  };
  if (isList && me.isOpenClose) listEvenOdd();
}

/* Scrolls to a list item and highlights.
 * @param me [oList, oToc] pane to change
 * @param eA [HTMLAnchorElement]
 */
function paneScrollTo(me, eA) {
  var eSTop,
      offset,
      eLI,
      clkTop;

  if (dbgListCalls)
    console.log( "paneScrollTo " + (me === oList ? "LIST" : "TOC") );


  if (eA) {
    if (eLI = getPrntByIO(eA, HTMLLIElement) ) {
      if (eLI !== me.clickedLI && (me.clickedLI instanceof HTMLLIElement) )
        me.clickedLI.classList.remove(CN_CLICKED);

      me.clickedLI = eLI;
      me.clickedA  = eA;
      if (me.isOpenClose) {
        if (paneOpenToItem(eLI) && me === oList) listEvenOdd();
      }
      eLI.classList.add(CN_CLICKED);
      offset = me.d.docked ? me.hdrHeight : winFloatingTop;
      if (clickedBy === CB_OBJ_PATH)
        clkTop = me.hdrHeight + 3 * H_CLS * px30em / 30.0;
      else
        clkTop = Math.max(me.hdrHeight, clickedTop) +  - fwHdrHgt;
      eSTop = eLI.offsetTop - clkTop + offset;
      me.nav.scrollTop = eSTop - ( me === oToc ? 1 : 0) - fwHdrHgt;
    }
  } else {
    me.nav.scrollTop = 0;
    if (me.clickedLI) me.clickedLI.classList.remove(CN_CLICKED);
    me.clickedA  = null;
    me.clickedLI = null;
  }
}

/* Shows a pane
 * @param [oList, oToc] me
 */
function paneShow(me) {
  var isList = (me === oList),
      you = isList ? oToc : oList,
      curDocked = me.e.classList.contains(CN_DOCKED),
      newDocked = me.d.docked,
      isDockedChanged = (curDocked !== newDocked),
      cnLoc = newDocked ? CN_DOCKED : CN_FLOATING;

  if (isDockedChanged) me.e.className = cnLoc + (isTouch ? CN_TOUCH : '');

  if (newDocked) {
    me.s.width = ((winType === 1) ? cS.widthDocked : me.d.width) + 'px';
  } else {
    // me.s.width = '';
    me.s.width = me.d.width + 'px';
  };

  me.e.classList.remove(CN_HIDDEN);
  me.d.vis = true;
  me.bVis.className = CN_BTN_VIS;

  if ( !newDocked && !you.d.docked ) {
    if (you.d.vis) paneHide(you);
  } else if (winType === 1) {
    if (newDocked && you.d.docked && you.d.vis) paneHide(you);
  }
  if (isList || aDOMCur.hash) me.showClicked(aDOMCur);
  if (storage) storage.yardState = JSON.stringify(state);

  updateCSS();
};

/* @!visibility public */

//} @!endgroup

//{ @!group oList Functions

/* Event Handler for Window keyPress
 * @param key [String] string of the key pressed
 */
function list_KeyPress(key) {
  var eA,
      re,
      result;

      // return if class, only list nested list
  if (oListData[listCurPN].type === LIST_CLASS) return;

  txt = key.replace(/([\?*+^|\.\$\[\]\(\)\{\}])/g, "\\$1");

  if (oListData[listCurPN].type === LIST_METHOD) {
    re = new RegExp('^[\.#]?' + txt, 'i');
  } else {
    re = new RegExp('^' + txt, 'i');
  }

  result = oListData[listCurPN].searchInfo.findIndex( function (o) { return re.test(o.text); } );

  if (result) {
    eA = oList.items.children[result];
    oList.nav.scrollTop = getPrntByIO(eA, HTMLLIElement).offsetTop;
  }
}

/* Loads List Pane.  Calls either xhr or cache load.
 * @param url   [String]  url of list
 * @param force [Boolean] force whether to always load page
 */
function list_Load(eA, force) {
  var el = _id('list_items'),
      url, pn;

  if (force === undefined) force = false;

  // return if base paths match
  if ( !force && listPath === eA.pathname.replace(/[^\/]+$/, '') ) return;

  if ( 'classList' in _id('list_search_icon') ) {
    _id('list_search_icon').classList.remove('s_clr');
  } else {
    _id('list_search_icon').className = '';
  };

  if (dbgListCalls) console.log("list_Load\nlistCurPN\n" + listCurPN +
    "\neA.pathname\n" + eA.pathname);

  // save previous list state
  if (listCurPN) {
    if (oList.clickedLI) oList.clickedLI.classList.remove(CN_CLICKED);
    oList.clickedLI = null;
    oList.clickedA  = null;
    oListData[listCurPN].list = el.cloneNode(true);
    oListData[listCurPN].scrollTop = el.parentElement.scrollTop;
  };

  url = eA.href.trim();
  pn  = eA.pathname;
  oLoad.pathName = pn;

  // new path, reset data and reload
  if ( listPath !== pn.replace(/[^\/]+$/, '') ) {
    oListData = {};
    oList.clickedA = null;
    oList.clickedLI = null;
    listPath = pn.replace(/[^\/]+$/, '');
    oLoad.xhr = xhrSend(url, listXhrCB);
  } else if (force) {
    setWait(CB_LIST);
    // request has been cached, load from cache
    if ( (oListData[pn] instanceof Object) &&
         (oListData[pn].list instanceof HTMLUListElement) )
      listXhrCB(true, '', url, 200, 0, 0)
    // need to load from file
    else oLoad.xhr = xhrSend(url, listXhrCB);
  };
};

/* Highlights an item in the oList list
 * @param aDOM [HTMLAnchorElement] anchor with object / url info
 */
function list_ShowClicked(aDOM) {
  // aDOM hash is NOT encoded
  var pathName = /^\//.test(aDOM.pathname) ? aDOM.pathname : '/' + aDOM.pathname,
      pathFull = pathName,
      eLI = oList.clickedLI,
      hrefA,
      qs,
      eA,
      eNewClickedLI,
      paneUL,
      t;

  if (dbgListCalls) {
    if (aDOM.hash)
      console.log("list_ShowClicked\n" + pathName + '#' + t2EncodeStr( aDOM.hash.slice(1) ));
    else
      console.log("list_ShowClicked\n" + pathName);
  };

  if (clickedBy === CB_LIST) {
    if (oList.clickedLIOld) {
      oList.clickedLIOld.classList.remove(CN_CLICKED);
      oList.clickedLIOld = null;
    }
    if (eLI) eLI.classList.add(CN_CLICKED);
    return;
  }

  if (aDOM.hash) pathFull += '#' + t2EncodeStr( aDOM.hash.slice(1) );

  if (oList.clickedA) {
    hrefA = oList.clickedA.getAttribute('href');
    if (hrefA === pathFull) {
      eA = oList.clickedA;
    } else if (hrefA === pathName) {
      eA = oList.clickedA;
      if ( eLI instanceof HTMLLIElement &&
        eLI.classList.contains(CN_CLICKED) ) return;
    };
    if (eA) eNewClickedLI = eLI;
  };

  if (!eA) {
    paneUL = ( t = _id('list_search_items') ) ? t : oList.items;
    // Quotes should match template
    qs = 'a[href="' + pathFull + '"]';
    eA = paneUL.querySelector(qs);
    if (!eA) {
      qs = 'a[href="' + pathName + '"]';
      eA = paneUL.querySelector(qs);
    };
  };

  if (dbgListCalls) console.log("list_ShowClicked Found\n" + eA);

  if (eA) paneScrollTo(oList, eA);
  else {
    if (oList.clickedLI) {
      oList.clickedLI.classList.remove(CN_CLICKED);
      oList.clickedLI = null;
      oList.clickedA  = null;
    };
    if ( oListData[listCurPN] && oListData[listCurPN].scrollTop > 0)
      oList.nav.scrollTop = oListData[listCurPN].scrollTop;
  };
};

/* Event Handler for oList Header click */
function listClkHeader(e) {
  var tgt = e.target,
      tag = tgt.tagName,
      cancel = false;

  settingsCheck();

  switch (tag) {
  case 'BUTTON':
    if (tgt.id !== 'list_sizer')
      paneOC(oList, (tgt.className === 'y_plus'));
    cancel = true;
    break;
  case 'A':
    if (!e.ctrlKey) {
      cancel = true;
      if (oLoad.xhr) {
        oLoad.xhr.abort();
        oLoad.xhr = null;
      }
      if (oLoad.isRunning) oLoad.cancel = true;
      listSearchCancel();
      list_Load(tgt, true);
    }
    break;
  case 'path':
    tag = 'svg';
    tgt = tgt.parentElement;
    /* falls through */
  case 'svg':
    if (tgt.id === 'list_search_icon') {
      listSearchClear();
      cancel = true;
    }
    break;
  case 'INPUT':
    if (tgt.id === 'list_search_text') {
      tgt.focus();
      cancel = true;
    }
    break;
  }
  if (cancel) {
    e.stopPropagation();
    e.preventDefault();
    return false;
  }
}

/* Sets the even / odd shading of oList items */
function listEvenOdd(items) {
  var liVis = [],
        odd = [],
       even = [],
     lenVis = 0;

  if (dbgListCalls) console.log("listEvenOdd\n" + listCurPN);

  if (items === undefined) items = oList.items;

  // array liVis passed by ref, loaded with visible items
  listGetVis( items.children, liVis );
  lenVis = liVis.length;
  oList.itemsVis = lenVis;

  // find all elements that require changing, push to odd & even arrays
  for (var j = 0, el; j < lenVis; j++) {
    el = liVis[j];
    if (j % 2 === 0) {
      if ( !el.classList.contains('odd') )  odd.push(el);
    } else {
      if ( !el.classList.contains('even')  ) even.push(el);
    }
  }

  // now loop thru items in both arrays and change class
  for (var j = 0, elCL, len =  odd.length; j < len; j++) {
    elCL = odd[j].classList;
    elCL.remove('even') ; elCL.add('odd');
  }
  for (var j = 0, elCL, len = even.length; j < len; j++) {
    elCL = even[j].classList;
    elCL.remove('odd')  ; elCL.add('even');
  }
}

/* Called after a new url is loaded into oList
 *
 * Sets the following:
 * * type
 * * isOpenClose
 *
 * @param [Object] ld oListData item.
 */
function listGetInfo(ld) {
  var ul   = ld.list,
      ulCL = ul.classList;

  ld.type = LIST_UNKNOWN;
  for (var i = 0, t; t = LIST_ENUM[i]; i++) {
    if ( ulCL.contains(t) ) {
      ld.type = i;
      break;
    };
  };
  ld.isOpenClose = (ul.querySelector('button') !== null);
  if (dbgListTiming) oDbgList.elements = ul.querySelectorAll('*').length;
}

/* Gets an ordered list of visible items (LI elements), only used when
 * isOpenClose is true.  Reentrant.
 * @param nl    [HTMLCollection] list of nodes to check
 * @param liVis [<HTMLLIElement>] array of LI elements that are visible
 */
function listGetVis(nl, liVis) {
  for (var i = 0, el, ul; el = nl[i]; i++) {
    liVis.push(el);
    ul = el.lastElementChild;
    if (ul instanceof HTMLUListElement && !el.classList.contains(CN_CLOSED)) {
      listGetVis( ul.children, liVis );
    }
  }
}

/* Called when Ctrl-Alt combinations are used to goto a list
 * @param list [String]
 */
function listGoto(list) {
  var nl = _id('list_menu').querySelectorAll('a'),
      re = new RegExp('^\\s*' + list, 'i'),
      url = '', listState;

  for (var i = 0, el; el = nl[i]; i++) {
    if (re.test(el.textContent)) {
      if (oLoad.xhr) {
        oLoad.xhr.abort();
        oLoad.xhr = null;
      }
      if   (oLoad.isRunning)   oLoad.cancel = true;
      listSearchCancel();
      list_Load(el, true);
      if (!oList.d.vis) paneShow(oList);
      break;
    }
  }
}

/* Callback function needed for when {listLoadSplit} completes. */
function listLoadDone() {
  var eSearch = _id('list_search_text'),
      t;

  if (dbgListCalls) console.log("listLoadDone");

  oList.items = _id('list_items');
  oList.itemsSearch = 0;

  if (isFirstLoad) {
    oList.s.visibility = '';
    clickedBy = CB_POP_STATE;
    clickedTop = (oToc.hdrHeight + 3.0 * H_CLS * px30em / 30) - fwHdrHgt;
    if (aDOMNext.hash)    gotoHash();
    else if (oList.d.vis) list_ShowClicked(aDOMNext);
    isFirstLoad = false;
  } else if (oList.d.vis) list_ShowClicked(aDOMNext);

  if (dbgListCalls) console.log("listLoadDone\nlistCurPN\n" + listCurPN +
    "\noListData[listCurPN].scrollTop\n" + oListData[listCurPN].scrollTop);

  if (listCurPN && oListData[listCurPN].scrollTop > 0) {
    if (!oList.clickedA || (oList.clickedA.href !== aDOMCur.href) )
      oList.nav.scrollTop = oListData[listCurPN].scrollTop;
  };

  oLoad.isRunning = false;
  if (dbgListTiming) {
    oDbgList.render = performance.now() - oDbgList.render;
    dbgListLoad();
  }

  if ( t = eSearch.value.trim()) {
    if (t !== '') listSearchChg();
  }
  setWait();
}

/* Splits loading of LI elements when list is large, better UI responsiveness.
 * @param xhrEl    [HTMLElement] element with children to copy from (from xhr docFrag)
 * @param docEl    [HTMLElement] element to add children to (in document)
 * @param qty      [Integer]     number of children to load in the first loop
 * @param qty_next [Integer]     number of children to load in the rest of the loops
 * @param cbFunc   [Function]    callback function called when all children have
 *   been loaded/moved
 * @param oState   [object] object to pass run to app, and cancel from app
 */
function listLoadSplit(xhrEl, docEl, qty, qty_next, cbFunc, oState) {
  var func,
      tmrIds = [],
      rng = xhrEl.ownerDocument ? xhrEl.ownerDocument.createRange() : document.createRange(),
      docFrags = [];

  setWait(CB_LIST);
  //var tSt = performance.now();

  rng.setStart(xhrEl, 0);
  rng.setEnd(xhrEl, Math.min( qty, xhrEl.childElementCount) );
  docEl.appendChild( rng.extractContents() );
  qty = qty_next;

  // load remaining nodes into docFrags array
  while (xhrEl.childElementCount > 0) {
    //console.log(xhrEl.firstChild.tagName + " len = " + xhrEl.childElementCount);
    rng.setStart(xhrEl, 0);
    rng.setEnd(xhrEl, Math.min(qty, xhrEl.childElementCount) );
    docFrags.push( rng.extractContents() );
  }
  rng.detach();
  rng = null;
  xhrEl = null;
  oState.isRunning = true;
  //console.log("Split items " + docFrags.length + " " + Math.round(performance.now() - tSt));

  func = function() {
    //console.log("Timer " + Math.round(performance.now() - tSt));
    var frag;
    if (oState.cancel) {
      listClearLoadTimers(tmrIds, oState);
      docFrags = null;
    } else {
      if ( frag = docFrags.shift() ) docEl.appendChild(frag);
      frag = null;
      if (docFrags.length === 0) {
        oState.isRunning = false;
        if (cbFunc instanceof Function) setTimeout(cbFunc, 50);
      } else {
        tmrIds.push( setTimeout( func, 100) );
      };
    };
  };
  tmrIds.push( setTimeout( func, 15) );
};

function listClearLoadTimers(ary, oState) {
  var len = ary.length;
  // console.log("called clearTimers " + len);
  if (len > 0) {
    for (var i = 0, tmr; tmr = ary[i]; i++) {
      clearTimeout(tmr);
    };
    ary = null;
  };
  oState.isRunning = false;
  setWait();
};

/* xhr callback function when a new List document is ready, called by
 * xhrReadyStateChange
 * @param docFrag [DocumentFragment] body element of url document
 * @param title   [String] \<head\>\<title\> textContent
 * @param url     [String]
 * @param status  [Integer]
 * @param ms      [Float]   time to parse docFrag
 * @param msRcv   {Float]   time from xhrSend to xhrRSC
 */
function listXhrCB(docFrag, title, url, status, ms, msRcv) {
  var newMenu,
      newUL,
      oldUL = _id('list_items'),
      hdr   = _id('list_header'),
      ld,
      len,
      t, t1;

  if (status !== 200 || !docFrag) {
    setWait();
    alert('listXhrCB - bad return with status ' + status + " from location\n" + url);
    return;
  }

  oDbgList.xhrRSC = ms;
  var tSt = performance.now(), tEnd;
  oDbgList.xhrRcv = msRcv;

  oLoad.xhr = null;
  oLoad.cancel = oLoad.isRunning;
  oList.clickedA = null;
  oList.clickedLI = null;

  listCurPN  = oLoad.pathName;

  if (oListData[listCurPN] === undefined) {

    if (t = getDocFragId(docFrag, 'list_footer')) {
      elLibFooter = t.cloneNode(true);
      addFooter(document);
    } else {
      elLibFooter = null;
    }

    oListData[listCurPN] = {};
    ld = oListData[listCurPN];
    ld.list = getDocFragId(docFrag, 'list_items').cloneNode(true);
    clean(ld.list);
    if ( t = getDocFragId(docFrag, 'list_menu') )
      ld.menu = t.cloneNode(true);
    else
      ld.menu = _id('list_menu').cloneNode(true);
    listGetInfo(ld);

    ld.title = title;
    ld.search = '';
    listSearchLoad(ld);
    listEvenOdd(ld.list);
    docFrag = null;
  } else {
    ld = oListData[listCurPN];
  }
  oList.itemQty = ld.searchInfo.length;
  oList.isOpenClose = ld.isOpenClose;

  newUL   = ld.list.cloneNode(true);
  newMenu = ld.menu.cloneNode(true);

  // remove event listeners
  if ( t = _id('list_sizer') ) {
    t.removeEventListener('mousedown',  oList.resizeMD);
    if (isTouch)
      t.removeEventListener('touchstart', oList.resizeTS);
  };

  _id('list_search_text').value = ld.search;
  if (ld.search === '') {
    if (t = _id('list_search_items') ) oList.nav.removeChild(t);
//    _id('list_search_icon').classList.remove('s_clr');
  } else {
    _id('list_search_icon').classList.add('s_clr');
//    newUL.style.display = 'none';
    len = 0;
  }

  t = oList.isOpenClose;
  hdr.querySelector('button.y_minus').disabled =  !t;
  hdr.querySelector('button.y_plus' ).disabled =  !t;

  _id('list_title').textContent = ld.title;

  len = newUL.childElementCount;

  if (dbgListTiming) {
    oDbgList.render = performance.now();
    oDbgList.cbProc = oDbgList.render - tSt;
    tSt = performance.now();
  }

  hdr.replaceChild(newMenu, _id('list_menu') );
  // rebind events
  if ( t = _id('list_sizer') ) {
    t.addEventListener('mousedown',  oList.resizeMD, false);
    if (isTouch)
      t.addEventListener('touchstart', oList.resizeTS, false);
  };

  if (len > 2000) {
    t = newUL.cloneNode(false);
    oList.nav.replaceChild(t, oldUL);
    oLoad.cancel = false;
    listLoadSplit(newUL, t, 1000, 4000, listLoadDone, oLoad);
  } else {
    setTimeout(listLoadDone, 15);
    oList.nav.replaceChild(newUL, oldUL);
  }
  newUl = null;
}

//} @!endgroup

//{ @!group oList Search Functions

/* Event handler for oList search input change */
function listSearchChg(e) {
  var text = e ? e.target.value.trim() : _id('list_search_text').value.trim(),
      t;

  if (text !== '') {
    // IE issue ?
    if ( 'classList' in _id('list_search_icon') ) {
      _id('list_search_icon').classList.add('s_clr');
    } else {
      _id('list_search_icon').className = 's_clr';
    };
    if (listLastSearchText !== text) listSearchCancel();
    listLastSearchText = text;
    listSearchExec(text);
  } else {
    listSearchClear();
  }
}

/* Event handler for oList search input keypress */
function listSearchKP(e) {
  var key = String.fromCharCode(e.which);
  if ( !RE_LIST_SEARCH.test(key) ) {
    e.stopPropagation();
    return true;
  }
}

function listSearchCancel() {
  for (var i = 0, o; o = oSearches[i]; i++) {
    if (o && o.running) o.cancel = true;
  }
}

/* Clears List search list
 */
function listSearchClear() {
  var t;
  oList.itemsSearch = 0;
  _id('list_search_text').value = '';
  if ( 'classList' in _id('list_search_icon') ) {
    _id('list_search_icon').classList.remove('s_clr');
  } else {
    _id('list_search_icon').className = '';
  };
  oListData[listCurPN].search = '';
  setWait(CB_LIST);
  setTimeout( function() {
    listSearchCancel();
    if (t = _id('list_search_items') ) oList.nav.removeChild(t);
    oList.items.style.display = '';
    oList.clickedA  = null;
    oList.clickedLI = null;
    if (clickedBy === CB_LIST) clickedBy = null;
    if (aDOMCur) list_ShowClicked(aDOMCur);
    setWait();
  }, 10);
}

/* Create elements from search result array
 * @param list [<object>]
 * @param re   [RegEx] regex string for highlighting search result text
 */
function listSearchCreate(list, re) {
  var li = document.createElement('li'),
      docFrag = document.createDocumentFragment(),
      a, findText, replText, inHTML,
      emptyRe = re.test('');

  for (var i = 0, sObj, small, newLI; sObj = list[i]; i++) {
    newLI = li.cloneNode(false);

    a = sObj.a.cloneNode(true);
    findText = a.firstChild.textContent;
//    txt = findText.replace(/&/g, '&amp;');
//    txt = txt.replace(/</g, '&lt;');
    txt = findText.replace(/</g, '&lt;');
    txt = txt.replace(/>/g, '&gt;');

    replText = txt.replace(re, "<em>$1</em>");

    if (!emptyRe) {
      a.innerHTML = a.textContent.replace(findText, replText);
    };

    newLI.appendChild(a);
    if (sObj.small) {
      small = sObj.small.cloneNode(true);
      small.className = '';
      small.textContent = small.textContent.trim();
      newLI.appendChild( small );
    }
    if (sObj.cl) {
      newLI.className = sObj.cl;
      if (i % 2 === 0) newLI.classList.add('odd');
      else             newLI.classList.add('even');
    } else {
      if (i % 2 === 0) newLI.className = 'odd';
      else             newLI.className = 'even';
    }
    docFrag.appendChild(newLI);
  }
  return docFrag;
}

/* Performs the List search
 * @note If result set is large, calls {listLoadSplit} so UI is responsive
 * while loading search results.  This allows search input text changes to
 * cancel the search result display.
 * @param text [String] text string to search for
 */
function listSearchExec(text) {
  var re,
      results,
      ul = document.createElement('ul'),
      oldUl,
      txt, pre, t,
      isStart,
      reNS,
      ld = oListData[listCurPN],
      tSt = performance.now(), tS;

  text = text.replace(/\s+/g, '');
  ld.search = text;


  if ( t2Info.NSEP === '::' && text.match(/[a-z][\.#]\S/i) ) {
    aText = text.split(/[\.#]/);
  } else {
    aText = text.split(t2Info.NSEP);
  }
  if (aText.length === 2) {
    reNS = new RegExp(aText[0]);
    text = aText[1];
  } else if (aText.length > 2) {
    text = aText.pop();
    reNS = new RegExp( aText.join("([^:]*" + t2Info.NSEP + "[^:]*)+?") );
  } else {
    reNS = null;
  };

  pre = text.charAt(0);
  if (pre === t2Info.CSEP || pre === t2Info.ISEP) {
    text = text.slice(1);
    if (pre === '.') pre = '\\.';
  } else pre = null;

  // isStart = ( /^[^!=?<>+|*\^\]_]/.test(text.charAt(0)) && (
  //    text.charAt(0) === text.charAt(0).toUpperCase() ) );
  isStart = /[A-Z]/.test(text.charAt(0));


  // create RegEx for search, dependent on whether 1st letter is uppercase
  // escapes ? * + ^ | . $ [ ] ( ) { } in search string
  txt = text.replace(/([\?*+^|\.\$\[\]\(\)\{\}])/g, "\\$1");
  if (isStart) {
    if (ld.type === LIST_METHOD) {
      if (pre)
        re = new RegExp('^' + pre + txt, 'i');
      else
        re = new RegExp('(^#' + txt + '|^\\.' + txt + '|^' + txt + ')', 'i');
    } else
      re = new RegExp('^' + txt, 'i');
  } else {
    if (ld.type === LIST_METHOD && pre ) {
      re = new RegExp('^' + pre + '.*?' + txt, 'i');
    } else {
      re = new RegExp(txt, 'i');
    }
  }
  if (reNS) {
    results = ld.searchInfo.filter( function (o) { return (re.test(o.text) &&
      !!o.small && reNS.test(o.small.textContent)); } );
  } else {
    results = ld.searchInfo.filter( function (o) { return re.test(o.text); } );
  }

  oList.itemsSearch = results.length;

  if (oList.itemsSearch > 0) {
    // sort objects via name then namespace
    if (oList.isOpenClose) {
      results = results.sort( function(a, b) {
        var at = a.text.toLowerCase(),
            bt = b.text.toLowerCase(),
            as = a.small ? a.small.textContent : '',
            bs = b.small ? b.small.textContent : '';

        if (at > bt)      return  1;
        else if (at < bt) return -1;
        else if (as > bs) return  1;
        else if (bs > as) return -1;
        else return 0;
      } );
    }

    if (ld.type === LIST_UNKNOWN || ld.type === LIST_FILE)
      ul.className = 'file';
    else
      ul.className = LIST_ENUM[LIST_METHOD];

    // Create RegEx (re) for search string highlight
//    txt = txt.replace(/&/g, '&amp;');
    txt = txt.replace(/</g, '&lt;');
    txt = txt.replace(/>/g, '&gt;');
    if (isStart) {
      if (oListData[listCurPN].type === LIST_METHOD) {
        if (pre)
          re = new RegExp('^(' + pre + txt + ')', 'i');
        else
          re = new RegExp('^([#\.]?' + txt + ')', 'i');
      } else
        re = new RegExp('^(' + txt + ')', 'i');
    } else {
      re = new RegExp('(' + txt + ')', 'ig');
    }
  }

  if (dbgSearchLoad) {
    tS = fmtTL(performance.now() - tSt, oList.itemsSearch);
    console.log('Search   exec    ' + tS + ' ' + text);
  }

  oList.items.style.display = 'none';
  ul.id = 'list_search_items';
  oldUl = _id('list_search_items');
  // If less than 600 matches, throw them all in, otherwise use splitLoad
  if (oList.itemsSearch < 600) {
    ul.appendChild( listSearchCreate(results, re) );
    if (oldUl)
      oList.nav.replaceChild(ul, oldUl);
    else
      oList.nav.appendChild(ul);
    listSearchExec2();
  } else {
    var   sUL = ul.cloneNode(false),
      oSearch = {
          list: results,
            re: re,
            ul: sUL,
           qty: 200,
          text: text,
       running: true,
        cancel: false,
            cb: listSearchExec2
      };
    oSearches.push(oSearch);
    if (oldUl) oList.nav.replaceChild(sUL, oldUl);
    else       oList.nav.appendChild(sUL);
    listSearchSplit(oSearch);
  }
  t = null;
}

/* Callback function needed for when search display {listLoadSplit} completes. */
function listSearchExec2() {
  var len = oSearches.length - 1,
      o;
  if (oList.itemsSearch > 0) {
    oList.clickedA = null;
    oList.showClicked(aDOMCur);
    if (!oList.clickedLI) oList.nav.scrollTop = 0;
  }
  if (len >= 0) {
    for (var i = len; i >= 0; i--) {
      o = oSearches[i];
      if (o && !o.running) {
        o = null;
        oSearches.pop();
      }
    }
  }
}

/* Splits loading of LI elements when list is large, better UI responsiveness.
 * @note Used for both large (+2,000) lists and large (+500) search result sets.
 * @param xhrEl [HTMLElement] element with children to copy from (from xhr frag)
 * @param docEl [HTMLElement] element to add children to (in document)
 * @param qty [Integer] number of children to load in each loop
 * @param cbFunc [Function] callback function called when all children have
 * been loaded/moved
 * @param oState [object] object to pass run to app, and cancel from app
 */
function listSearchSplit(o) {
  var tmrFunc,
      tmrIds = [],
      list,
      len;

  var tSt = performance.now(), tS;

  tmrFunc = function() {
    return function() {
      if (o.list.length > 0) {
        list = o.list.splice(0, o.qty);
        o.ul.appendChild( listSearchCreate(list, o.re) );
        if (!o.cancel) {
          if (o.list.length > 0) {
            if (dbgSearchSplit) {
              tS = fmtTL(performance.now() - tSt, o.list.length + 0);
              console.log('Search   split   ' + tS + ' ' +
                LIST_ENUM[oListData[listCurPN].type]  + '  ' + o.text);
            }
            tmrIds.push(setTimeout(tmrFunc, 20));
          } else {
            o.running = false;
            if (o.cb !== undefined) setTimeout(o.cb, 0);
            return;
          }
        } else {
          len = tmrIds.length;
          if (len > 0) {
            for (var i = 0; i < len; i++) {
              if (tmrIds[i]) clearTimeout(tmrIds[i]);
            }
          }
          setWait(-1);
          o.running = false;
          if (dbgSearchSplit) {
            tS = fmtTL(performance.now() - tSt, o.list.length);
            console.log('Search   split   ' + tS + ' ' +
              LIST_ENUM[oListData[listCurPN].type] + ' Cancel');
          }
        }
      }
    };
  }();
  tmrIds.push(setTimeout(tmrFunc, 0));
}

/* Loads ld.searchInfo array, sets all href's to the correct path
 * @param ul   [HTMLUListElement]  the top UL element to parse
 * @param menu [HTMLDivElement] the list menu element
 */
function listSearchLoad(ld) {
  var nl  = ld.list.querySelectorAll('a'),
      cl,
      tSt = performance.now(), tEnd;

  ld.searchInfo = [];
  // Load searchInfo and set list href's
  if (isServer) {
    for (var i = 0, eA, sObj, _small, eLI; eA = nl[i]; i++) {
      _small = eA.nextElementSibling;
      if (_small && _small.tagName === 'SMALL')
        sObj = { a: eA, small: _small, text: eA.childNodes[0].textContent };
      else {
        sObj = { a: eA, small: null  , text: eA.childNodes[0].textContent };

      }
      if (eLI = getPrntByIO(eA, HTMLLIElement)) {
        cl = eLI.className.replace(/even|odd/, '').trim();
        if (cl !== '') sObj.cl = cl;
      }
      if ( eA.classList.contains('nodoc') ) sObj.cl += ' nodoc';
      ld.searchInfo.push(sObj);
    }
  } else {
    for (var i = 0, eA, sObj, _small, eLI; eA = nl[i]; i++) {
      eA.setAttribute('href', listPath + eA.getAttribute('href') );
      _small = eA.nextElementSibling;
      if (_small && _small.tagName === 'SMALL')
        sObj = { a: eA, small: _small, text: eA.childNodes[0].textContent };
      else {
        sObj = { a: eA, small: null  , text: eA.childNodes[0].textContent };
      };
      if (eLI = getPrntByIO(eA, HTMLLIElement)) {
        cl = eLI.className.replace(/even|odd/, '').trim();
        if (cl !== '') sObj.cl = cl;
      };
      if ( eA.classList.contains('nodoc') ) sObj.cl += ' nodoc';
      ld.searchInfo.push(sObj);
    };
    // Set list menu href's
    nl = ld.menu.querySelectorAll('a');
    for (var i = 0, eA; eA = nl[i]; i++) {
      eA.setAttribute('href', listPath + eA.getAttribute('href') );
    };
  };

  if (dbgSearchLoad) {
    tEnd = performance.now() - tSt;
    console.log('Search   load    ' + fmtTL(tEnd, oList.itemQty) +
            ' ' + LIST_ENUM[ld.type]);
  }
}

//} @!endgroup

//{ @!group oToc Functions

/* Generates a table of contents and returns the new OL element
 * @param content [HTMLElement] the node containg the doc content
 * @param isCode  [Boolean] true is the doc is a 'code' doc
 * @return [HTMLOLElement] an OL element filled with TOC info
 */
function toc_Generate(content, isCode) {
  var cA   = document.createElement('a'),
      cBTN = document.createElement('button'),
      cDIV = document.createElement('div'),
      cLI  = document.createElement('li'),
      cOL  = document.createElement('ol'),
      a, div, li, ol,
      _toc = cOL.cloneNode(false),
      toc = _toc,
      counter = 0,
      tags = ['h2', 'h3', 'h4', 'h5', 'h6'],
      level = 0,
      nl,
      hTags = [],
      proposedId,
      qs,
      lastLvl,
      prntIsH2Details,
      thisLvl,
      nextLvl,
      thisIsA,
      thisIsH2Details,
      nextIsA,
      title,
      tmp, tmp1,
      itemHref,
      elCL,
      cls,
      leaveOpenLvl = 2;

  oToc.clickedA = null;
  oToc.clickedLI = null;
  if (content.childNodes === 0) return;

  if (isCode) tocSearchLoad(content);

  cDIV.appendChild( cBTN.cloneNode(false) );

  _toc.id = 'toc_items';
  _toc.className = 'class lvl0';

  tmp = content.querySelectorAll('h1').length -
        content.querySelectorAll('h1.title').length -
        content.querySelectorAll('h1.alphaindex').length;

  if (tmp > 1) {
    tags.unshift('h1');
    leaveOpenLvl = 1;
  }

  lastLvl = parseInt(tags[0][1], 10);
//  tmp = tags.join(', ') + (isCode ? ', ul.summary.compact:not(.constants) a' : '');
  tmp = tags.join(', ');
  nl = content.querySelectorAll(tmp);
  // load nl into array hTags
  for (var i = 0, el; el = nl[i]; i++) { hTags.push(el); };

  // now, loop array
  for (var i = 0, el; el = hTags[i]; i++) {
    thisIsA = (isCode && el instanceof HTMLAnchorElement)

//      if (getPrntByIO(el, HTMLUListElement, true).classList.contains('constants'))
//        continue;

    thisLvl = thisIsA ? 3 : parseInt(el.tagName[1], 10);

    thisIsH2Details = (isCode && thisLvl === 2 &&
      (el.classList.contains('y_details') || el.textContent.match(/Details$/i)));

    if ( !thisIsH2Details && prntIsH2Details &&
      !el.classList.contains('signature') ) {
        continue;
    }

    if (isCode && !thisIsA && thisLvl > 3 &&
        (getPrntByIO(el, HTMLLIElement) instanceof HTMLLIElement)) {
      continue;
    }

//console.log(thisLvl + ' ' + (thisIsA ? 'T' : 'F') + ' ' +
//  ( (getPrntByIO(el, HTMLLIElement) instanceof HTMLLIElement) ? 'LI ' : '   ') + el.textContent);

    // nextLvl info, skip if in Code Details
    if (hTags[i+1] && (!isCode || (thisIsH2Details || !prntIsH2Details) )) {
//      if (hTags[i+1] && (!isCode || (thisIsH2Details && !prntIsH2Details) )) {
      tmp = hTags[i+1];
      if (isCode && tmp instanceof HTMLAnchorElement) {
        nextIsA = true;
        nextLvl = 3;
      } else if (isCode && !(getPrntByIO(tmp, HTMLLIElement) instanceof HTMLLIElement)) {
        nextLvl = parseInt(tmp.tagName[1], 10);
      } else if (!isCode) nextLvl = parseInt(tmp.tagName[1], 10);
    } else nextLvl = thisLvl;

    // need something for rendered objects in md files ??

    if (thisIsA) {
      // el is a 'summary.compact a', no children, title already parsed
      a = el.cloneNode(false);
      a.textContent = el.textContent;
      li = cLI.cloneNode(false);
    } else {
      // Get text for toc entry
      if (isCode) {
        title = tocCodeTitle(el, content, cls);
        cls = '';
        elCL = el.classList;
        if (thisLvl === 3 && elCL.contains('signature')) {
              // set up classes for method type indicators
          if (el.querySelector('strong.nodoc, div.note.nodoc') ||
              el.classList.contains('nodoc'))
//              (el.nextElementSibling &&
//               el.nextElementSibling.classList.contains('nodoc')) )
                                                  cls += 'nodoc ';
          if (el.parentElement.querySelector('div.note.deprecated'))
                                                  cls += 'deprecated ';
          if (el.querySelector('span.readonly'))  cls += 'ro ';
          if (elCL.contains('rw'))                cls += 'rw ';
          if (el.querySelector('span.writeonly')) cls += 'wo ';
          if (el.querySelector('span.priv'))      cls += 'priv ';
          if (el.querySelector('span.prot'))      cls += 'prot ';
          if (el.querySelector('span.mod_func'))  cls += 'mf ';
          cls = cls.trim();
        }
      } else {
        title = el.getAttribute('toc-title') || el.textContent;
      }
      // Set id on h tag if undefined
      if (isCode && thisLvl === 3 && el.parentElement.tagName === 'SECTION') {
        itemHref = el.parentElement.id;
      } else {
        itemHref = el.id;
      }
      if (itemHref.length === 0) {
        proposedId = el.getAttribute('toc-id') || el.textContent.toLowerCase().replace(/& /g, '-').replace(/[^a-z0-9-]+/g, '-');
        qs = /^[0-9]/.test(proposedId) ? '#\\' : '#';
        if ( /^-/.test(proposedId) ) proposedId = "_" + proposedId;
        if (proposedId === null || proposedId === '' ||
            content.querySelector(qs + proposedId) ) {
          proposedId = title.toLowerCase().replace(/& /g, '-').replace(/[^a-z0-9-]+/g, '-');
          // selectors can't start with an unescaped number
          if ( /\s*/.test(proposedId) ) proposedId = "_" + counter; counter++;
          qs = /^[0-9]/.test(proposedId) ? '#\\' : '#';
          if ( content.querySelector(qs + proposedId) )
            proposedId += counter; counter++;
        }
        el.id = proposedId;
        itemHref = proposedId;

      }
      // load a with title & href
      a = cA.cloneNode(false);
      if (cls !== '' && cls !== undefined) a.className = cls;
      a.setAttribute('href','#' + itemHref);

      if ( el.classList.contains('inherited') && /ed$/.test(title) && / - /.test(title) ) {
        tmp = document.createTextNode(/^\S+/.exec(title) + ' - ');
        a.appendChild(tmp);
        tmp = document.createElement("I");
        tmp.textContent = /\S+$/.exec(title);
        a.appendChild(tmp);
      } else a.textContent = title;

      // move back up
      if (thisLvl < lastLvl && toc) {
        for (var k = 0, newToc; k < lastLvl - thisLvl; k++) {
          level --;
          toc = getPrntByIO(toc, HTMLOListElement, true);
        }
      }
    }
    li = cLI.cloneNode(false);

    if (thisLvl < nextLvl) {
      // Has children, needs buttons, div, ol, etc
      level ++
      if (thisLvl > leaveOpenLvl) li.className = CN_CLOSED;

      div = cDIV.cloneNode(true);
      div.appendChild(a);
      li.appendChild(div);

      ol  =  cOL.cloneNode();
      ol.className = 'lvl' + level;
      li.appendChild(ol);
      for (var k = thisLvl + 1, t; k < nextLvl; k++) {
        level++;
        t = cOL.cloneNode();
        t.className = 'lvl' + level;
        ol.appendChild(t);
        ol = t;
      }
      if (toc) toc.appendChild(li);
      toc = ol;
    } else {
      li.appendChild(a);
//      if (cls !== '') li.className = cls;
//      toc.appendChild(li);
      if (toc) toc.appendChild(li);
    }
    lastLvl = thisLvl;
    if (isCode)
      prntIsH2Details = prntIsH2Details || thisIsH2Details;
  }

  // Done with toc, check for summary vs detail children, and maybe remove some
  //if (isCode) tocRemoveSummaryChildren(_toc);

  oToc.isOpenClose = (_toc.querySelector('button') !== null);
//  oToc.nav.replaceChild(_toc, oToc.items);
//  oToc.items = _id('toc_items');
  return _toc;
}

/* Highlights an item in the TOC pane
 * @param aDOM [HTMLAnchorElement] anchor with object / url info,
 * only the hash is used
 */
function toc_ShowClicked(aDOM) {
  var qs = 'a[href="' + decodeURIComponent(aDOM.hash.replace(/%-/, '%25-')) + '"]',
      eA = oToc.items.querySelector(qs);

  if (clickedBy === CB_TOC) {
    if (oToc.clickedLIOld) {
      oToc.clickedLIOld.classList.remove(CN_CLICKED);
      oToc.clickedLIOld = null;
    }
    if (oToc.clickedLI) oToc.clickedLI.classList.add(CN_CLICKED);
    return;
  }
  paneScrollTo(oToc, eA);
};

/* Event handler for TOC header click */
function tocClkHeader(e) {
  var tgt = e.target,
      tag = tgt.tagName,
      cancel = false;

  settingsCheck();
  switch (tag) {
  case 'BUTTON':
    if (tgt.id !== 'toc_sizer')
      paneOC(oToc, (tgt.className === 'y_plus'));
    cancel = true;
    break;
  case 'path':
    tag = 'svg';
    tgt = tgt.parentElement;
    /* falls through */
  case 'svg':
    if (tgt.id === 'toc_search_icon') {
      tocSearchClear();
      cancel = true;
    }
    break;
  }
  if (cancel) {
    e.stopPropagation();
    e.preventDefault();
    return false;
  }
}

/* Used with code documents, generates a table of contents entry from an element
 * @param el [HTMLElement] element to extract title from
 * @return [String] TOC title / entry
 */
function tocCodeTitle(el) {
  var title = ( el.getAttribute('toc-title') || el.textContent).trim(),
      thisLvl = parseInt(el.tagName[1], 10),
      rePlus = /^[\+\*\|\^]/,
      re,
      titleMain,
      titleSuf,
      pre = '',
      prnt,
      prntId,
      t;

  if (thisLvl === 2) {
    // removes small text, typically expand / collapse
    if (t = el.querySelector('small')) {
      titleSuf = t.textContent;
      if (titleSuf) {
        title = title.replace(titleSuf, '').trim();
      }
    }
    title = title.replace(/Attributes & Methods/, 'A & M');
  } else if (thisLvl === 3) {
    if ( el.classList.contains('signature') ) {
      if ( el.classList.contains('aws_waiter') ) {
        title = el.querySelector('strong').textContent.replace(/'/g, '');
      } else {
        // check id of section element
        prnt = el.parentElement;
        if (prnt.tagName === 'SECTION' &&
            prnt.classList.contains('method_details') ) {
          prntId = prnt.id;

          if ( t = el.querySelector('strong') ) {
            if (t.previousSibling && t.previousSibling.nodeType === 3 )
              pre = t.previousSibling.nodeValue.trim();
          }

          if ( RE_METH_CLS.test(prntId) )
            title = pre + prntId.replace(RE_METH_CLS, '');
          else if ( RE_METH_INST.test(prntId) )
            title = pre + prntId.replace(RE_METH_INST, '');

//            title = t2Info.CSEP + prntId.replace(RE_METH_CLS, '');
//            title = t2Info.ISEP + prntId.replace(RE_METH_INST, '');

          if (title) return title.replace(/[\(\s].*$/, '');
        }

        if (t = el.querySelector('small')) {
          title = title.replace(t.textContent, '').trim();
        }
        title = title.replace(/[( ][\s\S]*$/g, '');
        if (t = el.querySelector('strong')) {
          titleMain = t.textContent.replace(/\?/, "\\?");
          if ( rePlus.test(titleMain) )
            re = new RegExp('[#.]?\\' + titleMain);
          else
            re = new RegExp('[#.]?' + titleMain);
          if ( t = title.match(re) ) title = t[0];
        }
      }
    } else if ( el.classList.contains('inherited') ) {
      title = title.replace(/^.*?(inherited|included)[ ]+from/, "<i>$1 -");
    }
  }
  title = title.trim();
  return title;
}

/* Removes children from 'Summary' entries if they are similar to the 'Details'
 * entries
 * @param toc [HTMLOLElement]
 */
function tocRemoveSummaryChildren(toc) {
  var RE_SUMMARY = / Summary$/,
      RE_DETAILS = / Details$/,
      summaries = [],
      details   = [],
      checked,
      nl, i, j, txtS, txtD, el, elS, elD, qtyS, qtyD, a, t;

  nl = toc.childNodes;
  for (i = 0; el = nl[i]; i++) {
    txtS = el.firstElementChild.textContent;
    // push all entries that end in SUMMARY or DETAILS to arrays
    if (RE_SUMMARY.test(txtS)) summaries.push(el);
    if (RE_DETAILS.test(txtS)) details.push(el);
  }
  // loop thru summaries and look for matching details
  for (i = 0; elS = summaries[i]; i++) {
    checked = false;
    txtS = elS.firstElementChild.textContent.replace(RE_SUMMARY, '');
    for (j = 0; elD = details[j]; j++) {
      txtD = elD.firstElementChild.textContent.replace(RE_DETAILS, '');
      if (txtD === txtS) {
        nl = elS.querySelectorAll('ol > li');
        qtyS = nl.length - elS.querySelectorAll('a > i').length;
        qtyD = elD.querySelectorAll('ol > li').length;

        if (qtyS + 1 >= qtyD) {
          if ( elS.querySelector('a > i') ) {
            console.log('Remove ' + txtS);
            nl = elS.querySelectorAll('li');
            console.log(txtS + ' ' + nl.length);
            for (var k = 0, el; el = nl[k]; k++) {
              if ( !el.querySelector('a > i') )
                el.parentElement.removeChild(el);
            }
          } else {
            if ( t = elS.querySelector('ol') ) elS.removeChild(t);
            a = elS.querySelector('a').cloneNode(true);
            if (t = elS.querySelector('div'))
              elS.removeChild(t);
            elS.className = '';
            elS.appendChild(a);
          }
        }
        // break because a match was found
        break;
        checked = true;
      }
    }
    // Probably a constructor in class methods
    if (!checked && elS.querySelectorAll('ol > li').length === 1) {
      elS.removeChild(elS.querySelector('ol'));
      a = elS.querySelector('a').cloneNode(true);
      elS.removeChild(elS.querySelector('div'));
      elS.className = '';
      elS.appendChild(a);
    }
  }
}

//} @!endgroup

//{ @!group oToc Search Functions

/* Event handler for oList search input keypress */
function tocSearchKP(e) {
  var key = String.fromCharCode(e.which);
  if ( !RE_LIST_SEARCH.test(key) ) {
    e.stopPropagation();
    return true;
  }
}

function tocSearchCancel() {
  // console.log('tocSearchCancel');
};

/* Event handler for oTOC search input change */
function tocSearchChg(e) {
  var text = e ? e.target.value.trim() : _id('toc_search_text').value.trim(),
      t;

  if (text !== '') {
    _id('toc_search_icon').classList.add('s_clr');
    if (tocLastSearchText !== text) {
      tocSearchCancel();
    }
    tocLastSearchText = text;
    tocSearchExec(text);
  } else {
    tocSearchClear();
  }
}

/* Clears Toc search list
 */
function tocSearchClear() {
  var t;
  //oList.itemsSearch = 0;
  _id('toc_search_text').value = '';
  _id('toc_search_icon').classList.remove('s_clr');
  setWait(CB_LIST);
  setTimeout( function() {
    if (t = _id('toc_search_items') ) oToc.nav.removeChild(t);
    oToc.items.style.display = '';
    oToc.clickedA  = null;
    oToc.clickedLI = null;
    if (aDOMCur) toc_ShowClicked(aDOMCur);
    setWait();
  }, 10);
}

/* Creates the html DocFrag of search results
 * @param [array] array of search matches
 * @param [re]    regex for text highlighting
 * @return [DocumentFragment]
 */
function tocSearchCreate(list, re) {
  var li = document.createElement('li'),
      aa = document.createElement('a'),
      ss = document.createElement('small'),
      docFrag = document.createDocumentFragment(),
      a, sml,
      findText, replText, inHTML;

  for (var i = 0, sObj, newLI; sObj = list[i]; i++) {
    newLI = li.cloneNode(false);
    a = aa.cloneNode(false);

    findText = sObj.text;
    txt = findText.replace(/&/g, '&amp;');
    txt = txt.replace(/</g, '&lt;');
    txt = txt.replace(/>/g, '&gt;');

    sml = ss.cloneNode(false);
    sml.textContent = sObj.small;

    a.innerHTML = txt.replace(re, "<em>$1</em>");
    a.href = sObj.href;
    newLI.className = sObj.cls;

    newLI.appendChild(a);
    newLI.appendChild(sml);

    docFrag.appendChild(newLI);
  }
  return docFrag;
}

/* Performs the TOC search
 * @param text [String] text string to search for
 */
function tocSearchExec(text) {
  var re,
      results,
      ul = document.createElement('ul'),
      oldUl,
      txt, pre, t,
      isStart,
      reNS,
      tSt = performance.now(), tS;

  text = text.replace(/\s+/g, '');

  pre = text.charAt(0);
  if (pre === t2Info.CSEP || pre === t2Info.ISEP) {
    text = text.slice(1);
    if (pre === '.') pre = '\\.';
  } else pre = null;

  isStart = /[A-Z]/.test(text.charAt(0));

  // create RegEx for search, dependent on whether 1st letter is uppercase
  // escapes ? * + ^ | . $ [ ] ( ) { } in search string
  txt = text.replace(/([\?*+^|\.\$\[\]\(\)\{\}])/g, "\\$1");
  if (isStart) {
    if (pre)
      re = new RegExp('^' + pre + txt, 'i');
    else
      re = new RegExp('(^' + re_csep + txt + '|^' + re_isep + txt + '|^' + txt + ')', 'i');
  } else {
    if (pre)
      re = new RegExp('^' + pre + '.*?' + txt, 'i');
    else
      re = new RegExp(txt, 'i');
  }
  results = tocSearchInfo.filter( function (o) { return re.test(o.text); } );

  if (results.length > 0) {
    // sort objects via name then namespace
    results = results.sort();

    ul.className = LIST_ENUM[LIST_METHOD];

    // Create RegEx (re) for search string highlight
    txt = txt.replace(/&/g, '&amp;');
    txt = txt.replace(/</g, '&lt;');
    txt = txt.replace(/>/g, '&gt;');
    if (isStart) {
      if (pre)
        re = new RegExp('^(' + pre + txt + ')', 'i');
      else
        re = new RegExp('^([#\.]?' + txt + ')', 'i');
    } else {
      re = new RegExp('(' + txt + ')', 'ig');
    }
  }

  if (dbgSearchLoad) {
    tS = fmtTL(performance.now() - tSt, results.length);
    console.log('Search   exec    ' + tS + ' ' + text);
  }

  oToc.items.style.display = 'none';
  ul.id = 'toc_search_items';
  oldUl = _id('toc_search_items');
  ul.appendChild( tocSearchCreate(results, re) );
  if (oldUl)
    oToc.nav.replaceChild(ul, oldUl);
  else
    oToc.nav.appendChild(ul);
//  listSearchExec2();

//  t = null;
}

/* Used for tocSearchInfo array.  Mostly so results sort can be done using
 * @param cls [String]
 */
function TocSObj(cls, href, idx, small, text) {
  this.cls   = cls;
  this.href  = href;
  this.idx   = idx;
  this.small = small;
  this.text  = text;
}

TocSObj.prototype.toString = function TocSObjToString() {
//  return this.text.replace(re_meth_sep, '').toLowerCase() +
//    ("     " + this.idx).slice(-5);
  return this.text.replace(re_meth_sep, '').toLowerCase();
};

/* Loads an array of TocSObj objects with method info.
 */
function tocSearchLoad(content) {
  var int_meths = content.querySelectorAll('ul.compact a'),
      ext_meths = content.querySelectorAll('a.i_m'),
      i, j, el, cls, small,
      reMethTrim = new RegExp( '(' + re_csep + '|' + re_isep + ')\\S+?$' );

  tocSearchInfo = [];
  for (j = 0; el = int_meths[j]; j++) {
   tocSearchInfo.push( new TocSObj(el.className, el.href, i + j, '', el.textContent) );
  }

  for (i = 0; el = ext_meths[i]; i++) {
    cls = el.className.replace(/private/, 'priv').replace(/protected/, 'prot');

    new_id = decodeURIComponent(el.getAttribute('href'));
    new_id = new_id.replace(/(\.html)?#/, '_');
    new_id = new_id.replace(/^\.+\//, '');
    new_id = new_id.replace(/\//g, '_');

    el.id = new_id;

    cls = cls.replace(/i_m /, '').trim();
    small = el.title.match(/^\S+/)[0];
    if (small) small = small.replace(reMethTrim, '');
//    tocSearchInfo.push( new TocSObj(cls, el.href, i, small, el.textContent) );
    tocSearchInfo.push( new TocSObj(cls, '#' + new_id, i, small, el.textContent) );
  }
}

//} @!endgroup

//{ @!group Resizer Event Functions

/* event MouseDown
 */
function resizeMD(e) {
  var stateWid;

  e.preventDefault();
  e.stopPropagation();

  if (e.which !== 1) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  } else if (e.altKey || e.ctrlKey) {
    var elWid = this.e.offsetWidth,
        em = px30em/30.0,
        min, max;
    if (this === oList) {
      max = (LIST_MAX * em).toFixed(0); min = (LIST_MIN * em).toFixed(0);
    } else {
      max = ( TOC_MAX * em).toFixed(0); min = ( TOC_MIN * em).toFixed(0);
    }

    if (winType === 1 && this.d.docked)
      stateWid = state.display[1].widthDocked;
    else
      stateWid = this.d.width;

    if (e.altKey) {
      if (elWid == this.d.width) {
        this.s.width = (this.d.docked ? max : min) + 'px';
      } else {
        this.s.width = stateWid + 'px';
      }
    } else if (e.ctrlKey) {
      if (elWid == this.d.width) {
        this.s.width = (this.d.docked ? min : max) + 'px';
      } else {
        this.s.width = stateWid + 'px';
      }
    }
    return false;
  }

  resizerStWid = this.e.offsetWidth;
  this.s.width = resizerStWid + 'px';
  resizerStX = e.screenX;

  window.addEventListener('mousemove', this.resizeMM, false);
  window.addEventListener('mouseup'  , this.resizeMU, false);
  return false;
}

/* MouseMove */
function resizeMM(e) {
    var offset   = e.screenX - resizerStX,
        newWidth = resizerStWid + (this.d.docked ? offset : -offset),
        em = px30em/ 30.0,
        minW = em * (this === oList ? LIST_MIN : TOC_MIN),
        maxW = em * (this === oList ? LIST_MAX : TOC_MAX);

  newWidth = Math.max( Math.min(newWidth, maxW), minW);
  newWidth = newWidth.toFixed(0);
  this.s.width = newWidth + 'px';
  this.s.flexBasis = newWidth + 'px';
  if (winType === 1 && this.d.docked) cS.widthDocked = newWidth;
  else this.d.width = newWidth;
  // hdrDbg(newWidth + (this === oList ? '_List' : '_TOC') );
}

/* MouseUp */
function resizeMU(e) {
  var newWidth = this.e.offsetWidth;
  this.s.width = newWidth + 'px';
  this.s.flexBasis = newWidth + 'px';
  if (winType === 1 && this.d.docked) cS.widthDocked = newWidth;
  else this.d.width = newWidth;
  window.removeEventListener('mousemove', this.resizeMM);
  window.removeEventListener('mouseup'  , this.resizeMU);
  if (storage) storage.yardState = JSON.stringify(state);
  updateCSS();
}

/* TouchStart */
function resizeTS(e) {
  resizerStWid = this.e.offsetWidth;
  this.s.width = resizerStWid + 'px';
  resizerStX = e.touches[0].screenX;
  e.preventDefault();
  e.stopPropagation();
  window.addEventListener('touchmove', this.resizeTM, false);
  window.addEventListener('touchend' , this.resizeTE, false);
}

/* TouchMove */
function resizeTM(e) { this.resizeMM( e.touches[0] ); }

/* TouchEnd */
function resizeTE(e) {
  window.removeEventListener('touchmove', this.resizeTM);
  window.removeEventListener('touchend' , this.resizeTE);
  this.resizeMU(e);
}

//} @!endgroup

__loadPublicState();
__loadPublicState = undefined;

})();

//{ @!group Debug Functions

/* Debug info about document size, element count, etc
 * @param content [HTMLDIVElement]
 */
function dbgDocInfo(content) {
  var lenTC = content.textContent.length / 1024.0,
      lenInnerHTML = content.innerHTML.length / 1024.0,
      lenChildren = content.querySelectorAll('*').length;

  console.log( aDOMNext.href.match(/[^\/]+$/)[0].replace(/\.html/, '') +
    "\n  textContent   " + fmtL(lenTC) + ' KB' +
    "\n  innerHTML     " + fmtL(lenInnerHTML) + ' KB' +
    "\n  elements      " + fmtL(lenChildren)
  )
}

/* Debug info about doc loading timing
 */
function dbgDocLoad() {
  var ttl = oDbgDoc.xhrRSC + oDbgDoc.cbAdd + oDbgDoc.cbToDOM + oDbgDoc.render,
      xhrRSC  = oDbgDoc.xhrRSC,
      cbAdd   = oDbgDoc.cbAdd,
      cbToDOM = oDbgDoc.cbToDOM,
      render  = oDbgDoc.render,
      xhrRcv  = oDbgDoc.xhrRcv,
      hgt = 'na',
      t;

  if ( t = _id('footer') ) {
    hgt = t.offsetTop + t.offsetHeight;
    hgt = hgt / 1000.0;
  }

  ttl = ('      ' + Math.round(ttl)).slice(-7);

  console.log( aDOMCur.href.match(/[^\/]+$/)[0].replace(/\.html/, '') +
    "\n  DOC      TOTAL " + fmtT( ttl     ) +
    "\n  xhrRSC   parse " + fmtT( xhrRSC  ) +
    "\n  xhrCBDoc add   " + fmtT( cbAdd   ) +
    "\n  xhrCBDoc > DOM " + fmtT( cbToDOM ) +
    "\n  render         " + fmtT( render  ) +
    "\n  xhrRcv         " + fmtT( xhrRcv  ) +
    "\n  hgt pixels/1k "  + fmtL( hgt     )
  );
}

/* Debug info about list loading timing
 */
function dbgListLoad() {
  var ttl      = oDbgList.xhrRSC + oDbgList.cbProc + oDbgList.render;
      xhrRSC   = oDbgList.xhrRSC,
      cbAdd    = oDbgList.cbProc,
      render   = oDbgList.render,
      xhrRcv   = oDbgList.xhrRcv,
      items    = oList.itemQty,
      itemsVis = oList.itemsVis,
      elements = oDbgList.elements,
      hgt = oList.items.getBoundingClientRect().height / 1000.0;

  console.log( (oList.libRoot.replace(/\//g, '') + '               ').slice(0,17) +
    ' ' + _id('list_title').textContent +
    "\n  LIST   TOTAL   " + fmtT( ttl     ) +
    "\n  xhrRSC parse   " + fmtT( xhrRSC  ) +
    "\n  xhrCB  proc    " + fmtT( cbAdd   ) +
    "\n  render         " + fmtT( render  ) +
    "\n  xhrRcv         " + fmtT( xhrRcv  ) +
    "\n  hgt pixels/1k "  + fmtL( hgt     ) +
    "\n     ItemsVis   "  + fmtL( itemsVis) +
    "\n     Items      "  + fmtL( items   ) +
    "\n     Elements   "  + fmtL( elements)
  );
}

/* Formats a time for console
 * @param t [Number]
 * @return  [String]
 */
function fmtT(t) {
  return ( '        ' + Math.round(t).toLocaleString() ).slice(-6) + ' ms';
}

/* Formats an integer for console
 * @param l [Number]
 * @return  [String]
 */
 function fmtL(l) {
  return ('       ' + Math.round(l).toLocaleString()).slice(-7);
}

function fmtTL(t, l) {
  return fmtT(t) + ' ' + fmtL(l);
}

/* Debug to text area in main header */
function hdrDbg(str) {
  var el = _id('y_debug'),
      ary;
  if (!dbgYDebug || !el) return;
  ary = el.textContent.split(' ');
  ary[0] = str;
  el.textContent = ary.join(' ');
}

//} @!endgroup

//{ @!group Navigation & XHR Functions

/* Called when new documents finish rendering
 */
function finishDocLoad() {
  setWait();
  if (oXHRDoc instanceof XMLHttpRequest) oXHRDoc = null;
  docReady();
  eContent.tabIndex = 1;
  eContent.focus();
  clickedBy  = -1;
  if (dbgDocTiming) {
    console.timeStamp('xhrCBDoc Render Done');
    oDbgDoc.render = performance.now() - oDbgDoc.render;
    dbgDocLoad();
  };
};

/* Called anytime an anchor element is clicked, determines whether to call
 * xhrSend or gotoHash, loads url into aDOMNext
 * @param url [string] url to load
 */
function gotoDoc(url) {
  if (!isServer && url.slice(0,6) === '/file.') {
    aDOMNext.href = (oList.libRoot || '')  +  url.replace(/%-/, '%25-').slice(1);
  } else {
    aDOMNext.href = url.replace(/%-/, '%25-');
  }

  if (aDOMCur.origin !== aDOMNext.origin) {
    window.location = url;
    return false;
  }

  if (aDOMCur.pathname === aDOMNext.pathname && aDOMNext.hash) {
    gotoHash();
  } else {
    if (dbgDocTiming) console.timeStamp('xhrSend');
    if (oXHRDoc instanceof XMLHttpRequest) oXHRDoc.abort();
    setWait(CB_CONTENT);
    oXHRDoc = xhrSend(aDOMNext.href, xhrCBDoc);
  }
  return true;
}

/* Called when hash navigation is required, uses aDOMNext for info.  Always
 * called by TOC list 'clicks', as TOC links are always for the document
 */
function gotoHash() {
  var hash = decodeURIComponent(aDOMNext.hash.replace(/%-/, '%25-')  ),
      title = winTitle + hash,
      el = _id(hash.slice(1)),
      prnt,
      nl,
      t,
      elOffTop;

  if (!el) return;

  if (el.tagName === 'SECTION' && el.firstElementChild.tagName === 'H3')
    el = el.firstElementChild;
  if ( /-constant$/.test(hash) && (t = _id('t2_cnst')) ) {
    if (t.classList.contains('h') ) t.classList.remove('h');
  }

  if (eContentClicked) eContentClicked.classList.remove(CN_CLICKED);

  // for constants
  if (el.tagName === 'DT') {
    prnt = el.parentElement;
    if (prnt.classList.contains('constants'))
      // prnt is DL, DL > div > h2
      prnt.parentElement.previousElementSibling.classList.remove(CN_HIDDEN);
  }

  if (el instanceof HTMLAnchorElement && el.classList.contains('i_m') ) {
    nl = eContent.querySelectorAll('h2.h2_sum');
    for (var i = nl.length - 1, h2; h2 = nl[i]; i--) {
      if (el.compareDocumentPosition(h2) & 2) {
        h2.classList.remove(CN_HIDDEN);
        break;
      }
    }
  }

  if (el) {
    eContentClicked = el;
    el.classList.add(CN_CLICKED);
    if (oList.d.vis) oList.showClicked(aDOMNext);
    if ( oToc.d.vis)  oToc.showClicked(aDOMNext);
  } else {
    el = eContent.querySelector('a[name="' + hash.slice(1) +'"]');
  }

  if (el) {
    elOffTop = getOffsetTop(el);
    if (elOffTop === 0) {
      // constants have ids and maybe hidden by collapsed section
      if (el.parentElement.style.display === 'none') {
        el.parentElement.style.display = '';
        elOffTop = getOffsetTop(el);
      } else if (el.parentElement.parentElement.style.display === 'none') {
        el.parentElement.parentElement.style.display = '';
        elOffTop = getOffsetTop(el);
      }
    }
    if (clickedTop) {
      eContent.scrollTop = elOffTop - clickedTop;
    } else {
      el.scrollIntoView(true);
    }
//    eContent.focus();
    el.focus();
  }

  if (aDOMCur.href === aDOMNext.href) return;

  aDOMCur.href = aDOMNext.href;
  hash = aDOMCur.href;
  if (isWinHistory && (clickedBy !== CB_POP_STATE) ) {
    window.history.pushState({name: title, url: hash},
        title, hash.replace(/%-/, '%25-') );
  }
}

/* xhr callback function when a new main document is ready, called by
 * xhrReadyStateChange
 * @param docFrag [DocumentFragment] body element of url document
 * @param title   [String] \<head\>\<title\> textContent
 * @param url     [String]
 * @param status  [Integer]
 * @param ms      [Float]   time to parse docFrag
 * @param msRcv   {Float]   time from xhrSend to xhrRSC
 */
function xhrCBDoc(docFrag, title, url, status, ms, msRcv) {

  if (status !== 200 || docFrag === null) {
    setWait(-1);
    alert('xhrCBDoc - bad return with status ' + status + " from location\n" + url);
    if (clickedBy === CB_LIST) {
      oList.clickedLI = oList.clickedLIOld;
      oList.clickedA = null;
    }
    return;
  }

  var hash = decodeURIComponent(aDOMNext.hash).slice(1),
      oldMenu = document.getElementById('y_menu'),
      oldContent = eContent,
      oldLibRoot,
      newContentClicked,
      newToc,
      newContent,
      newMenu,
      loadMenu = false,
      eAList,
      aDOMTemp = document.createElement('a'),
      tEl,
      t, t1, nl, tSt, tEnd;

  if (dbgDocTiming) {
    console.timeStamp('xhrCBDoc Start');
    oDbgDoc.xhrRSC = ms;
    tSt = performance.now();
    oDbgDoc.xhrRcv = msRcv;
  }

  // get content and objectPath from docFrag, along with list url
  if ( t = getDocFragId(docFrag, 'content') ) {
    if (hash) newContentClicked = getDocFragId(docFrag, hash);
    t1 = t.parentElement;
    newContent = t1.removeChild(t);
  };

  // Can't load without both
  if (newContent === undefined || oldContent === undefined) return;

  if ( t = getDocFragId(docFrag, 'y_header') ) {
    if (t1 = getDocFragId(docFrag, 'y_menu') )
      newMenu = t.removeChild(t1);
    if (t1 = getDocFragId(docFrag, 'list_href') )
      eAList  = t.removeChild(t1);
  };

  docFrag = null;

  if (newMenu) {
    isServer = (newMenu.className === 'server');
    if (oldMenu) {
      oldMenu.removeEventListener('click', clkMenu);
      loadMenu = true;
    };
  };

  // Update history
  if (aDOMNext.href !== aDOMCur.href) {
    t = aDOMNext.pathname + (hash ? "#" + hash : '');
    if (isWinHistory && (clickedBy !== CB_POP_STATE) ) {
      window.history.pushState({name: title, url: t}, title, url);
    };
    aDOMCur.href = aDOMNext.href;
  };

//console.log("eAList\n" + eAList.getAttribute('href') + "\nurl\n" + aDOMNext.href.replace(/[^\/]+$/, ''));
//console.log(aDOMNext.href.replace(/[^\/]+$/, '') + eAList.getAttribute('href'));

  if (eAList) {
    eAList.href = aDOMNext.href.replace(/[^\/]+$/, '') + eAList.getAttribute('href');
    oList.load(eAList, false);
  }

  if (dbgDoc) dbgDocInfo(newContent);

  var eTitle  = document.documentElement.querySelector('head title'),
      eMain   = _id('y_main'),
      eHeader = _id('y_header');

  isZoomed = false;

  winTitle = title;

  oldContent.removeEventListener('click', clkContent);
  eContentClicked = null;
  newToc = addContent(newContent);

  if (!newContentClicked) {
    newContentClicked = newContent.querySelector('a[name="' + hash.slice(1) +'"]');
  } else if (newContentClicked.tagName === 'SECTION' && newContentClicked.firstElementChild.tagName === 'H3') {
    newContentClicked = newContentClicked.firstElementChild;
  }

  if (newContentClicked) {
    newContentClicked.classList.add(CN_CLICKED);
    eContentClicked = newContentClicked;
  }

  // below wraps tables in div element with overflow-x: auto
  t = Array.prototype.slice.call( newContent.querySelectorAll('table') );
  if (t.length > 0) {
    tEl = document.createElement('div');
    tEl.className = 'y_table';
    for (var i = 0, div, prnt, repl, tbl; tbl = t[i]; i++) {
      if (tbl.className === '') {
        div = tEl.cloneNode(false);
        prnt = tbl.parentElement;
        repl = prnt.replaceChild(div, tbl);
        div.appendChild(repl);
      }
    }
  }

  if (dbgDocTiming) {
    console.timeStamp('xhrCBDoc Add Done');
    oDbgDoc.cbAdd = performance.now() - tSt;
    tSt = performance.now();
  }

  // timeout to allow rendering
  setTimeout( finishDocLoad, 15);

  // all the replacements at once
  eMain.replaceChild(newContent, oldContent);
  oToc.nav.replaceChild(newToc, oToc.items);
  if (t = _id('toc_search_items')) oToc.nav.removeChild(t);

  if (loadMenu) eHeader.replaceChild(newMenu, oldMenu);
  eTitle.textContent = title;

  // Shows or hides TOC search (none for doc content)
  if (!isFirstLoad) tocSearchShowHide(newContent);

  // Scroll oList & oToc
  if (oList.d.vis) oList.showClicked(aDOMNext);
  oToc.items = _id('toc_items');
  if ( oToc.d.vis) {
    if (hash) oToc.showClicked(aDOMNext);
    else oToc.nav.scrollTop = 0;
  }

  newContent = null;
  newToc = null;
  newMenu = null;

  eContent = _id('content');

  if (eContentClicked) {
    // open constants section if closed
    if ( /-constant$/.test(hash) && (t = _id('t2_cnst')) ) {
      if (t.classList.contains('h') ) t.classList.remove('h');
    }
    if (clickedTop) {
      eContent.scrollTop = eContentClicked.offsetTop - clickedTop;
    } else {
      eContentClicked.scrollIntoView(true);
    }
  }

  if (dbgDocTiming) {
    console.timeStamp('xhrCBDoc ToDom Done');
    oDbgDoc.render  = performance.now();
    oDbgDoc.cbToDOM = oDbgDoc.render - tSt;
  }
}

/* xhr onerror function
 * @param _url  [String]
 * @param _func [Function] The function to call when done processing
 * @param status [Integer]
 */
function xhrOnError(url, func, xhr) {
  var status = xhr.status;
  xhr.onreadystatechange = null;
  xhr.onerror = null;
  setWait(-1);
  func(null, null, url, status, 0, 0);
  return false;
}

/* Receives xhr.responseXML, parses, loads into a DocumentFragment, which is
 *  returned to func callback.
 *
 * * Parses title element string
 * * Parses to just children of the body element
 * * Removes any script elements
 * @param url  [String]
 * @param func [Function] callback
 * @param xhr  [XMLHttpRequest]
 * @param pn   [Float] performance.now
 */
function xhrReadyStateChange(url, func, xhr, pn) {
 if (xhr.readyState === 4) {
    if (xhr.status === 200) {
      var title,
          docFrag = document.createDocumentFragment(),
          topDiv = document.createElement('div'),
          doc = xhr.responseXML,
          tRcv, tSt, tParse, nl, temp;

      if (dbgDocTiming || dbgListTiming) {
        console.timeStamp('xhrRSC Start');
        tSt = performance.now();
        tRcv = tSt - pn;
      }
      if (doc === '') {
        func(null, null, url, 404, 0, tRcv);
        return;
      }

      if (temp = doc.querySelector("head > title")) {
        title = temp.innerHTML;
        title = title.replace(/[\v\n\r]+/g, ' ');
        title = title.replace(/&nbsp;/g, ' ');
        title = title.replace(/ [^\w\d] /, ' - ').trim();
      } else title = '';

      if (temp = doc.querySelector("head")) {
        // console.log("Deleting head");
        temp.parentElement.removeChild(temp);
      };

      nl = doc.body.querySelectorAll('script');
      for (var k = 0, el; el = nl[k]; k++) {
        el.parentElement.removeChild(el);
      };

      docFrag.appendChild(doc.body);
      // console.log(doc.body);
      doc = null;
      xhr.onreadystatechange = null;
      xhr.onerror = null;

      if (dbgDocTiming || dbgListTiming)
        tParse = performance.now() - tSt;

      func(docFrag, title, url, 200, tParse, tRcv);
      docFrag = null;
      xhr.onreadystatechange = null;
      xhr.onerror = null;
      xhr = null;
    } else if (xhr.status === 404) {
      // below is for RDoc links
      if (/classes\//.test(url) ) {
        url = url.replace(/classes\//, '');
        aDOMNext.href = aDOMNext.href.replace(/classes\//, '');
        xhr.open("GET", url , true);
        xhr.responseType = 'text';
        xhr.setRequestHeader('Content-Type', 'text/html');
        xhr.send();
        return false;
      }
      xhr.onreadystatechange = null;
      xhr.onerror = null;
      func(null, null, url, 404, tParse, tRcv);
    }
  }
}

/* Preps, opens, and sends the xhr request
 * @param url  [String]
 * @param func [Function] The function to call when done processing
 * @return [XMLHttpRequest] xhr object, used for abort
 */
function xhrSend(url, func) {
  var aDOM = document.createElement('a'),
      xhr = new XMLHttpRequest(),
      tSt,
      reFullHost = /^[^:]+:\/\/[^\/]+/;

  aDOM.setAttribute('href', url);

  if (reFullHost.exec(aDOM.href)[0] !== reFullHost.exec(location.href)[0]) {
    func(null, url);
    return;
  };
  tSt = performance.now();
  xhr.onreadystatechange = xhrReadyStateChange.bind({}, url, func, xhr, tSt);
  xhr.onerror = xhrOnError.bind({}, url, func, xhr);

  xhr.open("GET", url , true);
  xhr.responseType = 'document';
  xhr.setRequestHeader('Content-Type', 'text/html');
  xhr.send();
  return xhr;
}

//} @!endgroup

//{ @!group Misc & Helper Functions

/* Convenience method for document.getElementById()
 *  @param id  [String]
 *  @return    [HTMLElement]
 */
function _id(id) {
  //if (id === '' || !id) debugger;
  return document.getElementById(id);
}

/* Changes font size in state, then calls {setFontSize}.
 * @param [Boolean] up up for increased fontSize, otherwise decrease.
 */
function changeFontSize(up) {
  var fs = parseInt(state.fontSize.replace('px', '') || '15px') + (up ? 1 : -1);
  if      (fs <= 12)  fs = 12;
  else if (fs >= 18)  fs = 18;
  state.fontSize = fs + 'px';
  if (storage) storage.yardState = JSON.stringify(state);
  setFontSize();
  if (_id('settings').className === 'show') settingsSetData();
};

/* Cleans white space nodes from prnt.
 * @param [HTMLElement] prnt
 */
function clean(prnt) {
  for (var i = 0, el; el = prnt.childNodes[i]; i++) {
    if ( (el.nodeType === Node.TEXT_NODE && !/\S/.test(el.nodeValue)) ||
          el.nodeType === Node.COMMENT_NODE) {
      prnt.removeChild(el);
      i --;
    }
    else if (el.nodeType === Node.ELEMENT_NODE) clean(el);
  };
};

function commonLoad() {
  var foundHRef;
  for (var i = 0, ss; ss = document.styleSheets[i]; i++) {
    if ( /y_style\.css$/.test(ss.href) ) {
      foundHRef = ss.href.replace(/css\/y_style.css$/, 'xhr/common.html');
      xhrSend(foundHRef, commonXhrCB);
      break;
    };
  };
};

function commonInsert(docFrag, elId) {
  var newPrnt = _id(elId),
      oldPrnt = isGetElByIdInDocFrag ? docFrag.getElementById(elId) : docFrag.querySelector("#" + elId),
      el;
  clean(oldPrnt);
  while (el = oldPrnt.firstElementChild) { newPrnt.appendChild(el); };
};

function commonXhrCB(docFrag, title, url, status, ms, msRcv) {
  var eAList = _id('list_href').cloneNode(false),
      el;
  if (status !== 200 || !docFrag) {
    setWait();
    return;
  };

  if (_id('y_header').children.length === 5) {
    commonInsert(docFrag, 'y_header');
//    setFSTitles();
  };
  if (!_id('list_header').firstElementChild) {
    commonInsert(docFrag, 'list_header');
  };
  if (!_id('toc_header').firstElementChild) {
    commonInsert(docFrag, 'toc_header');
  };
  if (!_id('settings').firstElementChild) {
    commonInsert(docFrag, 'settings');
  };

  // Add events to items added above
  oPane.firstDOMLoad(true);
  _id('hdr_button').addEventListener('click'        , clkHdrBtn         , false);
  _id('settings'  ).addEventListener('click'        , clkSettingWindow  , false);

  // Load list
  if (eAList) oList.load(eAList);
  // Set LIST and TOC button state in main header
  oList.bVis = _id('list_vis');
  oList.bVis.className = oList.d.vis ? CN_BTN_VIS : CN_HIDDEN;
  oToc.bVis  = _id('toc_vis');
  oToc.bVis.className = oToc.d.vis ? CN_BTN_VIS : CN_HIDDEN;
  // Set source button state
  _id('src').className = state.showSource ? 'o' : 'c';
  _id('src').disabled = !eContent.querySelector('a.toggleSource')
  // Shows or hides TOC search (none for doc content)
  tocSearchShowHide(eContent);
};

/* To match Ruby CGI.escape /([^ a-zA-Z0-9_.-]+)/
 * @param str [String] unescaped string
 * @return [String] escaped string
 */
function encodeStr(str) {
  return str.replace(/[^ a-zA-Z0-9_.-]/g, encodeChar );
}

/* Escape string as valid regex
 * @param str [String] unescaped string
 * @return [String] escaped string
 */
function escapeRegEx(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

/* IE fun...
 *
 */
function getDocFragId(frag, id) {
  if (isGetElByIdInDocFrag)
    return frag.getElementById(id);
  else
    var escId = id.replace(/[`<>&\[\]/{}()*+?!.\^$|=@-]/g, "\\$&")
    // console.log(escId);
    return frag.querySelector('#' + escId);
};

function tocSearchShowHide(content) {
  cls = content.className;
  if (cls === 'module' || cls === 'class' || cls === 'method') {
    _id('toc_search_text').style.display = '';
    _id('toc_search_text').value = '';
    _id('toc_search_icon').style.display = '';

  } else {
    _id('toc_search_text').style.display = 'none';
    _id('toc_search_icon').style.display = 'none';
  }
}

/* Used to match encoding of method list, two % replace statements for FireFox's
 * handling of '<' and '>'
 * @param str [String] unescaped string
 * @return [String] escaped string
 */
function t2EncodeStr(str) {
  //str = str.replace(/[\/\.?+%]/g, encodeChar);
  // encode + 2B   / 2F   ? 3F
  //  str = str.replace(/[\/\.?+]/g, encodeChar);

  str = str.replace(/[`\/?+%^]/g, encodeChar);
  str = str.replace(/%3C/g, '\<' );
  str = str.replace(/%3E/g, '\>' );
//str = str.replace(/%3F/g, '\?>' );
  return str;
}

/* Return escaped char
 * @param c [Char] single character string
 * @return [String] escaped string, ie '!' => '%21'
 */
function encodeChar(c) {
  return '%' + c.charCodeAt(0).toString(16).toUpperCase();
}

/* Finds a css rule.
 * @param [String] file base file name of stylesheet
 * @param {String] rule selectorText of rule
 */
function getCSSRule(file, rule) {
  var foundRule,
      re = new RegExp( escapeRegEx(file) );
  for (var i = 0, ss; ss = document.styleSheets[i]; i++) {
//    if ( ss.href.endsWith(file) ) {

    if ( re.test(ss.href) ) {
      cssRules = ss.cssRules;
      for (var j = 0, cssRule; cssRule = cssRules[j]; j++) {
        // style
        if (cssRule.selectorText === rule) {
          foundRule = cssRule;
          break;
        };
      };
      break;
    };
  };
  return foundRule;
};

/* Finds the first parent element whose class matches using instanceof.
 * @param el [HTMLElement]
 * @param io [class HTMLElement] instanceof comparision class
 * @param notCurrent [Boolean] optional, whether to not test el parameter,
 *   if not specified, function will test el
 * @return [HTMLElement] the parent element matching io
 */
function getPrntByIO(el, io, notCurrent) {
  if (!notCurrent && el instanceof io) return el;
  var prnt = el.parentElement;
  while ( prnt && !(prnt instanceof io)) { prnt = prnt.parentElement; }
  return prnt;
}

/* returns offsetTop of element
 * @param el [HTMLElement]
 * @return [Integer] total offsetTop
 */
function getOffsetTop(el) {
  var y = el.offsetTop;
  while (el = el.offsetParent) { y += el.offsetTop; }
  return y;
}

/* Shows 'wait' svg
 * @param type [Integer, null] CB_CONTENT or CB_LIST, null to clear
 */
function setWait(type) {
  var oBCR,
      oBCRW,
      itemsX,
      eWait = _id('y_wait'),
      cls = isTouch ? 'text' : 'run',
      halfWid = 0.5 * waitWidth,
      t;

  if (type === CB_CONTENT) {
    oBCR = eContent.getBoundingClientRect();
    eWait.style.top  = Math.round(oBCR.top  + halfWid) + 'px';
    eWait.style.left = Math.round(oBCR.left  + oBCR.width/2.0 - halfWid) + 'px';
    eWait.setAttribute('class', cls);
  } else if (type === CB_LIST) {
    // oList.items maybe hidden due to search
    if (t = _id('list_search_items') ) {
      oBCRW = t.getBoundingClientRect();
      itemsX = oBCRW.left + oBCRW.width/2.0;
    }
    if ( !(itemsX > 15 )) {
      if (oList.items) {
        oBCRW = oList.items.getBoundingClientRect();
        itemsX = oBCRW.left + oBCRW.width/2.0;
      }
    }
    if ( !(itemsX > 15 )) {
      oBCR = oList.nav.getBoundingClientRect();
      itemsX = oBCR.left + oBCR.width/2.0;
    }
    oBCR = _id('list_header').getBoundingClientRect();
    eWait.style.top  = Math.round(oBCR.top + oBCR.height + halfWid) + 'px';
    eWait.style.left = Math.round(itemsX   - halfWid) + 'px';
    eWait.setAttribute('class', cls);
  } else
    eWait.setAttribute('class', '');
}

/* Globally shows / hides source code
 * @param content  [HTMLElement] the content element
 * @param showCode [Boolean]     true to show source
 */
function sourceShowHide(content, showCode) {
  var src =  content.querySelectorAll('section div.source_code'),
      sToggle = content.querySelectorAll('span.showSource a.toggleSource'),
      len,
      top = 0.0,
      eShow,
      hdrBottom = _id('y_header').getBoundingClientRect();

  hdrBottom = hdrBottom.top + hdrBottom.height;

  if (eContentClicked) {
    top = Math.round(eContentClicked.getBoundingClientRect().top);
  }
  if (hdrBottom < top && top < winHeight) {
    eShow = eContentClicked;
  } else {
    var nl = eContent.querySelectorAll('h2, h3');
    // eContentClicked not visible
    for (var i = 0, el, topTest; el = nl[i]; i++) {
      topTest = el.getBoundingClientRect().top;
      if (hdrBottom < topTest && topTest < winHeight) {
        top = Math.round(topTest);
        eShow = el;
        break;
      }
    }
  }

  len = src.length - 1;

  if (showCode) {
    _id('src').className = 'o';
    for (var i = len; i >= 0; i--) {
      src[i].classList.remove(CN_HIDDEN);
      sToggle[i].textContent = sToggle[i].textContent.replace(/^view/, 'hide');
    }
  } else {
    _id('src').className = 'c';
    for (var i = len; i >= 0; i--) {
      src[i].classList.add(CN_HIDDEN);
      sToggle[i].textContent = sToggle[i].textContent.replace(/^hide/, 'view');
    }
  }

  if (top !== 0.0) {
    top = eContent.scrollTop + Math.round(eShow.getBoundingClientRect().top) - top;
    eContent.scrollTop = top;
  }
}

/* Called when Summary h2 elements are clicked
 * @param tgt [HTMLAnchorElement]
 */
function summaryToggle(tgt) {
  var nlToggles = eContent.querySelectorAll('h2.h2_sum'),
      rTop = tgt.offsetTop - eContent.scrollTop,
      isHidden = tgt.classList.contains(CN_HIDDEN),
      a, h2El;

  nlToggles = Array.prototype.slice.call(nlToggles);

//  if (nlToggles.length > 0) {
    // code below for js constants & variables, assumes they're
    // singular and at the top of the nodelist
//    h2El = nlToggles[0];
//   if (h2El.id === 'js_h2_cv') {
//      a = nlToggles.shift();
//      a.textContent = text;
//      grandParent.nextElementSibling.style.display = (text === 'collapse') ? '' : 'none';
//    }
//  }

  len = nlToggles.length - 1;
  if (isHidden) {
    for (var i = len; i >= 0; i--) { nlToggles[i].classList.remove(CN_HIDDEN); }
  } else {
    for (var i = len; i >= 0; i--) { nlToggles[i].classList.add(CN_HIDDEN); }
  }
  eContent.scrollTop = tgt.offsetTop - rTop;
  state.summaryCollapsed = !isHidden;
  if (storage) storage.yardState = JSON.stringify(state);
}

/* Sets width and height of Settings transition style.
 * @param [Integer] wid width of Settings div
 * @param [Integer] hgt height of Settings div
 */
function settingsSetCSS(type) {
  var el   = _id('settings');

  if (type === 'in')          el.className = 'show';
  else if (type === 'out')  el.className = '';
  else alert("Parameter Error setSettingsCSS!");
};

/* Sets settings 'window' items */
function settingsSetData() {
  var scrnChar = Math.floor(50.0 * screen.availWidth / px50Char),
      scrnType = scrnChar > MED_LRG ? 2 : (scrnChar > SML_MED ? 1 : 0),
      fs = state.fontSize;
  settingsSetTitles(fs);
  _id('b2').textContent = winType;
  _id('c2').textContent = scrnType;
  _id('b3').textContent = Math.floor(50.0 * winWidth / px50Char);
  _id('c3').textContent = scrnChar;
  _id('a5').textContent = 'Font ' + fs;

  if (fs === '12px') changeClass( _id('font_sml'), CN_BTN_VIS, null      , true, true);
  else               changeClass( _id('font_sml'), null      , CN_BTN_VIS, true, false);

  if (fs === '18px') changeClass( _id('font_lrg'), CN_BTN_VIS, null      , true, true);
  else               changeClass( _id('font_lrg'), null      , CN_BTN_VIS, true, false);

  if (winType === 0) {
    changeClass( _id('list_dock'  ), CN_BTN_VIS, null      , null, true);
    changeClass( _id('toc_dock'   ), CN_BTN_VIS, null      , null, true);
    changeClass( _id('list_float' ), null      , 'selected', null, true);
    changeClass( _id('toc_float'  ), null      , 'selected', null, true);
  } else {
    changeClass( _id('list_dock' ), null, 'selected',  oList.d.docked, null);
    changeClass( _id('list_float'), null, 'selected', !oList.d.docked, null);
    changeClass( _id('toc_dock'  ), null, 'selected',   oToc.d.docked, null);
    changeClass( _id('toc_float' ), null, 'selected',  !oToc.d.docked, null);
  };
};

/* Sets title of font size buttons */
function settingsSetTitles(_fs) {
  var fs = parseInt( (_fs || state.fontSize).replace('px', '') );
  if (fs <= 12) {
    _id('font_sml').title = '12px'         ; _id('font_lrg').title = '13px';
  } else if (fs >= 18) {
    _id('font_sml').title = '17px'         ; _id('font_lrg').title = '18px';
  } else {
    _id('font_sml').title = (fs - 1) + 'px'; _id('font_lrg').title = (fs + 1) + 'px';
  };
};

/* Used to check whether settings 'window' is open and shoud be closed.  Called
 * from various event handlers.
 */
function settingsCheck() {
  var el = _id('settings');
  if ( el && el.className === 'show') settingsSetCSS('out');
}

/* Adds / removes classes from an element, also can disable.
 * @param [HTMLElement]   el      id of element
 * @param [String, null]  rmvCls  class to remove
 * @param [String, null]  addCls  class to add
 * @param [Integer, null] blnAdd  null no action, false remove addCls,
 *    true adds addCls
 * @param [Integer, null] blnDis  disable flag if not null
 */
function changeClass(el, rmvCls, addCls, blnAdd, blnDis) {
  var cl = el.classList;
  if (rmvCls) cl.remove(rmvCls);
  if (addCls) {
    if      (blnAdd === true)  cl.add(addCls);
    else if (blnAdd === false) cl.remove(addCls);
  };
  if (blnDis !== null) el.disabled = blnDis;
}

//} @!endgroup

//{ @!group Add Doc Content Functions

/* Main function that calls the remainder of the 'add' functions
 * @param content [HTMLDIVElement] the content div element
 */
function addContent(content) {
  var cls = content.className,
      toc, t, footer;

  if (t2GA instanceof Function) t2GA('send', 'pageview', aDOMNext.pathname);

  // for javascript files
  if ( typeof hljs !== 'undefined' &&
      hljs.highlightElement instanceof Function ) {
//    var nl = content.querySelectorAll('pre.code.javascript, pre.code.cpp');
    var nl = content.querySelectorAll('pre.code');
    for (var i = 0, el; el = nl[i]; i++) {
      if ( !(el.classList.contains('ruby') || el.classList.contains('example') ) )
        hljs.highlightElement(el);
    }
  }

  if (cls === 'module' || cls === 'class' || cls === 'method') {
    removeEmptyDocString(content);

    t = content.querySelector('#h2_overview');
    if (state.overviewCollapsed && t) t.classList.add(CN_HIDDEN);

    t = content.querySelector('#t2_relations');
    if (state.relationsCollapsed && t) {
      t.classList.add(CN_HIDDEN);
      // td > tr > thead > table
      var tbody = t.parentElement.parentElement.parentElement.querySelector('tbody');
      tbody.style.display = 'none';
    }

    addWhiteSpace(content);
    addLineNumbers(content);
    addShowSource(content);
    addSummaryCompact(content);
    toc = oToc.generate(content, true);
    if (isServer && cls !== 'method') addPermaLinks(content);
    t = content.querySelector('a.toggleSource');
  } else {
    toc = oToc.generate(content, false);
    t = false;
  }
  if ( _id('src') ) _id('src').disabled = !t;   // Source open/close button

  addFooter(content);

  return toc;
}

/* Adds footer children
 * @param content [HTMLDIVElement] the content div element
 */
function addFooter(content) {
  var footer = content.querySelector('#footer'),
      el;

  if (footer && footer.children.length === 0 &&
      elLibFooter && elLibFooter.children.length > 0) {
    while (el = footer.firstElementChild) { footer.removeChild(el); };
    for (var i = 0, node; node= elLibFooter.childNodes[i]; i++) {
      footer.appendChild(node.cloneNode(true));
    };
    // console.log("elLibFooter " + elLibFooter.textContent.length + "  footer " + footer.textContent.length);
  };
};

/* Adds Line number text to code segments
 * @param content [HTMLDIVElement] the content div element
 */
function addLineNumbers(content) {
  var nl = content.querySelectorAll('div.source_code pre.lines_num'),
      numStart,
      numEnd,
      str;

  for (var i = 0, el; el = nl[i]; i++) {
    if (el.textContent == '') {
      numStart = Number(el.dataset.start);
      numEnd = Number(el.dataset.end);
      if (numStart > 0) {
        str = "\n\n";
        for (var j = numStart; j <= numEnd; j++) {
          str += j + "\n";
        }
        el.textContent = str;
      }
    }
  }
}

/* If running server, adds the 'permalink' to method signatures in
 *  detail sections
 * @param content [HTMLDIVElement] the content div element
 */
function addPermaLinks(content) {
  var nl = content.querySelectorAll('section h3.signature'),
      a = document.createElement('a'),
      docPath = aDOMNext.pathname;

  a.className   = 'permalink';
  a.textContent = 'permalink';

  for (var i = 0, el, aa, href; el = nl[i]; i++) {
    aa = a.cloneNode(true);
    href = el.parentElement.id;
    if ( /-class_method$/.test(href) )
      href = '.' + href.replace(/-class_method$/, '');
    else
      href = ':' + href.replace(/-[a-z_]+$/, '');
    href = href.replace(/\?$/, '%3F');
    aa.setAttribute('href', docPath + href);
//      el.appendChild(aa);
    el.insertBefore(aa, el.firstChild);
  }
}

/* Adds the 'view / hide source' elements for source code
 * @param content [HTMLDIVElement] the content div element
 */
function addShowSource(content) {
  var nl = content.querySelectorAll('section.method_details div.source_code'),
      span = document.createElement('span'),
      spc = String.fromCharCode(8202),
      showSource = state.showSource;

  span.className = 'showSource';
  span.innerHTML = "[" + spc + "<a href='#' class='toggleSource'>" +
    (showSource ? T_HIDE_SRC : T_VIEW_SRC) + "</a>" + spc + "]";

  if ( _id('src') ) _id('src').disabled = (nl.length === 0);

  for (var i = 0, el; el = nl[i]; i++) {
    if (showSource) el.classList.remove(CN_HIDDEN);
    else            el.classList.add(CN_HIDDEN);
    if (el.previousElementSibling.className === 'link_repo')
      el = el.previousElementSibling;
    el.parentElement.insertBefore( span.cloneNode(true) , el);
  }
}

/* Add elements for compact summaries
 * @param content [HTMLDIVElement] the content div element
 */
function addSummaryCompact(content) {
//var nl = content.querySelectorAll('ul.summary.full'),
  var nl = content.querySelectorAll('ul.summary'),
      ulFull,
      ulCompact,
      isConstant,
      remove,
      nlChildren,
      prnt,
      grandParent,
      fullVis = !state.summaryCollapsed,
      compactVis = state.summaryCollapsed,
      eANew,
      eId,
      eA  = document.createElement('a'),
      eUL = document.createElement('ul'),
      eLI = document.createElement('li'),
      t;

  // Loop thru all the 'summary full' ul elements, clone for compact summaries,
  // then remove content
  for (var i = 0; ulFull = nl[i]; i++) {
    ulCompact = eUL.cloneNode(false);
    ulFull.classList.add('full');
    ulCompact.className = ulFull.className.replace(' full', ' compact');
    isConstant = ulFull.classList.contains('constants');
    // get anchor elements, clean up, append to ulCompact
    if (isConstant)
      nlChildren = ulFull.querySelectorAll('span.summary_signature');
    else
      nlChildren = ulFull.querySelectorAll('span.summary_signature a');

    for (var j = 0, a, li, cls; a = nlChildren[j]; j++) {
      if (isConstant) {
        cls = a.className.replace(/^summary_signature/, 'cnst_a').trim();
        eANew = eA.cloneNode();
        eANew.href = '#' + a.id;
        eANew.textContent = a.textContent.replace(/ =$/, '');
      } else {
        cls = a.parentElement.className.replace('summary_signature', '').trim();
        if (a.parentElement.parentElement.classList.contains('deprecated'))
          cls += ' deprecated';
        eANew = a.cloneNode(true);
        // remove text in anchor but only after strong
        for (var k = 0, child, del = false; child = eANew.childNodes[k]; k++) {
          if (del) {
            eANew.removeChild(child);
            k--;
          } else {
            del = (child.nodeType === 1 && child.tagName === 'STRONG');
          }
        }
        // remove anything after anchor
        while (t = eANew.nextSibling) {
          eANew.parentElement.removeChild(t);
        }
      }

      if (cls !== '') eANew.className = cls;

      li = eLI.cloneNode(false);
      li.appendChild(eANew);
      ulCompact.appendChild(li);
    }
    ulFull.parentElement.insertBefore(ulCompact, ulFull);
  }

  if (compactVis) {
    nl = content.querySelectorAll('h2.h2_sum');
    for (var i = 0, el; el = nl[i]; i++) { el.classList.add(CN_HIDDEN); }
  }
}

/* Adds small unicode space characters to long document titles, long class names
 * in particular.  This allows the text to wrap.  Without this, the long names
 * would force the document window width larger than the UI accomodates.
 * @param content [HTMLDIVElement] the content div element
 */
function addWhiteSpace(content) {
  var title = content.querySelector('h1'),
      spc = String.fromCharCode(8202);

  if (title && title.textContent.length > 40) {
    for (var i = 0, node; node = title.childNodes[i]; i++) {
      if (node.nodeType === 3) {
        node.nodeValue = node.nodeValue.replace(/::/g, '::' + spc);
        node.nodeValue = node.nodeValue.replace(/([a-z])([A-Z])/g, "\$1" + spc + "\$2");
      }
    }
  }
}

/* removes empty docstring divs
 * @param content [HTMLDIVElement] the content div element
 */
function removeEmptyDocString(content) {
  var nl = content.querySelectorAll('div.docstring, div.tags'),
      prnt;
  for (var i = 0, el; el = nl[i]; i++) {
    if (el.textContent.trim() === '') {
      prnt = el.parentElement;
      prnt.removeChild(el);
    }
  }
  nl = null;
}

//} @!endgroup

//{ @!group Window & Main Doc Event Handlers

/* Event handler for main header button click.  At present, the only active
 * controls are the four Pane control button, which are called via oPane.mainClk.
 */
function clkHdrBtn(e) {
  var tgt = e.target,
      tag = tgt.tagName,
      cls = tgt.className,
      id = tgt.id;

  if (tag === 'CODE'  || tag === 'svg' || tag === 'SPAN') {
    // move up to button (code element used for the triangles)
    tgt = tgt.parentElement;
    tag = tgt.tagName;
    cls = tgt.className;
    id  = tgt.id;
  } else if (tag === 'rect' || tag === 'path') {
    tgt = tgt.parentElement.parentElement;
    tag = tgt.tagName;
    cls = tgt.className;
    id  = tgt.id;
  }

  if (tgt instanceof HTMLButtonElement) {
    if (tgt.disabled) return;
    switch (id) {
      case 'src':
        settingsCheck();
        state.showSource = (_id('src').className === 'c');
        if (storage) storage.yardState = JSON.stringify(state);
        sourceShowHide(eContent, state.showSource);
        break;
      case 'sh_settings':
        el = _id('settings');
        el.style.willChange = 'opacity, max-height, max-width';
        settingsSetData();
//        if (el.className === 'hidden') {
        if (el.className !== 'show') {
//          el.className = '';
          settingsSetCSS('in');
        } else {
          settingsSetCSS('out');
        };
        break;
      default:
        settingsCheck();
        if ( HDR_PANE_BTNS.indexOf(id) > -1 )
          oPane.mainClk(id);
        break;
    };
  } else settingsCheck();
};

/* Event handler for main header Namespace/Object path click.  Locates the URL,
 * then calls gotoDoc.
 */
function clkMenu(e) {
  var tgt = e.target,
      url,
      cancel = false;

  settingsCheck();

  if (tgt instanceof HTMLAnchorElement) {
    if (tgt.id === 't2_doc_top') {
      eContent.scrollTop = 0;
      cancel = true
    } else if (!e.ctrlKey) {
      if (tgt.id === 'home_no_xhr') { return true }
      url = tgt.href;
      if (url) {
        clickedBy = CB_OBJ_PATH;
        if ( /github\.io/i.test(url) && /\/_index\.html$/.test(url) )
          url = url.replace(/\/_index\.html$/, '/y_index.html');
        gotoDoc(url);
        cancel = true;
      }
    }
  }
  if (cancel) {
    e.stopPropagation();
    e.preventDefault();
    return false;
  }
}

/* Event handler for content click.  Manages the content UI. */
function clkContent(e) {
  var tgt = e.target,
      tag = tgt.tagName,
      cls = tgt.className,
      clsList,
      id = tgt.id,
      eA,
      hash,
      prnt,
      len,
      cancel = false,
      reCls = /(toggleSource|summary_signature|h2_sum|h2_sum nodoc|cnst_a)/,
      reIds = /(h2_overview|t2_defined_in|t2_relations|t2_inherits)/,
      attrHRef = tgt.getAttribute('href');

  settingsCheck();

  // standard internal link
  if (attrHRef && /^#\S+/.test(attrHRef)) { return true };

  if (reIds.test(id)) {
    var t;
    clsList = tgt.classList;
    switch (id) {
    case 'h2_overview':
      state.overviewCollapsed = tgt.classList.toggle(CN_HIDDEN);
      if (storage) storage.yardState = JSON.stringify(state);
      cancel = true;
      break;
    case 't2_defined_in':
      t = getPrntByIO(tgt, HTMLTableRowElement).querySelector("span.defines")
      if (clsList.contains(CN_HIDDEN)) {
        clsList.remove(CN_HIDDEN);
        clsList.add(CN_VISIBLE);
        if (t) t.style.display = 'none';
      } else if (clsList.contains(CN_VISIBLE)) {
        clsList.remove(CN_VISIBLE);
        clsList.add(CN_HIDDEN);
        if (t) t.style.display = 'inline';
      }
      cancel = true;
      break;
    case 't2_inherits':
      if (clsList.contains(CN_HIDDEN)) {
        clsList.remove(CN_HIDDEN);
        clsList.add(CN_VISIBLE);
      } else if (clsList.contains(CN_VISIBLE)) {
        clsList.remove(CN_VISIBLE);
        clsList.add(CN_HIDDEN);
      }
      cancel = true;
      break;
    case 't2_relations':
      var tbody = getPrntByIO(tgt, HTMLTableElement).querySelector('tbody');
      if (clsList.contains(CN_HIDDEN)) {
        clsList.remove(CN_HIDDEN);
        tbody.style.display = 'table-row-group';
        state.relationsCollapsed = false;
      } else {
        clsList.add(CN_HIDDEN);
        tbody.style.display = 'none';
        state.relationsCollapsed = true;
      }
      if (storage) storage.yardState = JSON.stringify(state);
      cancel = true;
      break;
    }
  }

  if (!cancel && reCls.test(cls)) {
    if (reCls.test(tgt.parentElement.className)) {
      tgt = tgt.parentElement;
      cls = tgt.className;
    } else if (reCls.test(tgt.parentElement.parentElement.className)) {
      tgt = tgt.parentElement.parentElement;
      cls = tgt.className;
    }
  }
  cls = reCls.exec(tgt.className);
  if (!cancel && cls && cls[0]) {
    switch (cls[0]) {
    case 'toggleSource':
      var sourceCode = tgt.parentElement.parentElement.querySelector('div.source_code');
      if ( /^view/.test(tgt.textContent) ) {
        tgt.textContent = tgt.textContent.replace(/^view/, 'hide');
        sourceCode.classList.remove(CN_HIDDEN);
      } else {
        tgt.textContent = tgt.textContent.replace(/^hide/, 'view');
        sourceCode.classList.add(CN_HIDDEN);
      }
      cancel = true;
      break;
    case 'summary_signature':
      if (eA = tgt.querySelector('a')) {
        cancel = true;
        clickedBy = CB_CONTENT;
        clickedTop = tgt.getBoundingClientRect().top - fwHdrHgt;
        if (e.ctrlKey) {
          window.open(eA.href, '_blank');
        } else if (hash = eA.hash) {
          hash = decodeURIComponent(hash.slice(1));
          gotoDoc(eA.pathname + '#' + hash);
        } else gotoDoc(eA.href);
      }
      break;
    case 'h2_sum nodoc':
    case 'h2_sum':
      summaryToggle(tgt);
      cancel = true;
      break;
    case 'cnst_a':
      prnt = getPrntByIO(tgt, HTMLUListElement);
      // ul >> div >> h2
      clickedBy = CB_CONTENT;
      clickedTop = tgt.getBoundingClientRect().top - fwHdrHgt;
      if (e.ctrlKey) {
        window.open(tgt.href, '_blank');
        cancel = true;
      } else if (hash = tgt.hash) {
        hash = decodeURIComponent(hash.slice(1));
        prnt.parentElement.previousElementSibling.classList.remove(CN_HIDDEN);
        gotoDoc(tgt.pathname + '#' + hash);
      } else gotoDoc(tgt.href);
      cancel = true;
      break;
    }
  }

  // Index page 'Listings'
  if (tag === 'LI' && (cls === 'r1' || cls === 'r2') ) {
    tgt = tgt.firstElementChild;
    tag = 'A';
  }

  if (!cancel && !e.ctrlKey) {
    clickedTop = tgt.getBoundingClientRect().top - fwHdrHgt;
    if (tag === 'A') {
      eA = tgt;
      cancel = true;
    } else if (eA = tgt.parentElement) {
      if (eA instanceof HTMLAnchorElement) {
        cancel = true;
      } else if (eA = eA.parentElement) {
        if (eA instanceof HTMLAnchorElement) cancel = true;
      }
    }
    if (cancel && eA) {
      if (eA.className === 'repo') return true;
      clickedBy = CB_CONTENT;
      if (hash = eA.hash) {
        var a = eA.href.split('#');
        // console.log(a[0] + '#' + decodeURIComponent(a[1]));
        cancel = gotoDoc( a[0] + '#' + decodeURIComponent(a[1]) );
      } else
        cancel = gotoDoc(eA.href);
    }
  }
  if (cancel) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

function clkSettingWindow(e) {
  var tgt = e.target,
      tag = tgt.tagName,
      cls = tgt.className,
      id = tgt.id;

  if (tag === 'SPAN' || tag === 'CODE'  || tag === 'svg') {
    // move up to button (code element used for the triangles)
    tgt = tgt.parentElement;
    tag = tgt.tagName;
    cls = tgt.className;
    id  = tgt.id;
  } else if (tag === 'rect' || tag === 'path') {
    tgt = tgt.parentElement.parentElement;
    tag = tgt.tagName;
    cls = tgt.className;
    id  = tgt.id;
  }

  if (tgt instanceof HTMLButtonElement) {
    if (tgt.disabled) return;
    switch (id) {
      case 'font_lrg':
        changeFontSize(true);
        break;
      case 'font_sml':
        changeFontSize(false);
        break;
      default:
        oPane.mainClk(id);
        settingsSetData();
    };
  };
  e.preventDefault();
  e.stopPropagation();
  return false;
};

/* Event handler for browser forward & back navigation events. */
function popState(e) {
  var loc;
  clickedBy = CB_POP_STATE;
  if (e.state) {
    gotoDoc(e.state.url);
  } else {
    loc = window.location;
    gotoDoc(loc.pathname + loc.hash);
  }
  e.preventDefault();
}

/* Event handler for window keydown, used for Esc & Ctrl-Alt combinations. */
function winKeyDown(e) {
  var key = String.fromCharCode(e.which),
      keyU = key.toUpperCase(),
      keyD = key.toLowerCase(),
      isCtrlAlt = e.altKey && e.ctrlKey,
      url,
      cancel;

  if (e.which === 27) {
    oPane.mainKD(keyD, 27);
    eContent.focus();
    cancel = true;

  } else if (!isCtrlAlt) {
    return;

  } else if (WIN_PANE_KD.indexOf(keyD) > -1 ) {
    oPane.mainKD(keyD, e.which);
    cancel = true;

  } else {
    switch (keyD) {
    case 'i':
      var nl = document.querySelectorAll('#y_menu a');
      for (var i = 0, el; el = nl[i]; i++) {
        if (/^index/i.test(el.textContent)) {
          url = el.href;
          clickedBy = CB_OBJ_PATH;
          if ( /github\.io/i.test(url) && /\/_index\.html$/.test(url) )
            url = url.replace(/\/_index\.html$/, '/y_index.html');
          cancel = true;
          gotoDoc(url);
          break;
        }
      }
      break;
    }
  }
  if (cancel) {
    isWinKPTimeOut = true;
    e.preventDefault();
    e.stopPropagation();
    setTimeout( function(){ isWinKPTimeOut = false; }, 1000);
    return false;
  }
}

/* Event handler window keypress, at present, only used for jumping locations in
 * the Method List.  Does not handle Ctrl-Alt, which uses winKeyDown.
 */
function winKeyPress(e) {
  var key = String.fromCharCode(e.which),
      cancel;

  if (isWinKPTimeOut || document.activeElement === _id('list_search_text') ||
      document.activeElement === _id('toc_search_text') )
    return;

  // Add main keyPress code here

  if (e.altKey || e.ctrlKey) return;

  if ( RE_LIST_SEARCH.test(key) ) {
    oList.keyPress(key);
    cancel = true;
  }
  if (cancel) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
}

/* Event handler for window resize. Sets up a timer so the screen refreshes are limited. */
function winResize() {
  var eAct = document.activeElement,
      contentS = eContent.style;

  if (contentS && contentS.fontSize !== '') {
    //console.log('set_FS ' + contentS.fontSize + ' ' + (typeof contentS.fontSize));
    contentS.fontSize = '';
  }

  if (isTouch && eAct && eAct.id === 'list_search_text' &&
      window.innerWidth === winWidth) {
    eAct.focus();
  } else if (winResizeTmrId) {
    window.clearTimeout(winResizeTmrId);
    winResizeTmrId = window.setTimeout( domLayout, 200);
  } else {
    winResizeTmrId = window.setTimeout( domLayout, 200);
  }
}

//} @!endgroup

//{ @!group Load & Layout

/* Called on first load and anytime the window is resized */
function domLayout() {
  var winHeightLast = winHeight,
      winTypeLast = winType,
      charWid = 0,
      dockDisabled = false;

// window.devicePixelRatio

  e25vh    = _id('y_measure_vh');
  px30em   = _id('y_measure_em').offsetWidth;
  px50Char = _id('y_measure_50pre').offsetWidth;

  winHeight = window.innerHeight;
  winWidth  = window.innerWidth;

  charWid = Math.floor(50.0 * winWidth / px50Char);

  if      (charWid > MED_LRG)  winType = 2;
  else if (charWid > SML_MED)  winType = 1;
  else { dockDisabled = true;  winType = 0; }

//  if (winTypeLast !== winType && oList)

  if (winHeight !== winHeightLast) {
//    if (isVHBad) vhFix();
    if (winHeight < clickedTop) {
      clickedTop = 0.6 * winHeight;
    }
  }

  if (winType !== winTypeLast) {
    oPane.locSet(winTypeLast);
    if (_id('settings') && _id('settings').className === '') settingsSetData();
  };
  //  if (dbgYDebug) _id('y_debug').textContent = ' ' + charWid + '  ' + winType;
};

/* Called anytime a new doc is loaded */
function docReady() {
  eContent.tabIndex = 1;
  _id('y_menu').addEventListener('click', clkMenu, false);
  eContent.addEventListener('click', clkContent, false);
}

/* Hooks events on first doc load; these events are not affected when a doc
 * is loaded via XMLHttpRequest.
 */
function hookEvents() {
  window.addEventListener('keydown' , winKeyDown  , false);
  window.addEventListener('keypress', winKeyPress , false);
  window.addEventListener('resize'  , winResize   , false);
  window.addEventListener('popstate', popState    , false);
}

/* Read options */
function readOptions() {
  if (_t2Info !== undefined) {
    if ('NSEP' in _t2Info)
      t2Opts.NSEP = _t2Info.NSEP.trim();
    if ('customHeaderId' in _t2Info)
      t2Opts.customHeaderId =  _t2Info.customHeaderId.trim();
  }
}

/* Used for table overflow, see method --- */
function updateCSS() {
  var wid, t;
  if (oCSSRuleTable instanceof CSSRule) {
    wid = window.innerWidth;
    if (oList.d.docked && oList.d.vis)
      wid -= oList.e.getBoundingClientRect().width;
    if (oToc.d.docked && oToc.d.vis)
      wid -= oToc.e.getBoundingClientRect().width;
    wid -= 2.0 * (px30em)/30.0;
    oCSSRuleTable.maxWidth = Math.floor(wid) + 'px';
  };
};

function setFontSize() {
  var rule = getCSSRule('y_style.css', 'html, body');
  if (rule && rule.style.fontSize !== state.fontSize)
    rule.style.fontSize = state.fontSize;
  px30em    = _id('y_measure_em').offsetWidth;
  px50Char  = _id('y_measure_50pre').offsetWidth;
  waitWidth = (isTouch ? WAIT_TOUCH : WAIT_NO_TOUCH ) * px30em/30.0;

  if (!isFirstLoad) {
    settingsSetTitles();
    domLayout();
  };
};

/* Changes cssRules to pixels for devices with bad vh
 * units, see isVHBad in {eDOMContent}
 */
function vhFix() {
  var i, j, maxH,
      fw_hdr = _id(t2Opts.customHeaderId),
      winH = winHeight - 2 - (fw_hdr ? fw_hdr.offsetHeight : 0),
      ss,
      cntr,
      cssRules,
      cssRule;

  for (i = 0; ss = document.styleSheets[i]; i++) {
    if ( /y_list\.css$/.test(ss.href) ) {
      cssRules = ss.cssRules;
      cntr = 0;
      for (j = 0; cssRule = cssRules[j]; j++) {
        // style
        switch (cssRule.selectorText) {
          case '#y_list.f #list_nav':
            maxH = (winH - oList.hdrHeight - FLT_HGT * px30em / 30.0).toFixed(0);
            cssRule.style.maxHeight = maxH + 'px';
            cntr ++;
            break;
          case '#y_toc.f #toc_nav':
            maxH = (winH - oToc.hdrHeight - FLT_HGT * px30em / 30.0).toFixed(0);
            cssRule.style.maxHeight = maxH + 'px';
            cntr ++;
            break;
        }
        if (cntr === 2) break;
      }
    }
  }
}

function svgAddPath(el, opacity, d) {
  var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('opacity', opacity);
  p.setAttribute('d', d);
  el.appendChild(p);
};

/* Set html of SVG wait element, no need to have it in all of the content
 * pages
 */
function waitHTML() {
  var eWait = _id('y_wait'), el;
  if (isTouch) {
    eWait.setAttribute('viewBox', '0 0 135 45');
    eWait.setAttribute('width' , '135');
    eWait.setAttribute('height', '45');
    el = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    el.setAttribute('opacity', '0.6');
    el.setAttribute('x', '67');
    el.setAttribute('y', '30');
    el.setAttribute('text-anchor', 'middle');
    el.textContent = 'Waiting...';
    eWait.appendChild(el);
  } else {
    eWait.setAttribute('viewBox', '0 0 90 90');
    eWait.setAttribute('width' , '90');
    eWait.setAttribute('height', '90');

    svgAddPath(eWait, '0.1', 'M 58.46 7.28 L 62.16 8.81 52.59 31.91 48.89 30.38 ' +
      'M 71.87 15.3 L 74.7 18.13 57.02 35.81 54.19 32.98 ' +
      'M 81.19 27.84 L 82.72 31.54 59.62 41.11 58.09 37.41' +
      'M 85 43 L 85 47 60 47 60 43 ' +
      'M 82.72 58.46 L 81.19 62.16 58.09 52.59 59.62 48.89 ' +
      'M 74.7 71.87 L 71.87 74.7 54.19 57.02 57.02 54.19 ' +
      'M 62.16 81.19 L 58.46 82.72 48.89 59.62 52.59 58.09 ' +
      'M 47 85 L 43 85 43 60 47 60 ' +
      'M 31.54 82.72 L 27.84 81.19 37.41 58.09 41.11 59.62 ' +
      'M 18.13 74.7 L 15.3 71.87 32.98 54.19 35.81 57.02 ' +
      'M 8.81 62.16 L 7.28 58.46 30.38 48.89 31.91 52.59');

    svgAddPath(eWait, '0.2', 'M 5 47 L 5 43 30 43 30 47');
    svgAddPath(eWait, '0.4', 'M 7.28 31.54 L 8.81 27.84 31.91 37.41 30.38 41.11');
    svgAddPath(eWait, '0.6', 'M 15.3 18.13 L 18.13 15.3 35.81 32.98 32.98 35.81');
    svgAddPath(eWait, '0.8', 'M 27.84 8.81 L 31.54 7.28 41.11 30.38 37.41 31.91');
    svgAddPath(eWait, '1.0', 'M 43 5 L 47 5 47 30 43 30');
  }
}

function firstLoad() {
  var newToc,
      t, xhr, vhHgt,
      url, listState,
      oldLibRoot = oList.libRoot;

  waitHTML = undefined;
  eContent = _id('content');
  e25vh    = _id('y_measure_vh');
//  px30em   = _id('y_measure_em').offsetWidth;
//  px50Char = _id('y_measure_50pre').offsetWidth;

  isServer = (_id('y_menu').className === 'server');
  readOptions();

  winTitle = document.querySelector('head title').textContent;

  oPane.firstDOMLoad();

  aDOMCur.href  = window.location.href;
  aDOMNext.href = window.location.href;

  for (var i = 0, cssRules, ss; ss = document.styleSheets[i]; i++) {
    if ( /y_style\.css$/.test(ss.href)) {
      cssRules = ss.cssRules;
      cntr = 0;
      for (var j = 0, cssRule; cssRule = cssRules[j]; j++) {
        if (cssRule.selectorText === 'div.y_table') {
          oCSSRuleTable = cssRule;
          break;
        }
      }
    }
  }

  vhHgt = (4 * e25vh.getBoundingClientRect().width).toFixed(0);
  winHeight = window.innerHeight;

  //hdrDbg('v' + vhHgt + '_w' + winHeight);

  // for iOS
  if ( Math.abs(winHeight - vhHgt)/winHeight > 0.01 || t2Opts.customHeaderId ) {
    t = _id(t2Opts.customHeaderId);
    if (t) fwHdrHgt = t.offsetHeight;
    isVHBad = true;
    // hdrDbg('v' + vhHgt + '_w' + winHeight + ' called vhFix');
    vhFix();
  }

  domLayout();
  updateCSS();
  oList.e.tabIndex = 2;

  // must run before addContent
  if (t2GA instanceof Function && !t2GAInit) {
    t2GA( 'create', 'UA-79746991-1', 'auto');
    t2GA( 'set', 'anonymizeIp', true);
    t2GAInit = true;
  }

  newToc = addContent(eContent, document);
  oToc.nav.replaceChild(newToc.cloneNode(true), oToc.items);
  oToc.items = _id('toc_items');
  newToc = null;

  hookEvents();
  docReady();
  window.removeEventListener('DOMContentLoaded', eDOMContent);
  hookEvents = undefined;
  isFirstLoad = false;
}

/* Event handler for DOMContentLoaded */
function eDOMContent(e) {
  eContent = _id('content');
  setFontSize();
  waitHTML();
  commonLoad();
  firstLoad();

  if ( typeof hljs !== 'undefined' && hljs.highlightElement instanceof Function ) {
    hljs.configure({
      ignoreUnescapedHTML: true
    });
  };
}

//} @!endgroup

window.addEventListener('DOMContentLoaded', eDOMContent, false);

})(t2Info);
