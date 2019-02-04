import Ember from 'ember';
import { task } from 'ember-concurrency';
import contextMenuMixin from 'ember-context-menu';
export default Ember.Component.extend (contextMenuMixin, {

  // PERFORM TASKS, reachable from the HTML template page
  /////////////////////////////////////////////////////////////////////////////////////////

  rstBrdrs: task (function* () {
    resetBorders ();
    yield null; // required
  }),

  requestDirs: task (function* () {
    document.title = "MISH";
    let imdbroot = this.get ("imdbRoot");

    if (imdbroot === "") {
      let rootList = yield reqRoot (); // Request possible directories

      if (rootList) {
        rootList = rootList.split ("\n");
        let seltxt = rootList [0];
        rootList.splice (0, 1, "");
        let selix = rootList.indexOf (seltxt);
        if (selix > 0) {
          this.set ("imdbRoot", seltxt);
          Ember.$ ("#imdbRoot").text (seltxt);
        }
        this.set ("imdbRoots", rootList);
        rootList = rootList.join ("\n");
        Ember.$ ("#imdbRoots").text (rootList);
      }

      if (imdbroot === "") {
        // Select imdbRoot
        Ember.$ ("div.settings, div.settings div.root").show ();
        Ember.$ ("div.settings div.check").hide ();
        //Ember.$ ("#rootSel").prop ('selectedIndex', selix);
        return;
      }
    }

    yield reqDirs (imdbroot); // Request all subdirectories recursively

    this.set ("userDir", Ember.$ ("#userDir").text ());
    this.set ("imdbRoot", Ember.$ ("#imdbRoot").text ());
    this.set ("imdbDirs", Ember.$ ("#imdbDirs").text ().split ("\n"));

    if (this.get ("albumData").length === 0) {
      // Construct dirList/treePath for jstree data = albumData
      let treePath = this.get ("imdbDirs");
      treePath.splice (treePath.length - 1, 1); // Remove dirList 'filler'
      //console.log (treePath.length, treePath);
      let imdbLink = this.get ("imdbLink");
      for (var i=0; i<treePath.length; i++) {
        if (i === 0) {treePath [i] = imdbLink;} else {
          treePath [i] = imdbLink + treePath [i].toString ();
        }
        let branch = treePath [i].split ("/");
        if (branch [0] === "") {branch.splice (0, 1);}
        //console.log (branch);
      }
      let albDat = aData (treePath);
      // Substitute the first name (in '{text:"..."') into the root name:
      albDat = albDat.split (","); // else too long a string (??)
      albDat [0] = albDat [0].replace (/{text:".*"/, '{text:"' + this.get ("imdbRoot") + '"');
      albDat = albDat.join (",");
      let count = Ember.$ ("#imdbCoco").html ().split ("\n");
      for (let i=0; i<count.length; i++) {
        albDat = albDat.replace (/{text:"([^" ]*)"/, "{text:€$1<small>" + count[i] + "</small>\"");
      }
      albDat = albDat.replace (/€/g, '"');
      this.set ("albumData", eval (albDat));
//console.log(JSON.stringify (this.get ("albumData")));
      albumWait = false;
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
    { label: 'Redigera text...',
      /*disabled: () => {
        return !(allow.textEdit || allow.adminAll);
      },*/
      disabled: false,
      action: () => {
        // Mimic click on the text of the mini-picture (thumbnail)
        Ember.$ ("#i" + escapeDots (Ember.$ ("#picName").text ().trim ()) + " a").next ().next ().next ().click ();
      }
    },
    { label: 'Redigera bild...', // i18n
      disabled: () => {
        return !(allow.imgEdit || allow.adminAll);
      },
      // to be completed ...
      action () {
        var title = "Information";
        var text = "<br>”Redigera bild...” är fortfarande<br>UNDER UTVECKLING"; // i18n
        var yes = "Ok" // i18n
        infoDia (null, null, title, text, yes, true);
        return;
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
    { label: 'Markera bara gömda',
      disabled: () => {
        return false;
      },
      action () {
        let hico = Ember.$("#hideColor").text ();
        let tmp = document.getElementsByClassName ("img_mini");
        for (let i=0; i<tmp.length; i++) {
          tmp [i].querySelector ("div[alt='MARKER']").setAttribute ("class", "markFalse") ;
          if (tmp [i].style.backgroundColor === hico) {
            tmp [i].querySelector ("div[alt='MARKER']").setAttribute ("class", "markTrue") ;
          }
        }
        Ember.$ ('.showCount .numMarked').text (Ember.$ (".markTrue").length + ' ');
      }
    },
    { label: 'Placera först',
      disabled: () => {
        return !((allow.imgReorder && allow.saveChanges) || allow.adminAll);
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
        return !((allow.imgReorder && allow.saveChanges) || allow.adminAll);
        //return !((allow.imgReorder && allow.saveChanges && Ember.$ ("#saveOrder").css ("display") !== "none") || allow.adminAll);
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
        return !(["admin", "editall", "edit"].indexOf (loginStatus) > -1 && ((allow.imgOriginal || allow.adminAll) && window.screen.width > 500 && window.screen.height > 500));
        /*let dis = true; THIS way is too slow for copy protection!!
        let picName = Ember.$ ("#picName").text ();
        if (!picName.startsWith ("Vbm") && !picName.startsWith ("CPR") && ["admin", "editall", "edit"].indexOf (loginStatus) > -1 && ((allow.imgOriginal || allow.adminAll) && window.screen.width > 500 && window.screen.height > 500)) {dis = false;}
        return dis;*/
      },
      action () {
        Ember.$ ("#downLoad").click (); // Call via DOM since "this" is ...where?
      }
    },
    //{ label: '', disabled: true }, // Spacer
    { label: 'Länka till...', // i18n
      disabled: () => {
        return !(allow.delcreLink || allow.adminAll);
      },
      action () {
        var picName, nels, nlns, nelstxt, linktxt, picNames = [], nodelem = [], nodelem0, i;
        let symlinkClicked;
        picName = Ember.$ ("#picName").text ().trim ();
        Ember.run.later ( ( () => { // Picname needs time to settle...
          picName = Ember.$ ("#picName").text ().trim ();
        }), 50);
        resetBorders (); // Reset all borders
        if (!Ember.$ ("#i" + escapeDots (picName)).hasClass ("symlink")) { // Leave out symlinks
          markBorders (picName);
          picNames [0] = picName;
          nels = 1;
          symlinkClicked = false;
        } else {
          symlinkClicked = true;
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
            if (!Ember.$ ("#i" + escapeDots (tmpName)).hasClass ("symlink")) { // Leave out symlinks
              picNames.push (tmpName);
            }
          }
          nels = picNames.length;
          nlns = nodelem.length - nels;
          linktxt = "";
          if (nlns > 0) {linktxt = "En är redan länk, övriga:<br>";} // i18n
          if (nlns > 1) {linktxt = nlns + " är länkar och kan inte användas; övriga:<br>";} // i18n
          nelstxt = "Vill du länka alla " + nels; // i18n
          if (nels === 2) {nelstxt = "Vill du länka båda två";} // i18n
          //console.log("nodelems non-symlinks:", nodelem.length, nels);
        }
        if (nels === 0) {
          var title = "Ingenting att länka"; // i18n
          var text = "<br><b>Omöjligt att länka länkar!</b>"; // i18n
          var yes = "Uppfattat" // i18n
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
              if (picName === "") {
                Ember.$ (this).dialog ('close');
              } else {
                var nodelem = [];       // Redefined since:
                nodelem [0] = nodelem0; // Else illegal, displays "read-only"!
                picNames = [];
                picNames [0] = picName;
                nels = 1;
                Ember.$ ("#picNames").text (picNames.join ("\n"));
                Ember.$ (this).dialog ('close');
                linkFunc (picNames);
              }
            }
          }]);
          if (symlinkClicked) {
            picName = "";
            Ember.$ ("#singButt").html ("Nej");
          } else {
            Ember.$ ("#singButt").html ('Nej, bara <span  style="color:deeppink">' + picName + '</span>'); // 'text:', here we may include html tags
          }
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
    { label: 'Flytta till...', // i18n
      disabled: () => {
        return !(allow.deleteImg || allow.adminAll);
      },
      action () {
        var picName, nels, nlns, nelstxt, movetxt, picNames = [], nodelem = [], nodelem0, i;
        let symlinkClicked;
        picName = Ember.$ ("#picName").text ().trim ();
        Ember.run.later ( ( () => { // Picname needs time to settle...
          picName = Ember.$ ("#picName").text ().trim ();
        }), 50);
        resetBorders (); // Reset all borders
        if (!Ember.$ ("#i" + escapeDots (picName)).hasClass ("symlink")) { // Leave out symlinks
          markBorders (picName);
          picNames [0] = picName;
          nels = 1;
          symlinkClicked = false;
        } else {
          symlinkClicked = true;
          nels = 0;
          Ember.$ ("#picName").text (""); // Signals non-movable, see "downHere"
        }
        nodelem0 = document.getElementById ("i" + picName).firstElementChild.nextElementSibling;
        var picMarked = nodelem0.className === "markTrue";
        if (picMarked) {
          picNames = [];
          nodelem = document.getElementsByClassName ("markTrue");
          for (i=0; i<nodelem.length; i++) {
            var tmpName = nodelem [i].nextElementSibling.innerHTML.trim ();
            if (!Ember.$ ("#i" + escapeDots (tmpName)).hasClass ("symlink")) { // Leave out symlinks
              picNames.push (tmpName);
            }
          }
          nels = picNames.length;
          nlns = nodelem.length - nels;
          movetxt = "";
          if (nlns > 0) {movetxt = "En är länk och kan inte flyttas; övriga:<br>";} // i18n
          if (nlns > 1) {movetxt = nlns + " är länkar som inte kan flyttas; övriga:<br>";} // i18n
          nelstxt = "Vill du flytta alla " + nels; // i18n
          if (nels === 2) {nelstxt = "Vill du flytta båda två";} // i18n
          //console.log("nodelems non-symlinks:", nodelem.length, nels);
        }
        if (nels === 0) {
          var title = "Ingenting att flytta"; // i18n
          var text = "<br><b>Omöjligt att flytta länkar!</b>"; // i18n
          var yes = "Uppfattat" // i18n
          infoDia (null, null, title, text, yes, true);
          return;
        }
        //console.log (nodelem0.parentNode.style.backgroundColor); // << Checks this text content
        Ember.$ ("#picNames").text (picNames.join ("\n"));
        if (nels > 1) {
          var mvTxt = "<br>ska flyttas till annat album"; // i18n
          Ember.$ ("#dialog").html (movetxt + "<b>" + nelstxt + "?</b><br>" + cosp (picNames) + mvTxt); // Set dialog text content
          Ember.$ ("#dialog").dialog ( { // Initiate dialog
            title: "Flytta till... ", // i18n
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
              moveFunc (picNames);
            }
          },
          {
            text: "", // Set later, in order to include html tags (illegal here)
            "id": "singButt", // Process only one
            click: function () {
              if (picName === "") {
                Ember.$ (this).dialog ('close');
              } else {
                var nodelem = [];       // Redefined since:
                nodelem [0] = nodelem0; // Else illegal, displays "read-only"!
                picNames = [];
                picNames [0] = picName;
                nels = 1;
                Ember.$ ("#picNames").text (picNames.join ("\n"));
                Ember.$ (this).dialog ('close');
                moveFunc (picNames);
              }
            }
          }]);
          if (symlinkClicked) {
            picName = "";
            Ember.$ ("#singButt").html ("Nej");
          } else {
            Ember.$ ("#singButt").html ('Nej, bara <span  style="color:deeppink">' + picName + '</span>'); // 'text:', here we may include html tags
          }
          niceDialogOpen ();
          Ember.$ ("#singButt").removeClass ("ui-button-disabled ui-state-disabled");
          if (Ember.$ ("#picName").text () === "") { // "downHere", referenced above
            Ember.$ ("#singButt").addClass ("ui-button-disabled ui-state-disabled");
          }
          Ember.$ ("#allButt").focus ();
        } else {
          Ember.$ (this).dialog ('close');
          markBorders (picNames [0]); // Mark this single one, even if it wasn't clicked
          moveFunc (picNames);
          niceDialogOpen ();
        }
      }
    },
    { label: 'RADERA...',
      disabled: () => {
        return !(allow.delcreLink || allow.deleteImg || allow.adminAll);
      },
      action () {
        var picName, all, nels, nelstxt, delNames,
          picNames = [], nodelem = [], nodelem0, linked, i;
        picName = Ember.$ ("#picName").text ().trim ();

        // A symlink clicked:
        var title = "Otillåtet"; // i18n
        var text = "<br>— du får bara radera länkar —"; // i18n
        var yes = "Uppfattat" // i18n
        let symlink = document.getElementById ("i" + picName).classList.contains ('symlink');
        if (!symlink && !allow.deleteImg) {
          infoDia (null, null, title, text, yes, true);
          return;
        }

        picNames [0] = picName;
        nodelem0 = document.getElementById ("i" + picName).firstElementChild.nextElementSibling;
        nels = 1;
        var picMarked = nodelem0.className === "markTrue";
        if (picMarked) {
          picNames = [];
          nodelem = document.getElementsByClassName ("markTrue");
          linked = Ember.$ (".symlink .markTrue").length;
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

          // Not only symlinks are included:
          if (nels > linked && !allow.deleteImg) {
            infoDia (null, null, title, text, yes, true);
            return;
          }

          delNames =  cosp (picNames);
          nelstxt = "<b>Vill du radera " + all + nelstxt + "?</b><br>" + delNames + "<br>ska raderas permanent";
          if (linked) {
            nelstxt += " *<br><span style='color:green;font-size:85%'>* då <span style='color:green;text-decoration:underline'>länk</span> raderas berörs inte originalet</span>";
          }
          Ember.$ ("#dialog").html (nelstxt); // i18n
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
              nextStep (nels);
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
              nextStep (nels);
            }
          }]);
          resetBorders (); // Reset all borders
          markBorders (picName); // Mark this one
          Ember.$ ("#singButt").html ('Nej, bara <span  style="color:deeppink">' + picName + '</span>'); // May contain html
          niceDialogOpen ();
          Ember.$ ("#allButt").focus ();
        } else {nextStep (nels);}

        function nextStep (nels) {
          var eraseText = "Radera"; // i18n
          resetBorders (); // Reset all borders, can be first step!
          markBorders (picName); // Mark this one
          if (nels === 1) {
            linked = Ember.$ ("#i" + escapeDots (picName)).hasClass ("symlink");
          }
          nelstxt = "<b>Vänligen bekräfta:</b><br>" + delNames + "<br><b>ska alltså raderas?</b><br>(<i>kan inte ångras</i>)"; // i18n
          if (linked) {
            nelstxt += "<br><span style='color:green;font-size:85%'>Då <span style='color:green;text-decoration:underline'>länk</span> raderas berörs inte originalet</span>"; // i18n
          }
          Ember.$ ("#dialog").html (nelstxt);
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
              deleteFiles (picNames, nels); // NOTE: Must be a 'clean' call (no then or <await>)
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
//    document.addEventListener ('click', (evnt) => {triggerClick (evnt);}, false);
//    document.removeEventListener ('mouseup', (e) => {triggerClick (evnt);}, false);
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
    }), 5); // was 20
  },

  // STORAGE FOR THE HTML page population, and other storages
  /////////////////////////////////////////////////////////////////////////////////////////
  allNames: [], // ##### File names etc. (object array) for the thumbnail list generation
  timer: null,  // and the timer for auto slide show,
  savekey: -1,  // and the last pressed keycode used to lock Ctrl+A etc.
  userDir:  "undefined", // Current server user directory
  imdbLink: "imdb", // Name of the symbolic link to the imdb root directory
  imdbRoot: "", // The imdb directory (initial default = env.variable $IMDB_ROOT)
  imdbRoots: [], // For imdbRoot selection
  imdbDir: "",  // Current picture directory, selected from imdbDirs
  imdbDirs: ['Album?'], // Reset in requestDirs
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
      Ember.$ ("#title form button.viewSettings").hide ();
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
    prepSearchDialog ();
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
    // This will trigger the template to restore the DOM elements. Prepare the didRender hook
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
          if (sortnames === "") {
            var snamsvec = [];
          } else {
            snamsvec = sortnames.split ('\n'); // sortnames vectorized
          }
//console.log(" 1 sortnames.length",snamsvec.length);
//console.log("   sortnames",sortnames,snamsvec);
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
//console.log(" 2 namedata.length",namedata.length);
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
          // --- Move remaining 'namedata' objects (e.g. uploads) into 'newdata' until empty.
          // --- Place them first to get better noticed. Update newsort for sortnames.
          // --- The names, of such (added) 'namedata' objects, are kept remaining in 'name'??
//console.log(" 3 namedata.length",namedata.length);
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
//console.log(" 4 newdata.length",newdata.length);
          if (newdata.length > 0) {
            Ember.$ (".numMarked").text (' ' + Ember.$ (".markTrue").length);
            if (Ember.$ ("#hideFlag") === "1") {
              Ember.$ (".numHidden").text (' ' + Ember.$ (".img_mini [backgroundColor=Ember.$('#hideColor')]").length);
              // DOES THIS WORK OR MAY IT BE REMOVED??
              Ember.$ (".numShown").text (' ' + Ember.$ (".img_mini [backgroundColor!=Ember.$('#hideColor')]").length);
            } else {
              Ember.$ (".numHidden").text ("0");
              Ember.$ (".numShown").text (Ember.$ (".img_mini").length);
            }
            userLog ('RELOAD');
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

    // Also trigger actions.showShow(showpic, namepic, origpic) on mouse click:
//    document.addEventListener ('click', (evnt) => {triggerClick (evnt);}, false);
    var triggerClick = (evnt) => {
      var that = this;
      var tgt = evnt.target;
      let tgtClass = tgt.classList [0] || "";
      if (-1 < tgtClass.indexOf ("context-menu") || tgtClass === "spinner") {return;}
      if (tgt.id === "wrap_pad") {
        that.actions.hideShow ();
        return;
      }
      if (tgt.tagName !=="IMG") {return;}
      if (Ember.$ (tgt).hasClass ("mark")) {return;}
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
    document.addEventListener ('click', triggerClick, false);

    // Then the keyboard, actions.showNext etc.:
    var that = this;
    //document.removeEventListener ('keydown', triggerKeys, true);
//    document.addEventListener ('keydown', (event) => {triggerKeys (event);}, true);
    function triggerKeys (event) {
      var Z = false; // Debugging switch
      if (event.keyCode === 112) { // F1 key
        that.actions.toggleHelp ();
      } else
      if (event.keyCode === 27) { // ESC key
        Ember.$ (".jstreeAlbumSelect").hide ();
        if (Ember.$ ("div.settings").is (":visible")) { // Hide settings
          Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
          return;
        }
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
      if (event.keyCode === 37 && Ember.$ ('#navKeys').text () === "true" &&
      Ember.$ ("div[aria-describedby='searcharea']").css ('display') === "none" &&
      Ember.$ ("div[aria-describedby='textareas']").css ('display') === "none" &&
      !Ember.$ ("#title input.cred.user").is (":focus") &&
      !Ember.$ ("#title input.cred.password").is (":focus")) { // Left key <
        event.preventDefault(); // Important!
        that.actions.showNext (false);
        if (Z) {console.log ('*g');}
      } else
      if (event.keyCode === 39 && Ember.$ ('#navKeys').text () === "true" &&
      Ember.$ ("div[aria-describedby='searcharea']").css ('display') === "none" &&
      Ember.$ ("div[aria-describedby='textareas']").css ('display') === "none" &&
      !Ember.$ ("#title input.cred.user").is (":focus") &&
      !Ember.$ ("#title input.cred.password").is (":focus")) { // Right key >
        event.preventDefault(); // Important!
        that.actions.showNext (true);
        if (Z) {console.log ('*h');}
      } else
      if (that.savekey !== 17 && event.keyCode === 65 && Ember.$ ("#navAuto").text () !== "true" &&
      Ember.$ ("div[aria-describedby='searcharea']").css ('display') === "none" &&
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
      } else
      if (that.savekey === 17 && event.keyCode === 83) { // Ctrl + S (for saving texts)
        event.preventDefault(); // Important!
        if (Ember.$ ("button.saveNotes").is (":visible")) {
          Ember.$ ("button.saveNotes").click ();
        } else
        if (Ember.$ ("button.saveTexts").is (":visible") && !Ember.$ ("button.saveTexts").attr ("disabled")) {
          Ember.$ ("button.saveTexts").click ();
        }
        that.savekey = event.keyCode;
      } else {
        that.savekey = event.keyCode;
      }
    }
    document.addEventListener ('keydown', triggerKeys, false);
  },
  //----------------------------------------------------------------------------------------------
  runAuto (yes) { // ===== Help function for toggleAuto
    if (Number (Ember.$ (".numShown:first").text ()) < 2) {return;}
    if (yes) {
      ediTextClosed ();
      Ember.$ ("#showSpeed").show ();
      userLog ('START show');
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
      userLog ('STOP show');
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
          tmpName = removeUnderscore (tmpName); // Improve readability
          //console.log("albumName",tmpName);
          document.title = "MISH " + tmpName;
          if (data === "Error!") {
            tmpName += " &mdash; <em style=\"color:red;background:transparent\">just nu oåtkomligt</em>" // i18n
            that.set ("albumName", tmpName);
            that.set ("imdbDir", "");
            Ember.$ ("#imdbDir").text ("");
          } else {
            that.set ("albumText", "&nbsp; Valt album: &nbsp;");
            that.set ("albumName", '<strong class="albumName">' + tmpName + '</strong>');
            Ember.$ (".jstreeAlbumSelect p:first a").attr ("title", " Ta bort | gör nytt album ");
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
          userLog ('INFO received');
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
    //============================================================================================
    setAllow (newSetting) { // ##### Updates settings checkbox menu and check reordering attributes
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

      function code (i, j) {
        if (i) {
          return '<input id="c' + (j + 1) + '" type="checkbox" name="setAllow" checked value=""><label for="c' + (j + 1) + '"></label>';
        } else { // The label tags are to satisfy a CSS:checkbox construct, see app.css
          return '<input id="c' + (j + 1) + '" type="checkbox" name="setAllow" value=""><label for="c' + (j + 1) + '"></label>';
        }
      }
      var allowHtml = [];
      for (var j=0; j<n; j++) {
        allowHtml [j] = "<span>allow." + allowance [j] + " " + (j + 1) + ' </span>' + code (Number (allowvalue [j]), j);
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
        userLog ("ALBUM protected");
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
      var text = "<br><b>" + album + "</b> ska raderas<br>Nej, ingen fara: UNDER UTVECKLING!";

      // NOTE: Här kollas att albumet är tomt men inte om det har underalbum! OBS!
      var codeAlbum = "'var action=this.value;if (this.selectedIndex === 0) {Ember.$ (\"#temporary\").text (\"\");return false;}if (action === \"erase\" && Number (Ember.$ (\".showCount:first .numShown\").text ()) === 0 && Number (Ember.$ (\".showCount:first .numHidden\").text ()) === 0) {" + "Ember.$ (\"#temporary\").text (\"infoDia (null, null,\\\""+ album +"\\\",\\\""+ text +"\\\",\\\"Ok\\\",true)\")" + ";} else {" + "Ember.$ (\"#temporary\").text (\"infoDia (null, null,\\\""+ album +"\\\",\\\"<br>UNDER UTVECKLING\\\",\\\"Ok\\\",true)\")" + ";}'";

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
    // ##### Check file base names against a server directory & modify command(s), NOTE:
    // checkNames uses 1) the server directory in #temporary and 2) the commands in #temporary_1
    checkNames () {
      Ember.run.later ( ( () => {
        var lpath =  Ember.$ ('#temporary').text (); // <- the server dir
        getBaseNames (lpath).then (names => {
          //console.log("checkNames:", names);
          var links = Ember.$ ("#picNames").text ().split ("\n"); // <- the names to be checked
          var cmds = Ember.$ ('#temporary_1').text ().split ("\n"); // <- corresp. shell commands
          //console.log(cmds.join ("\n"));
  console.log(lpath);
  console.log(names);
          for (var i=0; i<links.length; i++) {
            if (names.indexOf (links [i]) > -1) {
  console.log(links[i]);
  console.log(cmds[i]);
              cmds [i] = cmds [i].replace (/^[^ ]+ [^ ]+ /, "#exists already: ");
              userLog ("NOTE exists");
            }
          }
          //console.log(cmds.join ("\n"));
          Ember.$ ('#temporary_1').text (cmds.join ("\n"));
        });
      }), 100);
    },
    //============================================================================================
    //linkNames () { // ##### Make the links, checked and prepared by checkNames ()
    //  serverShell ("temporary_1");
    //},
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
    selectRoot (value) { // ##### Select initial album root dir (imdb) from dropdown

//alert ("selectRoot");
      Ember.$ ("#toggleTree").attr ("title", "Välj album");
      // Close all dialogs/windows
      ediTextClosed ();
      //Ember.$ ("div.settings, div.settings div.root, div.settings div.check").hide ();
      Ember.$ (".img_show").hide ();
      document.getElementById ("imageList").className = "hide-all";
      document.getElementById ("divDropbox").className = "hide-all";
      if (value === "") {
        // Select imdbRoot
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
            userLog ("START " + imdbroot);
            initFlag = false;
            Ember.$ ("#toggleTree").click ();
          }
        }), 222);
      }), 222);
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
    toggleAlbumTree (imdbroot) {

//alert ("toggleAlbumTree");
      if (Ember.$ ("#imdbRoot").text () !== imdbroot) {
        this.actions.imageList (false); // Hide since source will change
        userLog ("START " + imdbroot);
        Ember.$ ("#imdbRoot").text (imdbroot);
        this.set ("imdbRoot", imdbroot);
        this.set ("albumData", []);
        this.set ("albumName", "");
        this.set ("albumText", "");
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
          }), 666);
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
        userLog ("HIDDEN protected");
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
      Ember.$ ("#" + escapeDots (namepic) + " a img").blur ();
      Ember.$ ("#picName").text (namepic);
      resetBorders (); // Reset all borders
      markBorders (namepic); // Mark this one
      Ember.$ ("#wrap_show").removeClass ("symlink");
      if (Ember.$ ("#i" + escapeDots (namepic)).hasClass ("symlink")) {Ember.$ ("#wrap_show").addClass ("symlink");}
      Ember.$ ("#full_size").hide ();
      if (allow.imgOriginal || allow.adminAll) {Ember.$ ("#full_size").show ();}
      Ember.$ (".img_show").hide (); // Hide in case a previous is not already hidden
      Ember.$ ("#link_show a").css ('opacity', 0 );
      Ember.$ (".img_show img:first").attr ('src', showpic);
      Ember.$ (".img_show img:first").attr ('title', origpic);
      Ember.$ (".img_show .img_name").text (namepic); // Should be plain text
      Ember.$ (".img_show .img_txt1").html (Ember.$ ('#i' + escapeDots (namepic) + ' .img_txt1').html ());
      Ember.$ (".img_show .img_txt2").html (Ember.$ ('#i' + escapeDots (namepic) + ' .img_txt2').html ());
      // The mini image 'id' is the 'trimmed file name' prefixed with 'i'
      if (typeof this.set === 'function') { // false if called from showNext
        var savepos = Ember.$ ('#i' + escapeDots (namepic)).offset ();
        if (savepos !== undefined) {
          Ember.$ ('#backPos').text (savepos.top); // Vertical position of the mini-image
        }
        Ember.$ ('#backImg').text (namepic); // The name of the mini-image
      }
      Ember.$ ("#wrap_show").css ('background-color', Ember.$ ('#i' + escapeDots (namepic)).css ('background-color'));
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

      hideShow_g ();
    },
    //============================================================================================
    showNext (forwards) { // ##### SHow the next image if forwards is true, else the previous

      Ember.$ (".shortMessage").hide ();
      if (Number (Ember.$ (".numShown:first").text ()) < 2) {
        Ember.$ ("#link_show a").blur ();
        return;
      }


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
            userLog ('FIRST');
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
            userLog ('LAST');
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
      var savepos = Ember.$ ('#i' + escapeDots (namepic)).offset ();
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

      if (Number (Ember.$ (".numShown:first").text ()) < 2) {return;}

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

      if (!(allow.saveChanges || allow.adminAll) || Ember.$ ("#imdbDir").text () === "") {return;}
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
      // OBSOLETE, REMOVE eventually ...
      Ember.$ ("#link_show a").css ('opacity', 0 ); // why ...?
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
    toggleHelp () { // ##### Toggle-view user manual

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
    findText () { // ##### Dialog window to search image text in the current imdbRoot

      let diaSrch = "div[aria-describedby='searcharea']"
      if (Ember.$ (diaSrch).css ('display') !== "none") {
        Ember.$ ("#searcharea").dialog ("close");
      } else {
        if (Ember.$ ("#imdbRoot").text () === "") {return;}
        Ember.$ (diaSrch).show ();
        Ember.$ ("#searcharea").dialog ("open");
        Ember.$ ("#searcharea div.diaMess div.edWarn").html ("Sökdata...");
        age_imdb_images ();
        let sw = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        let diaSrchLeft = parseInt ((sw - ediTextSelWidth ())/2) + "px";
        Ember.$ (diaSrch).css ("left", diaSrchLeft);
        Ember.$ (diaSrch).css ("max-width", sw+"px");
        Ember.$ (diaSrch).css ("width", "");
        Ember.$ ('textarea[name="searchtext"]').focus ();
        Ember.$ ("button.findText").html ("Sök i <b>" + Ember.$ ("#imdbRoot").text () + "</b>");
        Ember.$ ("button.updText").hide ();
        if (allow.albumEdit || allow.adminAll) {
          Ember.$ ("button.updText").show ();
          Ember.$ ("button.updText").css ("float", "left");
          Ember.$ ("button.updText").html ("Förnya söktexter");
          Ember.$ ("button.updText").attr ("title", "Uppdatera databasen med alla bildtexter")
        }
      }
    },
    //============================================================================================
    ediText (namepic) { // ##### Edit picture texts

      var displ = Ember.$ ("div[aria-describedby='textareas']").css ('display');
      var name0 = Ember.$ ("div[aria-describedby='textareas'] span.ui-dialog-title span").html ();
      if (allow.textEdit || allow.adminAll) {
        Ember.$ ("button.saveTexts").attr ("disabled", false);
      } else {
        Ember.$ ("button.saveTexts").attr ("disabled", true);
      }
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
        // NOTE: An ID string for JQuery has its dots escaped! CSS use!
        Ember.$ ("#backPos").text (Ember.$ ('#i' + escapeDots (namepic)).offset ().top);
        if (Ember.$ ("div[aria-describedby='textareas']").css ('display') !== "none") {
          ediTextClosed ();
          return;
        }
        origpic = Ember.$ (".img_show img").attr ('title'); // With path
      }
      Ember.$ ("#picName").text (namepic);
      displ = Ember.$ ("div[aria-describedby='textareas']").css ('display');

      // OPEN THE TEXT EDIT DIALOG and adjust some more details...
      Ember.$ ("#textareas").dialog ("open");
      Ember.$ ("div[aria-describedby='textareas']").show ();
      Ember.$ ("div[aria-describedby='textareas'] span.ui-dialog-title span").on ("click", () => { // Open if the name is clicked
        var showpic = origpic.replace (/\/[^/]*$/, '') +'/'+ '_show_' + namepic + '.png';
//console.log("showShow 4");
//alert ("showShow 4");
        this.actions.showShow (showpic, namepic, origpic);
      });
      Ember.$ ('textarea[name="description"]').attr ("placeholder", "Skriv här: När var vad vilka (för Xmp.dc.description)");
      Ember.$ ('textarea[name="creator"]').attr ("placeholder", "Skriv här: Foto upphov ursprung källa (för Xmp.dc.creator)");

      refreshEditor (namepic, origpic); // ...and perhaps warnings

      resetBorders ();
      if (displ === "none") {
        // Prepare the extra "non-trivial" dialog buttons
        Ember.$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button:first-child").css ("float", "left");
        Ember.$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button:last-child").css ("float", "right");
        Ember.$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button:first-child").attr ("title", "... som inte visas");
        Ember.$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button:last-child").attr ("title", "Extra sökbegrepp");
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

      Ember.$ ("#link_show a").css ('opacity', 0 );
      if (window.screen.width < 500 || window.screen.height < 500) {return;}
      if (!(allow.imgOriginal || allow.adminAll)) {return;}
      var name = Ember.$ ("#picName").text ();
      // Only selected user classes may view or download protected images
      if ((name.startsWith ("Vbm") || name.startsWith ("CPR")) && ["admin", "editall", "edit"].indexOf (loginStatus) < 0) {
        userLog ("COPYRIGHT©protected");
        return;
      }
      spinnerWait (true);
//console.log("SPINNER show 3");
      return new Ember.RSVP.Promise ( (resolve, reject) => {
        var xhr = new XMLHttpRequest ();
        var origpic = Ember.$ (".img_show img").attr ('title'); // With path
        xhr.open ('GET', 'fullsize/' + origpic); // URL matches routes.js with *?
        xhr.onload = function () {
          if (this.status >= 200 && this.status < 300) {

            // NOTE: djvuName is the name of a PNG file from 2019, see routes.js
            var djvuName = xhr.responseText;
            //var dejavu = window.open (djvuName  + '?djvuopts&amp;zoom=100', 'dejavu', 'width=916,height=600,resizable=yes,location=no,titlebar=no,toolbar=no,menubar=no,scrollbars=yes,status=no'); // Use the PNG file instead (wrongly named):
            var dejavu = window.open (djvuName, 'dejavu', 'width=916,height=600,resizable=yes,location=no,titlebar=no,toolbar=no,menubar=no,scrollbars=yes,status=no');

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

      if (!(allow.imgOriginal || allow.adminAll)) {return;}
      let name = Ember.$ ("#picName").text ();
      // Only selected user classes may view or download protected images
      if ((name.startsWith ("Vbm") || name.startsWith ("CPR")) && ["admin", "editall", "edit"].indexOf (loginStatus) < 0) {
        userLog ("COPYRIGHT©protected");
        return;
      }
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
        var origpic = Ember.$ ('#i' + escapeDots (tmp) + ' img.left-click').attr ('title'); // With path
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
      var ident = "#i" + escapeDots (name) + " div:first";
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

      //Ember.$ ("div[aria-describedby='textareas']").css ("display", "none");
      Ember.$ ("#dialog").dialog ('close');
      Ember.$ ("#searcharea").dialog ('close');
      ediTextClosed ();
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
            loginStatus = status; // global
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
      //document.getElementById ("imageList").className = "hide-all";
      Ember.$ ("#dialog").dialog ('close');
      Ember.$ ("#searcharea").dialog ('close');
      ediTextClosed ();
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
        Ember.$ (".settings input[type=checkbox]+label").css ("cursor", "default");
      }
      if (Ember.$ ("div.settings").is (":visible")) {
        Ember.$ (".jstreeAlbumSelect").hide ();
      }
    },
    //============================================================================================
    testSomething () {
    }
  }
});
// G L O B A L S, that is, 'outside' (global) variables and functions (globals)
/////////////////////////////////////////////////////////////////////////////////////////
let initFlag = true;
let albumWait = false;
let logAdv = "Logga in för att se inställningar, anonymt utan namn eller lösenord, eller med namnet 'gäst' utan lösenord för att också få vissa redigeringsrättigheter"; // i18n
let nosObs = "Skriv gärna på prov, men du saknar tillåtelse att spara text"; // i18n
let nopsGif = "GIF-fil kan bara ha tillfällig text"; // i18n
let nopsLink = "Text kan inte ändras/sparas permanent via länk"; // i18n
let preloadShowImg = [];
let loginStatus = "";
let textsDirty = false;
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Get the age of _imdb_images databases
function age_imdb_images () {
  execute ('echo $(($(date "+%s")-$(date -r imdb/_imdb_images.sqlite "+%s")))').then (s => {
    let d = 0, t = 0, m = 0, text = "&nbsp;";
    if (s*1) {
      d = (s - s%86400);
      s = s - d;
      d = d/86400;
      t = (s - s%3600);
      s = s - t;
      t = t/3600;
      m = (s - s%60);
      s = s - m;
      m = m/60;
      console.log(d, t, m, s);
      text = "&nbsp;Söktextålder: ";
      if (d) {text += d + " d "; s = 0; m = 0;}
      if (t) {text += t + " t "; s = 0;}
      if (m) {text += m + " m ";}
      if (s) {text += s + " s ";}
    }
    Ember.$ ("#searcharea div.diaMess div.edWarn").html (text);
  })
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Load all image paths of the current imdbRoot tree into _imdb_images.sqlite
function load_imdb_images () {
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    // ===== XMLHttpRequest checking 'usr'
    let xhr = new XMLHttpRequest ();
    xhr.open ('GET', 'pathlist/');
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
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Hide the show image element, called by hideShow ()
function hideShow_g () {
  Ember.$ ("ul.context-menu").hide (); // if open
  Ember.$ ("#link_show a").css ('opacity', 0 );
  Ember.$ (".img_show div").blur ();
  if (Ember.$ (".img_show").is (":visible")) {
    var namepic = Ember.$ (".img_show .img_name").text ();
    Ember.$ (".img_show").hide ();
    var sh = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    scrollTo (null, Ember.$ ("#i" + escapeDots (namepic)).offset ().top + Ember.$ ("#i" + escapeDots (namepic)).height ()/2 - sh/2);
    resetBorders (); // Reset all borders
    markBorders (namepic); // Mark this one
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
    Ember.run.later ( ( () => {
      document.getElementById("reLd").disabled = false;
      document.getElementById("saveOrder").disabled = false;
      document.getElementById("toggleTree").disabled = false;
      document.getElementById("showDropbox").disabled = false; // May be disabled at upload!
    }), 100);
    //if (allow.imgUpload || allow.adminAll) {document.getElementById("uploadPics").disabled = false;}
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function deleteFiles (picNames, nels) { // ===== Delete image(s)
  // nels = number of elements in picNames to be deleted
  new Ember.RSVP.Promise (resolve => {
    var keep = [], isSymlink;
    for (var i=0; i<nels; i++) {
      isSymlink = Ember.$ ('#i' + escapeDots (picNames [i])).hasClass ('symlink');
      if (!(allow.deleteImg || isSymlink && allow.delcreLink || allow.adminAll)) {
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
    var origpic = Ember.$ ('#i' + escapeDots (picName) + ' img.left-click').attr ('title'); // With path
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
  // NOTE: if (picName ===
  //                  "name") { show info for that picture }
  //                      "") { run serverShell ("temporary_1") ... }
  //   null && flag === true) { evaluate #temporary, probably for albumEdit }
  if (!dialogId) {dialogId = "dialog";}
  var id = "#" + dialogId;
  if (picName) { //
    resetBorders (); // Reset all borders
    markBorders (picName); // Mark this one
  }
  Ember.$ (id).dialog ( { // Initiate dialog
    title: "", // html set below //#
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
      if (picName === "") { // Special case: link, move, ..., and then refresh
        spinnerWait (true);
        serverShell ("temporary_1");
        Ember.run.later ( ( () => {
          document.getElementById("reLd").disabled = false;
          Ember.$ ("#reLd").click ();
          spinnerWait (false);
        }), 1000);
      }
      Ember.$ (this).dialog ('close');
      if (flag && !picName) { // Special case: evaluate #temporary
        console.log (Ember.$ ("#temporary").text ());
        eval (Ember.$ ("#temporary").text ());
      }
      return true;
    }
  }]);
  niceDialogOpen (dialogId);
  Ember.$ ("div[aria-describedby='" + dialogId + "'] span.ui-dialog-title").html (title); //#
  Ember.$ ("#yesBut").focus ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function notesDia (picName, filePath, title, text, save, close) { // ===== Text dialog
  Ember.$ ("#notes").dialog ('destroy').remove ();
  if (picName) { //
    resetBorders (); // Reset all minipic borders
    markBorders (picName); // Mark this one
  }
  Ember.$ ('<div id="notes"><textarea class="notes" name="notes" placeholder="Anteckningar (för Xmp.dc.source) som inte visas med bilden" rows="8"></textarea></div>').dialog ( { // Initiate dialog
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
          textsDirty = false;
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
  // NOTE, nodes above: JQuery objects
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Close the ediText dialog and return false if it wasn't already closed, else return true
function ediTextClosed () {
  Ember.$ ("div[aria-describedby='textareas'] span.ui-dialog-title span").html ("");
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
    Ember.$ ("#i" + escapeDots (picName)).css ('background-color', '#222');
    Ember.$ ("#wrap_show").css ('background-color', '#222'); // *Just in case the show image is visible     Ember.$ ("#i" + escapeDots (picName)).show ();
    if (hideFlag === "1") { // If it's going to be hidden: arrange its CSS ('local hideFlag')
      Ember.$ ("#i" + escapeDots (picName)).css ('background-color', Ember.$ ("#hideColor").text ());
      Ember.$ ("#wrap_show").css ('background-color', Ember.$ ("#hideColor").text ()); // *Just in case -
      // The 'global hideFlag' determines whether 'hidden' pictures are hidden or not
      if (Ember.$ ("#hideFlag").text () === "1") { // If hiddens ARE hidden, hide this also
        Ember.$ ("#i" + escapeDots (picName)).hide ();
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
    Ember.$ (".numHidden").text ("0");
    Ember.$ (".numShown").text (numTotal);
  }
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function linkFunc (picNames) { // ===== Execute a link-these-files-to... request
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
  var codeLink = "'var lalbum=this.value;var lpath = \"\";if (this.selectedIndex === 0) {return false;}lpath = lalbum.replace (/^[^/]*(.*)/, Ember.$ (\"#imdbLink\").text () + \"$1\");console.log(\"Link to\",lpath);var picNames = Ember.$(\"#picNames\").text ().split (\"\\n\");var cmd=[];for (var i=0; i<picNames.length; i++) {var linkfrom = document.getElementById (\"i\" + picNames [i]).getElementsByTagName(\"img\")[0].getAttribute (\"title\");linkfrom = \"../\".repeat (lpath.split (\"/\").length - 1) + linkfrom.replace (" + rex + ", \"\");var linkto = lpath + \"/\" + picNames [i];linkto += linkfrom.match(/\\.[^.]*$/);cmd.push(\"ln -sf \"+linkfrom+\" \"+linkto);}Ember.$ (\"#temporary\").text (lpath);Ember.$ (\"#temporary_1\").text (cmd.join(\"\\n\"));Ember.$ (\"#checkNames\").click ();'";
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
  infoDia (null, "", title, text, "Ok", modal); // Trigger infoDia run serverShell ("temporary_1")
  Ember.$ ("select.selectOption").focus ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function moveFunc (picNames) { // ===== Execute a link-this-file-to... request
  // picNames should also be saved as string in #picNames
  let albums = Ember.$ ("#imdbDirs").text ().replace (/\n[^\n]*$/, ""); // Remove 'filler' line
  albums =albums.slice (1); // Remove initial '/'
  albums = albums.split ("\n");
  //let coco = Ember.$ ("#imdbCoco").text ().split ("\n");  // coco [i] to be used wherw???
  let curr = Ember.$ ("#imdbDir").text ().match(/\/.*$/); // Remove imdbLink
  if (curr) {curr = curr.toString ();} else {curr = "";}
  let malbum = [];
  let i;
  for (i=0; i<albums.length; i++) { // Remove current album from options
    if (albums [i] !== curr) {malbum.push (albums [i]);}
  }

  let codeMove = "'let malbum = this.value;let mpath = \"\";if (this.selectedIndex === 0) {return false;}mpath = malbum.replace (/^[^/]*(.*)/, Ember.$ (\"#imdbLink\").text () + \"$1\");console.log(\"Move to\",mpath);let picNames = Ember.$(\"#picNames\").text ().split (\"\\n\");let cmd=[];for (let i=0; i<picNames.length; i++) {let movefrom = \" \" + document.getElementById (\"i\" + picNames [i]).getElementsByTagName(\"img\")[0].getAttribute (\"title\");let mini = movefrom.replace (/([^\\/]+)(\\.[^\\/.]+)$/, \"_mini_$1.png\");let show = movefrom.replace (/([^\\/]+)(\\.[^\\/.]+)$/, \"_show_$1.png\");let moveto = \" \" + mpath + \"/\";cmd.push (\"mv -fu\" +movefrom+mini+show+moveto);}Ember.$ (\"#temporary\").text (mpath);Ember.$ (\"#temporary_1\").text (cmd.join(\"\\n\"));Ember.$ (\"#checkNames\").click ();'"
  //console.log(codeMove);

  let r = Ember.$ ("#imdbRoot").text ();
  let codeSelect = '<select class="selectOption" onchange=' + codeMove + '>\n<option value="">Välj ett album:</option>';
  for (i=0; i<malbum.length; i++) {
    let v = r + malbum [i];
    codeSelect += '\n<option value ="' +v+ '">' +v+ '</option>';
  }
  codeSelect += "\n</select>"
  let title = "Flytta till annat album";
  let text = cosp (picNames) +"<br>ska flyttas till<br>" + codeSelect;
  let modal = true;
  infoDia (null, "", title, text, "Ok", modal); // Trigger infoDia run serverShell ("temporary_1")
  Ember.$ ("select.selectOption").focus ();
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function saveOrderFunction (namelist) { // ===== XMLHttpRequest saving the thumbnail order list

  if (!(allow.saveChanges || allow.adminAll) || Ember.$ ("#imdbDir").text () === "") {return;}

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
        userLog ('SAVE');
        resolve (true); // Can we forget 'resolve'?
      } else {
        userLog ('SAVE error');
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
  if (messes.length === 0 || messes [messes.length - 1].trim () !== message.trim ()) {messes.push (message);}
  if (messes.length > 5) {messes.splice (0, messes.length -5);}
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
    //userLog ("START " + imdbroot);
    xhr.open ('GET', 'imdbdirs/' + imdbroot);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        var dirList = xhr.responseText;
//console.log(dirList);
        dirList = dirList.split ("\n");
        var dirCoco = dirList.splice (dirList.length/2 + 1);
//console.log(dirList);
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
        dirCoco = dirCoco.join ("\n");
        Ember.$ ("#imdbCoco").html (dirCoco);
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
  Ember.$ ('#i' + escapeDots (picName) + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
  Ember.$ ('#i' + escapeDots (picName) + ".img_mini img.left-click").addClass ("dotted");
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function escapeDots (txt) { // Escape dots, for CSS names
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
function removeUnderscore (textString) {
  return textString.replace (/_/g,"&nbsp;")
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
    Ember.$ ("#full_size").hide (); // the central full size image link
  }
  if (window.screen.width < 500 || window.screen.height < 500) {
    Ember.$ ("#full_size").hide (); // the central full size image link
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
  // the first element is the root dir without any '/'
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
  return r; // Don't removeUnderscore here!
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
// Prepare dialogs
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
// Prepare the dialog for text search
let prepSearchDialog = () => {
  Ember.$ ( () => {
    function xxx () {
      spinnerWait (true);
      load_imdb_images ().then (result => {
        userLog (result);
        spinnerWait (false);
      });
    }
    if (textsDirty) {xxx ();}
    let sw = ediTextSelWidth () - 25; // Dialog width
    let tw = sw - 25; // Text width
    Ember.$ ('<div id="searcharea" style="margin:0;padding:0;width:'+sw+'px"><div class="diaMess"> <div class="edWarn" style="font-weight:normal;text-align:left" ></div> \
    <div class="srchIn">Sök i:&nbsp; <span class="glue"><input id="t1" type="checkbox" name="search1" value="description" checked/><label for="t1">&nbsp;bildtext</label></span>&nbsp; \
    <span class="glue"><input id="t2" type="checkbox" name="search2" value="creator"/><label for="t2">&nbsp;ursprung</label></span>&nbsp; \
    <span class="glue"><input id="t3" type="checkbox" name="search3" value="source"/><label for="t3">&nbsp;anteckningar</label></span>&nbsp; \
    <span class="glue"><input id="t4" type="checkbox" name="search4" value="name"/><label for="t4">&nbsp;namn</label></span></div> \
    <div class="orAnd">Regel för åtskilda ord eller textbitar:<br><span class="glue"><input id="r1" type="radio" name="searchmode" value="AND" checked/><label for="r1">&nbsp;alla&nbsp;ska&nbsp;hittas</label></span>&nbsp; <span class="glue"><input id="r2" type="radio" name="searchmode" value="OR"/><label for="r2">&nbsp;minst&nbsp;ett&nbsp;av&nbsp;dem&nbsp;ska&nbsp;hittas</label></span></div> <span class="srchMsg"></span></div><textarea name="searchtext" rows="4" style="min-width:'+tw+'px" /></div>').dialog ( {
      title: "Sök i bildtexter (ofärdigt men testa gärna)",
      //closeText: "×", // Replaced (why needed?) below by // Close => ×
      autoOpen: false,
      closeOnEscape: true,
      modal: false
    });
    Ember.$ ("#searcharea").dialog ('option', 'buttons', [
      {
        text: "reload", // findText should update
        title: "",
        //"id": "updBut",
        class: "updText",
        click: function () {
          Ember.$ ("div[aria-describedby='searcharea']").hide ();
          spinnerWait (true);
          load_imdb_images ().then (result => {
            console.log(result);
            Ember.run.later ( ( () => {
              age_imdb_images ();
              spinnerWait (false);
              userLog ("DATABASE reloaded");
              age_imdb_images ();
              Ember.$ ("div[aria-describedby='searcharea']").show ();
              Ember.$ ("button.updText").css ("float", "left");
              Ember.$ ("button.updText").hide ();
            }), 2000);
          });
        }
      },
      {
        text: " Sök ", // findText should update
        //"id": "findBut",
        class: "findText",
        click: function () {
          let sTxt = Ember.$ ('textarea[name="searchtext"]').val ().replace (/[ \n]+/g, " ").trim ()
          if (sTxt.length > 2) {
            Ember.$ ("button.updText").hide ();
            Ember.$ ("button.findText").hide ();
            spinnerWait (true);
            age_imdb_images ();
            searchText (sTxt, Ember.$ ('input[type="radio"]') [0].checked).then (result => {
              let n = 0
              if (result) {
                console.log(result);
                let paths = result.split ("\n");
                n = paths.length
              }
              spinnerWait (false);
              let yes ="Stäng";
              let modal = false;
              infoDia (null, null, "<p style='margin:-0.3em 1.6em 0.2em 0;background:transparent'>" + sTxt + "</p>Funnet i <span style='font-weight:bold'>" + Ember.$ ("#imdbRoot").text () + "</span>:&nbsp; " + n, "<div style='text-align:left;margin:0.3em 0 0 2em'>" + result.replace (/\n/g, "<br>").replace (/imdb\//g, "./") + "</div>", yes, modal);
              //alert (n +"\n"+ result);
              Ember.$ ("button.findText").show ();
              Ember.$ ("button.updText").css ("float", "left");
              //Ember.$ ("div[aria-describedby='searcharea'] .ui-dialog-buttonset").show ();
            });
          }
        }
      },
      {
        text: " Stäng ",
        click: () => {
          Ember.$ ("#searcharea").dialog ('close');
        }
      },
    ]);
    let txt = Ember.$ ("button.ui-dialog-titlebar-close").html (); // Close => ×
    txt.replace (/Close/, "×");                                    // Close => ×
    Ember.$ ("button.ui-dialog-titlebar-close").html (txt);        // Close => ×
  });
} // end prepSearchDialog
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Search image text in the current imdbRoot
function searchText (searchString, and) {
  hideShow_g ();
  ediTextClosed ();
  let ao = "", AO;
  if (and) {AO = " AND "} else {AO = " OR "}
  let arr = searchString;
  if (arr === "") {arr = undefined;}
  console.log ("Att söka:", arr);
  let str = "";
  if (arr) {
    arr = arr.split (" ");
    //console.log(arr);
    for (let i = 0; i<arr.length; i++) {
      arr [i] = "'%" + arr [i] + "%'";
      if (i > 0) {ao = AO + "\n"}
      str += ao + "txtstr LIKE " + arr[i].trim ();
    }
    console.log(str);
    str = str.replace (/\n/g, "");
  }
  //console.log(str); // här ska själva sökningen komma
  let srchData = new FormData();
  srchData.append ("like", str);
  srchData.append ("info", "not used yet");
  return new Ember.RSVP.Promise ( (resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open ('POST', 'search/');
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        let data = xhr.responseText.trim ();
        resolve (data);
      } else {
        reject ({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.send (srchData);
  });
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// https://stackoverflow.com/questions/30605298/jquery-dialog-with-input-textbox etc.
// Prepare the dialog for the image texts editor
var prepTextEditDialog = () => {
Ember.$ ( () => {
  var sw = ediTextSelWidth (); // Selected dialog width
  var tw = sw - 25; // Text width
  Ember.$ ('<div id="textareas" style="margin:0;padding:0;width:'+sw+'px"><div class="diaMess"><span class="edWarn"></span></div><textarea name="description" rows="6" style="min-width:'+tw+'px" /><br><textarea name="creator" rows="1" style="min-width:'+tw+'px" /></div>').dialog ( {
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
        var namepic = Ember.$ ("div[aria-describedby='textareas'] span.ui-dialog-title span").html ();
        var filepath = Ember.$ ("#i" + escapeDots (namepic) + " img").attr ("title");
        execute ("xmpget source " + filepath).then (result => {
          notesDia (namepic, filepath, "Anteckningar", result, "Spara", "Stäng");
        });
      }
    },
    {
      text: " Spara ",
      //"id": "saveBut",
      class: "saveTexts",
      click: function () {
        var namepic = Ember.$ ("div[aria-describedby='textareas'] span.ui-dialog-title span").html ();
        var text1 = Ember.$ ('textarea[name="description"]').val ();
        var text2 = Ember.$ ('textarea[name="creator"]').val ();
        storeText (namepic, text1, text2);
        textsDirty = false;
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
  Ember.$ ("button.ui-dialog-titlebar-close").attr ("onclick",'$("div[aria-describedby=\'textareas\'] span.ui-dialog-title span").html("");$("div[aria-describedby=\'textareas\']").hide();$("#navKeys").text("true");$("#smallButtons").show();$("div.nav_links").show()');

  function storeText (namepic, text1, text2) {
    //text1 = text1.replace (/\n/g, "<br>");
    //text2 = text2.replace (/\n/g, "<br>");
    text1 = text1.replace (/ +/g, " ").replace (/\n /g, "<br>").replace (/\n/g, "<br>").trim ();
    text2 = text2.replace (/ +/g, " ").replace (/\n /g, "<br>").replace (/\n/g, "<br>").trim ();
    // Show what was saved:
    Ember.$ ('textarea[name="description"]').val (text1.replace (/<br>/g, "\n"));
    Ember.$ ('textarea[name="creator"]').val (text2.replace (/<br>/g, "\n"));
    var ednp = escapeDots (namepic);
    var fileName = Ember.$ ("#i" + ednp + " img").attr ('title');
    Ember.$ ("#i" + ednp + " .img_txt1" ).html (text1);
    Ember.$ ("#i" + ednp + " .img_txt1" ).attr ('title', text1.replace(/<[^>]+>/g, ' '));
    Ember.$ ("#i" + ednp + " .img_txt2" ).html (text2);
    Ember.$ ("#i" + ednp + " .img_txt2" ).attr ('title', text2.replace(/<[^>]+>/g, ' '));
    if (Ember.$ (".img_show .img_name").text () === namepic) {
      Ember.$ ("#wrap_show .img_txt1").html (text1);
      Ember.$ ("#wrap_show .img_txt2").html (text2);
    }
    // Cannot save metadata in symlinks or GIFs:
    if (Ember.$ ("#i" + ednp).hasClass ("symlink") || (fileName.search (/\.gif$/i) > 0)) {return;}
    // ===== XMLHttpRequest saving the text
    function saveText (txt) {
      var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
      if (IMDB_DIR.slice (-1) !== "/") {IMDB_DIR = IMDB_DIR + "/";} // Important!
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories

      var xhr = new XMLHttpRequest ();
      xhr.open ('POST', 'savetext/' + IMDB_DIR); // URL matches server-side routes.js
      xhr.onload = function () {
        userLog ("TEXT written");
        //console.log ('Xmp.dc metadata saved in ' + fileName);
      };
      xhr.send (txt);
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
  Ember.$ ("div[aria-describedby='textareas'] span.ui-dialog-title").html ("<span class='pink'>" + namepic + "</span> &nbsp; Bildtexter");
  // Take care of the notes etc. buttons:
  if (!(allow.notesView || allow.adminAll)) {
    Ember.$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button:first-child").css ("display", "none");
    Ember.$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button:last-child").css ("display", "none");
  } else {
    Ember.$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button:first-child").css ("display", "inline");
    Ember.$ ("div[aria-describedby='textareas'] .ui-dialog-buttonset button:last-child").css ("display", "inline");
  }
  Ember.$ ("#textareas .edWarn").html ("");
  if (Ember.$ ("#i" + escapeDots (namepic)).hasClass ("symlink") || origpic.search (/\.gif$/i) > 0) { // Cannot save in symlinks or GIFs
    Ember.$ ("#textareas .edWarn").html (nopsLink); // Nops = no permanent save
    Ember.$ ("#textareas textarea").attr ("placeholder", "");
    // Don't display the notes etc. buttons:
    Ember.$ (".ui-dialog-buttonset button:first-child").css ("display", "none");
    Ember.$ (".ui-dialog-buttonset button:last-child").css ("display", "none");
  }
  if (origpic.search (/\.gif$/i) > 0) { // Correcting warning text for GIFs
    Ember.$ ("#textareas .edWarn").html (nopsGif); // Nops of texts in GIFs
  }
  if (Ember.$ ("button.saveTexts").attr ("disabled")) { // Cannot save if not allowed
    Ember.$ ("#textareas .edWarn").html (nosObs); // Nos = no save
  }
  // Load the texts to be edited after positioning to top
  Ember.$ ('textarea[name="description"]').html ("");
  Ember.$ ('textarea[name="creator"]').html ("");
  Ember.$ ("#textareas").dialog ("open"); // Reopen
  Ember.$ ('textarea[name="description"]').focus ();
  Ember.run.later ( ( () => {
    Ember.$ ('textarea[name="creator"]').val (Ember.$ ('#i' + escapeDots (namepic) + ' .img_txt2').html ().trim ().replace (/<br>/g, "\n"));
    Ember.$ ('textarea[name="description"]').val (Ember.$ ('#i' + escapeDots (namepic) + ' .img_txt1').html ().trim ().replace (/<br>/g, "\n"));
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
  "saveChanges",  // +  " save order/changes (= saveOrder)
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
  /*if (allow.textEdit || allow.adminAll) {
    Ember.$ (".img_txt1").css ("cursor", "pointer");
    Ember.$ (".img_txt2").css ("cursor", "pointer");
  } else {
    Ember.$ (".img_txt1").css ("cursor", "");
    Ember.$ (".img_txt2").css ("cursor", "");
  }*/
  // Hide smallbuttons we don't need:
  if (allow.adminAll || allow.saveChanges) { // For anonymous user who may reorder
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
history.pushState (null, null, location.href);
window.onpopstate = function () {
    history.go(1);
}
