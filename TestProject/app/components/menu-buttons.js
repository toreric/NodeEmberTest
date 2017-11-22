import Ember from 'ember';
import { task } from 'ember-concurrency';
import contextMenuMixin from 'ember-context-menu';
export default Ember.Component.extend (contextMenuMixin, {

  // PERFORM TASKS, reachable from the HTML template page
  /////////////////////////////////////////////////////////////////////////////////////////
  requestDirs: task (function * () {
    var dirList = yield reqRoot ();
    this.set ("imdbRoots", dirList.split ("\n"));
    dirList = yield reqDirs ();
    this.set ("userDir", Ember.$ ("#userDir").text ());
    this.set ("imdbRoot", Ember.$ ("#imdbRoot").text ());
    //this.set ("imdbDirs", dirList.split ("\n")); Take from DOM, there is HTML stuff:
    this.set ("imdbDirs", Ember.$ ("#imdbDirs").text ().split ("\n"));
  }),

// CONTEXT MENU Context menu
/////////////////////////////////////////////////////////////////////////////////////////
  contextItems: [
    { label: '', disabled: true }, // Spacer
    { label: 'Redigera text',
      disabled: false,
      action: (selection, details, event) => {
        selection = selection;
        details = details;
        event = event;
        // Mimic click on the text of the mini-picture (thumbnail)
        Ember.$ ("#i" + undot (Ember.$ ("#picName").text ().trim ()) + " a").next ().next ().next ().click ();
      }
    },
    { label: 'Göm eller visa', // Toggle hide/show
      disabled: false,
      action (selection, details, event) {
        selection = selection;
        details = details;
        event = event;
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
        var actxt = ["<b>visa</b> ", "<b>gömma</b> "];
        if (nels > 1) {
          resetBorders (); // Reset all borders
          // Mark this one:
          Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
          Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").addClass ("dotted");
          Ember.$ ("#dialog").html (picNames.toString ().replace (/,/g, ", ").replace (/,\s([^,]+)$/, " och $1") + "<br>Vill du " + actxt [act] + nelstxt + "?"); // Set dialog text content
          Ember.$ ("#dialog").dialog ( { // Initiate dialog
            title: "Göm eller visa ...",
            autoOpen: false,
            draggable: true,
            modal: true,
            closeOnEscape: true
          });
          // Define button array
          Ember.$ ("#dialog").dialog ('option', 'buttons', [
          {
            text: "Ja", // Yes
            "id": "allBut", // Process all
            click: function () {
              hideFunc (picNames, nels, act);
              Ember.$ (this).dialog ('close');
            }
          },
          {
            text: "", // Set later, in order to include html tags (illegal here)
            "id": "singBut", // Process only one
            click: function () {
              var nodelem = [];       // Redefined since:
              nodelem [0] = nodelem0; // Else illegal, displays "read-only"!
              picNames [0] = picName;
              nels = 1;
              hideFunc (picNames, nels, act);
              Ember.$ (this).dialog ('close');
            }
          }]);
          Ember.$ ("#singBut").html ('Nej, bara <span  style="color:deeppink">' + picName + '</span>'); // May contain html
          Ember.$ ("#dialog").dialog ('open');
          Ember.$ ("#allBut").focus ();
        } else {
          hideFunc (picNames, nels, act);
        }
      }
    },
    { label: '', disabled: true }, // Spacer
    { label: 'Invertera markeringar',
      disabled: false,
      action (selection, details, event) {
        selection = selection;
        details = details;
        event = event;
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
      action (selection, details, event) {
        selection = selection;
        details = details;
        event = event;
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
      disabled: false,
      action (selection, details, event) {
        selection = selection;
        details = details;
        event = event;
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
        .then (Ember.$ ("#reFresh-1").click ()); // Call via DOM...
        Ember.run.later ( ( () => {
          scrollTo (null, Ember.$ ("#highUp").offset ().top);
        }), 50);
      }
    },
    { label: 'Placera sist',
      disabled: false,
      action (selection, details, event) {
        selection = selection;
        details = details;
        event = event;
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
        .then (Ember.$ ("#reFresh-1").click ()); // Call via DOM...
        Ember.run.later ( ( () => {
          scrollTo (null, Ember.$ ("#lowDown").offset ().top - screen.height*0.85);
        }), 50);
      }
    },
    { label: '', disabled: true }, // Spacer
    { label: 'Information',
      disabled: false,
      action (selection, details, event) {
        selection = selection;
        details = details;
        event = event;
        var picName = Ember.$ ("#picName").text ();
        var picOrig = Ember.$ ("#picOrig").text ();
        var title = "Information";
        var yes = "Ok";
        var modal = true;
        if (Ember.$ (".img_name").css('display') === 'none' ) {
          Ember.$ ("#toggleName").click ();
        }
        getFilestat (picOrig).then (result => {
          Ember.$ ("#temporary").text (result);
        }).then ( () => {
            var txt = '<i>Namn</i>: <b>' + picName + '</b><br>';
            txt += Ember.$ ("#temporary").text ();
            var tmp = Ember.$ ("#download").attr ("href");
            if (tmp.toString () != "null") {
              txt += '<br><span class="lastDownload"><i>Senast startad nedladdning</i>: ' + tmp + "</span>";
            }
            infoDia (picName, title, txt, yes, modal);
        });
      }
    },
    { label: 'Ladda ned...',
      disabled: false,
      action (selection, details, event) {
        selection = selection;
        details = details;
        event = event;
        Ember.$ ("#downLoad").click (); // Call via DOM since "this" is ...where?
      }
    },
    { label: 'RADERA...',
      disabled: false,
      action (selection, details, event) {
        selection = selection;
        details = details;
        event = event;

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
          delNames =  picNames.toString ().replace (/,/g, ", ").replace (/,\s([^,]+)$/, " och $1");
          Ember.$ ("#dialog").html ("<p>" + delNames + "</p>Vill du <b>radera</b> " + all + nelstxt + "?");
          // Set dialog text content
          Ember.$ ("#dialog").dialog ( { // Initiate dialog
            title: "Radera ...",
            autoOpen: false,
            draggable: true,
            modal: true,
            closeOnEscape: true
          });
          // Close button
          Ember.$ ("#dialog").dialog ('option', 'buttons', [ // Define button array
          {
            text: "Ja", // Yes
            "id": "allBut", // Process all
            click: function () {
              Ember.$ (this).dialog ('close');
              nextStep ();
            }
          },
          {
            text: "", // Set later, (html tags are killed here)
            "id": "singBut", // Process only one
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
          // Mark this one:
          Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
          Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").addClass ("dotted");
          Ember.$ ("#singBut").html ('Nej, bara <span  style="color:deeppink">' + picName + '</span>'); // May contain html
          Ember.$ ("#dialog").dialog ('open');
          Ember.$ ("#allBut").focus ();
        } else {nextStep ();}

        function nextStep () {
          resetBorders (); // Reset all borders, can be first step!
          // Mark this one:
          Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
          Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").addClass ("dotted");
          Ember.$ ("#dialog").html ("<b>Vänligen bekräfta:</b><p>" + delNames + "</p><b>ska alltså raderas</b>?<br>(<i>kan inte ångras</i>)");
          Ember.$ ("#dialog").dialog ( { // Initiate a new, confirmation dialog
            title: "Radera ...",
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
              console.log ("To be deleted: " + delNames); // delNames is a string with picNames
              deleteFiles (picNames, nels); // ===== Delete file(s)
              Ember.$ (this).dialog ('close');
              return new Ember.RSVP.Promise ( () => {
                Ember.$ ("#saveOrder").click (); // Call via DOM...
              }).then (Ember.$ ("#reFresh-1").click ());
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
          Ember.$ ("#dialog").dialog ('open');
          Ember.$ ("#yesBut").focus ();
        }
      }
    },
  ],
  contextSelection: [{ paramDum: false }],  // The context menu "selection" parameter (not used)
  _contextMenu (e) {
    Ember.run.later ( ( () => {
      if ( (Ember.$ ("div.drag-box").css ("display") !== "none") ||  // At text edit (editText)
          (Ember.$ ("#navAuto").text () === "true") ) { // At running slide show
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
  userDir:  "undefined", // Current user (loaded into imdbLink by server), not employed
  imdbLink: "imdb", // Name of the symbolic link to the imdb root directory
  imdbRoot: "", // The imdb directory (initially = env.variable $IMDB_ROOT)
  imdbRoots: [], // For imdbRoot selection
  imdbDir: "",  // Current picture directory, selected from imdbDirs
  imdbDirs: ['Album?'], // Replaced in requestDirs

// HOOKS, that is, Ember "hooks" in the execution cycle
/////////////////////////////////////////////////////////////////////////////////////////
// -------------------------------------------------------------------------------------------------
  init () { // ##### Component initiation
    this._super (...arguments);
    Ember.$ (document).ready ( () => {
      console.log ("jQuery v" + Ember.$ ().jquery);
   // The time stamp is produced with the Bash 'ember-b-script'
      userLog (Ember.$ ("#timeStamp").text ());
      //userLog (navigator.userAgent);
      this.setNavKeys ();
    });
  },
// -------------------------------------------------------------------------------------------------
  didInsertElement () { // ##### Runs at page ready state
    this._super (...arguments);
    document.getElementById ("imdbError").className = "hide-all";
    //this.actions.imageList (false); // OK
    //Ember.$ ("#imageList").hide (); // förstör!

    // Update the slide show speed factor when it is changed
    document.querySelector ('input.showTime[type="number"]').addEventListener ('change', function (e) {e=e; Ember.$ ("#showFactor").text (parseInt (this.value));});

    // Initiate a dialog, ready to be used by any function:
    Ember.$ ("#dialog").dialog ({}); // Initiate a dialog...
    Ember.$ (".ui-dialog .ui-dialog-titlebar-close").text ("×");
    Ember.$ ('#dialog').dialog ("close"); // and close it
    // Close on click off a modal dialog with overlay:
    Ember.$ ("body").on ("click", ".ui-widget-overlay", function () {
      Ember.$ ('#dialog').dialog ( "close" );
    });

    //Ember.$ ("#requestRoot").click ();

    Ember.$ ("#requestDirs").click ();

  },
// -------------------------------------------------------------------------------------------------
  didRender () {
    this._super (...arguments);
    Ember.$ (document).ready ( () => {
      // Start device specific features -----------
      // How do we make context menus with iPad/iOS?
      if ( (navigator.userAgent).includes ("iPad")) {
        Ember.$ ("#full_size").hide ();
      }
      if (window.screen.width < 500 || window.screen.height < 500) {
        Ember.$ ("#full_size").hide ();
        Ember.$ ("a.toggleAuto").hide ();
      }
      // End device specific features -----------

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
    });
  },

// HELP FUNCTIONS, that is, component methods (within-component functions)
/////////////////////////////////////////////////////////////////////////////////////////
// -------------------------------------------------------------------------------------------------
  refreshAll () {
  // ===== Updates allNames and the sortOrder tables by locating all images and
  // their metadata in the "imdbDir" dir (name is DOM saved) on the server disk.
  // This will trigger the template to restore the DOM elements. Thus, prepare the didRender hook
  // to further restore all details!

   ///return new Ember.RSVP.Promise ( (resolve) => {

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
        document.getElementById ("imdbError").className = "hide-all";
        Ember.$ ("#sortOrder").text (sortnames); // Save in the DOM
      }

      test = 'A2';
      // Use sortOrder (as far as possible) to reorder namedata
      this.requestNames ().then (namedata => {
        var i = 0, k = 0;
        // --- START provide sortnames with all CSV columns
        var SN = [];
        if (Ember.$ ("#sortOrder").text ().trim ().length > 0) {
          SN = Ember.$ ("#sortOrder").text ().trim ().split ('\n');
        }
        sortnames = '';
        for (i=0; i<SN.length; i++) {
          var tmp = SN [i].split (',');
//console.log(tmp);
          // Fillter off any accidentally errenous names:
          if (tmp [0].slice (0, 1) !== "." && tmp [0].slice (0, 1) !== "_") {
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

        Ember.$ ("p.showCount span.imDir").html (Ember.$ ("p#imDi .imDi").text () + " &mdash; ");

        this.set ('allNames', newdata);
        Ember.$ ('#sortOrder').text (newsort); // Save in the DOM
        if (newdata.length > 0) {
          Ember.$ (".numMarked").text (' ' + Ember.$ (".markTrue").length);
          if (Ember.$ ("#hideFlag") === "1") {
            Ember.$ (".numHidden").text (' ' + Ember.$ (".ing_mini [backgroundColor=Ember.$('#hideColor')]").length);
            Ember.$ (".numShown").text (' ' + Ember.$ (".ing_mini [backgroundColor!=Ember.$('#hideColor')]").length);
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
    ////resolve ("REFRESHED");
   ///}).then ( () => {

    Ember.$ ('#navKeys').text ('true');
    if (Ember.$ ("#imdbDir").text () !== "") {
      this.actions.imageList (true);
    }
    setTimeout (function () {
      Ember.$ ("#saveOrder").click ();
      Ember.$ (".spinner").hide ();
    }, 4000);

   ///}).catch (error => {
    ///console.log (error);
   ///});

  },
// -------------------------------------------------------------------------------------------------
  setNavKeys () { // ===== Trigger actions.showNext when key < or > is pressed etc...
    var that = this;
    //document.removeEventListener ('keydown', triggerKeys, true);
    document.addEventListener ('keydown', (event) => {triggerKeys (event);}, true);
    function triggerKeys (event) {
      var Z = false; // Debugging switch
      if (event.keyCode === 112) { // F1 key
        //console.log ("setNavKeys/toggleHelp");
        that.actions.toggleHelp ();
      } else
      if (event.keyCode === 27) { // ESC key
        //console.log (Ember.$ ("#dialog").css ("height"));
        Ember.$ ("div.settings").hide (); // Always hide settings
        if (Ember.$ ("#dialog").css ("height") !== "0px") {
          Ember.$ ('#dialog').dialog ("close");
          //console.log (Ember.$ ("#dialog").css ("height"));
          return; // JQuery UI dialogs are hidden by size!
        } else
        if (Ember.$ ("div.drag-box").css ("display") !== "none") { // At text edit (editText, visible)
          Ember.$ ("div.drag-box").css ("display", "none");
          Ember.$ ('#navKeys').text ('true');
          if (Z) {console.log ('*a');}
        } else // Carefylly here: !== "none" is false if the context menu is absent!
        if (Ember.$ ("ul.context-menu").css ("display") === "block") { // When context menu EXISTS is visible
          Ember.$ ("ul.context-menu").hide ();
          if (Z) {console.log ('*b');}
        } else
        if (Ember.$ ("#link_show a").css ('opacity') > 0 ) { // Some of the help info is visible
          Ember.$ (".helpText").hide ();
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
        that.actions.showNext (false);
        if (Z) {console.log ('*g');}
      } else
      if (event.keyCode === 39 && Ember.$ ('#navKeys').text () === 'true') { // Right key >
        event.preventDefault(); // Important!
        that.actions.showNext (true);
        if (Z) {console.log ('*h');}
      } else
      if (that.savekey !== 17 && event.keyCode === 65 && Ember.$ ("#navAuto").text () !== "true" && Ember.$ ("div.drag-box").css ("display") === "none") { // A key
        Ember.$ ("#navAuto").text ("true");
        Ember.run.later ( ( () => {
          Ember.$ (".nav_links .toggleAuto").text ("STOP");
          that.runAuto (true);
        }), 250);
        if (Z) {console.log ('*i');}
      } else {
        that.savekey = event.keyCode;
      }
    }
  },
// -------------------------------------------------------------------------------------------------
  runAuto (yes) { // ===== Help function for toggleAuto
    if (yes) {
      Ember.$ (".drag-box").hide ();
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
// -------------------------------------------------------------------------------------------------
  requestOrder () { // ===== Request the sort order list
    return new Ember.RSVP.Promise ( (resolve, reject) => {
      var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
      if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";}
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories
      var xhr = new XMLHttpRequest ();
      xhr.open ('GET', 'sortlist/' + IMDB_DIR); // URL matches server-side routes.js
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.responseText.trim ();
          if (data.slice (0, 8) === '{"error"') {
            //data = undefined;
            data = "Error!"; // The same text is generated also elsewhere
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
// -------------------------------------------------------------------------------------------------
  requestNames () { // ===== Request the file information list
  // NEPF = number of entries (lines) per file in the plain text-line-result list ('namedata') from
  // the server. The main iformation ('namedata') is retreived from each image file, e.g. metadata.
  // It is reordered into 'newdata' in 'sortnames' order, as far as possible; 'sortnames' is cleaned
  // from non-existent (removed) files and extended with new (added) files, in order as is.
  // So far, the sort order is 'sortnames' with hideFlag (and albumIndex?)
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
            txt2: 'creator'      // for metadata
          });
          var NEPF = 6; // Number of properties in Fobj
          var result = xhr.responseText;
          result = result.trim ().split ('\n'); // result is vectorised
          var i = 0, j = 0;
          var n_files = result.length/NEPF;
          if (n_files < 1) { // Covers all weird outcomes
            result = [];
            n_files = 0;
            Ember.$ ('.showCount .numShown').text (' 0');
            Ember.$ ('.showCount .numHidden').text (' 0');
            Ember.$ ('.showCount .numMarked').text (' 0');
            Ember.$ ('.showCount').hide ();
            Ember.$ ('.showCount:first').show (); // Show upper
          }
          for (i=0; i<n_files; i++) {
            result [j + 4] = result [j + 4].replace (/&lt;br&gt;/g,"<br>");
            var f = Fobj.create ({
              orig: result [j],
              show: result [j + 1],
              mini: result [j + 2],
              name: result [j + 3],
              txt1: Ember.String.htmlSafe (result [j + 4]),
              txt2: Ember.String.htmlSafe (result [j + 5])
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

// TEMPLATE ACTIONS, that is, functions reachable from the HTML page
/////////////////////////////////////////////////////////////////////////////////////////
  actions: {
//==================================================================================================
    hideSpinner () { // ##### The spinner may be clicked away if it renamains for some reason

      Ember.$ ('.spinner').hide ();
    },
//==================================================================================================
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
//==================================================================================================
    selectRoot (value) { // #####
console.log (">>>>>>>>", value);
      Ember.$ (".drag-box").hide ();
      return new Ember.RSVP.Promise ( () => {
        if (Ember.$ (".imDi select").prop ('selectedIndex') === 0) {
          value = Ember.$ ("#imdbRoot").text ();
          Ember.$ ("select").blur (); // Important?
          return;
        }
        this.set ("imdbRoot", value);
        Ember.$ ("#imdbRoot").text (value);
      });
    },
//==================================================================================================
    selectImdbDir (value) { // #####

      Ember.$ (".drag-box").hide ();
      return new Ember.RSVP.Promise ( () => {
        if (Ember.$ ("#imDi select").prop ('selectedIndex') === 0) {
          value = Ember.$ ("#imdbDir").text ();
          document.getElementById ("imdbError").className = "hide-all";
          Ember.$ ("select").blur (); // Important
          //return;
        }
        //this.set ("imdbDir", "imdb" + value);
        this.set ("imdbDir", Ember.$ ("#imdbLink").text () + value);
        Ember.$ ("#imdbDir").text (Ember.$ ("#imdbLink").text () + value);
        Ember.$ ("#imDi .imDi").text (value);
        Ember.$ ("#imDi .imDi").css ("cursor", "default");
        Ember.$ ("#reFresh-1").click ();
        Ember.$ ("select").prop('selectedIndex', 0);
        Ember.$ ("select").blur (); // Important
        console.log ("Selected: " + this.get ('imdbDir'));

      }).then (null).catch (error => {
        console.log (error);
      });

    },
//==================================================================================================
    toggleHideFlagged () { // #####

     return new Ember.RSVP.Promise ( (resolve) => {

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      if (Ember.$ ("#sortOrder").text () === "") {return;}
      /*      Ember.$ ('.showCount').hide ();
      if (Ember.$ ("imdbDir").text () !== "") {
        Ember.$ ('.showCount:first').show (); // Show upper
      }*/

      if (Ember.$ ("#hideFlag").text () === "1") {
        Ember.$ ("#hideFlag").text ("0");
        this.actions.hideFlagged (false).then (null); // Show all pics
      } else {
        Ember.$ ("#hideFlag").text ("1");
        this.actions.hideFlagged (true).then (null); // Hide the flagged pics
      }

      //resolve (console.log ("toggleHideFlagged"));
      resolve ("OK");

    }).then (null).catch (error => {
      console.log (error);
     });

    },
//==================================================================================================
    hideFlagged (yes) { // #####

     return new Ember.RSVP.Promise ( (resolve) => {

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
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
        var albumIndex = 1*str;
        albumIndex = albumIndex; // Not yet used
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

      //resolve (console.log ("hideFlagged", yes));
      resolve ("OK");

     }).catch (error => {
      console.log (error);
     });

    },
//==================================================================================================
    showDropbox () { // ##### Display the Dropbox file upload area

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      if (Ember.$ ("#imdbDir").text () === "") {return;}
      if (document.getElementById ("divDropbox").className === "hide-all") {
        document.getElementById ("divDropbox").className = "show-block";
        document.getElementById ("showDropbox").innerHTML = "Göm uppladdning";
      } else {
        document.getElementById ("divDropbox").className = "hide-all";
        document.getElementById ("showDropbox").innerHTML = "Visa uppladdning";
      }
      scrollTo (null, Ember.$ ("#highUp").offset ().top);

      document.getElementById ("showDropbox").blur ();
    },
//==================================================================================================
    imageList (yes) { // ##### Display the thumbnail page

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      if (yes || document.getElementById ("imageList").className === "hide-all") {
        document.getElementById ("imageList").className = "show-block";
        document.getElementById ("imageBtn").innerHTML = "Göm bilderna";
        document.getElementById ("imageBtn-1").className = "btn-std show-inline";
        document.getElementById ("reFresh").className = "btn-std show-inline";
        document.getElementById ("reFresh-1").className = "btn-std show-inline";
      } else {
        document.getElementById ("imageList").className = "hide-all";
        document.getElementById ("imageBtn").innerHTML = "Visa bilderna";
        document.getElementById ("imageBtn-1").className = "hide-all";
        document.getElementById ("reFresh").className = "hide-all";
        document.getElementById ("reFresh-1").className = "hide-all";
      }
    },
//==================================================================================================
    showShow (showpic, namepic, origpic) { // ##### Render a 'show image' in its <div>

      if (Ember.$ ('#i'+undot (namepic)+".img_mini img.left-click").hasClass ("dotted")) {
        resetBorders ();
        return;
      }

      Ember.$ ("#full_size").show ();
      if (origpic.search (/gif$/i) > 0) { // GIFs are already full size
        Ember.$ ("#full_size").hide ();
      }

      Ember.$ ("div.img_show").hide (); // Hide in case a previous is not already hidden
      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      resetBorders (); // Reset all borders
      Ember.$ ('#i' + undot (namepic) + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
      Ember.$ ('#i' + undot (namepic) + ".img_mini img.left-click").addClass ("dotted");
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
      // Prepare text edit
      Ember.$ (".drag-box div div.name").text (Ember.$ ("#wrap_show .img_name").text ());
      Ember.$ (".drag-box textarea.textarea1").val (Ember.$ ("#wrap_show .img_txt1").html ().trim ());
      Ember.$ (".drag-box textarea.textarea2").val (Ember.$ ("#wrap_show .img_txt2").html ().trim ());

      Ember.$ ("#markShow").removeClass ();
      if (document.getElementById ("i" + namepic).firstElementChild.nextElementSibling.className === "markTrue") {
        Ember.$ ("#markShow").addClass ("markTrueShow");
      } else {
        Ember.$ ("#markShow").addClass ("markFalseShow");
      }
      Ember.$ ('.spinner').hide ();
   },
//==================================================================================================
    hideShow () { // ##### Hide the show image element

      Ember.$ ("ul.context-menu").hide (); // if open
      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      Ember.$ ("div.img_show div").blur ();
      Ember.$ ("div.img_show").hide ();
      var savepos = Ember.$ ('#backPos').text (); // Locate corresponding mini-image
      scrollTo (null, savepos - 3);
      //var saveimg = '#i' + undot (Ember.$ ('#backImg').text ()) + ' img'; // Locate corresponding mini-image
      //Ember.$ (saveimg).css ('border', '2px dotted deeppink'); // Mark this one ALREADY MARKED
    },
//==================================================================================================
    showNext (forwards) { // ##### SHow the next image if forwards is true, else the previous

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});

      var namehere = Ember.$ ("div.img_show .img_name").text ();
      var namepic, minipic, origpic;
      var tmp = document.getElementsByClassName ("img_mini");
      namepic = namehere;
      if (forwards) {
        while (namepic === namehere) {
          namepic = null;
          if (!document.getElementById ("i" + namehere) || !document.getElementById ("i" + namehere).parentElement.nextElementSibling) { // last
            //namepic = document.getElementsByClassName ("img_mini") [0].getAttribute ("id").slice (1);
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
//==================================================================================================
    toggleAuto () { // ##### Start/stop auto slide show

      if (Ember.$ ("#imdbDir").text () === "") {return;}
      if (Ember.$ ("#navAuto").text () === "false") {
        //this.contextSelection.editText = false;
        Ember.$ ("#navAuto").text ("true");

        Ember.run.later ( ( () => {
          Ember.$ (".nav_links .toggleAuto").text ("STOP");
          this.runAuto (true);
        }), 500);
      } else {
        //this.contextSelection.editText = true;
        Ember.$ ("#navAuto").text ("false");
        Ember.run.later ( ( () => {
          Ember.$ (".nav_links .toggleAuto").text ("AUTO");
          this.runAuto (false);
        }), 500);
      }
    },
//==================================================================================================
    reFresh (nospin) { // ##### Reload the imageList and update the sort order

      if (Ember.$ ("#imdbDir").text () === "") {return;}
      if (!nospin) {Ember.$ (".spinner").show ();} // Spin is later stopped in refreshAll
      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      Ember.$ ("div.img_show").hide ();
      this.actions.imageList (false);

      this.refreshAll ();
    },
//==================================================================================================
    saveOrder () { // ##### Save, in imdbDir on server, the ordered name list for the thumbnails on the screen. Note that they may, by user's drag-and-drop, have an unknown sort order (etc.)

    if (Ember.$ ("#imdbDir").text () === "") {return;}

    return new Ember.RSVP.Promise ( (resolve) => {

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
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
//==================================================================================================
    showOrder () { // ##### For DEBUG: Show the ordered name list in the (debug) log
    // OBSOLETE
      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      var tmp = Ember.$ ('#sortOrder').text ().trim ();
      if (!tmp) {tmp = '';}
      // sortOrder is a string with a bunch of lines
      console.log (tmp.length +', order:');
      console.log (tmp.trim ());
      document.getElementById ("showOrder").blur ();
    },
//==================================================================================================
    toggleNameView () { // ##### Toggle-view file names

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      Ember.$ ("div.img_name").toggle ();
    },
//==================================================================================================
    //hideHelp () Obsolete
//==================================================================================================
    toggleHelp (hideH) { // ##### Toggle help text and image navigation-click zones

      if (Ember.$ ("#navAuto").text () === "true") {
        var title = "Stanna automatisk visning...";
        var text = ' ... med <span style="color:deeppink;font-family:monospace;font-weight:bold">STOP</span> eller Esc-tangenten och börja visningen igen med <span style="color:deeppink;font-family:monospace;font-weight:bold">AUTO</span> eller A-tangenten!';
        var yes ="Ok";
        var modal = true;
        infoDia (null, title, text, yes, modal);
      } else if (Ember.$ ("#link_show a").css ('opacity') === '0' ) {
        Ember.$ (".helpText").show ();
        Ember.$ ("#link_show a").css ('opacity', 1 );
      } else {
        Ember.$ (".helpText").hide ();
        Ember.$ ("#link_show a").css ('opacity', 0 );
      }
      if (hideH) {Ember.$ (".helpText").hide ();} // But still show #link_show 'links'
    },
//==================================================================================================
    editText (namepic) { // ##### Edit the description text

      if (Ember.$ ("#navAuto").text () === "true") { return; }
      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});

      if (!namepic) {
        namepic = Ember.$ (".wrap_show .img_name").text ();
      }

      Ember.$ ('#navKeys').text ('false');
      // In case the name is given, the call originates in a mini-file (thumbnail)
      // Else, the call originates in the, or opening a, new|next show-file that may have a drag-box
      var origpic;
      if (namepic) {
        if (Ember.$ (".drag-box").is (':visible') && Ember.$ (".drag-box div div.name").text () === namepic) {
          Ember.$ (".drag-box").hide ();
          Ember.$ ('#navKeys').text ('true');
          return;
        }
        Ember.$ (".drag-box div div.name").text (namepic);
        origpic = document.getElementById ("i" + namepic).firstElementChild.firstElementChild.getAttribute ("title");
        if (origpic.search (/gif$/i) > 0) { // Texts will not be saved in a GIF
          Ember.$ (".drag-box div div.nosave").text ("[Text sparas inte permanent i GIF]");
        }
        // Below doesn't always work
        Ember.$ (".drag-box textarea.textarea1").val (Ember.$ ('#i' + undot (namepic) + ' .img_txt1').html ().trim ());
        Ember.$ (".drag-box textarea.textarea2").val (Ember.$ ('#i' + undot (namepic) + ' .img_txt2').html ().trim ());
        Ember.$ (".drag-box").show ();
      } else {
        if (Ember.$ (".drag-box").is (':visible')) {
          Ember.$ (".drag-box").hide ();
          Ember.$ ('#navKeys').text ('true');
          return;
        }
        Ember.$ (".drag-box div div.name").text (Ember.$ ("#wrap_show .img_name").text ());
        origpic = Ember.$ ("div.img_show img").attr ('title'); // With path
        if (origpic.search (/gif$/i) > 0) { // Texts will not be saved in a GIF
          Ember.$ (".drag-box div div.nosave").text ("[Text sparas inte permanent i GIF]");
        }
        Ember.$ (".drag-box textarea.textarea1").val (Ember.$ ("#wrap_show .img_txt1").html ().trim ());
        Ember.$ (".drag-box textarea.textarea2").val (Ember.$ ("#wrap_show .img_txt2").html ().trim ());
        Ember.$ (".drag-box").show ();
      }
      Ember.$ (".drag-box textarea.textarea1").focus ();
    },
//==================================================================================================
    fullSize () { // ##### Show full resolution image

      if (window.screen.width < 500 || window.screen.height < 500) {return;}
      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
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
//==================================================================================================
    downLoad () { // ##### Download an image

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      Ember.$ ('.spinner').show ();
      return new Ember.RSVP.Promise ( (resolve, reject) => {
        var xhr = new XMLHttpRequest ();
        var tmp = Ember.$ ("#picName").text ().trim ();
        Ember.run.later ( ( () => {
          resetBorders (); // Reset all borders
          // Mark this one:
          Ember.$ ('#i' + undot (tmp) + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
          Ember.$ ('#i' + undot (tmp) + ".img_mini img.left-click").addClass ("dotted");
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
//==================================================================================================
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
//==================================================================================================
    resetBorders () {
      resetBorders ();
    },
//==================================================================================================
    settings () { // ##### User settings
      Ember.$ ("div.settings").toggle ();
    }
  }
});

// G L O B A L S, that is, 'outside' (global) functions and variables
/////////////////////////////////////////////////////////////////////////////////////////
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var infoDia = (picName, title, text, yes, modal) => { // ===== Information dialog
  if (picName) {
    resetBorders (); // Reset all borders
    // Mark this one:
    Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
    Ember.$ ('#i' + undot (picName) + ".img_mini img.left-click").addClass ("dotted");
  }
  Ember.$ ("#dialog").html (text);
  Ember.$ ("#dialog").dialog ( { // Initiate a confirmation dialog
    title: title,
    closeText: "×",
    autoOpen: false,
    draggable: true,
    modal: modal,
    closeOnEscape: true
  });
  // Define button array
  Ember.$ ("#dialog").dialog ('option', 'buttons', [
  {
    text: yes, // Okay
    "id": "yesBut",
    click: function () {
      if (Ember.$ (".img_name").css('display') !== 'none' ) {
        Ember.$ ("#toggleName").click ();
      }
      Ember.$ (this).dialog ('close');
      return true;
    }
  }]);
  Ember.$ ("#dialog").dialog ('open');
  Ember.$ ("#yesBut").focus ();
};
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
function saveOrderFunction (namelist) { // ===== XMLHttpRequest saving the thumbnail order list
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
  }).catch (error => {
    console.log (error);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function deleteFiles (picNames, nels) { // ===== Delete image(s)
  // nels = number of elements in picNames to be deleted
  for (var i=0; i<nels; i++) {
    deleteFile (picNames [i]); // Returns a promise!?!?!?!?!?!?!?!?!?!?!?!?!
  }
  Ember.$ ("#saveOrder").click ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function deleteFile (picName) { // ===== Delete an image
  Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
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
    console.log (error);
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
        } // Remove the imdbLink name
        dirList.splice (0, 0, "Val av album:");
        dirList [dirList.length - 1] = Ember.String.htmlSafe("Gör&nbsp;nytt&nbsp;eller&nbsp;ändra");
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
    console.log (error);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function getFilestat (filePath) {
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'filestat/' + filePath.replace (/\//g, "@"));
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var data = xhr.responseText.trim ();
//console.log (typeof data, data);
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
function undot (txt) { // Escape dots, for CSS names
  // Use e.g. when file names are used in CSS #<id>
  return txt.replace (/\./g, "\\.");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
