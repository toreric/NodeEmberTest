import Ember from 'ember';
import { task } from 'ember-concurrency';
import contextMenuMixin from 'ember-context-menu';
export default Ember.Component.extend (contextMenuMixin, {

  // PERFORM TASKS, reachable from the HTML template page
  /////////////////////////////////////////////////////////////////////////////////////////
  requestDirs: task (function * () {
    document.title = "MISH";
    var dirList;

    dirList = yield reqRoot (); // Request possible directories
    if (dirList) {this.set ("imdbRoots", dirList.split ("\n"));}

    dirList = yield reqDirs (); // Request subdirectories
    this.set ("userDir", Ember.$ ("#userDir").text ());
    this.set ("imdbRoot", Ember.$ ("#imdbRoot").text ());
    this.set ("imdbDirs", Ember.$ ("#imdbDirs").text ().split ("\n"));
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
    //console.log (treePath.length, treePath);
    var albDat = aData (treePath)
    // Substitute the first name (in '{text:"..."') into the root name:
    albDat = albDat.split (","); // else too long a string
    albDat [0] = albDat [0].replace (/{text:".*"/, '{text: "' + this.get ("imdbRoot") + '"');
    albDat = albDat.join (",");
    //console.log (albDat);
    this.set ("albumData", eval (albDat));
  }),

  // CONTEXT MENU Context menu
  /////////////////////////////////////////////////////////////////////////////////////////
  contextItems: [
    { label: '', disabled: true }, // Spacer
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
          //Ember.$ ("#dialog").dialog ('open');
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
        return !(allow.imgReorder || allow.adminAll);
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
          scrollTo (null, Ember.$ ("#highUp").offset ().top);
        }), 50);
      }
    },
    { label: 'Placera sist',
      disabled: () => {
        return !(allow.imgReorder || allow.adminAll);
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
    { label: 'Information',
      disabled: false,
      action () {
        var picName = Ember.$ ("#picName").text ();
        var picOrig = Ember.$ ("#picOrig").text ();
        var title = "Information";
        var yes = "Ok";
        var modal = true;
        getFilestat (picOrig).then (result => {
          Ember.$ ("#temporary").text (result);
        }).then ( () => {
            var txt = '<i>Namn</i>: <span style="color:deeppink">' + picName + '</span><br>';
            txt += Ember.$ ("#temporary").text ();
            var tmp = Ember.$ ("#download").attr ("href");
            if (tmp.toString () != "null") {
              txt += '<br><span class="lastDownload"><i>Senast startad nedladdning</i>: ' + tmp + "</span>";
            }
            infoDia (picName, title, txt, yes, modal);
            Ember.$ ("#temporary").text ("");
        });
      }
    },
    { label: 'Ladda ned...',
      disabled: () => {
        return !(allow.imgOriginal || allow.adminAll);
      },
      action () {
        Ember.$ ("#downLoad").click (); // Call via DOM since "this" is ...where?
      }
    },
    { label: '', disabled: true }, // Spacer
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
          infoDia (null, title, text, yes, true);
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
          //Ember.$ ("#dialog").dialog ('open');
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
          //Ember.$ ("#dialog").dialog ('open');
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
              console.log ("To be  deleted: " + delNames); // delNames is picNames as a string
              deleteFiles (picNames, nels); // ===== Delete file(s)
              Ember.$ (this).dialog ('close');
              return new Ember.RSVP.Promise ( () => {
                Ember.$ ("#saveOrder").click (); // Call via DOM...
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
          //Ember.$ ("#dialog").dialog ('open');
          niceDialogOpen ();
          Ember.$ ("#yesBut").focus ();
        }
      }
    },
    { label: '', disabled: true } // Spacer
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
      var nodelem = e.target;
      if (nodelem.tagName === 'IMG' && nodelem.className.indexOf ('left-click') > -1 || nodelem.parentElement.id === 'link_show') {
        // Set the target image path. If the show-image is clicked the target is likely an
        // invisible navigation link, thus reset to parent.firstchild (= no-op for mini-images):
        Ember.$ ("#picOrig").text (nodelem.parentElement.firstElementChild.title.trim ());
        // Set the target image name, which is in the second parent sibling in both cases:
        Ember.$ ("#picName").text (nodelem.parentElement.nextElementSibling.nextElementSibling.innerHTML.trim ());

        //var docLen = document.body.scrollHeight; // << NOTE: this is the document Ypx height
        //var docWid = document.body.scrollWidth; // << NOTE: this is the document Xpx width
        // var scrollY = window.pageYOffset; // << NOTE: the Ypx document coord of the viewport

        Ember.$ ("#wormhole-context-menu").css ("position", "absolute"); // Change from fixed

        Ember.$ ("div.context-menu-container").css ("position", "relative"); // Change from fixed
        var viewTop = window.pageYOffset; // The viewport position
        var tmpTop = parseInt (Ember.$ ("div.context-menu-container").css ("top"));
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
  albumData: [], // Directory structure for the selected imdbRoot
  loggedIn: false,
  // HOOKS, that is, Ember "hooks" in the execution cycle
  /////////////////////////////////////////////////////////////////////////////////////////
  //-----------------------------------------------------------------------------------------------
  init () { // ##### Component initiation
    this._super (...arguments);
    Ember.$ (document).ready ( () => {
      console.log ("jQuery v" + Ember.$ ().jquery);
      // The time stamp is produced with the Bash 'ember-b-script'
      userLog (Ember.$ ("#timeStamp").text ());
      this.setNavKeys ();
      // Login advice:
      var logAdv = "Se inställningarna! Men logga in först: anonymt utan namn eller nyckelord, eller med namnet 'gäst' utan nyckelord för att få vissa redigeringsrättigheter"; // i18n
      Ember.$ ("#title span.proid").attr ("title", logAdv);
      Ember.$ ("#title button.cred").attr ("title", logAdv);
      // Initialize settings:
      zeroSet ();
      this.actions.setAllow ();
      this.actions.setAllow (true);
    });
  },
  //-----------------------------------------------------------------------------------------------
  didInsertElement () { // ##### Runs at page ready state
    this._super (...arguments);
    //this.actions.imageList (false); // OK
    //Ember.$ ("#imageList").hide (); // förstör!

    // Update the slide show speed factor when it is changed
    document.querySelector ('input.showTime[type="number"]').addEventListener ('change', function () {Ember.$ ("#showFactor").text (parseInt (this.value));});

    // Initiate a dialog, ready to be used by any function:
    Ember.$ ("#dialog").dialog ({resizable: true}); // Initiate a dialog...
    Ember.$ (".ui-dialog .ui-dialog-titlebar-close").text ("×");

    var diaDivHeigth = parseInt (screen.height) + "px";
    Ember.$ ('#dialog').css ("max-height", diaDivHeigth);

    Ember.$ ('#dialog').dialog ("close"); // and close it
    // Close on click off a modal dialog with overlay:
    Ember.$ ("body").on ("click", ".ui-widget-overlay", function () {
      Ember.$ ('#dialog').dialog ( "close" );
    });

    Ember.$ ("#requestDirs").click ();

  },
  //-----------------------------------------------------------------------------------------------
  didRender () {
    this._super (...arguments);
    Ember.$ (document).ready ( () => {

      devSpec ();

      if (Ember.$ ("#hideFlag").text () === "1") {
        this.actions.hideFlagged (true).then (null);
      } else {
        this.actions.hideFlagged (false).then (null);
      }

      if (Ember.$ ("imdbDir").text () !== "") {
        this.actions.imageList (true);
        //Ember.$ ("#imageList").show (); <-- Warning: Destroys actions.imageList
      }
      if (Ember.$ ("#hidePicNames").text () === "1") { // Initial setting
        Ember.$ ("div.img_name").hide ();
      } else {
        Ember.$ ("div.img_name").show ();
      }
      Ember.$ ("div.settings").hide ();
      Ember.$ ("span#showSpeed").hide ();
      //Ember.$ ("*").attr ("draggable", "false");

      Ember.$ ("div.ember-view.jstree").attr ("onclick", "return false");

    });
  },

  // HELP FUNCTIONS, that is, component methods (within-component functions)
  /////////////////////////////////////////////////////////////////////////////////////////
  //-----------------------------------------------------------------------------------------------
  refreshAll () {
    // ===== Updates allNames and the sortOrder tables by locating all images and
    // their metadata in the "imdbDir" dir (name is DOM saved) on the server disk.
    // This will trigger the template to restore the DOM elements. Thus, prepare the didRender hook
    // to further restore all details!

    var test = 'A1';
    this.requestOrder ().then (sortnames => {
      this.actions.imageList (false);
      //Ember.$ ("#imageList").hide (); Warning: Destroys actions.imageList
      if (sortnames === undefined) {sortnames = "";}
      if (sortnames === "Error!") {
        Ember.$ (".spinner").hide ();
        if (Ember.$ ("#imdbDir").text () !== "") {
          document.getElementById ("imdbError").className = "show-inline";
        }
        Ember.$ ('.showCount').hide ();
        this.set ("imdbDir", "");
        Ember.$ ("#imdbDir").text ("");
        Ember.$ ("#sortOrder").text ("");
        Ember.$ ('#navKeys').text ('true');
      } else {
        ///document.getElementById ("imdbError").className = "hide-all";
        Ember.$ ("#sortOrder").text (sortnames); // Save in the DOM
      }
      test = 'A2';
      // Use sortOrder (as far as possible) to reorder namedata
      this.requestNames ().then (namedata => {
        //console.log (JSON.stringify (namedata));
        var i = 0, k = 0;
        // --- START provide sortnames with all CSV columns
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
        sortnames = sortnames.trim (); // Important!
        test = 'A3';
        var snamsvec = sortnames.split ('\n'); // sortnames vectorized
        // --- END prepare sortnames
        // --- Make the object vector 'newdata' for new 'allNames' content
        // --- Pull out the plain dir list file names: name <=> namedata
        if (namedata === undefined) {namedata = [];}
        var name = [];
        for (i=0; i<namedata.length; i++) {
          name.push (namedata [i].name);
        }
        // --- Pull out the plain sort order file names: snams <=> sortnames
        var snams = [];
        // snamsvec is sortnames vectorized
        for (i=0; i<snamsvec.length; i++) {
          // snams is kind of 'sortnames.name'
          snams.push (snamsvec [i].split (',') [0]);
        }
        test ='B';
        // --- Use snams order to pick from namedata into newdata. Update newsort for sortnames
        var newsort = "", newdata = [];
        while (snams.length > 0 && name.length > 0) {
          k = name.indexOf (snams [0]);
          if (k > -1) {
            newsort = newsort + snamsvec [0] + "\n";
            snamsvec.splice (0, 1);
            newdata.pushObject (namedata [k]);
            namedata.splice (k, 1);
            name.splice (k, 1);
          }
          snams.splice (0, 1);
        }
        test ='C';
        // --- Move remaining namedata into newdata until empty
        // --- Place them first to become better noticed! Update newsort for sortnames
        while (namedata.length > 0) {
          newsort = namedata [0].name + ",0,0\n" + newsort;
          //newdata.pushObject (namedata [0]); instead:
          newdata.insertAt (0, namedata [0]);
          namedata.splice (0, 1);
        }
        newsort = newsort.trim ();
        test ='E0';
        this.set ('allNames', newdata);
        Ember.$ ('#sortOrder').text (newsort); // Save in the DOM
        if (newdata.length > 0) {
          Ember.$ (".numMarked").text (' ' + Ember.$ (".markTrue").length);
          if (Ember.$ ("#hideFlag") === "1") {
            Ember.$ (".numHidden").text (' ' + Ember.$ (".img_mini [backgroundColor=Ember.$('#hideColor')]").length);
            Ember.$ (".numShown").text (' ' + Ember.$ (".img_mini [backgroundColor!=Ember.$('#hideColor')]").length);
          } else {
            Ember.$ (".numHidden").text (' 0');
            Ember.$ (".numShown").text (Ember.$ (".img_mini").length);
          }
          userLog ('RELOADED order');
        }
      }).catch (error => {
        console.error (test + ' in function refreshAll: ' + error);
      });
    }).then (null)
    .catch ( () => {
      console.log ("Not found");
    });
    Ember.$ ('#navKeys').text ('true');
    if (Ember.$ ("#imdbDir").text () !== "") {
      this.actions.imageList (true);
    }
    var that = this;
    setTimeout (function () {
      Ember.$ ("#saveOrder").click ();
      Ember.$ (".spinner").hide ();
      that.actions.setAllow (); // Fungerar hyfsat ...
    }, 4000);
  },
  //-----------------------------------------------------------------------------------------------
  setNavKeys () { // ===== Trigger actions.showNext when key < or > is pressed etc...
    var that = this;
    //document.removeEventListener ('keydown', triggerKeys, true);
    document.addEventListener ('keydown', (event) => {triggerKeys (event);}, true);
    function triggerKeys (event) {
      var Z = false; // Debugging switch
      if (event.keyCode === 112) { // F1 key
        that.actions.toggleHelp ();
      } else
      if (event.keyCode === 27) { // ESC key
        //console.log (Ember.$ ("#dialog").css ("height"));
        if (Ember.$ ("div.settings").is (":visible")) {
          Ember.$ ("div.settings").hide (); // Hide settings
          return;
        }
        if (document.getElementById ("divDropbox").className !== "hide-all") { // Hide upload
          document.getElementById ("divDropbox").className = "hide-all";
          return;
        }
        if (Ember.$ ("#dialog").is (":visible")) {
          Ember.$ ('#dialog').dialog ("close");
        } else
        if (Ember.$ ("div[aria-describedby='textareas']").css ('display') !== "none") { // At text edit, visible
          Ember.$ ("div[aria-describedby='textareas']").hide ();
          Ember.$ ('#navKeys').text ('true');
          Ember.$ ("#smallButtons").show ();
          Ember.$ ("div.nav_links").show ();
          if (Z) {console.log ('*a');}
        } else // Carefylly here: !== "none" is false if the context menu is absent!
        if (Ember.$ ("ul.context-menu").css ("display") === "block") { // When context menu EXISTS and is visible
          Ember.$ ("ul.context-menu").hide ();
          if (Z) {console.log ('*b');}
        } else
        if (Ember.$ ("#link_show a").css ('opacity') > 0 ) { // Some of the help info is visible
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
        if (Ember.$ ("div.img_show").css ("display") !== "none") { // Show image is visible
          that.actions.hideShow ();
          if (Z) {console.log ('*e');}
        } else {
          resetBorders (); // Reset all borders
        }
        if (Z) {console.log ('*f');}
      } else
      if (event.keyCode === 37 && Ember.$ ('#navKeys').text () === 'true') { // Left key <
        event.preventDefault(); // Important!
        that.actions.showNext (false);
        if (Z) {console.log ('*g');}
      } else
      if (event.keyCode === 39 && Ember.$ ('#navKeys').text () === 'true') { // Right key >
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
  //-----------------------------------------------------------------------------------------------
  runAuto (yes) { // ===== Help function for toggleAuto
    if (yes) {
      Ember.$ ("div[aria-describedby='textareas']").hide ();
      Ember.$ ('#navKeys').text ('true');
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
  //-----------------------------------------------------------------------------------------------
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
            data = "Error!"; // The same text may also be generated elsewhere
          }
          //var tmpName = Ember.$ (that.get ("albumName")).text ();
          var tmpName = that.get ("albumName");
          tmpName = extractContent (tmpName); // Don't accumulate...
          //console.log("that albumName",tmpName);
          document.title = "MISH " + tmpName;
          if (data === "Error!") {
            tmpName += " &mdash; <em style=\"color:red;background:transparent\">just nu oåtkomligt</em>"
            that.set ("albumName", tmpName);
            that.set ("imdbDir", "");
            Ember.$ ("#imdbDir").text ("");
          } else {
            that.set ("albumName", '<strong class="albumName">' + tmpName + '</strong>')
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
      xhr.send ();
    }).catch (error => {
      console.log (error);
    });
  },
  //-----------------------------------------------------------------------------------------------
  requestNames () { // ===== Request the file information list
    // NEPF = number of entries (lines) per file in the plain text-line-result list ('namedata')
    // from the server. The main information ('namedata') is retreived from each image file, e.g.
    // metadata. It is reordered into 'newdata' in 'sortnames' order, as far as possible;
    // 'sortnames' is cleaned from non-existent (removed) files and extended with new (added)
    // files, in order as is. So far, the sort order is 'sortnames' with hideFlag (and albumIndex?)
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
            Ember.$ ('.showCount').hide ();
            Ember.$ ('.showCount:first').show (); // Show upper
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
          userLog ('FILE INFO received');
          // but wait here until what?
          resolve (allfiles); // Return file-list object array
          //resolve (xhr.response);
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
  //-----------------------------------------------------------------------------------------------
  // TEMPLATE ACTIONS, that is, functions reachable from the HTML page
  /////////////////////////////////////////////////////////////////////////////////////////
  actions: {
    //=============================================================================================
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

      if (newSetting) { // Signal: Allow only one confirmation per settings-view
        disableSettings ();
      }

      if (allow.imgReorder || allow.adminAll) { // set reorder status
        Ember.$ ("div.show-inline.ember-view").attr ("draggable", "true");
      } else {
        Ember.$ ("div.show-inline.ember-view").attr ("draggable", "false");
      }
      Ember.$ (".settings button").blur (); // Important in some situations
    },
    //=============================================================================================
    albumEdit () { // ##### Erase or create (sub)albums (image folders)

      if (!(allow.albumEdit || allow.adminAll)) {
        userLog ("ALBUMs locked");
        return;
      }
      Ember.$ ("div.img_show").hide ();
      var imdbRoot = Ember.$ ("#imdbRoot").text ();
      var album = Ember.$ (this.get ("albumName")).text ();
      var imdbDir = Ember.$ ("#imdbDir").text ();
      if (imdbDir.indexOf ("/") < 0) {
        imdbDir = imdbRoot;
      } else {
        imdbDir = imdbDir.replace (/^[^/]*\//, imdbRoot + "/");
      }

      Ember.$ ("#temporary").text ("");
      var text = "<br><b>" + album + "<b> ska raderas";
console.log(text);
      var codeAlbum = "'var action=this.value;if (this.selectedIndex === 0) {Ember.$ (\"#temporary\").text (\"\");return false;}if (action === \"erase\" && Number (Ember.$ (\".showCount:first .numShown\").text ()) === 0 && Number (Ember.$ (\".showCount:first .numHidden\").text ()) === 0) {" + "Ember.$ (\"#temporary\").text (\"infoDia (null,\\\""+ album +"\\\",\\\""+ text +"\\\",\\\"Ok\\\",true)\")" + ";} else {" + "Ember.$ (\"#temporary\").text (\"infoDia (null,\\\""+ album +"\\\",\\\"UNDER UTVECKLING\\\",\\\"Ok\\\",true)\")" + ";}'";
console.log(codeAlbum);
      var code = '<br><select class="selectOption" onchange=' + codeAlbum + '>'
      code += '\n<option value="">&nbsp;Välj åtgärd för&nbsp;</option>'
      code += '\n<option value="new">&nbsp;Gör ett nytt underalbum till&nbsp;</option>'
      code += '\n<option value="erase">&nbsp;Radera albumet (töm det först)&nbsp;</option>'
      code += '\n</select><br>' + imdbDir + '<br>&nbsp;';
      text = code;
console.log(text);
      infoDia (null, album, text, 'Ok', true, true);
      Ember.run.later ( ( () => {
        Ember.$ ("select.selectOption").focus ();
      }), 50);
    },
    //=============================================================================================
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
            /*console.log("Exists already: " + links [i]);
            } else {
              console.log(links [i]);*/
          }
        }
        //console.log(cmds.join ("\n"));
        Ember.$ ('#temporary_1').text (cmds.join ("\n"));
      });
    },
    //=============================================================================================
    linkNames () { // ##### Make the links, checked and prepared by checkNames ()
      serverShell ("temporary_1");
    },
    //=============================================================================================
    hideSpinner () { // ##### The spinner may be clicked away if it renamains for some reason

      Ember.$ ('.spinner').hide ();
    },
    //=============================================================================================
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
    //=============================================================================================
    selectRoot (value) { // #####
      console.log (">>>>>>>>", value);
      Ember.$ ("div[aria-describedby='textareas']").hide ();
      return new Ember.RSVP.Promise ( () => {
        if (Ember.$ ("select").prop ('selectedIndex') === 0) {
          value = Ember.$ ("#imdbRoot").text ();
          Ember.$ ("select").blur (); // Important?
          return;
        }
        //this.set ("imdbRoot", value);
        //Ember.$ ("#imdbRoot").text (value);
      });
    },
    //=============================================================================================
    selectAlbum () {

      Ember.$ ("#smallButtons").show ();
      Ember.$ ("div.nav_links").show ();
      Ember.$ ("div[aria-describedby='textareas']").hide ();
      Ember.$ ("div.ember-view.jstree").attr ("onclick", "return false");
      Ember.$ ("ul.jstree-container-ul.jstree-children").attr ("onclick", "return false");
      return new Ember.RSVP.Promise ( () => {
        var value =Ember.$ ("[aria-selected='true'] a").attr ("title");
        Ember.$ ("a.jstree-anchor").blur (); // Important?
        //Ember.$ ("div.jstree").blur (); // Important?
        this.set ("imdbDir", value);
        Ember.$ ("#imdbDir").text (value);
        var tmp = this.get ('imdbDir').split ("/");
        if (tmp [tmp.length - 1] === "") {tmp = tmp.slice (0, -1)} // removes trailing /
        tmp = tmp.slice (1); // remove symbolic link name
        if (tmp.length > 0) {
          this.set ("albumName", tmp [tmp.length - 1]);
        } else {
          this.set ("albumName", this.get ("imdbRoot"));
        }
        Ember.$ ("#refresh-1").click ();
        console.log ("Selected: " + this.get ('imdbDir'));
      }).then (null).catch (error => {
        console.log (error);
      });
    },
    //=============================================================================================
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
    //=============================================================================================
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
    //=============================================================================================
    showDropbox () { // ##### Display (toggle) the Dropbox file upload area

      if (Ember.$ ("#imdbDir").text () === "") {return;}
      Ember.$ ("#link_show a").css ('opacity', 0 );
      if (document.getElementById ("divDropbox").className === "hide-all") {
        document.getElementById ("divDropbox").className = "show-block";
        Ember.$ ("div.settings").hide ();
        this.actions.hideShow ();
        Ember.$ ("#dzinfo").html ("VÄLJ FOTOGRAFIER FÖR UPPLADDNING"); // i18n
        if (allow.imgUpload || allow.adminAll) {
          document.getElementById("uploadPics").disabled = false;
        } else {
          document.getElementById("uploadPics").disabled = true;
          userLog ("UPLOAD prohibited");
        }
      } else {
        document.getElementById ("divDropbox").className = "hide-all";
      }
      scrollTo (null, Ember.$ ("#highUp").offset ().top);
    },
    //=============================================================================================
    imageList (yes) { // ##### Display the thumbnail page

      Ember.$ ("#link_show a").css ('opacity', 0 );
      if (yes || document.getElementById ("imageList").className === "hide-all") {
        document.getElementById ("imageList").className = "show-block";
        document.getElementById ("imageBtn").innerHTML = "Göm bilderna";
        document.getElementById ("imageBtn-1").className = "btn-std show-inline";
        document.getElementById ("refresh").className = "btn-std show-inline";
        document.getElementById ("refresh-1").className = "btn-std show-inline";
      } else {
        document.getElementById ("imageList").className = "hide-all";
        document.getElementById ("imageBtn").innerHTML = "Visa bilderna";
        document.getElementById ("imageBtn-1").className = "hide-all";
        document.getElementById ("refresh").className = "hide-all";
        document.getElementById ("refresh-1").className = "hide-all";
      }
    },
    //=============================================================================================
    showShow (showpic, namepic, origpic) { // ##### Render a 'show image' in its <div>

      Ember.$ ("div.settings").hide ();
      //Ember.$ ("#" + undot (namepic) + " a img").blur ();
      resetBorders (); // Reset all borders
      markBorders (namepic); // Mark this one
      Ember.$ ("#wrap_show").removeClass ("symlink");
      Ember.$ ("#full_size").hide ();
      if (allow.imgOriginal || allow.adminAll) {Ember.$ ("#full_size").show ();}
      Ember.$ ("div.img_show").hide (); // Hide in case a previous is not already hidden
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ ("div.img_show img:first").attr ('src', showpic);
      Ember.$ ("div.img_show img:first").attr ('title', origpic);
      Ember.$ ("div.img_show .img_name").text (namepic); // Should be plain text
      Ember.$ ("div.img_show .img_txt1").html (Ember.$ ('#i' + undot (namepic) + ' .img_txt1').html ());
      Ember.$ ("div.img_show .img_txt2").html (Ember.$ ('#i' + undot (namepic) + ' .img_txt2').html ());
      // The mini image 'id' is the 'trimmed file name' prefixed with 'i'
      if (typeof this.set === 'function') { // false if called from showNext
        var savepos = Ember.$ ('#i' + undot (namepic)).offset ();
        if (savepos !== undefined) {
          Ember.$ ('#backPos').text (savepos.top); // Vertical position of the mini-image
        }
        Ember.$ ('#backImg').text (namepic); // The name of the mini-image
      }
      Ember.$ ("#wrap_show").css ('background-color', Ember.$ ('#i' + undot (namepic)).css ('background-color'));
      Ember.$ ("div.img_show").show ();
      scrollTo (null, Ember.$ ("div.img_show img:first").offset ().top - Ember.$ ("#topMargin").text ());
      devSpec (); // Special device settings
      // Prepare texts for ediText dialog
      if (Ember.$ ("div[aria-describedby='textareas']").css ('display') !== "none") {
        Ember.$ ("span.ui-dialog-title").html ("<span>" + namepic + "</span> &nbsp; Bildtexter");
      }
      Ember.$ ("#textareas .edWarn").html ("");
      if (Ember.$ ("#i" + undot (namepic)).hasClass ("symlink")) { // Cannot save in symlinks
        Ember.$ ("#textareas .edWarn").html (nopsLink); // Nops = no permanent save
      }
      if (origpic.search (/\.gif$/i) > 0) { // Texts cannot be saved within GIFs
        Ember.$ ("#textareas .edWarn").html (nopsGif); // Nops of texts in GIFs
      }
      Ember.$ ('textarea[name="description"]').focus ();
      Ember.$ ('textarea[name="description"]').val (Ember.$ ('#i' + undot (namepic) + ' .img_txt1').html ().trim ());
      Ember.$ ('textarea[name="creator"]').val (Ember.$ ('#i' + undot (namepic) + ' .img_txt2').html ().trim ());

      Ember.$ ("#markShow").removeClass ();
      if (document.getElementById ("i" + namepic).firstElementChild.nextElementSibling.className === "markTrue") {
        Ember.$ ("#markShow").addClass ("markTrueShow");
      } else {
        Ember.$ ("#markShow").addClass ("markFalseShow");
      }
      Ember.$ ('.spinner').hide ();
    },
    //=============================================================================================
    hideShow () { // ##### Hide the show image element

      Ember.$ ("ul.context-menu").hide (); // if open
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ ("div.img_show div").blur ();
      Ember.$ ("div.img_show").hide ();
      var namepic = Ember.$ ("#wrap_show .img_name").text ();
      if (namepic !== "") {
        scrollTo (null, Ember.$ ('#i' + undot (namepic)).offset ().top - 3);
        resetBorders (); // Reset all borders
        markBorders (namepic); // Mark this one
      }
    },
    //=============================================================================================
    showNext (forwards) { // ##### SHow the next image if forwards is true, else the previous

      if (Ember.$ ("#navAuto").text () !== "true") {
      //if (Ember.$ ("div[aria-describedby='textareas']").css ('display') === "none") {
        Ember.$ ("#dialog").dialog ("close");
      }
      Ember.$ ("#link_show a").css ('opacity', 0 );

      var namehere = Ember.$ ("div.img_show .img_name").text ();
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
      Ember.$ ("div.img_show").hide (); // Hide to get right savepos
      var savepos = Ember.$ ('#i' + undot (namepic)).offset ();
      if (savepos !== undefined) {
        Ember.$ ('#backPos').text (savepos.top); // Save position
      }
      Ember.$ ('#backImg').text (namepic); // Save name
      if (typeof this.set === "function") { // false if called from didInsertElement.
        this.actions.showShow (showpic, namepic, origpic);
      } else {                              // Arrow-key move, from didInsertElement
        this.showShow (showpic, namepic, origpic);
      }
      Ember.$ ("#link_show a").blur (); // If the image was clicked
    },
    //=============================================================================================
    toggleAuto () { // ##### Start/stop auto slide show

      Ember.$ ("#dialog").dialog ("close");
      if (Ember.$ ("#imdbDir").text () === "") {return;}
      if (Ember.$ ("#navAuto").text () === "false") {
        Ember.$ ("#navAuto").text ("true");

        Ember.run.later ( ( () => {
          Ember.$ (".nav_links .toggleAuto").text ("STOP");
          this.runAuto (true);
        }), 500);
      } else {
        Ember.$ ("#navAuto").text ("false");
        Ember.run.later ( ( () => {
          Ember.$ (".nav_links .toggleAuto").text ("AUTO");
          this.runAuto (false);
        }), 500);
      }
    },
    //=============================================================================================
    refresh (nospin) { // ##### Reload the imageList and update the sort order

      if (Ember.$ ("#imdbDir").text () === "") {return;}
      if (!nospin) {Ember.$ (".spinner").show ();} // Spin is later stopped in refreshAll
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ ("div.img_show").hide ();
      this.actions.imageList (false);

      this.refreshAll ();
    },
    //=============================================================================================
    saveOrder () { // ##### Save, in imdbDir on server, the ordered name list for the thumbnails on the screen. Note that they may, by user's drag-and-drop, have an unknown sort order (etc.)

      if (Ember.$ ("#imdbDir").text () === "") {return;}

      return new Ember.RSVP.Promise ( (resolve) => {

        Ember.$ ("#link_show a").css ('opacity', 0 );
        // Get the true ordered name list from the DOM mini-pictures (thumbnails).
        var i =0, k = 0, SName = [], names;
        var SN = Ember.$ ('#sortOrder').text ().trim ().split ('\n'); // Take it from the DOM storage
        for (i=0; i<SN.length; i++) {
          SName.push (SN[i].split (',') [0]);
        }
        var UName = Ember.$ ('#uploadNames').text ().trim (); // Newly uploaded
        Ember.$ ('#uploadNames').text (''); // Reset
        var newOrder = '';
        //names = Ember.$ ("#temporary").text ();
        names = Ember.$ (".img_mini .img_name").text ().toString ().trim ().replace (/\s+/g, " ");
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
        Ember.$ ('#sortOrder').text (newOrder); // Save in the DOM
        saveOrderFunction (newOrder).then ( () => { // Save on server disk
          document.getElementById ("saveOrder").blur ();
          resetBorders (); // Reset all borders
        });
        resolve ("ORDERSAVED");
      }).catch (error => {
        console.log (error);
      });
    },
    //=============================================================================================
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
    //=============================================================================================
    toggleNameView () { // ##### Toggle-view file names

      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ ("div.img_name").toggle ();
    },
    //=============================================================================================
    toggleHelp () { // ##### Togglle-view user manual

      if (Ember.$ ("#dialog").is (":visible") || Ember.$ ("#navAuto").text () === "true") {
        Ember.$ ('#dialog').dialog ("close");
      } else {
        infoDia (null, "Användarhandledning", Ember.$ ("div.helpText").html (), "Stäng", false);
      }
    },
    //=============================================================================================
    toggleNav () { // ##### Toggle image navigation-click zones

      if (Ember.$ ("#navAuto").text () === "true") {
        var title = "Stanna automatisk visning...";
        var text = ' ... med <span style="color:deeppink;font-family:monospace;font-weight:bold">STOP</span> eller Esc-tangenten och börja visningen igen med <span style="color:deeppink;font-family:monospace;font-weight:bold">AUTO</span> eller A-tangenten!';
        var yes ="Ok";
        var modal = true;
        infoDia (null, title, text, yes, modal);
      } else if (Ember.$ ("#link_show a").css ('opacity') === '0' ) {
        Ember.$ ("#link_show a").css ('opacity', 1 );
      } else {
        Ember.$ ("#link_show a").css ('opacity', 0 );
      }
      devSpec ();

    },
    //=============================================================================================
    ediText (namepic) { // ##### Edit picture texts

      if (!(allow.textEdit || allow.adminAll)) {
        userLog ("TEXTs locked");
        return;
      }
      if (Ember.$ ("#navAuto").text () === "true") { return; }
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ ("div.ui-dialog div#textareas div span.edWarn").text ("");
      Ember.$ ('#navKeys').text ('false');
      // In case the name is given, the call originates in a mini-file (thumbnail)
      // Else, the call originates in, or in the opening of, a new|next show-file
      //   that may have an open 'textareas' dialog
      var origpic;
      if (namepic) {
        if (Ember.$ ("div[aria-describedby='textareas']").css ('display') !== "none" && Ember.$ ("span.ui-dialog-title span").html () === namepic) {
          Ember.$ ("div[aria-describedby='textareas']").hide ();
          Ember.$ ('#navKeys').text ('true');
          Ember.$ ("#smallButtons").show ();
          Ember.$ ("div.nav_links").show ();
          return;
        }
        // NOTE: An ID string used like this should have dots unescaped
        origpic = document.getElementById ("i" + namepic).firstElementChild.firstElementChild.getAttribute ("title"); // With path

      } else {
        namepic = Ember.$ ("#wrap_show .img_name").text ();
        Ember.$ ("#backPos").text (Ember.$ ('#i' + undot (namepic)).offset ().top);
        if (Ember.$ ("div[aria-describedby='textareas']").css ('display') !== "none") {
          Ember.$ ("div[aria-describedby='textareas']").hide ();
          Ember.$ ('#navKeys').text ('true');
          Ember.$ ("#smallButtons").show ();
          Ember.$ ("div.nav_links").show ();
          return;
        }
        origpic = Ember.$ ("div.img_show img").attr ('title'); // With path
      }
      Ember.$ ("#picName").text (namepic);

      // Open the text edit dialog and adjust some more details and perhaps warnings
      Ember.$ ("#textareas").dialog ("open");
      Ember.$ ("div[aria-describedby='textareas']").show ();
      Ember.$ ("span.ui-dialog-title").html ("<span>" + namepic + "</span> &nbsp; Bildtexter");
      Ember.$ ("span.ui-dialog-title span").on ("click", () => { // Open if the name is clicked
        var showpic = origpic.replace (/\/[^/]*$/, '') +'/'+ '_show_' + namepic + '.png';
        this.actions.showShow (showpic, namepic, origpic);
      });
      Ember.$ ("#textareas .edWarn").html ("");
      if (Ember.$ ("#i" + undot (namepic)).hasClass ("symlink")) { // Cannot save in symlinks
        Ember.$ ("#textareas .edWarn").html (nopsLink); // Nops = no permanent save
      }
      if (origpic.search (/\.gif$/i) > 0) { // Texts cannot be saved within GIFs
        Ember.$ ("#textareas .edWarn").html (nopsGif); // Nops of texts in GIFs
      }
      // Load the texts to be edited
      Ember.$ ('textarea[name="description"]').focus ();
      Ember.$ ('textarea[name="description"]').val (Ember.$ ('#i' + undot (namepic) + ' .img_txt1').html ().trim ());
      Ember.$ ('textarea[name="creator"]').val (Ember.$ ('#i' + undot (namepic) + ' .img_txt2').html ().trim ());
      resetBorders ();
      markBorders (namepic);
      // Resize and position the dialog
      var diaDiv = "div.ui-dialog.ui-corner-all.ui-widget.ui-widget-content.ui-front.ui-dialog-buttons.ui-draggable.ui-resizable";
      var sw = ediTextSelWidth ();
      var diaDivLeft = parseInt ((screen.width - sw)/2) + "px";
      Ember.$ (diaDiv).css ("top", "0px");
      Ember.$ (diaDiv).css ("left", diaDivLeft);
      Ember.$ (diaDiv).css ("max-width", sw+"px");
      Ember.$ (diaDiv).css ("width", "");
      // Hide the small button arrays since they may hide text on small screens
      Ember.$ ("#smallButtons").hide ();
      Ember.$ ("div.nav_links").hide ();
    },
    //=============================================================================================
    // editText (namepic) { // ##### OBSOLETE, replaced by ediText
    //=============================================================================================
    fullSize () { // ##### Show full resolution image

      if (window.screen.width < 500 || window.screen.height < 500) {return;}
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ ('.spinner').show ();
      return new Ember.RSVP.Promise ( (resolve, reject) => {
        var xhr = new XMLHttpRequest ();
        var origpic = Ember.$ ("div.img_show img").attr ('title'); // With path
        xhr.open ('GET', 'fullsize/' + origpic); // URL matches routes.js with *?
        xhr.onload = function () {
          if (this.status >= 200 && this.status < 300) {
            var djvuName = xhr.responseText;
            var dejavu = window.open (djvuName  + '?djvuopts&amp;zoom=100', 'dejavu', 'width=916,height=600,resizable=yes,location=no,titlebar=no,toolbar=no,menubar=no,scrollbars=yes,status=no');
            dejavu.focus ();
            Ember.$ ('.spinner').hide ();
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
    //=============================================================================================
    downLoad () { // ##### Download an image

      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ ('.spinner').show ();
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
            Ember.$ ('.spinner').hide ();
            userLog ('DOWNLOAD ' + origpic);
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
    //=============================================================================================
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
    //=============================================================================================
    logIn () { // ##### User login (confirm, logout) button pressed

      Ember.$ ("div.img_show").hide ();
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
        this.actions.hideFlagged (true).then (null); // Hide flagged pics if shown
        Ember.$ ("#title button.cred").text (" Logga in ");
        Ember.$ ("#title button.cred").attr ("title", "");
        Ember.$ ("#title span.cred.name").text ("");
        this.set ("loggedIn", false);
        Ember.$ ("div.settings").hide ();
        userLog ("LOGGED out");
        zeroSet (); // #allowValue = '000... etc.
        this.actions.setAllow ();
        return;
      }
      if (btnTxt === " Bekräfta ") { // Confirm
        var usr = Ember.$ ("#title input.cred.user").val ();
        var pwd = Ember.$ ("#title input.cred.password").val ();
        Ember.$ ("#title input.cred").hide ();
        loginError ().then (isLoginError => {
          if (isLoginError) {
            Ember.$ ("#title button.cred").text (" Logga in ");
            Ember.$ ("#title button.cred").attr ("title", "");
            this.set ("loggedIn", false);
            Ember.$ ("div.settings").hide ();
            userLog ("LOGIN error");
            zeroSet (); // #allowValue = '000... etc.
            this.actions.setAllow ();
          } else {
            Ember.$ ("#title button.cred").text (" Logga ut ");
            Ember.$ ("#title button.cred").attr ("title", "Du är inloggad!");
            Ember.$ ("#title span.proid").attr ("title", "Inställningar - klicka här!");
            this.set ("loggedIn", true);
            userLog ("LOGGED in");
            this.actions.setAllow ();
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
              setTimeout(function () {
                resolve (false);
              }, 1);
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
    //=============================================================================================
    settings () { // ##### Show settings

      if (!this.get ("loggedIn")) {
        Ember.$ ("div.settings").hide ();
        return;
      }
      document.getElementById ("divDropbox").className = "hide-all";
      Ember.$ ("div.img_show").hide (); // settings + img_show don't go together
      Ember.$ ("div.settings").toggle ();
      document.querySelector ("div.settings select.root").disabled = false; // Make available
      this.actions.setAllow (); // Resets unconfirmed changes
      document.querySelector ('div.settings button').disabled = true;
      var n = document.querySelectorAll ('input[name="setAllow"]').length;
      for (var i=0; i<n; i++) {
        document.querySelectorAll ('input[name="setAllow"]') [i].disabled = false;
        document.querySelectorAll ('input[name="setAllow"]') [i].addEventListener ('change', function () {document.querySelector ('div.settings button').disabled = false;})
      }
      // Protect the first checkbox (must be 'allow.adminAll'), set in the sqLite tables:
      document.querySelectorAll ('input[name="setAllow"]') [0].disabled = true;
      // Lock if change of setting is not allowed
      if (!(allow.setSetting || allow.adminAll)) {
        disableSettings ();
      }
    }
  }
});
// G L O B A L S, that is, 'outside' (global) functions and variables
/////////////////////////////////////////////////////////////////////////////////////////
var nopsLink = "I länkad fil kan inte text ändras permanent";
var nopsGif = "GIF-fil kan bara ha tillfällig text";
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function infoDia (picName, title, text, yes, modal, flag) { // ===== Information dialog
  if (picName) { //
    resetBorders (); // Reset all borders
    markBorders (picName); // Mark this one
  }
  Ember.$ ("#dialog").html (text);
  Ember.$ ("#dialog").dialog ( { // Initiate a confirmation dialog
    title: title,
    closeText: "×",
    autoOpen: false,
    draggable: true,
    modal: modal,
    closeOnEscape: true,
  });
  // Define button array
  Ember.$ ("#dialog").dialog ('option', 'buttons', [
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
  niceDialogOpen ();
  Ember.$ ("#yesBut").focus ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function niceDialogOpen () {
  // NOTE nodes: JQuery objects
  var hs = window.innerHeight;
  var up = 128;
  var uy = Ember.$("div.ui-dialog");
  var ui = Ember.$("div.ui-dialog .ui-dialog-content");
  uy.css ("height", "auto");
  ui.css ("height", "auto");
  uy.css ("max-height", hs + "px");
  ui.css ("max-height", hs - up + "px");

  Ember.$ ("#dialog").dialog ('open');
  uy = Ember.$("div.ui-dialog");
  ui = Ember.$("div.ui-dialog .ui-dialog-content");
  uy.css ("width", "auto");
  ui.css ("width", "auto");
  uy.css ("min-width", "300px");
  uy.css ("max-height", hs + "px");
  ui.css ("max-height", (hs - up) + "px");
  //console.log ("uy.height hs hs-up",uy.height(),hs,hs-up);
  if (uy.height () > hs - up) {
    uy.css ("top","10px");
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function linkFunc (picNames) { // ===== Execute a link request
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
  var codeLink = "'var lalbum=this.value;if (this.selectedIndex === 0) {return false;}var lpath = Ember.$ (\"#imdbLink\").text () + \"/\" + lalbum.replace ("+rex+", \"\");console.log(lpath);var picNames = Ember.$(\"#picNames\").text ().split (\"\\n\");var cmd=[];for (var i=0; i<picNames.length; i++) {var linkfrom = document.getElementById (\"i\" + picNames [i]).getElementsByTagName(\"img\")[0].getAttribute (\"title\");linkfrom = \"../\".repeat (lpath.split (\"/\").length - 1) + linkfrom.replace ("+rex+", \"\");var linkto = lpath + \"/\" + picNames [i];linkto += linkfrom.match(/\\.[^.]*$/);cmd.push(\"ln -sf \"+linkfrom+\" \"+linkto);}Ember.$ (\"#temporary\").text (lpath);Ember.$ (\"#temporary_1\").text (cmd.join(\"\\n\"));Ember.$ (\"#checkNames\").click ();'";
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
  infoDia ("", title, text, "Ok", modal); // Trigger infoDia to make links
  //Ember.$ ("div.ui-dialog").css ("width", "auto");
  //Ember.$ ("div.ui-dialog").css ("height", "auto");
  Ember.$ ("select.selectOption").focus ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function saveOrderFunction (namelist) { // ===== XMLHttpRequest saving the thumbnail order list
  Ember.$ ("#sortOrder").text (namelist); // Save in the DOM
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
    if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
    IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories
    var xhr = new XMLHttpRequest ();
    xhr.open ('POST', 'saveorder/' + IMDB_DIR); // URL matches server-side routes.js
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        userLog ('ORDER saved');
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.send (namelist);
    //console.log ('*   saveOrderFunction\n'+namelist);
  }).catch (error => {
    console.log (error);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function deleteFiles (picNames, nels) { // ===== Delete image(s)
  // nels = number of elements in picNames to be deleted
  var keep = [], symlink;
  for (var i=0; i<nels; i++) {
    symlink = Ember.$ ('#i' + undot (picNames [i])).hasClass ('symlink');
    if (!(allow.deleteImg || symlink && allow.delcreLink || allow.adminAll)) {
      keep.push (picNames [i]);
    } else {
      deleteFile (picNames [i]); // Returns a promise!?!?
    }
  }
  if (keep.length > 0) {
    console.log ("No delete permission for " + cosp (keep, true));
    keep = cosp (keep);
    Ember.run.later ( ( () => {
      infoDia (null, "Otillåtet att radera", '<br><span  style="color:deeppink">' + keep + '</span>', "Ok", true); // i18n
    }), 100);
  }
  Ember.$ ("#saveOrder").click ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
    console.log ('Deleted: ' + picName);
    return true;
  }).catch (error => {
    console.log (error);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
  setTimeout (function () {
    Ember.$ (".shortMessage").hide ();
  }, 2000);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function reqRoot () { // Propose root directory (requestDirs)
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'rootdir/');
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var dirList = xhr.responseText;
        dirList = dirList.split ("\n");
        dirList.splice (0, 0, "Albumplats:");
        dirList = dirList.join ("\n");
        Ember.$ ("#imdbRoots").text (dirList);
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
      console.log ("No NodeJS server");
    }
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function reqDirs () { // Read the dirs in imdb (requestDirs)
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    var imdbroot = "*"; // Signal to server: Use env.variable $IMDB_ROOT as default
    console.log ('>>>>>>>>' + imdbroot);
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
        var nodeText = Ember.$ ("p#title span small").html ();
        nodeText = nodeText.replace (/NodeJS/, nodeVersion);
        Ember.$ ("p#title span small").html (nodeText);
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
      console.log ("No NodeJS server");
    }
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function resetBorders () { // Reset all mini-image borders
  Ember.$ (".img_mini img.left-click").css ('border', '0.25px solid #888');
  Ember.$ (".img_mini img.left-click").removeClass ("dotted");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function markBorders (picName) { // Mark a mini-image border
  Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
  Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").addClass ("dotted");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function undot (txt) { // Escape dots, for CSS names
  // Use e.g. when file names are used in CSS, #<id> etc.
  return txt.replace (/\./g, "\\.");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function cosp (textArr, system) { // Convert an array of text strings
  // into a comma+space[and]-separated text string
  var andSep = " och"; // i18n
  if (system) {andSep = ", and"}
  if (textArr.length === 1) {return textArr [0]} else {
    return textArr.toString ().replace (/,/g, ", ").replace (/,\s([^,]+)$/, andSep + " $1")
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function extractContent(htmlString) { // Extracts text from an HTML string
  var span= document.createElement('span');
  span.innerHTML= htmlString;
  return span.textContent || span.innerText;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function disableSettings () { // Disables select, the button, and all checkboxes
  document.querySelector ("div.settings select.root").disabled = true;
  document.querySelector ('div.settings button').disabled = true;
  for (var i=0; i<allowvalue.length; i++) {
    document.querySelectorAll ('input[name="setAllow"]') [i].disabled = true;
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function aData (dirList) { // Construct the jstree data template from dirList
  var d = dirList;  // the dirList vector should be strictly sorted
  var r = ''; // for resulting data
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
  return r;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function serverShell (anchor) { // Send commands in 'anchor text' to server shell
  var cmds = Ember.$ ("#"+anchor).text ();
  console.log(cmds);
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
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function execute (command) {
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'execute/' + command.replace (/\//g, "@"));
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
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function ediTextSelWidth () { // Selects a useful edit dialog width within available screen (px)
  var sw = window.screen.width;
  if (sw > 750) {sw = 750;}
  return sw;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// https://stackoverflow.com/questions/30605298/jquery-dialog-with-input-textbox etc.
// This block prepares for the image text's editor dialog
Ember.$ ( () => {
  var sw = ediTextSelWidth (); // Selected dialog width
  var tw = sw - 6; // Text width
  Ember.$ ('<div id="textareas" style="margin:0;padding:0;width:'+sw+'px"><div id="editMess"><span class="edWarn"></span></div><textarea name="description" placeholder="När var vad vilka (Xmp.dc.description)" rows="6" style="min-width:'+tw+'px" /><br><textarea name="creator" placeholder="Foto upphov ursprung källa (Xmp.dc.creator)" rows="1" style="min-width:'+tw+'px" /></div>').dialog ( {
    title: "Bildtexter",
    //closeText: "×", // Replaced (why needed?) below by // Close => ×
    autoOpen: false,
    draggable: true,
    closeOnEscape: false, // NOTE: handled otherwise
    modal: false,
    buttons: {
      'Spara': () => {
        var namepic = Ember.$ ("span.ui-dialog-title span").html ();
        var text1 = Ember.$ ('textarea[name="description"]').val ();
        var text2 = Ember.$ ('textarea[name="creator"]').val ();
        storeText (namepic, text1, text2);
      },
      'Stäng': function () {
        Ember.$ (this).dialog ('close');
        Ember.$ ("#smallButtons").show ();
        Ember.$ ("div.nav_links").show ();
      }
    }
  });
  var txt = Ember.$ ("button.ui-dialog-titlebar-close").html (); // Close => ×
  txt.replace (/Close/, "×");                                    // Close => ×
  Ember.$ ("button.ui-dialog-titlebar-close").html (txt);        // Close => ×
  // NOTE this direct reference to jquery:
  Ember.$ ("button.ui-dialog-titlebar-close").attr ("onclick",'$("#smallButtons").show();$("div.nav_links").show()');

  function storeText (namepic, text1, text2) {
    var udnp = undot (namepic);
    var fileName = Ember.$ ("#i" + udnp + " img").attr ('title');
    Ember.$ ("#i" + udnp + " .img_txt1" ).html (text1);
    Ember.$ ("#i" + udnp + " .img_txt1" ).attr ('title', text1);
    Ember.$ ("#i" + udnp + " .img_txt2" ).html (text2);
    Ember.$ ("#i" + udnp + " .img_txt2" ).attr ('title', text2);
    if (Ember.$ ("#wrap_show .img_name").text () === namepic) {
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
        console.log ('Xmp.dc metadata saved in ' + fileName);

        var messes = Ember.$ ("#title span.usrlg").text ().trim ().split ("•");
        if (messes.length > 4) {messes.splice (0, messes.length - 4);}
        messes.push ('TEXT written');
        messes = messes.join (" • ");
        Ember.$ ("#title span.usrlg").text (messes);

        Ember.$ (".shortMessage").text ('TEXT written');
        Ember.$ (".shortMessage").show ();
        setTimeout (function () {
          Ember.$ (".shortMessage").hide ();
        }, 1000);
      };
      xhr.send(txt);
    }

    text1 = text1.replace (/\n/g, " ");
    text2 = text2.replace (/\n/g, " ");
    saveText (fileName +'\n'+ text1 +'\n'+ text2);
  }
});
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Allowance settings
// 'allowance' contains the property names array for 'allow'
// 'allowvalue' is the source of the 'allow' property values
// 'allow' has settings like 'allow.deleteImg' etc.
var allowance = [ // 'allow' order
  "adminAll",     // + allow everything NOTE *
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
  "setSetting",   //    " change settings
  "tempEdit",     // o  " edit temporary texts (metadata)
  "tempView",     // o  " view     "
  "textEdit"      // +  " edit image texts (metadata)
];
var allowvalue = "0".repeat (allowance.length);
var allow = {};
/*Ember.$ (document).ready ( () => {
  Ember.$ ("#allowValue").text (allowvalue);
});*/
function zeroSet () { // Called from logIn at logout
  Ember.$ ("#allowValue").text ("0".repeat (allowance.length));
}
function allowFunc () { // Called from setAllow (which is called from init(), logIn(), settings())
  allowvalue = Ember.$ ("#allowValue").text ();
  for (var i=0; i<allowance.length; i++) {
    allow [allowance [i]] = Number (allowvalue [i]);
  }
  if (allow.deleteImg) {  // NOTE *  If ...
    allow.delcreLink = 1; // NOTE *  then set this too
    i = allowance.indexOf ("delcreLink");
    allowvalue = allowvalue.slice (0, i - allowvalue.length) + "1" + allowvalue.slice (i + 1 - allowvalue.length); // Also set the source value (in this way since see below)
    //allowvalue [i] = "1"; Gives a weird compiler error: "4 is read-only" if 4 = the index value
  }
  Ember.$ ("#allowValue").text (allowvalue);
  // Hide buttons we don't need:
  if (allow.adminAll || allow.imgHidden || allow.imgReorder) {
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
