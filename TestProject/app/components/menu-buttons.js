import Ember from 'ember';
import { task } from 'ember-concurrency';
import contextMenuMixin from 'ember-context-menu';
export default Ember.Component.extend (contextMenuMixin, {

  // PERFORM TASKS, reachable from the HTML template page
  /////////////////////////////////////////////////////////////////////////////////////////
  rstBrdrs: task (function* () {
    resetBorders ();
    yield null;
  }),

  requestDirs: task (function* () {
    document.title = "MISH";
    var dirList;
    var imdbroot = this.get ("imdbRoot");

    if (imdbroot === "") {
      dirList = yield reqRoot (); // Request possible directories

      if (dirList) {
        dirList = dirList.split ("\n");
        var seltxt = dirList [0];
        dirList.splice (0, 1, "");
        var selix = dirList.indexOf (seltxt);
        if (selix > 0) {
          this.set ("imdbRoot", seltxt);
          Ember.$ ("#imdbRoot").text (seltxt);
        }
        this.set ("imdbRoots", dirList);
        dirList = dirList.join ("\n");
        Ember.$ ("#imdbRoots").text (dirList);
      }

      if (imdbroot === "") {
        // ##### Select imdbRoot
        Ember.$ ("div.settings, div.settings div.root").show ();
        Ember.$ ("div.settings div.check").hide ();
        //Ember.$ ("#rootSel").prop ('selectedIndex', selix);
        return;
      }
    }

    dirList = yield reqDirs (imdbroot); // Request subdirectories

    this.set ("userDir", Ember.$ ("#userDir").text ());
    this.set ("imdbRoot", Ember.$ ("#imdbRoot").text ());
    this.set ("imdbDirs", Ember.$ ("#imdbDirs").text ().split ("\n"));

    if (this.get ("albumData").length === 0) {
      // Construct dirList/treePath for jstree data = albumData
      var treePath = this.get ("imdbDirs");
      treePath.splice (treePath.length - 1, 1); // Remove dirList 'filler'
      //console.log (treePath.length, treePath);
      var imdbLink = this.get ("imdbLink");
      for (var i=0; i<treePath.length; i++) {
        if (i === 0) {treePath [i] = imdbLink;} else {
          treePath [i] = imdbLink + treePath [i].toString ();
        }
        var branch = treePath [i].split ("/");
        if (branch [0] === "") {branch.splice (0, 1);}
        //console.log (branch);
      }
      var albDat = aData (treePath);
      // Substitute the first name (in '{text:"..."') into the root name:
      albDat = albDat.split (","); // else too long a string
      albDat [0] = albDat [0].replace (/{text:".*"/, '{text: "' + this.get ("imdbRoot") + '"');
      albDat = albDat.join (",");
      albumWait = false;
      this.set ("albumData", eval (albDat));
    }

  }),

  // CONTEXT MENU Context menu
  /////////////////////////////////////////////////////////////////////////////////////////
  contextItems: [
    { label: '×', disabled: true }, // Spacer
    { label: 'Information',
      disabled: false,
      action () {
        var picName = Ember.$ ("#picName").text ();
        var picOrig = Ember.$ ("#picOrig").text ();
        var title = "Information";
        var yes = "Ok";
        getFilestat (picOrig).then (result => {
          Ember.$ ("#temporary").text (result);
        }).then ( () => {
            var txt = '<i>Namn</i>: <span style="color:deeppink">' + picName + '</span><br>';
            txt += Ember.$ ("#temporary").text ();
            var tmp = Ember.$ ("#download").attr ("href");
            if (tmp.toString () != "null") {
              txt += '<br><span class="lastDownload"><i>Senast startad nedladdning</i>:<br>' + tmp + "</span>";
            }
            infoDia (null, picName, title, txt, yes, true);
            Ember.$ ("#temporary").text ("");
        });
      }
    },
    { label: 'Redigera text',
      disabled: () => {
        return !(allow.textEdit || allow.adminAll);
      },
      action: () => {
        // Mimic click on the text of the mini-picture (thumbnail)
        Ember.$ ("#i" + undot (Ember.$ ("#picName").text ().trim ()) + " a").next ().next ().next ().click ();
      }
    },
    { label: 'Göm eller visa', // Toggle hide/show
      disabled: () => {
        return !(allow.imgHidden || allow.adminAll);
      },
      action () {
        var picName, act, nels, nelstxt, picNames = [], nodelem = [], nodelem0, i;
        Ember.run.later ( ( () => { // Picname needs time to settle...
          picName = Ember.$ ("#picName").text ().trim ();
        }), 50);
        picName = Ember.$ ("#picName").text ().trim ();
        picNames [0] = picName;
        nodelem0 = document.getElementById ("i" + picName).firstElementChild.nextElementSibling;
        nels = 1;
        var picMarked = nodelem0.className === "markTrue";
        if (picMarked) {
          picNames = [];
          nodelem = document.getElementsByClassName ("markTrue");
          nels = nodelem.length;
          nelstxt = "alla " + nels;
          if (nels === 2) {nelstxt = "båda två";}
          for (i=0; i<nodelem.length; i++) {
            picNames.push (nodelem [i].nextElementSibling.innerHTML.trim ());
          }
        }
        //console.log (nodelem0.parentNode.style.backgroundColor); // Check representation!
        if (nodelem0.parentNode.style.backgroundColor === Ember.$ ("#hideColor").text ())
          {act = 0;} else {act = 1;} // 0 = show, 1 = hide (it's the hide flag!)
        var actxt1 = ["Vill du visa ", "Vill du gömma "];
        var actxt2 = ["ska visas ", "ska gömmas "];
        if (nels > 1) {
          resetBorders (); // Reset all borders
          markBorders (picName); // Mark this one
          Ember.$ ("#dialog").html ("<b>" + actxt1 [act] + nelstxt + "?</b><br>" + cosp (picNames) + "<br>" + actxt2 [act]); // Set dialog text content
          Ember.$ ("#dialog").dialog ( { // Initiate dialog
            title: "Göm eller visa...",
            autoOpen: false,
            draggable: true,
            modal: true,
            closeOnEscape: true
          });
          // Define button array
          Ember.$ ("#dialog").dialog ('option', 'buttons', [
          {
            text: "Ja", // Yes
            "id": "allButt", // Process all
            click: function () {
              hideFunc (picNames, nels, act);
              Ember.$ (this).dialog ('close');
            }
          },
          {
            text: "", // Set later, in order to include html tags (illegal here)
            "id": "singButt", // Process only one
            click: function () {
              var nodelem = [];       // Redefined since:
              nodelem [0] = nodelem0; // Else illegal, displays "read-only"!
              picNames [0] = picName;
              nels = 1;
              hideFunc (picNames, nels, act);
              Ember.$ (this).dialog ('close');
            }
          }]);
          Ember.$ ("#singButt").html ('Nej, bara <span  style="color:deeppink">' + picName + '</span>'); // 'text:', here we may include html tags
          niceDialogOpen ();
          Ember.$ ("#allButt").focus ();
        } else {
          hideFunc (picNames, nels, act);
        }
      }
    },
    { label: '', disabled: true }, // Spacer
    { label: 'Invertera markeringar',
      disabled: false,
      action () {
        Ember.$ (".markTrue").addClass ("set_false");
        Ember.$ (".markFalse").addClass ("set_true");
        Ember.$ (".set_false").removeClass ("markTrue");
        Ember.$ (".set_true").removeClass ("markFalse");
        Ember.$ (".set_false").addClass ("markFalse");
        Ember.$ (".set_true").addClass ("markTrue");
        Ember.$ (".markTrue").removeClass ("set_true");
        Ember.$ (".markFalse").removeClass ("set_false");
        var marked = Ember.$ (".markTrue").length;
        Ember.$ (".numMarked").text (' ' + marked);
        var cn = document.getElementById ("markShow").className;
        Ember.$ ("#markShow").removeClass ();
        if (cn === "markFalseShow") {
          Ember.$ ("#markShow").addClass ("markTrueShow");
        } else {
          Ember.$ ("#markShow").addClass ("markFalseShow");
        }
        resetBorders (); // Reset all borders
      }
    },
    { label: 'Markera/avmarkera alla',
      disabled: false,
      action () {
        var picName = Ember.$ ("#picName").text ().trim ();
        var tmp = document.getElementById ("i" + picName).firstElementChild.nextElementSibling.className;
        var marked;
        Ember.$ ("[alt='MARKER']").removeClass ();
        Ember.$ ("#markShow").removeClass ();
        if (tmp === "markTrue") {
          Ember.$ ("[alt='MARKER']").addClass ("markFalse");
          Ember.$ ("#markShow").addClass ("markFalseShow");
          marked = "0";
        } else {
          Ember.$ ("[alt='MARKER']").addClass ("markTrue");
          Ember.$ ("#markShow").addClass ("markTrueShow");
          marked = Ember.$ ("[alt='MARKER']").length;
        }
        Ember.$ (".numMarked").text (marked);
        resetBorders (); // Reset all borders
      }
    },
    { label: '', disabled: true }, // Spacer
    { label: 'Placera först',
      disabled: () => {
        return !((allow.imgReorder && Ember.$ ("#saveOrder").css ("display") !== "none") || allow.adminAll);
      },
      action () {
        var picName;
        picName = Ember.$ ("#picName").text ();
        var sortOrder = Ember.$ ("#sortOrder").text ();
        var rex = new RegExp (picName + ",[\\d,]+\\n?", "");
        var k = sortOrder.search (rex);
        if (k < 1) {return;}
        var line = sortOrder.match (rex) [0];
        sortOrder = sortOrder.replace (line, "");
        sortOrder = sortOrder.replace (/\\n\\n/g, "\n");
        sortOrder = line.trim () + "\n" + sortOrder.trim ();
        Ember.$ ("#sortOrder").text (sortOrder);
        saveOrderFunction (sortOrder) // Save on server disk
        .then (Ember.$ ("#refresh-1").click ()); // Call via DOM...
        Ember.run.later ( ( () => {
          scrollTo (null, Ember.$ (".showCount:first").offset ().top);
        }), 50);
      }
    },
    { label: 'Placera sist',
      disabled: () => {
        return !((allow.imgReorder && Ember.$ ("#saveOrder").css ("display") !== "none") || allow.adminAll);
      },
      action () {
        var picName;
        picName = Ember.$ ("#picName").text ();
        var sortOrder = Ember.$ ("#sortOrder").text ();
        var rex = new RegExp (picName + ",[\\d,]+\\n?", "");
        var k = sortOrder.search (rex);
        if (k < 0) {return;}
        var line = sortOrder.match (rex) [0];
        sortOrder = sortOrder.replace (line, "");
        sortOrder = sortOrder.replace (/\\n\\n/g, "\n");
        sortOrder = sortOrder.trim () + "\n" + line.trim ();
        Ember.$ ("#sortOrder").text (sortOrder);
        saveOrderFunction (sortOrder) // Save on server disk
        .then (Ember.$ ("#refresh-1").click ()); // Call via DOM...
        Ember.run.later ( ( () => {
          scrollTo (null, Ember.$ ("#lowDown").offset ().top - window.screen.height*0.85);
        }), 50);
      }
    },
    { label: '', disabled: true }, // Spacer
    { label: 'Ladda ned...',
      disabled: () => {
        return !(allow.imgOriginal || allow.adminAll);
      },
      action () {
        Ember.$ ("#downLoad").click (); // Call via DOM since "this" is ...where?
      }
    },
    //{ label: '', disabled: true }, // Spacer
    { label: 'Länka till...', // i18n Toggle hide/show
      disabled: () => {
        return !(allow.delcreLink || allow.adminAll);
      },
      action () {
        var picName, nels, nlns, nelstxt, linktxt, picNames = [], nodelem = [], nodelem0, i;
        picName = Ember.$ ("#picName").text ().trim ();
        Ember.run.later ( ( () => { // Picname needs time to settle...
          picName = Ember.$ ("#picName").text ().trim ();
        }), 50);
        resetBorders (); // Reset all borders
        if (!Ember.$ ("#i" + undot (picName)).hasClass ("symlink")) { // Leave out symlinks
          markBorders (picName);
          picNames [0] = picName;
          nels = 1;
        } else {
          nels = 0;
          Ember.$ ("#picName").text (""); // Signals non-linkable, see "downHere"
        }
        nodelem0 = document.getElementById ("i" + picName).firstElementChild.nextElementSibling;
        var picMarked = nodelem0.className === "markTrue";
        if (picMarked) {
          picNames = [];
          nodelem = document.getElementsByClassName ("markTrue");
          for (i=0; i<nodelem.length; i++) {
            var tmpName = nodelem [i].nextElementSibling.innerHTML.trim ();
            if (!Ember.$ ("#i" + undot (tmpName)).hasClass ("symlink")) { // Leave out symlinks
              picNames.push (tmpName);
            }
          }
          nels = picNames.length;
          nlns = nodelem.length - nels;
          linktxt = "";
          if (nlns > 0) {linktxt = "En är länk, övriga:<br>";} // i18n
          if (nlns > 1) {linktxt = nlns + " är länkar, övriga:<br>";} // i18n
          nelstxt = "Vill du länka alla " + nels; // i18n
          if (nels === 2) {nelstxt = "Vill du länka båda två";} // i18n
          //console.log("nodelems non-symlinks:", nodelem.length, nels);
        }
        if (nels === 0) {
          var title = "Ingenting att länka"; // i18n
          var text = "<br>— omöjligt att länka länkar —"; // i18n
          var yes = "Ok" // i18n
          infoDia (null, null, title, text, yes, true);
          return;
        }
        //console.log (nodelem0.parentNode.style.backgroundColor); // << Checks this text content
        Ember.$ ("#picNames").text (picNames.join ("\n"));
        if (nels > 1) {
          var lnTxt = "<br>ska länkas till visning också i annat album"; // i18n
          Ember.$ ("#dialog").html (linktxt + "<b>" + nelstxt + "?</b><br>" + cosp (picNames) + lnTxt); // Set dialog text content
          Ember.$ ("#dialog").dialog ( { // Initiate dialog
            title: "Länka till... ", // i18n
            autoOpen: false,
            draggable: true,
            modal: true,
            closeOnEscape: true
          });
          // Define button array
          Ember.$ ("#dialog").dialog ('option', 'buttons', [
          {
            text: "Ja", // Yes i18n
            "id": "allButt", // Process all
            click: function () {
              Ember.$ (this).dialog ('close');
              linkFunc (picNames);
            }
          },
          {
            text: "", // Set later, in order to include html tags (illegal here)
            "id": "singButt", // Process only one
            click: function () {
              var nodelem = [];       // Redefined since:
              nodelem [0] = nodelem0; // Else illegal, displays "read-only"!
              picNames = [];
              picNames [0] = picName;
              nels = 1;
              Ember.$ ("#picNames").text (picNames.join ("\n"));
              Ember.$ (this).dialog ('close');
              linkFunc (picNames);
            }
          }]);
          Ember.$ ("#singButt").html ('Nej, bara <span  style="color:deeppink">' + picName + '</span>'); // 'text:', here we may include html tags
          niceDialogOpen ();
          Ember.$ ("#singButt").removeClass ("ui-button-disabled ui-state-disabled");
          if (Ember.$ ("#picName").text () === "") { // "downHere", referenced above
            Ember.$ ("#singButt").addClass ("ui-button-disabled ui-state-disabled");
          }
          Ember.$ ("#allButt").focus ();
        } else {
          Ember.$ (this).dialog ('close');
          markBorders (picNames [0]); // Mark this single one, even if it wasn't clicked
          linkFunc (picNames);
          niceDialogOpen ();
        }
      }
    },
    { label: 'RADERA...',
      disabled: () => {
        return !(allow.deleteImg || allow.delcreLink || allow.adminAll);
      },
      action () {
        var picName, all, nels, nelstxt, delNames,
          picNames = [], nodelem = [], nodelem0, i;
        Ember.run.later ( ( () => { // Picname needs time to settle...
          picName = Ember.$ ("#picName").text ().trim ();
        }), 50);
        picName = Ember.$ ("#picName").text ().trim ();
        picNames [0] = picName;
        nodelem0 = document.getElementById ("i" + picName).firstElementChild.nextElementSibling;
        nels = 1;
        var picMarked = nodelem0.className === "markTrue";
        if (picMarked) {
          picNames = [];
          nodelem = document.getElementsByClassName ("markTrue");
          all = "alla ";
          nels = nodelem.length;
          nelstxt = nels; // To be used as text...
          if (nels === 2) {all = "båda "; nelstxt = "två";}
          for (i=0; i<nodelem.length; i++) {
            picNames.push (nodelem [i].nextElementSibling.innerHTML.trim ());
          }
        }
        delNames = picName;
        if (nels > 1) {
          delNames =  cosp (picNames);
          Ember.$ ("#dialog").html ("<b>Vill du radera " + all + nelstxt + "?</b><br>" + delNames + "<br>ska raderas permanent"); // i18n
          var eraseText = "Radera...";
          // Set dialog text content
          Ember.$ ("#dialog").dialog ( { // Initiate dialog
            title: eraseText,
            autoOpen: false,
            draggable: true,
            modal: true,
            closeOnEscape: true
          });
          // Close button
          Ember.$ ("#dialog").dialog ('option', 'buttons', [ // Define button array
          {
            text: "Ja", // Yes
            "id": "allButt", // Process all
            click: function () {
              Ember.$ (this).dialog ('close');
              nextStep ();
            }
          },
          {
            text: "", // Set later, (html tags are killed here)
            "id": "singButt", // Process only one
            click: function () {
              var nodelem = [];       // Redefined since:
              nodelem [0] = nodelem0; // Else illegal, displays "read-only"!
              picNames [0] = picName;
              delNames = picName;
              nels = 1;
              Ember.$ (this).dialog ('close');
              nextStep ();
            }
          }]);
          resetBorders (); // Reset all borders
          markBorders (picName); // Mark this one
          Ember.$ ("#singButt").html ('Nej, bara <span  style="color:deeppink">' + picName + '</span>'); // May contain html
          niceDialogOpen ();
          Ember.$ ("#allButt").focus ();
        } else {nextStep ();}

        function nextStep () {
          resetBorders (); // Reset all borders, can be first step!
          markBorders (picName); // Mark this one
          var eraseText = "Radera"; // i18n
          Ember.$ ("#dialog").html ("<b>Vänligen bekräfta:</b><br>" + delNames + "<br><b>ska alltså raderas?</b><br>(<i>kan inte ångras</i>)"); // i18n
          Ember.$ ("#dialog").dialog ( { // Initiate a new, confirmation dialog
            title: eraseText,
            closeText: "×",
            autoOpen: false,
            draggable: true,
            modal: true,
            closeOnEscape: true
          });
          Ember.$ ("#dialog").dialog ('option', 'buttons', [ // Define button array
          {
            text: "Ja", // Yes
            "id": "yesBut",
            click: function () {
              /*if (!(allow.deleteImg || allow.adminAll)) { // Will never happen
                userLog ("RADERING FÖRHINDRAD"); // i18n
                return;
              }*/
              console.log ("To be deleted: " + delNames); // delNames is picNames as a string
              deleteFiles (picNames, nels); // NOTE: Must be a 'clean' call (no await or then!)
              Ember.$ (this).dialog ('close');
              return new Ember.RSVP.Promise (resolve => {
                //Ember.run.later ( ( () => {
                  //Ember.$ ("#saveOrder").click (); // Call via DOM...
                //}), 200);
                resolve (true);
              }).then (Ember.$ ("#refresh-1").click ());
            }
          },
          {
            text: "Nej", // No
            "id": "noBut",
            click: function () {
              console.log ("Untouched: " + delNames);
              Ember.$ (this).dialog ('close');
            }
          }]);
          niceDialogOpen ();
          Ember.$ ("#yesBut").focus ();
        }
      }
    },
    { label: '', disabled: true }, // Spacer
  ],
  //contextSelection: [{ paramDum: false }],  // The context menu "selection" parameter (not used)
  contextSelection: {},
  _contextMenu (e) {
    Ember.run.later ( ( () => {
      // At text edit (ediText) || running slide show
      if ( (Ember.$ ("div[aria-describedby='textareas']").css ('display') !== "none") ||
          (Ember.$ ("#navAuto").text () === "true") ) {
        Ember.$ ("ul.context-menu").hide ();
        return;
      }
      Ember.$ ("ul.context-menu").hide ();
      var nodelem = e.target;
      if (nodelem.tagName === 'IMG' && nodelem.className.indexOf ('left-click') > -1 || nodelem.parentElement.id === 'link_show') {
        // Set the target image path. If the show-image is clicked the target is likely an
        // invisible navigation link, thus reset to parent.firstchild (= no-op for mini-images):
        Ember.$ ("#picOrig").text (nodelem.parentElement.firstElementChild.title.trim ());
        // Set the target image name, which is in the second parent sibling in both cases:
        var namepic = nodelem.parentElement.nextElementSibling.nextElementSibling.innerHTML.trim ();
        Ember.$ ("#picName").text (namepic);

        // Ascertain that the minipic is shown (maybe created just now)
        var toshow = document.getElementById ("i" + namepic).firstElementChild.firstElementChild;
        var minipic = toshow.getAttribute ("src");
        toshow.removeAttribute ("src");
        toshow.setAttribute ("src", minipic);
        //var docLen = document.body.scrollHeight; // << NOTE: this is the document Ypx height
        //var docWid = document.body.scrollWidth; // << NOTE: this is the document Xpx width
        // var scrollY = window.pageYOffset; // << NOTE: the Ypx document coord of the viewport

        Ember.$ ("#wormhole-context-menu").css ("position", "absolute"); // Change from fixed

        Ember.$ ("div.context-menu-container").css ("position", "relative"); // Change from fixed
        var viewTop = window.pageYOffset; // The viewport position
        var tmpTop = e.clientY;           // The mouse position
        Ember.$ ("div.context-menu-container").css ("top", (viewTop + tmpTop) + "px");

        Ember.$ ("ul.context-menu").css ("left", "-2px");
        Ember.$ ("ul.context-menu").css ("right", "");
        Ember.$ ("ul.context-menu.context-menu--left").css ("left", "");
        Ember.$ ("ul.context-menu.context-menu--left").css ("right", "2px");
        Ember.$ ("ul.context-menu").show ();

      } else {
        Ember.$ ("ul.context-menu").hide ();
        Ember.$ ("#picName").text ('');
        Ember.$ ("#picOrig").text ('');
      }
    }), 40);
  },

  // STORAGE FOR THE HTML page population, and other storages
  /////////////////////////////////////////////////////////////////////////////////////////
  allNames: [], // ##### File names etc. (object array) for the thumbnail list generation
  timer: null,  // and the timer for auto slide show,
  savekey: -1,  // and the last pressed keycode used to lock Ctrl+A
  userDir:  "undefined", // Current user ?
  imdbLink: "imdb", // Name of the symbolic link to the imdb root directory
  imdbRoot: "", // The imdb directory (initial default = env.variable $IMDB_ROOT)
  imdbRoots: [], // For imdbRoot selection
  imdbDir: "",  // Current picture directory, selected from imdbDirs
  imdbDirs: ['Album?'], // Replaced in requestDirs
  albumName: "",
  albumText: "",
  albumData: [], // Directory structure for the selected imdbRoot
  loggedIn: false,
  // HOOKS, that is, Ember "hooks" in the execution cycle
  /////////////////////////////////////////////////////////////////////////////////////////
  //----------------------------------------------------------------------------------------------
  init () { // ##### Component initiation
    this._super (...arguments);
    Ember.$ (document).ready ( () => {
      console.log ("jQuery v" + Ember.$ ().jquery);
      // The time stamp is produced with the Bash 'ember-b-script'
      userLog (Ember.$ ("#timeStamp").text ());
//this.setNavKeys ();
      // Login advice:
      Ember.$ ("#title span.proid").attr ("title", "Most is safe here!");
      Ember.$ ("#title button.cred").attr ("title", logAdv);
      // Initialize settings:
      zeroSet ();
      this.actions.setAllow ();
      this.actions.setAllow (true);
      Ember.$ ("#title button.viewSettings").hide ();
      // To top of screen:
      Ember.run.later ( ( () => {
        scrollTo (0, 0);
      }), 50);
    });
  },
  //----------------------------------------------------------------------------------------------
  didInsertElement () { // ##### Runs at page ready state
    this._super (...arguments);

    this.setNavKeys ();
    // Update the slide show speed factor when it is changed
    document.querySelector ('input.showTime[type="number"]').addEventListener ('change', function () {Ember.$ ("#showFactor").text (parseInt (this.value));});
    prepDialog ();
    prepTextEditDialog ();
  },
  //----------------------------------------------------------------------------------------------
  didRender () {
    this._super (...arguments);
    Ember.$ (document).ready ( () => {

      devSpec ();

      if (Ember.$ ("#hideFlag").text () === "1") {
        this.actions.hideFlagged (true).then (null);
      } else {
        this.actions.hideFlagged (false).then (null);
      }

      /*if (Ember.$ ("imdbDir").text () !== "") {
        this.actions.imageList (true); //<<<<<<<<<<<<
        //Ember.$ ("#imageList").show (); <-- Warning: Destroys actions.imageList
      }*/

      Ember.$ ("span#showSpeed").hide ();
      Ember.$ ("div.ember-view.jstree").attr ("onclick", "return false");

    });
  },

  // HELP FUNCTIONS, that is, component methods (within-component functions)
  /////////////////////////////////////////////////////////////////////////////////////////
  //----------------------------------------------------------------------------------------------
  refreshAll () {
    // ===== Updates allNames and the sortOrder tables by locating all images and
    // their metadata in the "imdbDir" dir (name is DOM saved) on the server disk.
    // This will trigger the template to restore the DOM elements. Thus, prepare the didRender hook
    // to further restore all details!

    return new Ember.RSVP.Promise (resolve => {
      var test = 'A1';
      this.requestOrder ().then (sortnames => {
        if (sortnames === undefined) {sortnames = "";}
        if (sortnames === "Error!") {
          spinnerWait (false);
          Ember.$ (".jstreeAlbumSelect").show ();
          if (Ember.$ ("#imdbDir").text () !== "") {
            document.getElementById ("imdbError").className = "show-inline";
          }
          Ember.$ ('.showCount').hide ();
          this.set ("imdbDir", "");
          Ember.$ ("#imdbDir").text ("");
          Ember.$ ("#sortOrder").text ("");
          Ember.$ ('#navKeys').text ('true');
        } else {
          Ember.$ ('.showCount:last').hide ();
          Ember.$ ("#sortOrder").text (sortnames); // Save in the DOM
        }
        test = 'A2';
        // Use sortOrder (as far as possible) to reorder namedata ERROR
        // First pick out namedata (allNames) against sortnames (SN), then any remaining
        this.requestNames ().then (namedata => {
          var i = 0, k = 0;
          // --- START prepare sortnames checking CSV columns
          var SN = [];
          if (Ember.$ ("#sortOrder").text ().trim ().length > 0) {
            SN = Ember.$ ("#sortOrder").text ().trim ().split ('\n');
          }
          sortnames = '';
          for (i=0; i<SN.length; i++) {
            var tmp = SN [i].split (',');
            if (tmp [0].slice (0, 1) !== ".") {
              if (tmp.length < 2) {
                tmp.push (' ');
                SN [i] = SN [i] + ',';
              }
              if (tmp [1].trim ().length === 0) {SN [i] = SN [i] + '0';}
              if (tmp.length < 3) {
                tmp.push (' ');
                SN [i] = SN [i] + ',';
              }
              if (tmp [2].trim ().length === 0) {SN [i] = SN [i] + '0';}
              sortnames = sortnames +'\n'+ SN [i];
            }
          }
          test = 'A3';
          sortnames = sortnames.trim (); // Important!
          var snamsvec = sortnames.split ('\n'); // sortnames vectorized
          // --- Pull out the plain sort order file names: snams <=> sortnames
          var snams = [];
          // snamsvec is sortnames vectorized
          for (i=0; i<snamsvec.length; i++) {
            // snams is kind of 'sortnames.name'
            snams.push (snamsvec [i].split (',') [0]);
          }
          //console.log(test,"[sortnames]",sortnames,snamsvec.length);
          // --- END prepare sortnames
          // --- Pull out the plain dir list file names: name <=> namedata (undefined order)
          if (namedata === undefined) {namedata = [];}
          var name = [];
          for (i=0; i<namedata.length; i++) {
            name.push (namedata [i].name);
          }
          test ='B';
          // --- Make the object vector 'newdata' for new 'namedata=allNames' content
          // --- Use 'snams' order to pick from 'namedata' into 'newdata' and 'newsort'
          // --- 'namedata' and 'name': Ordered as from disk (like unknown)
          var newsort = "", newdata = [];
          //console.log(test,"[namedata] ...",namedata.length,"[name]",name.join ("\n"),name.length,"[snams]",snams.join ("\n"),snams.length);
          while (snams.length > 0 && name.length > 0) {
            k = name.indexOf (snams [0]);
            if (k > -1) {
              newsort = newsort + snamsvec [0] + "\n";
              newdata.pushObject (namedata [k]);
              //namedata.splice (k, 1);
              //namedata.replace (k, 1);
              namedata.removeAt (k, 1);
              name.splice (k, 1);
            }
            snamsvec.splice (0, 1);
            snams.splice (0, 1);
          }
          test ='C';
          //console.log(test,"[namedata] ...",namedata.length,"[name]",name.join ("\n"),name.length,"[snams]",snams.join ("\n"),snams.length);
          //console.log(test,"[snamsvec]",snamsvec,snamsvec.length);

          // --- Move remaining 'namedata' objects (e.g. uploads) into 'newdata' until empty.
          // --- Place them first to get better noticed. Update newsort for sortnames.
          // --- The names, of such (added) 'namedata' objects, are kept remaining in 'name'??
          while (namedata.length > 0) {
            newsort = namedata [0].name + ",0,0\n" + newsort;
            //newdata.pushObject (namedata [0]); instead:
            newdata.insertAt (0, namedata [0]);
            namedata.removeAt (0, 1);
            //namedata.replace (0, 1);
          }
          newsort = newsort.trim (); // Important
          test ='E0';
          this.set ('allNames', newdata);
          Ember.$ ('#sortOrder').text (newsort); // Save in the DOM
          preloadShowImg = []; // Preload show images:
          for (i=0; i<newdata.length; i++) {
            preloadShowImg [i] = new Image();
            preloadShowImg [i].src = newdata [i].show;
          }
          if (newdata.length > 0) {
            Ember.$ (".numMarked").text (' ' + Ember.$ (".markTrue").length);
            if (Ember.$ ("#hideFlag") === "1") {
              Ember.$ (".numHidden").text (' ' + Ember.$ (".img_mini [backgroundColor=Ember.$('#hideColor')]").length);
              Ember.$ (".numShown").text (' ' + Ember.$ (".img_mini [backgroundColor!=Ember.$('#hideColor')]").length);
            } else {
              Ember.$ (".numHidden").text (' 0');
              Ember.$ (".numShown").text (Ember.$ (".img_mini").length);
            }
            userLog ('REFRESHED');
          }
          test = 'E1';
          Ember.run.later ( ( () => {
            Ember.$ ("#saveOrder").click ();
          }), 200);
        }).catch (error => {
          console.error (test + ' in function refreshAll: ' + error);
        });
      }).catch ( () => {
        console.log ("Not found");
      });
      Ember.$ ('#navKeys').text ('true');
      if (Ember.$ ("#imdbDir").text () !== "") {
        this.actions.imageList (true);
      }
      resolve ();
    });
  },
  //----------------------------------------------------------------------------------------------
  setNavKeys () { // ===== Trigger actions.showNext when key < or > is pressed etc...

    // Also, first trigger actions.showShow(showpic, namepic, origpic) on mouse click:
    document.addEventListener ('click', (evnt) => {triggerClick (evnt);}, false);
    var triggerClick = (evnt) => {
      var that = this;
      var tgt = evnt.target;
      if (tgt.id === "wrap_pad") {
        that.actions.hideShow ();
        return;
      }
//alert ("setNavKeys 1");
      if (tgt.tagName !=="IMG") {return;}
//alert ("setNavKeys 2");
      if (Ember.$ (tgt).hasClass ("mark")) {return;}
//alert ("setNavKeys 3");
      var namepic = tgt.parentElement.parentElement.id.slice (1);

      // Check if the intention is to "mark" (Shift + click):
      if (evnt.shiftKey) {
        Ember.run.later ( ( () => {
          //console.log("NOTE: Click with shift pressed:",namepic);
          that.actions.toggleMark (namepic);
          return;
        }), 20);
      } else {
        var origpic = tgt.title;
        var minipic = tgt.src;
        var showpic = minipic.replace ("/_mini_", "/_show_");
//console.log("showShow 1");
//alert ("showShow 1");
        this.actions.showShow (showpic, namepic, origpic);
        return;
      }
    }
    // Then the keyboard, actions.showNext etc.:
    var that = this;
    //document.removeEventListener ('keydown', triggerKeys, true);
    document.addEventListener ('keydown', (event) => {triggerKeys (event);}, true);
    function triggerKeys (event) {
      var Z = false; // Debugging switch
      if (event.keyCode === 112) { // F1 key
        that.actions.toggleHelp ();
      } else
      if (event.keyCode === 27) { // ESC key
        Ember.$ (".jstreeAlbumSelect").hide ();
        Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide (); // Hide settings
        if (document.getElementById ("divDropbox").className !== "hide-all") { // Hide upload
          document.getElementById ("divDropbox").className = "hide-all";
          return;
        }
        if (Ember.$ ("#notes").is (":visible")) {
          Ember.$ ("#notes").dialog ("close");
        } else
        if (Ember.$ ("#dialog").is (":visible")) {
          Ember.$ ("#dialog").dialog ("close");
        } else
        if (Ember.$ ("div[aria-describedby='textareas']").css ('display') !== "none") { // At text edit, visible
          ediTextClosed ();
          if (Z) {console.log ('*a');}
        } else // Carefylly here: !== "none" is false if the context menu is absent!
        if (Ember.$ ("ul.context-menu").css ("display") === "block") { // When context menu EXISTS and is visible
          Ember.$ ("ul.context-menu").hide ();
          if (Z) {console.log ('*b');}
        } else
        if (Ember.$ ("#link_show a").css ('opacity') > 0 ) { // The navigation help is visible
          Ember.$ ("#link_show a").css ('opacity', 0 );
          if (Z) {console.log ('*c');}
        } else
        if (Ember.$ (".toggleAuto").text () === "STOP") { // Auto slide show is running
          Ember.$ ("#navAuto").text ("false");
          Ember.run.later ( ( () => {
            Ember.$ (".nav_links .toggleAuto").text ("AUTO");
            that.runAuto (false);
          }), 100);
          if (Z) {console.log ('*d');}
        } else
        if (Ember.$ (".img_show").css ("display") === "block") { // Show image is visible
          that.actions.hideShow ();
          if (Z) {console.log ('*e');}
        } else {
          resetBorders (); // Reset all borders
        }
        if (Z) {console.log ('*f');}
      } else
      if (event.keyCode === 37 && Ember.$ ('#navKeys').text () === "true") { // Left key <
        event.preventDefault(); // Important!
        that.actions.showNext (false);
        if (Z) {console.log ('*g');}
      } else
      if (event.keyCode === 39 && Ember.$ ('#navKeys').text () === "true") { // Right key >
        event.preventDefault(); // Important!
        that.actions.showNext (true);
        if (Z) {console.log ('*h');}
      } else
      if (that.savekey !== 17 && event.keyCode === 65 && Ember.$ ("#navAuto").text () !== "true" &&
      Ember.$ ("div[aria-describedby='textareas']").css ('display') === "none" &&
      !Ember.$ ("#title input.cred.user").is (":focus") &&
      !Ember.$ ("#title input.cred.password").is (":focus")) { // A key
        if (!(Ember.$ ("#imdbDir").text () === "")) {
          Ember.$ ("#dialog").dialog ("close");
          Ember.$ ("#navAuto").text ("true");
          Ember.run.later ( ( () => {
            Ember.$ (".nav_links .toggleAuto").text ("STOP");
            that.runAuto (true);
          }), 250);
          if (Z) {console.log ('*i');}
        }
      } else {
        that.savekey = event.keyCode;
      }
    }
  },
  //----------------------------------------------------------------------------------------------
  runAuto (yes) { // ===== Help function for toggleAuto
    if (yes) {
      ediTextClosed ();
      Ember.$ ("#showSpeed").show ();
      userLog ('STARTED auto show');
      //Ember.$ ("#showSpeed input").focus (); Fatal for phones!
      var that = this;
      (function sequence () {
        that.actions.showNext (true); // Immediate response
        var showFactor = parseInt (Ember.$ ("#showFactor").text ());
        if (showFactor < 1) {showFactor = 0.5;}
        if (showFactor > 99) {showFactor = 99;}
        var txlen = Ember.$ ("#wrap_show .img_txt1").text ().length + Ember.$ ("#wrap_show .img_txt2").text ().length;
        if (!txlen) {txlen = 0;}
        if (txlen < 100) {txlen = 100;} // 100 char
        if (txlen > 1000) {txlen = 1000;} // 1000 char
        var ms;
        if (Ember.$ (".nav_links span a.speedBase").css ('color') === 'rgb(255, 20, 147)') { // deeppink
          ms = 14*txlen;
        } else {
          ms = 1000;
        }
        that.timer = setTimeout (sequence, showFactor*ms);
      } ());
    } else {
      clearTimeout (this.timer);
      Ember.$ ("#showSpeed").hide ();
      userLog ('STOPPED auto show');
    }
  },
  //----------------------------------------------------------------------------------------------
  requestOrder () { // ===== Request the sort order list
    return new Ember.RSVP.Promise ( (resolve, reject) => {
      var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
      if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories
      var that = this;
      var xhr = new XMLHttpRequest ();
      xhr.open ('GET', 'sortlist/' + IMDB_DIR); // URL matches server-side routes.js
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.responseText.trim ();
          if (data.slice (0, 8) === '{"error"') {
            //data = undefined;
            data = "Error!"; // This error text may also be generated elsewhere
          }
          var tmpName = that.get ("albumName");
          tmpName = extractContent (tmpName); // Don't accumulate HTML
          //console.log("albumName",tmpName);
          document.title = "MISH " + tmpName;
          if (data === "Error!") {
            tmpName += " &mdash; <em style=\"color:red;background:transparent\">just nu oåtkomligt</em>" // i18n
            that.set ("albumName", tmpName);
            that.set ("imdbDir", "");
            Ember.$ ("#imdbDir").text ("");
          } else {
            that.set ("albumText", "&nbsp; Valt album: &nbsp;");
            //that.set ("albumName", '<strong class="albumName" title=" Ta bort | gör nytt album ">' + tmpName + '</strong>');
            that.set ("albumName", '<strong class="albumName">' + tmpName + '</strong>');
            Ember.$ (".jstreeAlbumSelect p a").attr ("title", " Ta bort | gör nytt album ");
          }
          resolve (data); // Return file-name text lines
          console.log ("ORDER received");
        } else {
          resolve ("Error!");
          reject ({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        resolve ("Error!");
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      };
//console.log("Get sortlist/"+IMDB_DIR);
      xhr.send ();
    }).catch (error => {
      console.log (error);
    });
  },
  //----------------------------------------------------------------------------------------------
  requestNames () { // ===== Request the file information list
    // NEPF = number of entries (lines) per file in the plain text-line-result list ('namedata')
    // from the server. The main information ('namedata') is retreived from each image file, e.g.
    // metadata. It is reordered into 'newdata' in 'sortnames' order, as far as possible;
    // 'sortnames' is cleaned from non-existent (removed) files and extended with new (added)
    // files, in order as is. So far, the sort order is 'sortnames' with hideFlag (and albumIndex?)
    var that = this;
    return new Ember.RSVP.Promise ( (resolve, reject) => {
      var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
      if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories
      var xhr = new XMLHttpRequest ();
      xhr.open ('GET', 'imagelist/' + IMDB_DIR); // URL matches server-side routes.js
      var allfiles = [];
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var Fobj = Ember.Object.extend ({
            orig: '',  // for orig-file path (...jpg|tif|png|...)
            show: '',  // for show-file path (_show_...png)
            mini: '',  // for mini-file path (_mini_...png)
            name: '',  // Orig-file base name without extension
            txt1: 'description', // for metadata
            txt2: 'creator',     // for metadata
            symlink: 'false'           // else 'symlink'
          });
          var NEPF = 7; // Number of properties in Fobj
          var result = xhr.responseText;
          result = result.trim ().split ('\n'); // result is vectorised
          var i = 0, j = 0;
          var n_files = result.length/NEPF;
          if (n_files < 1) { // Covers all weird outcomes
            result = [];
            n_files = 0;
            Ember.$ ('.showCount .numShown').text (' 0');
            Ember.$ ('.showCount .numHidden').text (' 0');
            Ember.$ ('.showCount .numMarked').text ('0');
            //Ember.$ ('.showCount').hide ();
            //Ember.$ ('.showCount:first').show (); // Show upper
            Ember.$ ('#navKeys').text ('false'); // Prevents unintended use of L/R arrows
          }
          for (i=0; i<n_files; i++) {
            result [j + 4] = result [j + 4].replace (/&lt;br&gt;/g,"<br>");
            var f = Fobj.create ({
              orig: result [j],
              show: result [j + 1],
              mini: result [j + 2],
              name: result [j + 3],
              txt1: Ember.String.htmlSafe (result [j + 4]),
              txt2: Ember.String.htmlSafe (result [j + 5]),
              symlink: result [j + 6],
            });
            if (f.txt1.toString () === "-") {f.txt1 = "";}
            if (f.txt2.toString () === "-") {f.txt2 = "";}
            j = j + NEPF;
            allfiles.pushObject (f);
          }
          Ember.run.later ( ( () => {
            Ember.$ (".showCount:first").show ();
            Ember.$ (".miniImgs").show ();
            Ember.run.later ( ( () => {
              spinnerWait (false);
              //Ember.run.later ( ( () => {
              that.actions.setAllow (); // Fungerar hyfsat ...?
              //}), 2000);
            }), 2000);
          }), 2000);
          userLog ('FILE INFO received');
          resolve (allfiles); // Return file-list object array
        } else {
          reject ({
            status: this.status,
            statusText: xhr.statusText
          });
        }
      };
      xhr.onerror = function () {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      };
      xhr.send ();
    }).catch (error => {
      console.log (error);
    });
  },
  //----------------------------------------------------------------------------------------------
  // TEMPLATE ACTIONS, that is, functions reachable from the HTML page
  /////////////////////////////////////////////////////////////////////////////////////////
  actions: {
    //============================================================================================
    rstBrdrs () {
      resetBorders ();
    },
    //============================================================================================
    setAllow (newSetting) { // ##### Updates settings checkbox menu and reorder status
      allowvalue = Ember.$ ("#allowValue").text ();
      var n = allowvalue.length;

      if (newSetting) { // Uppdate allowvalue from checkboxes
        var a = "";
        for (var i=0; i<n; i++) {
          var v = String (1 * Ember.$ ('input[name="setAllow"]') [i].checked);
          a += v;
        }
        allowvalue = a;
        Ember.$ ("#allowValue").text (allowvalue);
      }

      var code = [];
      code [0] = ' </p><p><input type="checkbox" name="setAllow" value="">';
      code [1] = ' </p><p><input type="checkbox" name="setAllow" checked value="">';
      var allowHtml = [];
      for (var j=0; j<n; j++) {
        allowHtml [j] = "<p>allow." + allowance [j] + " " + (j + 1) + code [Number (allowvalue [j])] + "</p>";
      }
      Ember.$ ("#setAllow").html (allowHtml.join ("<br>"));
      allowFunc ();

      if (newSetting) { // Allow only one confirmation per settings-view
        disableSettings ();
        Ember.run.later ( ( () => {
          Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
        }), 500);
      }

      if (allow.imgReorder || allow.adminAll) { // Allow reorder and ...
        Ember.$ ("div.show-inline.ember-view").attr ("draggable", "true");
        Ember.$ ("div.show-inline.ember-view").attr ("onmousedown", "return true");
      } else { // ... disallow reorder, onmousedown setting is important!
        Ember.$ ("div.show-inline.ember-view").attr ("draggable", "false");
        Ember.$ ("div.show-inline.ember-view").attr ("onmousedown", "return false");
      }
      Ember.$ ("div.settings button.confirm").blur (); // Important in some situations
    },
    //============================================================================================
    albumEdit () { // ##### Erase or create (sub)albums (image folders)

      var imdbDir = Ember.$ ("#imdbDir").text ();
      if (imdbDir === "—" || imdbDir === "") {return;}
      if (!(allow.albumEdit || allow.adminAll)) {
        userLog ("ALBUM locked");
        return;
      }
      Ember.$ (".img_show").hide ();
      var imdbRoot = Ember.$ ("#imdbRoot").text ();
      var album = Ember.$ (this.get ("albumName")).text ();
      if (imdbDir.indexOf ("/") < 0) {
        imdbDir = imdbRoot;
      } else {
        imdbDir = imdbDir.replace (/^[^/]*\//, imdbRoot + "/");
      }

      Ember.$ ("#temporary").text ("");
      var text = "<br><b>" + album + "<b> ska raderas";

      var codeAlbum = "'var action=this.value;if (this.selectedIndex === 0) {Ember.$ (\"#temporary\").text (\"\");return false;}if (action === \"erase\" && Number (Ember.$ (\".showCount:first .numShown\").text ()) === 0 && Number (Ember.$ (\".showCount:first .numHidden\").text ()) === 0) {" + "Ember.$ (\"#temporary\").text (\"infoDia (null, null,\\\""+ album +"\\\",\\\""+ text +"\\\",\\\"Ok\\\",true)\")" + ";} else {" + "Ember.$ (\"#temporary\").text (\"infoDia (null, null,\\\""+ album +"\\\",\\\"UNDER UTVECKLING\\\",\\\"Ok\\\",true)\")" + ";}'";

      var code = '<br><select class="selectOption" onchange=' + codeAlbum + '>'
      code += '\n<option value="">&nbsp;Välj åtgärd för&nbsp;</option>'
      code += '\n<option value="new">&nbsp;Gör ett nytt underalbum till&nbsp;</option>'
      code += '\n<option value="erase">&nbsp;Radera albumet (töm det först)&nbsp;</option>'
      code += '\n</select><br>' + imdbDir + '<br>&nbsp;';
      text = code;

      infoDia (null, null, album, text, 'Ok', true, true);
      Ember.run.later ( ( () => {
        Ember.$ ("select.selectOption").focus ();
      }), 50);
    },
    //============================================================================================
    checkNames () { // ##### Check file base names against a server directory & modify commands
      var lpath =  Ember.$ ('#temporary').text (); // <- the server dir
      getBaseNames (lpath).then (names => {
        //console.log("checkNames:", names);
        var links = Ember.$ ("#picNames").text ().split ("\n"); // <- the names to be checked
        var cmds = Ember.$ ('#temporary_1').text ().split ("\n"); // <- corresp. shell commands
        //console.log(cmds.join ("\n"));
        for (var i=0; i<links.length; i++) {
          if (names.indexOf (links [i]) > -1) {
            cmds [i] = cmds [i].replace (/^ln -sf [^ ]*/, "#exists already:");
            userLog ("EXISTS already");
          }
        }
        //console.log(cmds.join ("\n"));
        Ember.$ ('#temporary_1').text (cmds.join ("\n"));
      });
    },
    //============================================================================================
    linkNames () { // ##### Make the links, checked and prepared by checkNames ()
      serverShell ("temporary_1");
    },
    //============================================================================================
    hideSpinner () { // ##### The spinner may be clicked away if it renamains for some reason

      spinnerWait (false);
      userLog ("USER hide");
    },
    //============================================================================================
    speedBase () { // ##### Toogle between seconds/textline and seconds/picture

      // Deppink triggers seconds/textline
      var colorText = Ember.$ (".nav_links span a.speedBase").css ('color');
      //console.log (colorText);
      if ( colorText !== 'rgb(255, 20, 147)') { // not deeppink but gray or hoover-color
        Ember.$ (".nav_links span a.speedBase").css ('color', 'deeppink'); // 'rgb(255, 20, 147)'
      } else {
        Ember.$ (".nav_links span a.speedBase").css ('color', 'gray'); // 'rgb(128, 128, 128)'
      }
    },
    //============================================================================================
    selectRoot (value) { // #####

//alert ("selectRoot");
      Ember.$ ("#toggleTree").attr ("title", "Välj album");
      // Close all dialogs/windows
      ediTextClosed ();
      //Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
      Ember.$ (".img_show").hide ();
      document.getElementById ("imageList").className = "hide-all";
      document.getElementById ("divDropbox").className = "hide-all";
      if (value === "") {
        // ##### Select imdbRoot
        Ember.$ ("div.settings, div.settings div.root").show ();
        Ember.$ ("div.settings div.check").hide ();
      }
      Ember.run.later ( ( () => {
        Ember.$ ("#imdbDir").text ("");
        albumWait = true;
        Ember.$ ("#requestDirs").click ();
        Ember.run.later ( ( () => {
          var imdbroot = Ember.$ ("#imdbRoot").text ();
          if (imdbroot !== "" && initFlag) {
            userLog ("ALBUM START " + imdbroot);
            initFlag = false;
            Ember.$ ("#toggleTree").click ();
          }
        }), 100);
      }), 100);
    },
    //============================================================================================
    selectAlbum () {

//alert ("selectAlbum");
      var that = this;
      var value = Ember.$ ("[aria-selected='true'] a.jstree-clicked");
      if (value && value.length > 0) {
        value = value.attr ("title").toString ().trim ();
      } else {
        value =  "";
      }
//alert ("Selected value: '" + value + "'");
      if (albumWait) {
//alert ("albumWait == true");
        document.getElementById ("imageList").className = "hide-all";
        return;
      }
      ediTextClosed ();
      Ember.$ ("div.ember-view.jstree").attr ("onclick", "return false");
      Ember.$ ("ul.jstree-container-ul.jstree-children").attr ("onclick", "return false");
      new Ember.RSVP.Promise ( (resolve) => {
        Ember.$ ("a.jstree-anchor").blur (); // Important?
        if (value !== Ember.$ ("#imdbDir").text ()) {
          Ember.$ ("#backImg").text ("");
          Ember.$ ("#picName").text ("");
          Ember.$ ("#picOrig").text ("");
          Ember.$ ("#sortOrder").text ("");
          Ember.$ (".showCount").hide ();
          Ember.$ (".miniImgs").hide ();
        }
        that.set ("imdbDir", value);
        Ember.$ ("#imdbDir").text (value);
        var tmp = "";
        if (value) {tmp = value.split ("/");}
        if (tmp [tmp.length - 1] === "") {tmp = tmp.slice (0, -1)} // removes trailing /
        tmp = tmp.slice (1); // remove symbolic link name
        that.set ("albumText", "&nbsp; Valt album: &nbsp;")
        if (tmp.length > 0) {
          that.set ("albumName", tmp [tmp.length - 1]);
        } else {
          that.set ("albumName", that.get ("imdbRoot"));
        }
        Ember.$ ("#refresh-1").click ();
        console.log ("Selected: " + that.get ("imdbDir"));
        if (value) {
          Ember.$ ("#toggleTree").attr ("title", "Valt album:  " + that.get ("albumName") + "  (" + that.get ("imdbDir").replace (/imdb/, that.get ("imdbRoot")) + ")"); // /imdb/ == imdbLink
        }
        //Ember.$ (".ember-view.jstree").jstree ("close_node", Ember.$ ("#j1_1"));
        resolve (true);
        Ember.run.later ( ( () => {
          scrollTo (0, 0);
        }), 50);
      }).catch (error => {
        console.log (error);
      });
    },
    //============================================================================================
    toggleAlbumTree: function (imdbroot) {

//alert ("toggleAlbumTree");
      if (Ember.$ ("#imdbRoot").text () !== imdbroot) {
        userLog ("ALBUM START " + imdbroot);
        Ember.$ ("#imdbRoot").text (imdbroot);
        this.set ("imdbRoot", imdbroot);
        this.set ("albumData", []);
        this.set ("albumName", "");
        this.set ("albumText", ""); // har degenererat
        Ember.$ ("#toggleTree").attr ("title", "Välj album");
      }
      document.getElementById ("divDropbox").className = "hide-all";
      var that = this;
      Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
      if (!Ember.$ (".jstreeAlbumSelect").is (":visible")) {
        // Cannot be shown without imdbRoot set
        if (!imdbroot || imdbroot === "") {
          that.actions.selectRoot ("");
          return;
        }
        Ember.$ ("#requestDirs").click ();
        if (that.get ("albumName") === "") {
          Ember.run.later ( ( () => {
            Ember.$ (".ember-view.jstree").jstree ("open_node", Ember.$ ("#j1_1"));
            //Ember.$ (".ember-view.jstree").jstree ("open_all");
          }), 300);
        }
        Ember.$ (".jstreeAlbumSelect").show ();
//alert ("jstreeAlbumSelect show");
        return;
      } else {
        Ember.$ (".jstreeAlbumSelect").hide ();
      }
    },
    //============================================================================================
    toggleHideFlagged () { // #####

      if (Ember.$ ("#sortOrder").text () === "") {return;}
      if (!(allow.imgHidden || allow.adminAll)) {
        userLog ("HIDDEN locked");
        return;
      }
      return new Ember.RSVP.Promise ( (resolve) => {
        Ember.$ ("#link_show a").css ('opacity', 0 );

        if (Ember.$ ("#hideFlag").text () === "1") {
          Ember.$ ("#hideFlag").text ("0");
          this.actions.hideFlagged (false).then (null); // Show all pics
        } else {
          Ember.$ ("#hideFlag").text ("1");
          this.actions.hideFlagged (true).then (null); // Hide the flagged pics
        }
        resolve ("OK");
      }).then (null).catch (error => {
        console.log (error);
      });

    },
    //============================================================================================
    hideFlagged (yes) { // #####

     return new Ember.RSVP.Promise ( (resolve) => {

      Ember.$ ("#link_show a").css ('opacity', 0 );
      var tmp = Ember.$ ('#sortOrder').text ().trim ();
      if (tmp.length < 1) {return;}
      var rows = tmp.split ('\n');
      var n = 0, h = 0;
      for (var i=0; i<rows.length; i++) {
        var str = rows [i].trim ();
        var k = str.indexOf (',');
        var name = str.substring (0, k);
        str = str.slice (k+1);
        k = str.indexOf (',');
        var hideFlag = 1*str.substring (0, k); // Used as 1 = hidden, 0 = shown
        str = str.slice (k+1);
        //var albumIndex = 1*str;
        //var dummy = albumIndex; // Not yet used
        var nodelem = document.getElementById ("i" + name);
        if (nodelem) {
          n = n + 1;
          if (hideFlag) {
            nodelem.style.backgroundColor=Ember.$ ("#hideColor").text ();
            if (yes) {
              nodelem.style.display='none';
            }
            h = h + 1;
          } else {
            nodelem.style.backgroundColor='#222';
            if (yes) {
              nodelem.style.display='block-inline';
            }
          }
        }
      }
      if (yes) {
        Ember.$ ('.showCount .numShown').text (' ' + (n - h));
        Ember.$ ('.showCount .numHidden').text (' ' + h);
        //Ember.$ ('#toggleHide').css ('color', 'lightskyblue');
        Ember.$ ('#toggleHide').css ('background-image', 'url(/images/eyes-blue.png)');
      } else {
        Ember.$ ('.showCount .numShown').text (' ' + n);
        Ember.$ ('.showCount .numHidden').text (' 0');
        //Ember.$ ('#toggleHide').css ('color', 'white');
        Ember.$ ('#toggleHide').css ('background-image', 'url(/images/eyes-white.png)');
        Ember.$ (".img_mini").show (); // Show all pics
      }
      Ember.$ ('.showCount .numMarked').text (Ember.$ (".markTrue").length + ' ');

      var lineCount = parseInt (Ember.$ (window).width ()/170); // w150 +> w170 each pic
      Ember.$ ('.showCount').hide ();
      Ember.$ ('.showCount:first').show (); // Show upper
      if (n > 0) {
        if ( (n - h) > lineCount) {Ember.$ ('.showCount').show ();} // Show both
      }

      resolve ("OK");

     }).catch (error => {
      console.log (error);
     });

    },
    //============================================================================================
    showDropbox () { // ##### Display (toggle) the Dropbox file upload area

      if (Ember.$ ("#imdbDir").text () === "") {return;}
      Ember.$ (".jstreeAlbumSelect").hide ();
      Ember.$ ("#link_show a").css ('opacity', 0 );
      if (document.getElementById ("divDropbox").className === "hide-all") {
        document.getElementById ("divDropbox").className = "show-block";
        Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
        this.actions.hideShow ();
        Ember.$ ("#dzinfo").html ("VÄLJ FOTOGRAFIER FÖR UPPLADDNING"); // i18n
        scrollTo (null, Ember.$ ("#highUp").offset ().top);
        if (allow.imgUpload || allow.adminAll) {
          document.getElementById("uploadPics").disabled = false;
        } else {
          document.getElementById("uploadPics").disabled = true;
          userLog ("UPLOAD prohibited");
        }
      } else {
        document.getElementById ("divDropbox").className = "hide-all";
        document.getElementById("reLd").disabled = false;
        document.getElementById("saveOrder").disabled = false;
        scrollTo (null, Ember.$ (".showCount:first").offset ().top);
      }
    },
    //============================================================================================
    imageList (yes) { // ##### Display or hide the thumbnail page

      Ember.$ ("#link_show a").css ('opacity', 0 );
      //if (yes || document.getElementById ("imageList").className === "hide-all") {
      if (yes) {
        document.getElementById ("imageList").className = "show-block";
        /*document.getElementById ("imageBtn").innerHTML = "Göm bilderna";
        document.getElementById ("imageBtn-1").className = "btn-std show-inline";
        document.getElementById ("refresh").className = "btn-std show-inline";
        document.getElementById ("refresh-1").className = "btn-std show-inline";*/
      } else {
        document.getElementById ("imageList").className = "hide-all";
        /*document.getElementById ("imageBtn").innerHTML = "Visa bilderna";
        document.getElementById ("imageBtn-1").className = "hide-all";
        document.getElementById ("refresh").className = "hide-all";
        document.getElementById ("refresh-1").className = "hide-all";*/
      }
    },
    //============================================================================================
    showShow (showpic, namepic, origpic) { // ##### Render a 'show image' in its <div>

      Ember.$ (".jstreeAlbumSelect").hide ();
      Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
      Ember.$ ("ul.context-menu").hide ();
      Ember.$ ("#" + undot (namepic) + " a img").blur ();
      Ember.$ ("#picName").text (namepic);
      resetBorders (); // Reset all borders
      markBorders (namepic); // Mark this one
      Ember.$ ("#wrap_show").removeClass ("symlink");
      if (Ember.$ ("#i" + undot (namepic)).hasClass ("symlink")) {Ember.$ ("#wrap_show").addClass ("symlink");}
      Ember.$ ("#full_size").hide ();
      if (allow.imgOriginal || allow.adminAll) {Ember.$ ("#full_size").show ();}
      Ember.$ (".img_show").hide (); // Hide in case a previous is not already hidden
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ (".img_show img:first").attr ('src', showpic);
      Ember.$ (".img_show img:first").attr ('title', origpic);
      Ember.$ (".img_show .img_name").text (namepic); // Should be plain text
      Ember.$ (".img_show .img_txt1").html (Ember.$ ('#i' + undot (namepic) + ' .img_txt1').html ());
      Ember.$ (".img_show .img_txt2").html (Ember.$ ('#i' + undot (namepic) + ' .img_txt2').html ());
      // The mini image 'id' is the 'trimmed file name' prefixed with 'i'
      if (typeof this.set === 'function') { // false if called from showNext
        var savepos = Ember.$ ('#i' + undot (namepic)).offset ();
        if (savepos !== undefined) {
          Ember.$ ('#backPos').text (savepos.top); // Vertical position of the mini-image
        }
        Ember.$ ('#backImg').text (namepic); // The name of the mini-image
      }
      Ember.$ ("#wrap_show").css ('background-color', Ember.$ ('#i' + undot (namepic)).css ('background-color'));
      Ember.$ (".img_show").show ();
      scrollTo (null, Ember.$ (".img_show img:first").offset ().top - Ember.$ ("#topMargin").text ());
      devSpec (); // Special device settings
      // Prepare texts for ediText dialog if not runAuto
      if (Ember.$ ("#navAuto").text () === "false") {
        if (Ember.$ ("#textareas").is (":visible")) {
          refreshEditor (namepic, origpic);
        }
        Ember.$ ("#markShow").removeClass ();
        if (document.getElementById ("i" + namepic).firstElementChild.nextElementSibling.className === "markTrue") {
          Ember.$ ("#markShow").addClass ("markTrueShow");
        } else {
          Ember.$ ("#markShow").addClass ("markFalseShow");
        }
        if (Ember.$ (".img_mini .img_name").css ("display") !== Ember.$ (".img_show .img_name").css ("display")) { // Can happen in a few situations
          Ember.$ (".img_show .img_name").toggle ();
        }
      }
    },
    //============================================================================================
    hideShow () { // ##### Hide the show image element

      Ember.$ ("ul.context-menu").hide (); // if open
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ (".img_show div").blur ();
      if (Ember.$ (".img_show").is (":visible")) {
        var namepic = Ember.$ (".img_show .img_name").text ();
        Ember.$ (".img_show").hide ();
        var sh = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
        scrollTo (null, Ember.$ ("#i" + undot (namepic)).offset ().top + Ember.$ ("#i" + undot (namepic)).height ()/2 - sh/2);
        resetBorders (); // Reset all borders
        markBorders (namepic); // Mark this one
      }
    },
    //============================================================================================
    showNext (forwards) { // ##### SHow the next image if forwards is true, else the previous

      if (Ember.$ ("#navAuto").text () !== "true") {
      //if (Ember.$ ("div[aria-describedby='textareas']").css ('display') === "none") {
        Ember.$ ("#dialog").dialog ("close");
      }
      Ember.$ ("#link_show a").css ('opacity', 0 );

      var namehere = Ember.$ (".img_show .img_name").text ();
      var namepic, minipic, origpic;
      var tmp = document.getElementsByClassName ("img_mini");
      namepic = namehere;
      if (forwards) {
        while (namepic === namehere) {
          namepic = null;
          if (!document.getElementById ("i" + namehere) || !document.getElementById ("i" + namehere).parentElement.nextElementSibling) { // last
            namepic = tmp [0].getAttribute ("id").slice (1);
            userLog ('To FIRST picture');
          } else {
            namepic = document.getElementById ("i" + namehere).parentElement.nextElementSibling.firstElementChild.id.slice (1);
          }
          if (document.getElementById ("i" + namepic).style.display === 'none') {
            namehere = namepic;
          }
        }
      } else {
        while (namepic === namehere) {
          namepic = null;
          if (!document.getElementById ("i" + namehere) || !document.getElementById ("i" + namehere).parentElement.previousElementSibling) { // first
            //var tmp = document.getElementsByClassName ("img_mini");
            namepic = tmp [tmp.length - 1].getAttribute ("id").slice (1);
            userLog ('To LAST picture');
          } else {
            namepic = document.getElementById ("i" + namehere).parentElement.previousElementSibling.firstElementChild.id.slice (1);
          }
          if (document.getElementById ("i" + namepic).style.display === 'none') {
            namehere = namepic;
          }
        }
      }

      if (!namepic) {return;} // Maybe malplacé...
      var toshow = document.getElementById ("i" + namepic);
      minipic = toshow.firstElementChild.firstElementChild.getAttribute ("src");
      origpic = toshow.firstElementChild.firstElementChild.getAttribute ("title");

      var showpic = minipic.replace ("/_mini_", "/_show_");
      Ember.$ (".img_show").hide (); // Hide to get right savepos
      var savepos = Ember.$ ('#i' + undot (namepic)).offset ();
      if (savepos !== undefined) {
        Ember.$ ('#backPos').text (savepos.top); // Save position
      }
      Ember.$ ('#backImg').text (namepic); // Save name
      if (typeof this.set === "function") { // false if called from didInsertElement.
//console.log("showShow 2");
//alert ("showShow 2");
        this.actions.showShow (showpic, namepic, origpic);
      } else {                              // Arrow-key move, from didInsertElement
//console.log("showShow 3");
//alert ("showShow 3");
        this.showShow (showpic, namepic, origpic);
      }
      Ember.$ ("#link_show a").blur (); // If the image was clicked
    },
    //============================================================================================
    toggleAuto () { // ##### Start/stop auto slide show

      Ember.$ ("#dialog").dialog ("close");
      if (Ember.$ ("#imdbDir").text () === "") {return;}
      if (Ember.$ ("#navAuto").text () === "false") {
        Ember.$ ("#navAuto").text ("true");
        Ember.run.later ( ( () => {
          Ember.$ (".nav_links .toggleAuto").text ("STOP");
          this.runAuto (true);
          document.getElementById("reLd").disabled = true;
          document.getElementById("saveOrder").disabled = true;
        }), 500);
      } else {
        Ember.$ ("#navAuto").text ("false");
        Ember.run.later ( ( () => {
          Ember.$ (".nav_links .toggleAuto").text ("AUTO");
          this.runAuto (false);
          document.getElementById("reLd").disabled = false;
          document.getElementById("saveOrder").disabled = false;
        }), 500);
      }
    },
    //============================================================================================
    refresh (nospin) { // ##### Reload the imageList and update the sort order

      if (Ember.$ ("#imdbDir").text () === "") {return;}
      if (!nospin) {
        spinnerWait (true);
      }
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ (".img_show").hide ();
      this.refreshAll ().then ( () => {
        return true;
      });
    },
    //============================================================================================
    saveOrder () { // ##### Save, in imdbDir on server, the ordered name list for the thumbnails on the screen. Note that they may, by user's drag-and-drop, have an unknown sort order (etc.)

      if (Ember.$ ("#imdbDir").text () === "") {return;}
      Ember.$ ("#link_show a").css ('opacity', 0 );

      new Ember.RSVP.Promise (resolve => {
        spinnerWait (true);
        var i =0, k = 0, SName = [], names, SN;
        SN = Ember.$ ('#sortOrder').text ().trim ().split ('\n'); // Take it from the DOM storage
        for (i=0; i<SN.length; i++) {
          SName.push (SN[i].split (',') [0]);
        }
        var UName = Ember.$ ('#uploadNames').text ().trim (); // Newly uploaded
        Ember.$ ('#uploadNames').text (''); // Reset
        var newOrder = '';
        // Get the true ordered name list from the DOM mini-pictures (thumbnails).
        names = Ember.$ (".img_mini .img_name").text ();
        names = names.toString ().trim ().replace (/\s+/g, " ");
        names = names.split (" ");
        for (i=0; i<names.length; i++) {
          k = SName.indexOf (names [i]);
          if (k > -1) {
            if (UName.indexOf (names[i]) > -1) {
              SN [k] = SN [k].replace (/,\d*,/, ',0,'); // Reset the hide flag for newly uploaded
            }
            newOrder = newOrder + '\n' + SN [k];
          } else {
            newOrder = newOrder + '\n' + names [i] + ',0,0';
          }
        }
        newOrder = newOrder.trim ();
        //Ember.$ ("#sortOrder").text (newOrder);
        Ember.run.later ( ( () => {
          saveOrderFunction (newOrder).then ( () => { // Save on server disk
            document.getElementById ("saveOrder").blur ();
            resetBorders (); // Reset all borders
            spinnerWait (false);
          });
        }), 1500);
        resolve (true);
      }).catch (error => {
        console.log (error);
      });
    },
    //============================================================================================
    showOrder () { // ##### For DEBUG: Show the ordered name list in the (debug) log
      // OBSOLETE, REMOVE?
      Ember.$ ("#link_show a").css ('opacity', 0 );
      var tmp = Ember.$ ('#sortOrder').text ().trim ();
      if (!tmp) {tmp = '';}
      // sortOrder is a string with a bunch of lines
      console.log (tmp.length +', order:');
      console.log (tmp.trim ());
      document.getElementById ("showOrder").blur ();
    },
    //============================================================================================
    toggleNameView () { // ##### Toggle-view file names

      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ (".img_mini .img_name").toggle ();
      Ember.$ (".img_show .img_name").toggle ();
    },
    //============================================================================================
    toggleHelp () { // ##### Togglle-view user manual

      if (Ember.$ ("#helpText").is (":visible") || Ember.$ ("#navAuto").text () === "true") {
        Ember.$ ('#helpText').dialog ("close");
      } else {
        infoDia ("helpText", null, "Användarhandledning", Ember.$ ("div.helpText").html (), "Stäng", false);
        Ember.$ ("#helpText").parent ().css ("top", "0");
        Ember.$ (".jstreeAlbumSelect").hide ();
      }
    },
    //============================================================================================
    toggleNav () { // ##### Toggle image navigation-click zones

      if (Ember.$ ("#navAuto").text () === "true") {
        var title = "Stanna automatisk visning...";
        var text = ' ... med <span style="color:deeppink;font-family:monospace;font-weight:bold">STOP</span> eller Esc-tangenten och börja visningen igen med <span style="color:deeppink;font-family:monospace;font-weight:bold">AUTO</span> eller A-tangenten!';
        var yes ="Ok";
        var modal = true;
        infoDia (null, null, title, text, yes, modal);
      } else if (Ember.$ ("#link_show a").css ('opacity') === '0' ) {
        Ember.$ ("#link_show a").css ('opacity', 1 );
      } else {
        Ember.$ ("#link_show a").css ('opacity', 0 );
      }
      devSpec ();

    },
    //============================================================================================
    ediText (namepic) { // ##### Edit picture texts

      var displ = Ember.$ ("div[aria-describedby='textareas']").css ('display');
      var name0 = Ember.$ ("span.ui-dialog-title span").html ();
      if (!(allow.textEdit || allow.adminAll)) {return;}
      if (Ember.$ ("#navAuto").text () === "true") {return;}
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ ('#navKeys').text ('false');
      // In case the name is given, the call originates in a mini-file (thumbnail)
      // Else, the call originates in, or in the opening of, a new|next show-file
      //   that may have an open 'textareas' dialog
      var origpic;
      if (namepic) {
        Ember.run.later ( ( () => {
          displ = Ember.$ ("div[aria-describedby='textareas']").css ('display');
          if (displ !== "none" && name0 === namepic) {
            ediTextClosed ();
            return;
          }
        }), 20);
        // NOTE: An ID string for 'getElementById' should have dots unescaped!
        origpic = document.getElementById ("i" + namepic).firstElementChild.firstElementChild.getAttribute ("title"); // With path

      } else {
        namepic = Ember.$ (".img_show .img_name").text ();
        Ember.$ ("#backPos").text (Ember.$ ('#i' + undot (namepic)).offset ().top);
        if (Ember.$ ("div[aria-describedby='textareas']").css ('display') !== "none") {
          ediTextClosed ();
          return;
        }
        origpic = Ember.$ (".img_show img").attr ('title'); // With path
      }
      Ember.$ ("#picName").text (namepic);
      displ = Ember.$ ("div[aria-describedby='textareas']").css ('display');

      // OPEN THE TEXT EDIT DIALOG and adjust some more details and perhaps warnings
      Ember.$ ("#textareas").dialog ("open");
      Ember.$ ("div[aria-describedby='textareas']").show ();
      Ember.$ ("span.ui-dialog-title span").on ("click", () => { // Open if the name is clicked
        var showpic = origpic.replace (/\/[^/]*$/, '') +'/'+ '_show_' + namepic + '.png';
//console.log("showShow 4");
//alert ("showShow 4");
        this.actions.showShow (showpic, namepic, origpic);
      });
      Ember.$ ('textarea[name="description"]').attr ("placeholder", "Skriv här: När var vad vilka (för Xmp.dc.description)");
      Ember.$ ('textarea[name="creator"]').attr ("placeholder", "Skriv här: Foto upphov ursprung källa (för Xmp.dc.creator)");

      refreshEditor (namepic, origpic);

      resetBorders ();
      if (displ === "none") {
        // Prepare the extra "non-trivial" dialog buttons
        Ember.$ (".ui-dialog-buttonset button:first-child").css ("float", "left");
        Ember.$ (".ui-dialog-buttonset button:last-child").css ("float", "right");
        Ember.$ (".ui-dialog-buttonset button:first-child").attr ("title", "... som inte visas");
        Ember.$ (".ui-dialog-buttonset button:last-child").attr ("title", "Extra sökbegrepp");
        // Resize and position the dialog
        var diaDiv = "div[aria-describedby='textareas']"
        var sw = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        var diaDivLeft = parseInt ((sw - ediTextSelWidth ())/2) + "px";
        Ember.$ (diaDiv).css ("top", "0px");
        Ember.$ (diaDiv).css ("left", diaDivLeft);
        Ember.$ (diaDiv).css ("max-width", sw+"px");
        Ember.$ (diaDiv).css ("width", "");
        var hs = window.innerHeight;
        var up = 128;
        //var uy = Ember.$("div.ui-dialog");
        //var ui = Ember.$("div.ui-dialog .ui-dialog-content");
        var uy = Ember.$(diaDiv);
        var ui = Ember.$(diaDiv + " .ui-dialog-content");
        uy.css ("height", "auto");
        ui.css ("height", "auto");
        uy.css ("max-height", hs + "px");
        ui.css ("max-height", hs - up + "px");
      }
      Ember.$ (".jstreeAlbumSelect").hide ();
      // Also hide the small button arrays since they may hide text in dialog on small screens
      Ember.$ ("#smallButtons").hide ();
      Ember.$ ("div.nav_links").hide ();
      markBorders (namepic);
    },
    //============================================================================================
    fullSize () { // ##### Show full resolution image

      if (window.screen.width < 500 || window.screen.height < 500) {return;}
      Ember.$ ("#link_show a").css ('opacity', 0 );
      spinnerWait (true);
//console.log("SPINNER show 3");
      return new Ember.RSVP.Promise ( (resolve, reject) => {
        var xhr = new XMLHttpRequest ();
        var origpic = Ember.$ (".img_show img").attr ('title'); // With path
        xhr.open ('GET', 'fullsize/' + origpic); // URL matches routes.js with *?
        xhr.onload = function () {
          if (this.status >= 200 && this.status < 300) {
            var djvuName = xhr.responseText;
            var dejavu = window.open (djvuName  + '?djvuopts&amp;zoom=100', 'dejavu', 'width=916,height=600,resizable=yes,location=no,titlebar=no,toolbar=no,menubar=no,scrollbars=yes,status=no');
            dejavu.focus ();
            spinnerWait (false);
//console.log("SPINNER hide 3");
            resolve (true);
          } else {
            reject ({
              status: this.status,
              statusText: xhr.statusText
            });
          }
        };
        xhr.onerror = function () {
          reject ({
            status: this.status,
            statusText: xhr.statusText
          });
        };
        xhr.send ();
      }).catch (error => {
        console.log (error);
      });
    },
    //============================================================================================
    downLoad () { // ##### Download an image

      Ember.$ ("#link_show a").css ('opacity', 0 );
      spinnerWait (true);
//console.log("SPINNER show 4");
      return new Ember.RSVP.Promise ( (resolve, reject) => {
        var xhr = new XMLHttpRequest ();
        var tmp = Ember.$ ("#picName").text ().trim ();
        Ember.run.later ( ( () => {
          resetBorders (); // Reset all borders
          markBorders (tmp); // Mark this one
        }), 50);
        var origpic = Ember.$ ('#i' + undot (tmp) + ' img.left-click').attr ('title'); // With path
        xhr.open ('GET', 'download/' + origpic); // URL matches routes.js with *?
        xhr.onload = function () {
          if (this.status >= 200 && this.status < 300) {
            //console.log (this.responseURL); // Contains http://<host>/download/...
            var host = this.responseURL.replace (/download.+$/, "");
            Ember.$ ("#download").attr ("href", host + this.responseText); // Is just 'origpic'(!)
            Ember.run.later ( ( () => {
              //Ember.$ ("#download").click (); DOES NOT WORK
              document.getElementById ("download").click (); // Works
            }), 250);
            spinnerWait (false);
//console.log("SPINNER hide 4");
            userLog ('DOWNLOAD ' + origpic);
            resolve (true);
          } else {
            reject ({
              status: this.status,
              statusText: xhr.statusText
            });
          }
        };
        xhr.onerror = function () {
          reject ({
            status: this.status,
            statusText: xhr.statusText
          });
        };
        xhr.send ();
      }).catch (error => {
        console.log (error);
      });
    },
    //============================================================================================
    toggleMark (name) { // ##### Mark an image

      if (!name) {
        name = document.getElementById ("link_show").nextElementSibling.nextElementSibling.textContent.trim ();
      }
      resetBorders (); // Reset all borders
      var ident = "#i" + undot (name) + " div:first";
      var marked = Ember.$ (ident).hasClass ("markTrue");
      Ember.$ (ident).removeClass ();
      Ember.$ ("#markShow").removeClass ();
      if (marked) {
        Ember.$ (ident).addClass ('markFalse');
        Ember.$ ("#markShow").addClass ('markFalseShow');
      } else {
        Ember.$ (ident).addClass ('markTrue');
        Ember.$ ("#markShow").addClass ('markTrueShow');
      }
      Ember.$ ('.showCount .numMarked').text (Ember.$ (".markTrue").length + ' ');
    },
    //============================================================================================
    logIn () { // ##### User login (confirm, logout) button pressed

      var that = this;
      Ember.$ (".img_show").hide ();
      var btnTxt = Ember.$ ("#title button.cred").text ();
      if (btnTxt === " Logga in ") { // Log in (should be buttonText[0] ... i18n)
        Ember.$ ("#title input.cred").show ();
        Ember.$ ("#title input.cred.user").focus ();
        Ember.$ ("#title input.cred.user").select ();
        Ember.$ ("#title button.cred").text (" Bekräfta ");
        Ember.$ ("#title button.cred").attr ("title", "Bekräfta inloggning");
        return;
      }
      if (btnTxt === " Logga ut ") { // Log out
        Ember.$ ("#hideFlag").text ("1");// Two lines from 'toggleHideFlagged'
        that.actions.hideFlagged (true).then (null); // Hide flagged pics if shown
        Ember.$ ("#title button.cred").text (" Logga in ");
        Ember.$ ("#title button.cred").attr ("title", logAdv);
        Ember.$ ("#title span.cred.name").text ("");
        this.set ("loggedIn", false);
        Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
        Ember.$ ("#title button.viewSettings").hide ();
        userLog ("LOGGED out");
        zeroSet (); // #allowValue = '000... etc.
        that.actions.setAllow ();
        return;
      }
      if (btnTxt === " Bekräfta ") { // Confirm
        var usr = Ember.$ ("#title input.cred.user").val ();
        var pwd = Ember.$ ("#title input.cred.password").val ();
        Ember.$ ("#title input.cred").hide ();
        loginError ().then (isLoginError => {
          if (isLoginError) {
            Ember.$ ("#title button.cred").text (" Logga in ");
            Ember.$ ("#title button.cred").attr ("title", logAdv);
            this.set ("loggedIn", false);
            Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
            userLog ("LOGIN error");
            zeroSet (); // #allowValue = '000... etc.
            that.actions.setAllow ();
          } else {
            Ember.$ ("#title button.cred").text (" Logga ut ");
            Ember.$ ("#title button.cred").attr ("title", "Du är inloggad!");
            Ember.$ ("#title button.viewSettings").attr ("title", "Se inställningar - klicka här!");
            Ember.$ ("#title button.viewSettings").show ();
            this.set ("loggedIn", true);
            userLog ("LOGGED in");
            that.actions.setAllow ();
          }
          Ember.$ ("#title input.cred.password").val ("");
        });
      }

      // When password doesn't match user return true; else set 'allowvalue' and return 'false'
      function loginError () {
        return new Ember.RSVP.Promise (resolve => {
          if (usr === "") {
            usr = "anonym"; // i18n
            //Ember.$ ("#title input.cred.user").val (usr);
          }
          //console.log(usr,pwd,"probe");
          getCredentials (usr).then (credentials => {
            var cred = credentials.split ("\n");
            var password = cred [0];
            var status = cred [1];
            var allow = cred [2];
            //console.log(usr,password,"está");
            if (pwd === password) {
              Ember.$ ("#allowValue").text (allow);
              Ember.$ ("#title span.cred.name").text (usr +" ["+ status +"]");
              setTimeout(function () { // NOTE: Normally, Ember.run.later replaces setTimeout
                resolve (false);
              }, 10);                  //       (preserved here just as an example)
            } else {
              resolve (true);
            }
          }).catch (error => {
            console.log (error);
          });

          function getCredentials (user) { // Sets .. and returns ...
            return new Ember.RSVP.Promise ( (resolve, reject) => {
              // ===== XMLHttpRequest checking 'usr'
              var xhr = new XMLHttpRequest ();
              xhr.open ('GET', 'login/' + user);
              xhr.onload = function () {
                resolve (xhr.responseText);
              }
              xhr.onerror = function () {
                reject ({
                  status: this.status,
                  statusText: xhr.statusText
                });
              }
              xhr.send ();
            }).catch (error => {
              console.log (error);
            });
          }
        });
      }
    },
//============================================================================================
    toggleSettings () { // ##### Show/change settings

      if (!this.get ("loggedIn")) {
        Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
        return;
      }
      document.getElementById ("imageList").className = "hide-all";
      Ember.$ ("#dialog").dialog ('close');
      document.getElementById ("divDropbox").className = "hide-all";
      Ember.$ (".img_show").hide (); // settings + img_show don't go together
      Ember.$ ("div.settings, div.settings div.root, div.settings div.check").toggle ();
      if (!(allow.albumEdit || allow.adminAll)) {
        Ember.$ ("div.settings div.root").hide ();
      } else {
        Ember.$ ("div.settings div.root").show (); //important!
        //Ember.$ (".jstreeAlbumSelect").hide ();
        if (Ember.$ ("#imdbRoot").text () === "") {
          this.actions.selectRoot ("");
          return;
        }
      }
      this.actions.setAllow (); // Resets unconfirmed changes
      document.querySelector ('div.settings button.confirm').disabled = true;
      var n = document.querySelectorAll ('input[name="setAllow"]').length;
      for (var i=0; i<n; i++) {
        document.querySelectorAll ('input[name="setAllow"]') [i].disabled = false;
        document.querySelectorAll ('input[name="setAllow"]') [i].addEventListener ('change', function () {
          document.querySelector ('div.settings button.confirm').disabled = false;
          Ember.$ ("div.settings div.root").hide ();
        })
      }
      // Protect the first checkbox (must be 'allow.adminAll'), set in the sqLite tables:
      document.querySelectorAll ('input[name="setAllow"]') [0].disabled = true;
      // Lock if change of setting is not allowed
      if (!(allow.setSetting || allow.adminAll)) {
        disableSettings ();
      }
      if (Ember.$ ("div.settings").is (":visible")) {
        Ember.$ (".jstreeAlbumSelect").hide ();
      }
    }
  }
});
// G L O B A L S, that is, 'outside' (global) variables and functions
/////////////////////////////////////////////////////////////////////////////////////////
var initFlag = true;
var albumWait = false;
var logAdv = "Logga in för att se inställningar, anonymt utan namn eller lösenord, eller med namnet 'gäst' utan lösenord för att också få vissa redigeringsrättigheter"; // i18n
var nopsGif = "GIF-fil kan bara ha tillfällig text"; // i18n
var nopsLink = "Text kan inte ändras/sparas permanent via länk"; // i18n
var preloadShowImg = [];
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Close the ediText dialog and return false if it wasn't already closed, else return true
function ediTextClosed () {
  Ember.$ ("span.ui-dialog-title span").html ("");
  Ember.$ (".ui-dialog-buttonset button:first-child").css ("float", "none");
  Ember.$ (".ui-dialog-buttonset button:last-child").css ("float", "none");
  Ember.$ (".ui-dialog-buttonset button:first-child").attr ("title", "");
  Ember.$ (".ui-dialog-buttonset button:last-child").attr ("title", "");
  if (Ember.$ ("div[aria-describedby='textareas']").css ("display") === "none") {
    return true; // It is closed
  } else {
    Ember.$ ("div[aria-describedby='textareas']").hide ();
    Ember.$ ('#navKeys').text ('true');
    Ember.$ ("#smallButtons").show ();
    Ember.$ ("div.nav_links").show ();
    return false; // It wasn't closed (now it is)
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Wait for server activities etc.
function spinnerWait (runWait) {
  if (runWait) {
    Ember.$ (".spinner").show ();
    document.getElementById("reLd").disabled = true;
    document.getElementById("saveOrder").disabled = true;
    document.getElementById("toggleTree").disabled = true;
    Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
    Ember.$ (".jstreeAlbumSelect").hide ();
    document.getElementById ("divDropbox").className = "hide-all";
  } else { // End waiting
    Ember.$ (".spinner").hide ();
    document.getElementById("reLd").disabled = false;
    document.getElementById("saveOrder").disabled = false;
    document.getElementById("toggleTree").disabled = false;
    document.getElementById("showDropbox").disabled = false; // May be disabled at upload!
    //if (allow.imgUpload || allow.adminAll) {document.getElementById("uploadPics").disabled = false;}
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function deleteFiles (picNames, nels) { // ===== Delete image(s)
  // nels = number of elements in picNames to be deleted
  new Ember.RSVP.Promise (resolve => {
    var keep = [], symlink;
    for (var i=0; i<nels; i++) {
      symlink = Ember.$ ('#i' + undot (picNames [i])).hasClass ('symlink');
      if (!(allow.deleteImg || symlink && allow.delcreLink || allow.adminAll)) {
        keep.push (picNames [i]);
      } else {
        deleteFile (picNames [i]).then (result => {
          console.log ('Deleted: ' + result);
        });
      }
    }
    if (keep.length > 0) {
      console.log ("No delete permission for " + cosp (keep, true));
      keep = cosp (keep);
      Ember.run.later ( ( () => {
        infoDia (null, null, "Otillåtet att radera", '<br><span  style="color:deeppink">' + keep + '</span>', "Ok", true); // i18n
      }), 100);
    }
    Ember.run.later ( ( () => {
      Ember.$ ("#saveOrder").click ();
    }), 200);
    resolve ();
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function deleteFile (picName) { // ===== Delete an image
  Ember.$ ("#link_show a").css ('opacity', 0 );
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    // ===== XMLHttpRequest deleting 'picName'
    var xhr = new XMLHttpRequest ();
    var origpic = Ember.$ ('#i' + undot (picName) + ' img.left-click').attr ('title'); // With path
    xhr.open ('GET', 'delete/' + origpic); // URL matches routes.js with *?
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        //console.log (xhr.responseText);
        //userLog (xhr.responseText);
        resolve (picName);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
    //console.log ('Deleted: ' + picName);
  }).catch (error => {
    console.log (error);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function infoDia (dialogId, picName, title, text, yes, modal, flag) { // ===== Information dialog
  // NOTE: picName ===
  //   "name" shows info for that picture
  //   "" makes symlink(s) for pics with linkNames()
  //   null AND flag === true triggers evaluation of #temporary, probably for albumEdit
  if (!dialogId) {dialogId = "dialog";}
  var id = "#" + dialogId;
  if (picName) { //
    resetBorders (); // Reset all borders
    markBorders (picName); // Mark this one
  }
  Ember.$ (id).dialog ( { // Initiate dialog
    title: title,
    closeText: "×",
    autoOpen: false,
    draggable: true,
    modal: modal,
    closeOnEscape: true,
  });
  Ember.$ (id).html (text);
  // Define button array
  Ember.$ (id).dialog ('option', 'buttons', [
  {
    text: yes, // Okay
    "id": "yesBut",
    click: function () {
      if (picName === "") {Ember.$ ("#linkNames").click ();} // Special case: make symlinks!
      //if (flag) {Ember.$ ("#runTemp").click ();}
      Ember.$ (this).dialog ('close');
      if (flag) {
        console.log (Ember.$ ("#temporary").text ());
        eval (Ember.$ ("#temporary").text ());
      }
      return true;
    }
  }]);
  niceDialogOpen (dialogId);
  Ember.$ ("#yesBut").focus ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function notesDia (picName, filePath, title, text, save, close) { // ===== Text dialog
  Ember.$ ("#notes").dialog ('destroy').remove ();
  if (picName) { //
    resetBorders (); // Reset all minipic borders
    markBorders (picName); // Mark this one
  }
  Ember.$ ('<div id="notes"><textarea class="notes" name="notes" placeholder="Anteckningar (för Xmp.dc.source) visas ej" rows="8"></textarea></div>').dialog ( { // Initiate dialog
    title: title,
    closeText: "×",
    autoOpen: false,
    draggable: true,
    modal: true,
    closeOnEscape: true,
    resizable: false
  });
  // Define button array
  Ember.$ ("#notes").dialog ("option", "buttons", [
    {
      text: save,
      //"id": "saveBut",
      class: "saveNotes",
      click: function () {
        // Remove extra spaces and convert to <br> for saving metadata in server image:
        text = Ember.$ ('textarea[name="notes"]').val ().replace (/ +/g, " ").replace (/\n /g, "<br>").replace (/\n/g, "<br>").trim ();
        // Remove <br> in the text shown; use <br> as is for metadata
        Ember.$ ('textarea[name="notes"]').val (text.replace (/<br>/g, "\n"));
        execute ("xmpset source " + filePath + ' "' + text.replace (/"/g, '\\"')+ '"').then ( () => {
          userLog ("TEXT written");
          return true;
        });
      }
    },
    {
      text: close,
      class: "closeNotes",
      click: function () {
        Ember.$ (this).dialog ("close");
      }
    }
  ]);
  Ember.$ ("#notes").dialog ("open");
  var tmp = Ember.$ ("#notes").prev ().html ();
  tmp = tmp.replace (/<span([^>]*)>/, "<span$1><span>" + picName + "</span> &nbsp ");
  // Why doesn't the close button work? Had to add next line to get it function:
  tmp = tmp.replace (/<button/,'<button onclick="$(\'#notes\').dialog(\'close\');"');
  Ember.$ ("#notes").prev ().html (tmp);
  Ember.$ ('textarea[name="notes"]').html ("");
  niceDialogOpen ("notes");
  Ember.run.later ( ( () => {
    Ember.$ ("#notes").dialog ("open"); // Reopen
    Ember.$ ('textarea[name="notes"]').focus (); // Positions to top *
    if (!(allow.notesEdit || allow.adminAll)) {
      Ember.$ ('textarea[name="notes"]').attr ("disabled", true);
      Ember.$ ("button.saveNotes").attr ("disabled", true);
      Ember.$ ("button.closeNotes").focus ();
    }
    Ember.$ ('textarea[name="notes"]').html (text.replace (/<br>/g, "\n"));
  }), 40);
  // Why doesn't the 'close-outside' work? Had to add this to get it function:
  Ember.$ ('.ui-widget-overlay').bind ('click', function () {
    Ember.$ ('#notes').dialog ('close');
  });
  Ember.$ ("#notes").css ("padding", "0");
  //document.querySelector('textarea[name="notes"]').scrollTop = 0; // * Doesn't work
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function niceDialogOpen (dialogId) {
  if (!dialogId) {dialogId = "dialog";}
  var id = "#" + dialogId;
  Ember.$ (id).parent ().width ("auto");
  Ember.$ (id).width ("auto");
  Ember.$ (id).parent ().height ("auto");
  Ember.$ (id).height ("auto");
  Ember.$ (id).parent ().css ("max-height", "");
  Ember.$ (id).css ("max-height","");
  Ember.$ (id).dialog ("open");
  var esw = ediTextSelWidth () - 100;
  var sw = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  Ember.$ (id).parent ().css ("min-width", "300px");
  Ember.$ (id).parent ().css ("max-width", sw+"px");
  Ember.$ (id).parent ().width ("auto");
  Ember.$ (id).width ("auto");
  if (id === "#notes") {
    var diaDivLeft = parseInt ( (sw - esw)/2) + "px";
    Ember.$ (id).parent ().css ("left", diaDivLeft);
    Ember.$ (id).parent ().width (esw + "px");
  }
  var up = 128;
  var hs = window.innerHeight;
  Ember.$ (id).parent ().css ("max-height", hs + "px");
  Ember.$ (id).css ("max-height", hs - up + "px");
  // NOTE nodes above: JQuery objects
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function hideFunc (picNames, nels, act) { // ===== Execute a hide request
  // nels = number of elements in picNames to be acted on, act = hideFlag
  for (var i=0; i<nels; i++) {
    var picName = picNames [i];
    var sortOrder = Ember.$ ("#sortOrder").text ();
    var k = sortOrder.indexOf (picName + ',');
    var part1 = sortOrder.substring (0, picName.length + k + 1);
    var part2 = sortOrder.slice (picName.length + k + 1);
    k = part2.indexOf (',');
    var hideFlag = ('z' + act).slice (1); // Set 1 or 0 and convert to string
    sortOrder = part1 + hideFlag + part2.slice (k); // Insert the new flag
    Ember.$ ("#i" + undot (picName)).css ('background-color', '#222');
    Ember.$ ("#wrap_show").css ('background-color', '#222'); // *Just in case the show image is visible     Ember.$ ("#i" + undot (picName)).show ();
    if (hideFlag === "1") { // If it's going to be hidden: arrange its CSS ('local hideFlag')
      Ember.$ ("#i" + undot (picName)).css ('background-color', Ember.$ ("#hideColor").text ());
      Ember.$ ("#wrap_show").css ('background-color', Ember.$ ("#hideColor").text ()); // *Just in case -
      // The 'global hideFlag' determines whether 'hidden' pictures are hidden or not
      if (Ember.$ ("#hideFlag").text () === "1") { // If hiddens ARE hidden, hide this also
        Ember.$ ("#i" + undot (picName)).hide ();
      }
    }
    Ember.$ ("#sortOrder").text (sortOrder); // Save in the DOM
  }
  //Update picture numbers:
  var tmp = document.getElementsByClassName ("img_mini");
  var numHidden = 0, numTotal = tmp.length;
  for (i=0; i<numTotal; i++) {
    if (tmp [i].style.backgroundColor === Ember.$ ("#hideColor").text ()) {
      numHidden = numHidden + 1;
    }
  }
  if (Ember.$ ("#hideFlag").text () === "1") {
    Ember.$ (".numHidden").text (numHidden);
    Ember.$ (".numShown").text (numTotal - numHidden);
  } else {
    Ember.$ (".numHidden").text (0);
    Ember.$ (".numShown").text (numTotal);
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function linkFunc (picNames) { // ===== Execute a link-this-file-to... request
  // picNames should also be saved as string in #picNames
  var albums = Ember.$ ("#imdbDirs").text ().replace (/\n[^\n]*$/, ""); // Remove dirList 'filler'
  albums =albums.slice (1); // Remove initial '/'
  albums = albums.split ("\n");
  var curr = Ember.$ ("#imdbDir").text ().match(/\/.*$/); // Remove imdbLink
  if (curr) {curr = curr.toString ();} else {curr = "";}
  var lalbum = [];
  var i;
  for (i=0; i<albums.length; i++) { // Remove current album from options
    if (albums [i] !== curr) {lalbum.push (albums [i]);}
  }

  var rex = /^[^/]*\//;
  var codeLink = "'var lalbum=this.value;if (this.selectedIndex === 0) {return false;}if (this.selectedIndex === 1) {lalbum = \"\";var lpath = Ember.$ (\"#imdbLink\").text ();}else{lpath = Ember.$ (\"#imdbLink\").text () + \"/\" + lalbum.replace (/^[^/]*\\//,\"\");} console.log(\"Link to\",lpath);var picNames = Ember.$(\"#picNames\").text ().split (\"\\n\");var cmd=[];for (var i=0; i<picNames.length; i++) {var linkfrom = document.getElementById (\"i\" + picNames [i]).getElementsByTagName(\"img\")[0].getAttribute (\"title\");linkfrom = \"../\".repeat (lpath.split (\"/\").length - 1) + linkfrom.replace ("+rex+", \"\");var linkto = lpath + \"/\" + picNames [i];linkto += linkfrom.match(/\\.[^.]*$/);cmd.push(\"ln -sf \"+linkfrom+\" \"+linkto);}Ember.$ (\"#temporary\").text (lpath);Ember.$ (\"#temporary_1\").text (cmd.join(\"\\n\"));Ember.$ (\"#checkNames\").click ();'";
  //console.log(codeLink);

  var r = Ember.$ ("#imdbRoot").text ();
  var codeSelect = '<select class="selectOption" onchange=' + codeLink + '>\n<option value="">Välj ett album:</option>';
  for (i=0; i<lalbum.length; i++) {
    var v = r + lalbum [i];
    codeSelect += '\n<option value ="' +v+ '">' +v+ '</option>';
  }
  codeSelect += "\n</select>"
  var title = "Länka till annat album";
  var text = cosp (picNames) +"<br>ska länkas till<br>" + codeSelect;
  var modal = true;
  infoDia (null, "", title, text, "Ok", modal); // Trigger infoDia to make links
  Ember.$ ("select.selectOption").focus ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function saveOrderFunction (namelist) { // ===== XMLHttpRequest saving the thumbnail order list

  document.getElementById ("divDropbox").className = "hide-all"; // If shown...
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    Ember.$ ("#sortOrder").text (namelist); // Save in the DOM
    var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
    if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
    IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories
    var xhr = new XMLHttpRequest ();
    xhr.open ('POST', 'saveorder/' + IMDB_DIR); // URL matches server-side routes.js
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        userLog ('ORDER saved');
        resolve (true); // Can we forget 'resolve'?
      } else {
        userLog ('ORDER save error');
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.send (namelist);
  }).catch (error => {
    console.log (error);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function userLog (message) { // ===== Message to the log file and also the user
  console.log (message);
  var messes = Ember.$ ("#title span.usrlg").text ().trim ().split ("•");
  if (messes.length === 1 && messes [0].length < 1) {messes = [];}
  if (messes.length > 4) {messes.splice (0, messes.length - 4);}
  messes.push (message);
  messes = messes.join (" • ");
  Ember.$ ("#title span.usrlg").text (messes);

  Ember.$ (".shortMessage").text (message);
  Ember.$ (".shortMessage").show ();
  Ember.run.later ( ( () => {
    Ember.$ (".shortMessage").hide ();
  }), 2000);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function reqRoot () { // Propose root directory (requestDirs)
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'rootdir/');
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var dirList = xhr.responseText;
console.log(dirList);
        resolve (dirList);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  }).catch (error => {
    if (error.status !== 404) {
      console.log (error);
    } else {
      console.log ("reqRoot No NodeJS server");
    }
  });
  // Choose the imdb directory and save in #imdbRoot (select?)

}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function reqDirs (imdbroot) { // Read the dirs in imdb (requestDirs)
  if (imdbroot === undefined) {return;}
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    //userLog ("ALBUM START " + imdbroot);
    xhr.open ('GET', 'imdbdirs/' + imdbroot);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var dirList = xhr.responseText;
        dirList = dirList.split ("\n");
        Ember.$ ("#userDir").text (dirList [0].slice (0, dirList [0].indexOf ("@")));
        Ember.$ ("#imdbRoot").text (dirList [0].slice (dirList [0].indexOf ("@") + 1));
        Ember.$ ("#imdbLink").text (dirList [1].slice (0, -1)); // Remove trailing '/'
        var imdbLen = dirList [1].length - 1;
        dirList = dirList.slice (1);
        var nodeVersion = dirList [dirList.length - 1];
        var nodeText = Ember.$ ("#lastRow").html (); // In application.hbs
        nodeText = nodeText.replace (/NodeJS[^•]*•/, nodeVersion +" •");
        Ember.$ ("#lastRow").html (nodeText); // In application.hbs
        for (var i=0; i<dirList.length; i++) {
          dirList [i] = dirList [i].slice (imdbLen);
        }
        // This line is not used any longer but should remain as a filler line:
        dirList [dirList.length - 1] = Ember.String.htmlSafe("Make&nbsp;new&nbsp;or&nbsp;change");
        dirList = dirList.join ("\n");
        Ember.$ ("#imdbDirs").html (dirList);
        resolve (dirList);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  }).catch (error => {
    if (error.status !== 404) {
      console.log (error);
    } else {
      console.log (error.status, error.statusText, "or NodeJS server error?");
    }
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function getBaseNames (IMDB_DIR) { // ===== Request imgfile basenames from a server directory
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    //var IMDB_DIR =  Ember.$ ('#temporary').text ();
    if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
    IMDB_DIR = IMDB_DIR.replace (/\//g, "@");
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'basenames/' + IMDB_DIR);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var result = xhr.responseText;
        //userLog ('NAMES received');
        resolve (result);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  }).catch (error => {
    console.log (error);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function getFilestat (filePath) { // Request a file's statistics/information
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'filestat/' + filePath.replace (/\//g, "@"));
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var data = xhr.responseText.trim ();
        resolve (data);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function resetBorders () { // Reset all mini-image borders and SRC attributes
  var minObj = Ember.$ (".img_mini img.left-click");
  minObj.css ('border', '0.25px solid #888');
  //console.log("--- resetBorders");
  minObj.removeClass ("dotted");
  // Resetting all minifile SRC attributes ascertains that any minipic is shown
  // (maybe created just now, e.g. at upload, any outside-click will show them)
  for (var i=0; i<minObj.length; i++) {
    var toshow = minObj [i];
    var minipic = toshow.src;
    toshow.src = null;
    toshow.src = minipic;
    /*That was a good JQuery-object way.
      The "normal" way 'flickers' very much:
    var minObj = document.querySelectorAll (".img_mini img.left-click");
    var minipic = toshow.getAttribute ("src");
    toshow.removeAttribute ("src");
    toshow.setAttribute ("src", minipic);*/
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function markBorders (picName) { // Mark a mini-image border
  Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
  Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").addClass ("dotted");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function undot (txt) { // Escape dots, for CSS names
  // Use e.g. when file names are used in CSS, #<id> etc.
  return txt.replace (/\./g, "\\.");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function cosp (textArr, system) { // Convert an array of text strings
  // into a comma+space[and]-separated text string
  var andSep = " och"; // i18n
  if (system) {andSep = ", and"}
  if (textArr.length === 1) {return textArr [0]} else {
    return textArr.toString ().replace (/,/g, ", ").replace (/,\s([^,]+)$/, andSep + " $1")
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function extractContent(htmlString) { // Extracts text from an HTML string
  var span= document.createElement('span');
  span.innerHTML= htmlString;
  return span.textContent || span.innerText;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function devSpec () { // Device specific features/settings
  // How do we make context menus with iPad/iOS?
  if ( (navigator.userAgent).includes ("iPad")) {
    Ember.$ ("#full_size").hide (); // the central image link
  }
  if (window.screen.width < 500 || window.screen.height < 500) {
    Ember.$ ("#full_size").hide (); // the central image link
    Ember.$ ("a.toggleAuto").hide (); // slide show button
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function disableSettings () { // Disables the confirm button, and all checkboxes
  document.querySelector ('div.settings button.confirm').disabled = true;
  for (var i=0; i<allowvalue.length; i++) {
    document.querySelectorAll ('input[name="setAllow"]') [i].disabled = true;
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function aData (dirList) { // Construct the jstree data template from dirList
  var d = dirList;  // the dirList vector should be strictly sorted
  var r = ''; // for resulting data
  if (d.length <1) {return r;}
  var i = 0, j = 0;
  var li_attr = 'li_attr:{onclick:"return false",draggable:"false",ondragstart:"return false"},';
  // he first element is the root dir without any '/'
  r = '[ {text:"' + d [0] + '",' + 'a_attr:{title:"' + d [0] + '"},' +li_attr+ '\n';
  var nc = -1; // children level counter
  var b = [d [0]];
  for (i=1; i<dirList.length; i++) {
    var a_attr = 'a_attr:{title:"' + d [i] + '"},'
    var s = b; // branch before
    b = d [i].split ("/"); // branch
    if (b.length > s.length) { // start children
      r += 'children: [\n';
      nc += 1; // always one step up
    } else if (b.length < s.length) { // end children
      r += '}';
      for (j=0; j<s.length - b.length; j++) {
        r += ' ]}';
      }
      r += ',\n';
      nc -= s.length - b.length; // one or more steps down
    } else {
      r += '},\n';
    }
    r += '{text:"' + b [b.length - 1] + '",' + a_attr + li_attr + '\n';
    s = b;
  }
  r += '}]}';
  for (i=0; i<nc; i++) {r += ' ]}';}
  r += ' ]\n';
  if (d.length === 1) {r = r.slice (0, r.length - 4);} // Surplus "} ]" characters
  return r;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function serverShell (anchor) { // Send commands in 'anchor text' to server shell
  var cmds = Ember.$ ("#"+anchor).text ();
  //console.log(cmds);
  cmds = cmds.split ("\n");
  for (var i=0; i<cmds.length; i++) {
    if (cmds [i].length > 0 && cmds [i].slice (0, 1) !== "#") { // Skip comment lines
      execute (cmds [i]).then (result => {
        if (result.toString ().trim ().length > 0) {
          console.log (result);
        }
      });
    }
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function execute (command) { // Execute on the server, return a promise
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    command = command.replace (/%/g, "%25");
    xhr.open ('GET', 'execute/' + encodeURIComponent (command.replace (/\//g, "@")));
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var data = xhr.responseText.trim ();
        resolve (data);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject ({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send ();
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function ediTextSelWidth () { // Selects a useful edit dialog width within available screen (px)
  var sw = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
  if (sw > 750) {sw = 750;}
  return sw;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Prepare a dialog
var prepDialog = () => {
  Ember.$ ("#helpText").dialog ({autoOpen: false, resizable: true, title: "Användarhandledning"}); // Initiate a dialog...
  Ember.$ (".ui-dialog .ui-dialog-titlebar-close").text ("×");
  //Ember.run.later ( ( () => {
  //  Ember.$ ("#helpText").dialog ("close"); // and close it
  //}), 100);
  // Initiate a dialog, ready to be used:
  Ember.$ ("#dialog").dialog ({resizable: true}); // Initiate a dialog...
  Ember.$ (".ui-dialog .ui-dialog-titlebar-close").text ("×");
  Ember.$ ("#dialog").dialog ("close"); // and close it
  // Close on click off a modal dialog with overlay:
  Ember.$ ("body").on ("click", ".ui-widget-overlay", function () {
    Ember.$ ("#dialog").dialog ( "close" );
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// https://stackoverflow.com/questions/30605298/jquery-dialog-with-input-textbox etc.
// Prepare the dialog editor for the image texts
var prepTextEditDialog = () => {
Ember.$ ( () => {
  var sw = ediTextSelWidth (); // Selected dialog width
  var tw = sw - 25; // Text width
  Ember.$ ('<div id="textareas" style="margin:0;padding:0;width:'+sw+'px"><div id="editMess"><span class="edWarn"></span></div><textarea name="description" placeholder="Skriv här: ..." rows="6" style="min-width:'+tw+'px" /><br><textarea name="creator" placeholder="Skriv här: ..." rows="1" style="min-width:'+tw+'px" /></div>').dialog ( {
    title: "Bildtexter",
    //closeText: "×", // Replaced (why needed?) below by // Close => ×
    autoOpen: false,
    draggable: true,
    closeOnEscape: false, // NOTE: handled otherwise
    modal: false
  });

  Ember.$ ("#textareas").dialog ('option', 'buttons', [
    {
      text: "Anteckningar",
      click: () => { // "Non-trivial" dialog button, to a new level
        var namepic = Ember.$ ("span.ui-dialog-title span").html ();
        var filepath = Ember.$ ("#i" + undot (namepic) + " img").attr ("title");
        execute ("xmpget source " + filepath).then (result => {
          notesDia (namepic, filepath, "Anteckningar", result, "Spara", "Stäng");
        });
      }
    },
    {
      text: " Spara ",
      class: "saveBut",
      click: function () {
        var namepic = Ember.$ ("span.ui-dialog-title span").html ();
        var text1 = Ember.$ ('textarea[name="description"]').val ();
        var text2 = Ember.$ ('textarea[name="creator"]').val ();
        storeText (namepic, text1, text2);
      }
    },
    {
      text: " Stäng ",
      click: () => {
        ediTextClosed ();
      }
    },
    {
      text: "Nyckelord",
      click: () => { // "Non-trivial" dialog button, to a new level
        infoDia (null, "","Nyckelord", "Ord lagrade som metadata<br>som kan användas som särskilda sökbegrepp<br><br>UNDER UTVECKLING", "Ok", true);
      }
    }
  ]);

  var txt = Ember.$ ("button.ui-dialog-titlebar-close").html (); // Close => ×
  txt.replace (/Close/, "×");                                    // Close => ×
  Ember.$ ("button.ui-dialog-titlebar-close").html (txt);        // Close => ×
  // NOTE this clumpsy direct reference to jquery (how directly trigger ediTextClosed?):
  Ember.$ ("button.ui-dialog-titlebar-close").attr ("onclick",'$("span.ui-dialog-title span").html("");$("div[aria-describedby=\'textareas\']").hide();$("#navKeys").text("true");$("#smallButtons").show();$("div.nav_links").show()');

  function storeText (namepic, text1, text2) {
    //text1 = text1.replace (/\n/g, "<br>");
    //text2 = text2.replace (/\n/g, "<br>");
    text1 = text1.replace (/ +/g, " ").replace (/\n /g, "<br>").replace (/\n/g, "<br>").trim ();
    text2 = text2.replace (/ +/g, " ").replace (/\n /g, "<br>").replace (/\n/g, "<br>").trim ();
    // Show what was saved:
    Ember.$ ('textarea[name="description"]').val (text1.replace (/<br>/g, "\n"));
    Ember.$ ('textarea[name="creator"]').val (text2.replace (/<br>/g, "\n"));
    var udnp = undot (namepic);
    var fileName = Ember.$ ("#i" + udnp + " img").attr ('title');
    Ember.$ ("#i" + udnp + " .img_txt1" ).html (text1);
    Ember.$ ("#i" + udnp + " .img_txt1" ).attr ('title', text1);
    Ember.$ ("#i" + udnp + " .img_txt2" ).html (text2);
    Ember.$ ("#i" + udnp + " .img_txt2" ).attr ('title', text2);
    if (Ember.$ (".img_show .img_name").text () === namepic) {
      Ember.$ ("#wrap_show .img_txt1").html (text1);
      Ember.$ ("#wrap_show .img_txt2").html (text2);
    }
    // Cannot save metadata in symlinks or GIFs:
    if (Ember.$ ("#i" + udnp).hasClass ("symlink") || (fileName.search (/\.gif$/i) > 0)) {return;}
    // ===== XMLHttpRequest saving the text
    function saveText (txt) {
      var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories

      var xhr = new XMLHttpRequest ();
      xhr.open ('POST', 'savetext/' + IMDB_DIR); // URL matches server-side routes.js
      xhr.onload = function () {
        userLog ("TEXT written");
        //console.log ('Xmp.dc metadata saved in ' + fileName);
      };
      xhr.send(txt);
    }

    text1 = text1.replace (/\n/g, " ");
    text2 = text2.replace (/\n/g, " ");
    saveText (fileName +'\n'+ text1 +'\n'+ text2);
  }
});
} // end prepTextEditDialog
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Refresh the editor dialog content
function refreshEditor (namepic, origpic) {
  Ember.$ ("span.ui-dialog-title").html ("<span>" + namepic + "</span> &nbsp; Bildtexter");
  // Take care of the notes etc. buttons:
  if (!(allow.notesView || allow.adminAll)) {
    Ember.$ (".ui-dialog-buttonset button:first-child").css ("display", "none");
    Ember.$ (".ui-dialog-buttonset button:last-child").css ("display", "none");
  } else {
    Ember.$ (".ui-dialog-buttonset button:first-child").css ("display", "inline");
    Ember.$ (".ui-dialog-buttonset button:last-child").css ("display", "inline");
  }
  Ember.$ ("#textareas .edWarn").html ("");
  if (Ember.$ ("#i" + undot (namepic)).hasClass ("symlink") || origpic.search (/\.gif$/i) > 0) { // Cannot save in symlinks or GIFs
    Ember.$ ("#textareas .edWarn").html (nopsLink); // Nops = no permanent save
    Ember.$ ("#textareas textarea").attr ("placeholder", "");
    // Don't display the notes etc. buttons:
    Ember.$ (".ui-dialog-buttonset button:first-child").css ("display", "none");
    Ember.$ (".ui-dialog-buttonset button:last-child").css ("display", "none");
  }
  if (origpic.search (/\.gif$/i) > 0) { // Correcting warning text for GIFs
    Ember.$ ("#textareas .edWarn").html (nopsGif); // Nops of texts in GIFs
  }
  // Load the texts to be edited after positioning to top
  Ember.$ ('textarea[name="description"]').html ("");
  Ember.$ ('textarea[name="creator"]').html ("");
  Ember.$ ("#textareas").dialog ("open"); // Reopen
  Ember.$ ('textarea[name="description"]').focus ();
  Ember.run.later ( ( () => {
    Ember.$ ('textarea[name="creator"]').val (Ember.$ ('#i' + undot (namepic) + ' .img_txt2').html ().trim ().replace (/<br>/g, "\n"));
    Ember.$ ('textarea[name="description"]').val (Ember.$ ('#i' + undot (namepic) + ' .img_txt1').html ().trim ().replace (/<br>/g, "\n"));
  }), 40);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Allowance settings
// 'allowance' contains the property names array for 'allow'
// 'allowvalue' is the source of the 'allow' property values
// 'allow' has settings like 'allow.deleteImg' etc.
var allowance = [ // 'allow' order
  "adminAll",     // + allow EVERYTHING
  "albumEdit",    // +  " create/delete album directories
  "appendixEdit", // o  " edit appendices (attached documents)
  "appendixView", // o  " view     "
  "delcreLink",   // +  " delete and create linked images NOTE *
  "deleteImg",    // +  " delete (= remove, erase) images NOTE *
  "imgEdit",      // o  " edit images
  "imgHidden",    // +  " view and manage hidden images
  "imgOriginal",  // +  " view and download full size images
  "imgReorder",   // +  " reorder images
  "imgUpload",    // +  " upload    "
  "notesEdit",    // +  " edit notes (metadata) NOTE *
  "notesView",    // +  " view   "              NOTE *
  "setSetting",   // +  " change settings
  "textEdit"      // +  " edit image texts (metadata)
];
var allowvalue = "0".repeat (allowance.length);
Ember.$ ("#allowValue").text (allowvalue);
var allow = {};
function zeroSet () { // Called from logIn at logout
  Ember.$ ("#allowValue").text ("0".repeat (allowance.length));
}
function allowFunc () { // Called from setAllow (which is called from init(), logIn(), toggleSettings(),..)
  allowvalue = Ember.$ ("#allowValue").text ();
  for (var i=0; i<allowance.length; i++) {
    allow [allowance [i]] = Number (allowvalue [i]);
    //console.log(allowance[i], allow [allowance [i]]);
  }
  if (allow.deleteImg) {  // NOTE *  If ...
    allow.delcreLink = 1; // NOTE *  then set this too
    i = allowance.indexOf ("delcreLink");
    allowvalue = allowvalue.slice (0, i - allowvalue.length) + "1" + allowvalue.slice (i + 1 - allowvalue.length); // Also set the source value (in this way since see below)
    //allowvalue [i] = "1"; Gives a weird compiler error: "4 is read-only" if 4 = the index value
  }
  if (allow.notesEdit) { // NOTE *  If ...
    allow.notesView = 1; // NOTE *  then set this too
    i = allowance.indexOf ("notesView");
    allowvalue = allowvalue.slice (0, i - allowvalue.length) + "1" + allowvalue.slice (i + 1 - allowvalue.length);
  }
  if (allow.textEdit || allow.adminAll) {
    Ember.$ (".img_txt1").css ("cursor", "pointer");
    Ember.$ (".img_txt2").css ("cursor", "pointer");
  } else {
    Ember.$ (".img_txt1").css ("cursor", "");
    Ember.$ (".img_txt2").css ("cursor", "");
  }
  // Hide smallbuttons we don't need:
  //if (allow.adminAll || allow.imgHidden || allow.imgReorder) {
  if (allow.adminAll || allow.imgHidden) { // For anonymous user who may reorder
    Ember.$ ("#saveOrder").show ();
  } else {
    Ember.$ ("#saveOrder").hide ()
  }
  if (allow.adminAll || allow.imgHidden) {
    Ember.$ ("#toggleHide").show ();
  } else {
    Ember.$ ("#toggleHide").hide ();
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Disable browser back button
history.pushState(null, null, location.href);
window.onpopstate = function () {
    history.go(1);
};
