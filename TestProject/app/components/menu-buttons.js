import Ember from 'ember';
import contextMenuMixin from 'ember-context-menu';
export default Ember.Component.extend (contextMenuMixin, {

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
        Ember.$ ("#i" + Ember.$ ("#picName").text ().trim () + " a").next ().next ().next ().click ();
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
        //console.log (picName);
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
          Ember.$ (".img_mini img").css ('border', '0.25px solid #888'); // Reset all borders
          Ember.$ ('#i' + picName + ' img').css ('border', '2px dotted deeppink'); // Mark this one
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
    { //label: 'Markera/avmarkera alla',
      label: Ember.computed ('labTxt', function () {
        console.log (labTxt); // Node load
        return labTxt; // Global experimental...
      }),
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
          labTxt ='Markera alla';
        } else {
          Ember.$ ("[alt='MARKER']").addClass ("markTrue");
          Ember.$ ("#markShow").addClass ("markTrueShow");
          marked = Ember.$ ("[alt='MARKER']").length;
          labTxt ='Avmarkera alla';
        }
        Ember.$ (".numMarked").text (marked);
        //Ember.$ ("#backPos").text ('0');
        //Ember.$ ("#hideShow").click ();
        Ember.$ (".img_mini img").css ('border', '0.25px solid #888'); // Reset all borders
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
        //console.log (picName, k, line + line);
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
        //console.log (picName, k, line + line);
        Ember.run.later ( ( () => {
          scrollTo (null, Ember.$ ("#lowDown").offset ().top - screen.height*0.85);
        }), 50);
      }
    },
    { label: '', disabled: true }, // Spacer
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
        //console.log (picName);
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
          Ember.$ (".img_mini img").css ('border', '0.25px solid #888'); // Reset all borders
          Ember.$ ('#i' + picName + ' img').css ('border', '2px dotted deeppink'); // Mark this one
          Ember.$ ("#singBut").html ('Nej, bara <span  style="color:deeppink">' + picName + '</span>'); // May contain html
          Ember.$ ("#dialog").dialog ('open');
          Ember.$ ("#allBut").focus ();
        } else {nextStep ();}

        function nextStep () {
          Ember.$ (".img_mini img").css ('border', '0.25px solid #888'); // Reset all borders, can be first step!
          Ember.$ ('#i' + picName + ' img').css ('border', '2px dotted deeppink'); // Mark this one
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
    { label: 'Information',
      disabled: false,
      action (selection, details, event) {
        selection = selection;
        details = details;
        event = event;
        var picName = Ember.$ ("#picName").text ();
        var title = "Information";
        var text = "Här ska det stå en massa information om ett och annat, särskilt om " + picName;
        text = text + ". &mdash;&nbsp;Senaste nedladdning: " + Ember.$ ("#download").attr ("href");
        var yes = "Ok";
        var modal = true;
        infoDia (picName, title, text, yes, modal);
      }
    },
  ],
  contextSelection: [{ editText: false }],  // The context menu "selection" parameter (not used)
  _contextMenu (e) {
    Ember.run.later ( ( () => {
      if ( (Ember.$ ("div.drag-box").css ("display") !== "none") ||  // At text edit (editText)
          (Ember.$ ("#navAuto").text () === "true") ) { // At running slide show
        Ember.$ ("ul.context-menu").hide ();
        return;
      }
      var nodelem = e.target;
      //console.log (nodelem.tagName);
      if (nodelem.tagName === 'IMG' && nodelem.className === 'left-click' || nodelem.parentElement.id === 'link_show') { // If mini-image || show-image, set the target image name and path
        Ember.$ ("#picName").text (nodelem.parentElement.nextElementSibling.nextElementSibling.innerHTML.trim ());
        Ember.$ ("#picOrig").text (nodelem.title.trim ());
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
  savekey: -1, // and the last pressed keycode used to lock Ctrl+A

// HOOKS, that is, Ember "hooks" in the execution cycle
/////////////////////////////////////////////////////////////////////////////////////////
// -------------------------------------------------------------------------------------------------
  init () { // ##### Component initiation
    this._super (...arguments);
    Ember.$ (document).ready ( () => {
      console.log ("jQuery version is " + Ember.$ ().jquery);
   // The time stamp is produced with the Bash 'ember-b-script'
      userLog (Ember.$ ("#timeStamp").text ());
      this.setNavKeys ();
    });
  },
// -------------------------------------------------------------------------------------------------
  didInsertElement () { // ##### Runs at page ready state
    this._super (...arguments);
    document.getElementById ("imdbError").className = "hide-all";
    //this.actions.imageList (false); // OK?
    //Ember.$ ("#imageList").hide (); // Ok


    Ember.$ ("#spinner").show ();
    Ember.run.later ( ( () => {
      Ember.$ ("#toggleHide").click ();
      Ember.$ ("#hideFlag").text ("1");
      Ember.run.later ( ( () => {
        Ember.$ ("#spinner").hide ();
      }), 1000);
    }), 1000);
    document.querySelector ('input[type="number"]').addEventListener ('change', function (e) {
      e=e;
      Ember.$ ("#showFactor").text (parseInt (this.value));
      //timing = parseInt (this.value);
    });
    Ember.$ ("#showSpeed").hide ();
    Ember.$ ('.showCount').hide ();

    // Initiate a dialog, ready to be used by any function:
    Ember.$ ("#dialog").dialog ({}); // Initiate a dialog...
    Ember.$ (".ui-dialog .ui-dialog-titlebar-close").text ("×");
    Ember.$ ('#dialog').dialog ("close"); // and close it
    // Close on click off a modal dialog with overlay:
    Ember.$ ("body").on ("click", ".ui-widget-overlay", function () {
      Ember.$ ('#dialog').dialog ( "close" );
    });
  },
// -------------------------------------------------------------------------------------------------
  didRender () {
    this._super (...arguments);
    Ember.$ (document).ready ( () => {
      if (Ember.$ ("#hideFlag").text () === "1") {
        this.actions.hideFlagged (true);
      } else {
        this.actions.hideFlagged (false);
      }
      if (Ember.$ ("imdbDir").text () !== "") {
        this.actions.imageList (true);
        //Ember.$ ("#imageList").show (); <-- Warning: Destroys actions.imageList
      }
    });
  },

// HELP FUNCTIONS, that is, component methods (within-component functions)
/////////////////////////////////////////////////////////////////////////////////////////
// -------------------------------------------------------------------------------------------------
  refreshAll () { // ===== Updates allNames and the sortOrder tables by locating all images and
  // their metadata in the "imdbDir" dir (name is DOM saved) on the server disk.
  // This will trigger the template to restore the DOM elements. Thus, prepare the didRender hook
  // to further restore all details!

  return new Ember.RSVP.Promise ( (resolve) => {

    var test = 'A1';

    this.requestOrder ().then (sortnames => {
      this.actions.imageList (false);
      //Ember.$ ("#imageList").hide (); Warning: Destroys actions.imageList
//console.log ("A1 sortnames.length = ", sortnames.length);
      if (sortnames === undefined || sortnames === "Error!") {
//console.log ("A1 sortnames =\n" + sortnames);
        Ember.$ (".loadspin").hide ();
        if (Ember.$ ("#imdbDir").text () !== "") {
          document.getElementById ("imdbError").className = "show-inline";
        }
        Ember.$ ('.showCount').hide ();
        this.set ("imdbDir", "");
        Ember.$ ("#imdbDir").text ("");
        Ember.$ ("#sortOrder").text ("");
        Ember.$ ('#navKeys').text ('true');
      } else {
//console.log ("A1-sortnames =\n" + sortnames);
        document.getElementById ("imdbError").className = "hide-all";
        Ember.$ ("#sortOrder").text (sortnames); // Save in the DOM
        /*setTimeout (function () {
        }, 4000);*/
      }
//console.log ("A1 #sortOrder =", Ember.$ ("#sortOrder").text ());

      test = 'A2';
      // Use sortOrder (as far as possible) to reorder namedata
      this.requestNames ().then (namedata => {
        var i = 0, k = 0;
        // --- START provide sortnames with all CSV columns
//console.log ("A2 #sortOrder =", Ember.$ ("#sortOrder").text ().replace (/\n/gm, " "));
        var SN = [];
        if (Ember.$ ("#sortOrder").text ().trim ().length > 0) {
          SN = Ember.$ ("#sortOrder").text ().trim ().split ('\n');
        }
//console.log ("A2 SN =", SN);
        sortnames = '';
        for (i=0; i<SN.length; i++) {
          var tmp = SN [i].split (',');
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
        sortnames = sortnames.trim (); // Important!
        test = 'A3';
        var snamsvec = sortnames.split ('\n'); // sortnames vectorized
//console.log ("A3 snamsvec.length = " + snamsvec.length);
//console.log ("A3 snamsvec = " + snamsvec.join (" "));
        // --- END prepare sortnames
        // --- Make the object vector 'newdata' for new 'allNames' content
        // --- Pull out the plain dir list file names: name <=> namedata
        if (namedata === undefined) {namedata = [];}
        var name = [];
        for (i=0; i<namedata.length; i++) {
          name.push (namedata [i].name);
        }
//console.log ("A3 namedata.length = ", namedata.length);
//console.log ("A3 name from namedata = ", name.join (" "));
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
        /*test ='D';
        // --- Make the object vector 'newsort' for new 'sortOrder' content
        // --- Pull out the new ordered file names: snams <=> newdata
        snams = []; // reuse, newdata name order
        for (i=0; i<newdata.length; i++) {
          snams.push (newdata [i].name);
        }*/
        test ='E0';
//console.log ("E0 newsort.length = " + newsort.split ("\n").length);
//console.log ("E0 newsort = " + newsort.replace (/\n/gm, " "));
        this.set ('allNames', newdata);
        Ember.$ ('#sortOrder').text (newsort); // Save in the DOM
//console.log ("E0 #sortOrder = " + Ember.$ ('#sortOrder').text ().replace (/\n/gm, " "));
        if (newdata.length > 0) {
          userLog ('RESTORED order');
        }

      }).catch (error => {
        console.error (test + ' in function refreshAll: ' + error);
      });

    }).catch ( () => {
      console.log ("Not found");
    });
    resolve ("REFRESHED");

  }).then ( () => {
    //this.setNavKeys ();
    Ember.$ ('#navKeys').text ('true');
    if (Ember.$ ("#imdbDir").text () !== "") {
      this.actions.imageList (true);
    }
    setTimeout (function () {
      Ember.$ ("#saveOrder").click ();
      Ember.$ (".loadspin").hide ();
    }, 4000);
  }).catch (error => {
    console.log (error);
  });

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
          Ember.$ (".img_mini img").css ('border', '0.25px solid #888'); // Reset all borders
        }
        if (Z) {console.log ('*f');}
      } else
      if (event.keyCode === 37 && Ember.$ ('#navKeys').text () === 'true') { // Left key <
        that.actions.showNext (false);
        if (Z) {console.log ('*g');}
      } else
      if (event.keyCode === 39 && Ember.$ ('#navKeys').text () === 'true') { // Right key >
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
      Ember.$ ("#showSpeed input").focus ();
      var that = this;
      (function sequence () {
        that.actions.showNext (true); // Immediate response
        var showFactor = parseInt (Ember.$ ("#showFactor").text ());
        if (showFactor < 1) {showFactor = 0.5;}
        if (showFactor > 10) {showFactor = 15;}
        var txlen = Ember.$ ("#wrap_show .img_txt1").text ().length + Ember.$ ("#wrap_show .img_txt2").text ().length;
        if (!txlen) {txlen = 0;}
        if (txlen < 100) {txlen = 100;} // 100 char
        if (txlen > 1000) {txlen = 1000;} // 1000 char
        that.timer = setTimeout (sequence, showFactor*14*txlen);
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
      var xhr = new XMLHttpRequest ();
      var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
      xhr.open ('GET', 'sortlist/' + IMDB_DIR); // URL matches server-side routes.js
      xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
          var data = xhr.responseText.trim ();
          if (data.slice (0, 8) === '{"error"') {
            data = undefined;
          }
//console.log ("requestOrder ", data); checked OK
          resolve (data); // Return file-name text lines

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
// -------------------------------------------------------------------------------------------------
  requestNames () { // ===== Request the file information list
  // NEPF = number of entries (lines) per file in the plain text-line-result list ('namedata') from
  // the server. The main iformation ('namedata') is retreived from each image file, e.g. metadata.
  // It is reordered into 'newdata' in 'sortnames' order, as far as possible; 'sortnames' is cleaned
  // from non-existent (removed) files and extended with new (added) files, in order as is.
  // So far, the sort order is 'sortnames' with hideFlag (and albumIndex?)
    return new Ember.RSVP.Promise ( (resolve, reject) => {
      var xhr = new XMLHttpRequest ();
      var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
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
//console.log (result);
          IMDB_DIR = IMDB_DIR;
          result = result.trim ().split ('\n'); // result is vectorised
          var i = 0, j = 0;
          var n_files = result.length/NEPF;
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
            j = j + NEPF;
            allfiles.pushObject (f);
          }
          userLog ('FILE INFO received');
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

  imdbDir: "", // Picture data directory
  imdbDirs: ['- VÄLJ -', 'imdb', 'album1', 'flyg2017', 'imdb/album2', 'imdb/Toyota'],

// TEMPLATE ACTIONS, that is, functions reachable from the HTML page
/////////////////////////////////////////////////////////////////////////////////////////
  actions: {
//==================================================================================================
    selectImdbDir (value) {
    return new Ember.RSVP.Promise ( () => {

      if (value.slice (0,1) === '-') {
        value = "";
        document.getElementById ("imdbError").className = "hide-all";
        Ember.$ ('.showCount').hide ();
      }
      Ember.$ ("#sortOrder").text ("");
      this.set ("imdbDir", value);
      Ember.$ ("#imdbDir").text (value);
      Ember.$ ("#imDi strong").text (value);
      /*while (Ember.$ ("#sortOrder").text () !== "") {
        Ember.$ ("#sortOrder").text ("");
      }*/
      Ember.$ ("select").blur (); // Important
      if (Ember.$ ("#hideFlag").text () === "0") {Ember.$ ("#toggleHide").click ();}
      Ember.$ ("#reFresh-1").click ();
      console.log ("Selected: " + this.get ('imdbDir'));

    }).catch (error => {
      console.log (error);
    });

    },
//==================================================================================================
    toggleHideFlagged () { // #####

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});

      Ember.$ ('.showCount').hide ();
      if (Ember.$ ("imdbDir").text () !== "") {
        Ember.$ ('.showCount:first').show (); // Show upper
      }
      Ember.$ ('.showCount .numMarked').text (Ember.$ (".markTrue").length + ' ');

      if (Ember.$ ("#hideFlag").text () === "1") {
        Ember.$ ("#hideFlag").text ("0");
        Ember.$ (".img_mini").show (); // Show all pics
        var n = Number (Ember.$ ('.showCount .numShown:first').text ().trim ()) + Number (Ember.$ ('.showCount .numHidden:first').text ().trim ());
        if (n > 0) {Ember.$ ('.showCount').show ();} // Show both
        Ember.$ ('.showCount .numShown').text (' ' + n);
        Ember.$ ('.showCount .numHidden').text (' 0');
        Ember.$ ('#toggleHide').css ('color', 'white');
      } else {
        Ember.$ ("#hideFlag").text ("1");
        this.actions.hideFlagged (true); // Hide the flagged pics
        Ember.$ ('#toggleHide').css ('color', 'lightskyblue');
      }
    },
//==================================================================================================
    hideFlagged (yes) { // #####

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      var tmp = Ember.$ ('#sortOrder').text ().trim ();
      if (tmp.length < 1) {return;}
      var rows = tmp.split ('\n');
      //console.log (rows.length + " files");
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
        Ember.$ ('.showCount .numMarked').text (Ember.$ (".markTrue").length + ' ');
        Ember.$ ('#toggleHide').css ('color', 'lightskyblue');
      }

      var lineCount = parseInt (Ember.$ (window).width ()/170); // w150 +> w170 each
      Ember.$ ('.showCount').hide ();
      Ember.$ ('.showCount:first').show (); // Show upper
      if ( (n - h) > lineCount) {Ember.$ ('.showCount').show ();} // Show both

    },
//==================================================================================================
    showDropbox () { // ##### Display the Dropbox file upload area

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      if (document.getElementById ("divDropbox").className === "hide-all") {
        document.getElementById ("divDropbox").className = "show-block";
        document.getElementById ("showDropbox").innerHTML = "Göm uppladdning";
        //Ember.$ (".dropzoneFill").css ('height', '240px');
        //Ember.$ (".dropzoneFill").css ('opacity', 0 );
        //Ember.$ (".dropzoneFill").show ();
      } else {
        document.getElementById ("divDropbox").className = "hide-all";
        document.getElementById ("showDropbox").innerHTML = "Visa uppladdning";
        //Ember.$ (".dropzoneFill").css ('height', '0px');
        //Ember.$ (".dropzoneFill").hide ();
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
      //var BTN = Ember.$ ("#imageBtn").offset ().top;
      //scrollTo (null, BTN);
      //document.getElementById ("imageBtn").blur ();
    },
//==================================================================================================
    showShow (showpic, namepic, origpic) { // ##### Render a 'show image' in its <div>

      Ember.$ ("div.img_show").hide (); // Hide in case a previous is not already hidden
      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      Ember.$ (".img_mini img").css ('border', '0.25px solid #888'); // Reset all borders
      Ember.$ ("div.img_show img:first").attr ('src', showpic);
      Ember.$ ("div.img_show img:first").attr ('title', origpic);
      Ember.$ ("div.img_show .img_name").text (namepic); // Should be plain text
      Ember.$ ("div.img_show .img_txt1").html (Ember.$ ('#i' + namepic + ' .img_txt1').html ());
      Ember.$ ("div.img_show .img_txt2").html (Ember.$ ('#i' + namepic + ' .img_txt2').html ());
      // The mini image 'id' is the 'trimmed file name' prefixed with 'i'
      if (typeof this.set === 'function') { // false if called from showNext
        var savepos = Ember.$ ('#i' + namepic).offset ();
        Ember.$ ('#backPos').text (savepos.top); // Vertical position of the mini-image
        Ember.$ ('#backImg').text (namepic); // The name of the mini-image
      }
      Ember.$ ("#wrap_show").css ('background-color', Ember.$ ('#i' + namepic).css ('background-color'));
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
      Ember.$ ('.loadspin').hide ();
   },
//==================================================================================================
    hideShow () { // ##### Hide the show image element

      Ember.$ ("ul.context-menu").hide (); // if open
      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      Ember.$ ("div.img_show div").blur ();
      Ember.$ ("div.img_show").hide ();
      var savepos = Ember.$ ('#backPos').text (); // Locate corresponding mini-image
      scrollTo (null, savepos - 3);
      var saveimg = '#i' + Ember.$ ('#backImg').text () + ' img'; // Locate corresponding mini-image
      Ember.$ (saveimg).css ('border', '2px dotted deeppink'); // Mark this one
    },
//==================================================================================================
    showNext (forwards) { // ##### SHow the next image if forwards is true, else the previous

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});

      var namehere = Ember.$ ("div.img_show .img_name").text ();
      var namepic, minipic, origpic;
      namepic = namehere;
      if (forwards) {
        while (namepic === namehere) {
          namepic = null;
          if (!document.getElementById ("i" + namehere) || !document.getElementById ("i" + namehere).parentElement.nextElementSibling) { // last
            namepic = document.getElementsByClassName ("img_mini") [0].getAttribute ("id").slice (1);
            //console.log ('To FIRST picture');
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
            var tmp = document.getElementsByClassName ("img_mini");
            namepic = tmp [tmp.length - 1].getAttribute ("id").slice (1);
            //console.log ('To LAST picture');
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
      var savepos = Ember.$ ('#i' + namepic).offset ();
      Ember.$ ('#backPos').text (savepos.top); // Save position
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

      if (Ember.$ ("#navAuto").text () === "false") {
        this.contextSelection.editText = false;
        Ember.$ ("#navAuto").text ("true");

        Ember.run.later ( ( () => {
          Ember.$ (".nav_links .toggleAuto").text ("STOP");
          this.runAuto (true);
        }), 500);
      } else {
        this.contextSelection.editText = true;
        Ember.$ ("#navAuto").text ("false");
        Ember.run.later ( ( () => {
          Ember.$ (".nav_links .toggleAuto").text ("AUTO");
          this.runAuto (false);
        }), 500);
      }
    },
//==================================================================================================
    reFresh (nospin) { // ##### Reload the imageList and update the sort order

      if (!nospin) {Ember.$ (".loadspin").show ();}
      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      Ember.$ ("div.img_show").hide ();
      this.actions.imageList (false);

//return new Ember.RSVP.Promise ( () => {

        this.refreshAll ().then ( (message) => {
          document.getElementById ("reFresh").blur ();
          message = message;
          Ember.run.later ( ( () => {
            if (Ember.$ ("#imdbDir").text () === "") {
              this.actions.imageList (false);
            }
            //Ember.$ ("#saveOrder").click ();  refreshAll
            //Ember.$ (".loadspin").hide ();     refreshAll
          }), 2000);
        });

//}).catch (error => {
//  console.log (error);
//});

    },
//==================================================================================================
    saveOrder () { // ##### Save, in imdbDir on server, the ordered name list for the thumbnails on the screen. Note that they may, by user's drag-and-drop, have an unknown sort order (etc.)

    setTimeout (function () {
      var a = true; a = false; // noop
    }, 4000);

    return new Ember.RSVP.Promise ( (resolve) => {

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      // Get the true ordered name list from the DOM mini-pictures (thumbnails).
      var i =0, k = 0, SName = [], names;
      /*setTimeout (function () {
        Ember.$ ("#temporary").text (Ember.$ (".img_mini .img_name").text ().toString ().trim ().replace (/\s+/g, " ")); // The vector of picture names (replace whitespaces)
      }, 4000);*/
      var SN = Ember.$ ('#sortOrder').text ().trim ().split ('\n'); // Take it from the DOM storage
//console.log ("SN =", SN);
      for (i=0; i<SN.length; i++) {
        SName.push (SN[i].split (',') [0]);
      }
      var UName = Ember.$ ('#uploadNames').text ().trim (); // Newly uploaded
      Ember.$ ('#uploadNames').text (''); // Reset
      var newOrder = '';
      //names = Ember.$ ("#temporary").text ();
      names = Ember.$ (".img_mini .img_name").text ().toString ().trim ().replace (/\s+/g, " ");
      //Ember.$ ("#temporary").text ("");
      //names = Ember.$ (".img_mini .img_name").text ().toString ().trim ().replace (/\s+/g, ";").split (";"); // The vector of picture names (replace whitespaces and split)
//console.log ("names =", names);
      names = names.split (" ");
//console.log ("names =", names);
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
//console.log ("newOrder =", newOrder.split ("\n"));
      Ember.$ ('#sortOrder').text (newOrder); // Save in the DOM
      saveOrderFunction (newOrder).then ( () => { // Save on server disk
        document.getElementById ("saveOrder").blur ();
        Ember.$ (".img_mini img").css ('border', '0.25px solid #888'); // Reset all borders
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
        var text = " ... med Esc-tangenten och börja visningen igen med A-tangenten!";
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

      Ember.$ ('#navKeys').text ('false');
      // In case the name is given, the call originates in a mini-file (thumbnail)
      // Else, the call originates in the, or opening a new|next show-file that may have a drag-box
      if (namepic) {
        if (Ember.$ (".drag-box").is (':visible') && Ember.$ (".drag-box div div.name").text () === namepic) {
          Ember.$ (".drag-box").hide ();
          Ember.$ ('#navKeys').text ('true');
          return;
        }
        Ember.$ (".drag-box div div.name").text (namepic);
        Ember.$ (".drag-box textarea.textarea1").val (Ember.$ ('#i' + namepic + ' .img_txt1').html ().trim ());
        Ember.$ (".drag-box textarea.textarea2").val (Ember.$ ('#i' + namepic + ' .img_txt2').html ().trim ());
        Ember.$ (".drag-box").show ();
      } else {
        if (Ember.$ (".drag-box").is (':visible')) {
          Ember.$ (".drag-box").hide ();
          Ember.$ ('#navKeys').text ('true');
          return;
        }
        Ember.$ (".drag-box div div.name").text (Ember.$ ("#wrap_show .img_name").text ());
        Ember.$ (".drag-box textarea.textarea1").val (Ember.$ ("#wrap_show .img_txt1").html ().trim ());
        Ember.$ (".drag-box textarea.textarea2").val (Ember.$ ("#wrap_show .img_txt2").html ().trim ());
        Ember.$ (".drag-box").show ();
      }
      Ember.$ (".drag-box textarea.textarea1").focus ();
    },
//==================================================================================================
    fullSize () { // ##### Show full resolution image

      Ember.$ (".helpText").hide (10, function () {Ember.$ ("#link_show a").css ('opacity', 0 );});
      Ember.$ ('.loadspin').show ();
      return new Ember.RSVP.Promise ( (resolve, reject) => {
        var xhr = new XMLHttpRequest ();
        var origpic = Ember.$ ("div.img_show img").attr ('title'); // With path
        xhr.open ('GET', 'fullsize/' + origpic); // URL matches routes.js with *?
        xhr.onload = function () {
          if (this.status >= 200 && this.status < 300) {
            var djvuName = xhr.responseText;
            var dejavu = window.open (djvuName  + '?djvuopts&amp;zoom=100', 'dejavu', 'width=916,height=600,resizable=yes,location=no,titlebar=no,toolbar=no,menubar=no,scrollbars=yes,status=no');
            dejavu.focus ();
            Ember.$ ('.loadspin').hide ();
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
      Ember.$ ('.loadspin').show ();
      return new Ember.RSVP.Promise ( (resolve, reject) => {
        var xhr = new XMLHttpRequest ();
        var tmp = Ember.$ ("#picName").text ().trim ();
        Ember.run.later ( ( () => {
          Ember.$ ('#i' + tmp + ' img').css ('border', '2px dotted deeppink'); // Mark this one
        }), 50);
        var origpic = Ember.$ ('#i' + tmp + ' img').attr ('title'); // With path
        xhr.open ('GET', 'download/' + origpic); // URL matches routes.js with *?
        xhr.onload = function () {
          if (this.status >= 200 && this.status < 300) {
            //console.log (this.responseURL); // Contains http://<host>/download/...
            var host = this.responseURL.replace (/download.+$/, "");
            Ember.$ ("#download").attr ("href", host + this.responseText); // Is just 'origpic'(!)
console.log (Ember.$ ("#download").attr ("href"));
            Ember.run.later ( ( () => {
              //Ember.$ ("#download").click (); DOES NOT WORK
              document.getElementById ("download").click (); // Works
            }), 250);
            Ember.$ ('.loadspin').hide ();
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
      Ember.$ (".img_mini img").css ('border', '0.25px solid #888'); // Reset all borders
      var ident = "#i" + name + " div:first";
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
    }
  }
});

// G L O B A L S, that is, 'outside' (global) functions and variables
/////////////////////////////////////////////////////////////////////////////////////////
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var infoDia = (picName, title, text, yes, modal) => { // ===== Information dialog
  if (picName) {
    Ember.$ (".img_mini img").css ('border', '0.25px solid #888'); // Reset all borders
    Ember.$ ('#i' + picName + ' img').css ('border', '2px dotted deeppink'); // Mark this one
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
    Ember.$ ("#i" + picName).css ('background-color', '#222');
    Ember.$ ("#wrap_show").css ('background-color', '#222'); // *Just in case the show image is visible     Ember.$ ("#i" + picName).show ();
    if (hideFlag === "1") { // If it's going to be hidden: arrange its CSS ('local hideFlag')
      Ember.$ ("#i" + picName).css ('background-color', Ember.$ ("#hideColor").text ());
      Ember.$ ("#wrap_show").css ('background-color', Ember.$ ("#hideColor").text ()); // *Just in case -
      // The 'global hideFlag' determines whether 'hidden' pictures are hidden or not
      if (Ember.$ ("#hideFlag").text () === "1") { // If hiddens ARE hidden, hide this also
        Ember.$ ("#i" + picName).hide ();
      }
    }
    Ember.$ ("#sortOrder").text (sortOrder); // Save in the DOM
  }
  //Update picture numbers:
  var tmp = document.getElementsByClassName ("img_mini");
  var numHidden = 0, numTotal = tmp.length;
  for (i=0; i<numTotal; i++) {
    //console.log (tmp [i].style.backgroundColor);
    if (tmp [i].style.backgroundColor === Ember.$ ("#hideColor").text ()) {
      numHidden = numHidden + 1;
    }
  }
  //console.log ("numTotal", numTotal);
  //console.log ("numHidden", numHidden);
 //Ember.run.later ( ( () => {
  if (Ember.$ ("#hideFlag").text () === "1") {
    Ember.$ (".numHidden").text (numHidden);
    Ember.$ (".numShown").text (numTotal - numHidden);
  } else {
    Ember.$ (".numHidden").text (0);
    Ember.$ (".numShown").text (numTotal);
  }
 //}), 1000);
 //setTimeout (function () {
 //  var a = true; a = false; // noop
 //}, 1000);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function saveOrderFunction (namelist) { // ===== XMLHttpRequest saving the thumbnail order list
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
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
    var origpic = Ember.$ ('#i' + picName + ' img').attr ('title'); // With path
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
var labTxt = 'Markera/avmarkera alla'; // Global experimental...
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*function saveBlob (blob, fileName) { // Download a file
    var a = document.createElement ("a");
    a.href = window.URL.createObjectURL (blob);
    a.download = fileName;
    a.click ();
}*/
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
