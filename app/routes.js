// app/routes.js
module.exports = function (app) {
  //var express = require ('express') // behövs nog inte
  var path = require ('path')
  var Promise = require ('bluebird')
  var fs = Promise.promisifyAll (require ('fs'))
  var multer = require ('multer')
  var upload = multer ( {dest: '/tmp'}) // tmp upload
  var exec = require ('child_process').exec
  var execSync = require ('child_process').execSync
  var Utimes = require('@ronomon/utimes')
  var bodyParser = require ('body-parser')
  app.use (bodyParser.urlencoded ( {extended: false}))
  app.use (bodyParser.json())
  var sqlite = require('sqlite3').verbose ()
  var setdb = new sqlite.Database('_imdb_settings.sqlite')
  //var db = new sqlite.Database('imdb/_imdb_images.sqlite')

  //var jsdom = require('jsdom')
  //var dialog = require('nw-dialog')
  // Did never get jsdom or dialog to function

  // ----- C O M M O N S
  // ----- Upload counter
  var n_upl = 0
  // ----- Present directory
  let PWD_PATH = path.resolve ('.')
  // ----- Image data(base) root directory
  let IMDB_ROOT = null // Must be set in route
  // ----- Image data(base) directory
  let IMDB_DIR = null // Must be set in route
  // ----- For debug data(base) directories
  let show_imagedir = false

  // ##### R O U T I N G  E N T R I E S
  // Remember to check 'Express route tester'!
  // ##### #0. General passing point
  app.all ('*', function (req, res, next) {
    if (show_imagedir) {
      console.log (" IMDB_DIR:", IMDB_DIR)
    }
    //console.log (process.memoryUsage ())
    next () // pass control to the next matching handler
  })

  // ##### #0.1 Get file information
  app.get ('/filestat/:path', async function (req, res) {

    var LT = "se-SV" // Language tag for dateTime, environmrnt locales are different!
    var missing = "uppgift saknas"
    var file = req.params.path.replace (/@/g, "/").trim ()
    var stat = fs.statSync (file)
    var lstat = fs.lstatSync (file)
    var linkto = ""
    function isSymlink (file) {
      return new Promise (function (resolve, reject) {
        fs.lstat (file, function (err, stats) {
          resolve (stats.isSymbolicLink ())
        })
      })
    }
    var syml = await isSymlink (file)
    if (syml) {
      linkto = execSync ("readlink " + file).toString ().trim ()
    }
    var fileStat = "<i>Filnamn</i>: " + file + "<br><br>"
    if (linkto) {
      fileStat += "<span style='color:#0b5'><i style='color:#0b5'>Länk till</i>: " + linkto + "</span><br><br>"
    }
    fileStat += "<i>Storlek</i>: " + stat.size/1000000 + " Mb<br>"
    var tmp = execSync ("exif_dimension " + file).toString ().trim ()
    if (tmp === "missing") {tmp = missing}
    fileStat += "<i>Dimension</i>: " + tmp + "<br><br>"
    tmp = (new Date (execSync ("exif_dateorig " + file))).toLocaleString (LT, {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
    if (tmp.indexOf ("Invalid") > -1) {tmp = missing}
    fileStat += "<i>Fototid</i>: " + tmp + "<br>"
    fileStat += "<i>Ändrad</i>: " + stat.mtime.toLocaleString (LT, {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'}) + "<br>"
    res.send (fileStat)
  })

  // ##### #0.2 Get imdb directory list
  app.get ('/imdbdirs/:imdbroot', function (req, res) {

    var homeDir = imdbHome () // From env.var. $IMDB_HOME or $HOME
    console.log ("\nIMDB_HOME:", homeDir)

    IMDB_ROOT = req.params.imdbroot.replace (/@/g, "/").trim ()
    if (!IMDB_ROOT || IMDB_ROOT === "") {IMDB_ROOT = execSync ("echo $IMDB_ROOT").toString ().trim ()}
    if (IMDB_ROOT === "undefined") {IMDB_ROOT = "/";}
    console.log ("IMDB_ROOT:", IMDB_ROOT)

    // Establish the symlink to the chosen album root directory
    var imdbLink = "imdb" // Symlink pointing to current albums
    execSync ("ln -sfn " + homeDir + "/" + IMDB_ROOT + " " + imdbLink)
    var rootDir = execSync ("readlink " + imdbLink).toString ().trim ()
    console.log ("Path in '" + imdbLink + "': " + rootDir)

    findDirectories (imdbLink).then (dirlist => {
      //console.log ("\n\na\n", dirlist)
      areAlbums (dirlist).then (dirlist => {
        dirlist = dirlist.sort ()
        // imdbLink is the www-imdb root, add here:
        dirlist.splice (0, 0, imdbLink + "/")
        dirlist = dirlist.join ("\n").trim ()
        console.log("Directories:\n" + dirlist)
        // NOTE: rootDir = homeDir + "/" + IMDB_ROOT, but here "@" separates them (important!):
        dirlist = homeDir +"@"+ IMDB_ROOT  + "\n" + dirlist + "\nNodeJS " + process.version.trim ()
        //console.log ("C\n", dirlist)
        res.location ('/')
        res.send (dirlist)
        console.log ('Directory information sent from server')
      })
    }).catch (function (error) {
      res.location ('/')
      res.send (error + ' ')
    })
  })

  // ##### #0.3 readSubdir to select rootdir...
  app.get ('/rootdir', function (req, res) {

    var homeDir = imdbHome ()
    readSubdir (homeDir).then (dirlist => {
      console.log("DIRLIST", dirlist)
      dirlist = dirlist.join ('\n')
      var tmp = execSync ("echo $IMDB_ROOT").toString ().trim ()
      if (dirlist.indexOf (tmp) < 0) {tmp = ""}
      dirlist = tmp + '\n' + dirlist
      console.log (dirlist)
      res.location ('/')
      res.send (dirlist)
    }).catch (function (error) {
      res.location ('/')
      res.send (error + ' ')
    })
  })

  // ##### #0.4 Read file basenames
  app.get ('/basenames/:imagedir', (req, res) => {
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/")
    findFiles (IMDB_DIR).then ( (files) => {
      var namelist = ""
      for (var i=0; i<files.length; i++) {
        var file = files [i]
        file = file.slice (IMDB_DIR.length)
        if (acceptedFileName (file)) {
          file = file.replace (/\.[^.]*$/, "") // Remove ftype
          namelist = namelist +'\n'+ file
        }
      }
      namelist = namelist.trim ()
      //console.log(namelist)
      res.location ('/')
      res.send (namelist)
    }).catch (function (error) {
      res.location ('/')
      res.send (error + ' ')
    })
  })
  // ##### #0.5 Execute a shell command
  app.get ('/execute/:command', (req, res) => {
    //console.log(req.params.command);
    //console.log(decodeURIComponent (req.params.command));
    var cmd = decodeURIComponent (req.params.command).replace (/@/g, "/")
    //console.log (cmd)
    try {
      // NOTE: execSync seems to use ``-ticks, not $()
      // Hence "`" don't pass if you don't escape them
      cmd = cmd.replace (/`/g, "\\`")
      var resdata = execSync (cmd)
      console.log ("`" + cmd.trim ().replace (/ .*/, " ...") + "`")
      res.location ('/')
      res.send (resdata)
    } catch (err) {
      console.log ("`" + cmd + "`")
      res.location ('/')
      res.send (err)
    }
  })
  // ##### #0.6 Return user credentials
  app.get ('/login/:user', (req, res) => {
    var name = req.params.user
    var password = ""
    var status = "viewer"
    var allow = "?"
    try {
      setdb.serialize ( () => {
        //###  Uncomment the following to get a full user credentials log listout  ###//
        /*setdb.all ("SELECT name, pass, user.status, class.allow FROM user LEFT JOIN class ON user.status = class.status ORDER BY name;", (error,rows) => {
          if (!rows) {rows = []}
          console.log("----------------")
          for (var i=0; i<rows.length; i++) {
            console.log(rows [i].name, rows [i].pass, rows [i].status, rows [i].allow)
          }
          console.log("----------------")
        })*/
        setdb.get ("SELECT pass, status FROM user WHERE name = $name", {
          $name: name
        }, (error, row) => {
          if (error) {throw error}
          if (row) {
            password = row.pass
            status = row.status
          }
          // Must be nested, cannot be serialized (keeps 'status'):
          setdb.get ("SELECT allow FROM class WHERE status = $status", {
            $status: status
          }, (error, row) => {
            if (error) {throw error}
            if (row) {
              allow = row.allow
            }
            //console.log(name, "("+ password +")", status, "("+ allow +")")
            console.log ("Login " + name + " (" + status + ")")
            res.location ('/')
            res.send (password +"\n"+ status +"\n"+ allow)
          })
        })
      })
    } catch (err) {
      res.location ('/')
      res.send (err)
    }
  })

  // ##### #0.7 Load data into _imdb_images.sqlite
  app.get ('/pathlist', (req, res) => {
    var pathlist = execSync ('find imdb/ -type f -not -name "_*" -not -name ".*"')
    //console.log("\n" + pathlist);
    execSync ('rm -f imdb/_imdb_images.sqlite')
    try {
      var db = new sqlite.Database ('imdb/_imdb_images.sqlite', function (err) {
        if (err) {
          console.error(err.message)
          res.send (err.message)
        }
      })
      db.run ('CREATE TABLE imginfo (id INTEGER PRIMARY KEY, filepath TEXT UNIQUE, name TEXT, description TEXT, creator TEXT, source TEXT, subject TEXT, tcreated TEXT, tchanged TEXT)', function (err) {
        if (err) {
          console.error(err.message)
          res.send (err.message)
        }
      })
      /*db.run ('INSERT INTO imginfo (name, description) VALUES ("dummy", "dummy")', function (err) {
        if (err) {
          console.error(err.message)
          res.send (err.message)
        }
      })
      db.run ('DELETE FROM imginfo', function (err) {
        if (err) {
          console.error(err.message)
          res.send (err.message)
        }
      })*/
      pathlist = pathlist.toString ().trim ().split ("\n")
      console.log(pathlist); //////
      db.serialize ( () => {
        for (var i=0; i<pathlist.length; i++) {
          var tmp = pathlist [i].split ("/")
          var param = []
          var xmpkey = ['description', 'creator', 'source']
          for (var j=0; j<xmpkey.length; j++) {
            param [j] = execSync ('xmpget ' + xmpkey [j] + ' ' + pathlist [i])
          }
          db.run ('INSERT INTO imginfo (filepath,name,description,creator,source,subject,tcreated,tchanged) VALUES ($filepath,$name,$description,$creator,$source,$subject,$tcreated,$tchanged)', {
            $filepath:  pathlist [i],
            $name:      tmp [tmp.length -1].replace (/\.[^.]+$/, ""),
            $description: param [0],
            $creator:   param [1],
            $source:    param [2],
            $subject:   '',
            $tcreated:  '',
            $tchanged:  ''
          }, function (err, row) {
            if (err) {console.error(err.message)}
            if (row) {console.log (row)}
          })
        }
        db.close ()
        res.location ('/')
        res.send (' db loaded')
      })
    } catch (err) {
      res.location ('/')
      res.send (err)
    }
  })

  // ##### #1. Image list section using 'findFiles' with readdirAsync, Bluebird support
  //           Called from menu-buttons.js component
  app.get ('/imagelist/:imagedir', function (req, res) {
    // NOTE: Reset allfiles here, since it isn't refreshed by an empty album!
    allfiles = undefined
    // Note: A terminal '/' had been lost here, but not a terminal '@'! Thus, no need to add a '/':
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/")
    if (show_imagedir) {
      console.log ("imagelist", req.params.imagedir, "=>", IMDB_DIR)
    }
    findFiles (IMDB_DIR).then (function (files) {
      var origlist = ''
      //files.forEach (function (file) { not recommended
      for (var i=0; i<files.length; i++) {
        var file = files [i]
        file = file.slice (IMDB_DIR.length)
        if (acceptedFileName (file)) {
          //console.log (file, ftype)
          file = IMDB_DIR + file
          origlist = origlist +'\n'+ file
        }
      }
      origlist = origlist.trim ()
      ////////////////////////////////////////////////////////
      // Get, check and package quadruple file names:
      //    [ 3 x relative-path, and simple-name ]   of
      //    [ origfile, showfile, minifile, nameonly ]
      // where the corresponding images will be sized (e.g.)
      //    [ full, 640x640, 150x150, -- ]   with file type
      //    [ image/*, png, png, -- ]   *(see application.hbs)
      // Four text lines represents an image's names
      ////////////////////////////////////////////////////////
      // Next to them, two '\n-free' metadata lines follow:
      // 5 Xmp.dc.description
      // 6 Xmp.dc.creator
      // 7 Last is '' or 'symlink'
      ////////////////////////////////////////////////////////
      // pkgfilenames prints initial console.log message
      //var pkgfilenamesWrap
      async function pkgfilenamesWrap () {
        await pkgfilenames (origlist).then ( () => {
          if (!allfiles) {allfiles = ''}
          res.location ('/')
          res.send (allfiles)
          console.log ('...file information sent from server') // Remaining message
        }).catch (function (error) {
          res.location ('/')
          res.send (error + ' ')
        })
      }
      pkgfilenamesWrap ()
    })
  })

  // ##### #2. Get sorted file name list after removing broken symlinks
  //           Called from the menu-buttons component
  app.get ('/sortlist/:imagedir', function (req, res) {
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/")
    // Remove broken symlinks: NOTE NOTE NOTE
    /*execSync ('for x in ' + IMDB_DIR + '* ' + IMDB_DIR + '.[!.]* ' + IMDB_DIR + '..?*; do if [ -L "$x" ] && ! [ -e "$x" ]; then rm -- "$x"; fi; done')*/
    if (show_imagedir) {
      console.log ("sortlist", req.params.imagedir, "=>", IMDB_DIR)
    }
    var imdbtxtpath = IMDB_DIR + '_imdb_order.txt'
    try {
      execSync ('touch ' + imdbtxtpath) // In case not yet created
    } catch (err) {
      res.location ('/')
      //res.send (err)
      res.send ("Error!") // Keyword!
      console.log (IMDB_DIR + ' not found')
    }
    fs.readFileAsync (imdbtxtpath)
    .then (names => {
      //console.log (names) // <buffer>
      res.location ('/')
      res.send (names) // Sent buffer arrives as text
      //console.log ('\n'+names.toString ()+'\n')
    }).then (console.log ('File order sent from server'))
  })

  // ##### #3. Get full-size djvu file
  app.get ('/fullsize/*?', function (req, res) {
    var fileName = req.params[0] // with path
    //console.log (fileName)
    // Make a temporary .djvu file with the mkdjvu script
    var tmpName = execSync ('mkdjvu ' + fileName)
    res.location ('/')
    res.send (tmpName)
    console.log ('Fullsize image generated')
  })

  // ##### #4. Download full-size original image file: Get the host name in responseURL
  app.get ('/download/*?', function (req, res) {
    var fileName = req.params[0] // with path
    console.log ('Download of ' + fileName + " initiated")
    res.location ('/')
    res.send (fileName)
  })

  // ##### #5. Delete an original file, or a symlink, and its mini and show files
  app.get ('/delete/*?', function (req, res) {
    var fileName = req.params[0] // with path
    var pngname = path.parse (fileName).name + '.png'
    var tmp = path.parse (fileName).dir + '/'
    if (tmp === IMDB_DIR) {
      var IMDB_PATH = PWD_PATH + '/' + IMDB_DIR
      fs.unlinkAsync (PWD_PATH + '/' + fileName) // File not found isn't caught!
      .then (fs.unlinkAsync (IMDB_PATH +'_mini_'+ pngname)) // File not found isn't caught!
      .then (fs.unlinkAsync (IMDB_PATH +'_show_'+ pngname)) // File not found isn't caught!
      .catch (function (error) {
        if (error.code === "ENOENT") {
          console.log ('FILE NOT FOUND: ' + IMDB_PATH + '_xxx_' + pngname)
        } else {
          console.log ('\033[31m' + ' NO PERMISSION to' + IMDB_PATH + fileName + '\033[0m')
        }
      })
      //tmp = 'DELETED ' + fileName
      tmp = 'DELETED ' + fileName //+ ', path === IMDB_DIR (' + tmp + ' === ' + IMDB_DIR + ')'
    } else {
      tmp = '\033[31m' + 'UNTOUCHED ' + fileName + ', ERROR:  path !== IMDB_DIR (' + tmp + ' !== ' + IMDB_DIR + ')\033[0m'
    }
    console.log (tmp)
    res.location ('/')
    res.send (tmp)
  })

  // ##### #6. S T A R T  P A G E
  app.get ('/', function (req, res) {
    res.sendFile ('index.html', {root: PWD_PATH + '/public/'}) // load our index.html file
    // path must be "absolute or specify root to res.sendFile"
  })

  // ##### #7. Image upload, using Multer multifile and Bluebird promise upload
  // Called from the drop-zone component, NOTE: The name 'file' is mandatory!
  app.post ('/upload', upload.array ('file'), function (req, res, next) {
    console.log ("IMDB_DIR =", IMDB_DIR)
    if (!IMDB_DIR) { // If not already set: refrain
      console.log ("Image directory missing, cannot upload")
      return
    }
    async function uploadWrap () {
      // ----- Image data base absolute path
      var IMDB_PATH = PWD_PATH + '/' + IMDB_DIR
      var fileNames = ""
      await Promise.map (req.files, function (file) {
        //console.log (JSON.stringify (file)) // the file object
        //console.log (file.originalname)
        console.log (file.path);
        file.originalname = file.originalname.replace (/ /g, "_") // Spaces prohibited
        //console.log (file.originalname)
        fs.readFileAsync (file.path)
        .then (contents => fs.writeFileAsync (IMDB_PATH + file.originalname, contents, 'binary'))
        .then (console.log (++n_upl +' TMP: '+ file.path + ' written to' +'\nUPLOADED: '+ IMDB_DIR + file.originalname),
        fileNames = fileNames + file.originalname)
        // Delete showfile and minifile if the main file is refreshed
        .then(pngname = path.parse (file.originalname).name + '.png')
        .then (fs.unlinkAsync (IMDB_PATH +'_mini_'+ pngname)) // File not found isn't caught, see Express unhandledRejection!
        .then (fs.unlinkAsync (IMDB_PATH +'_show_'+ pngname)) // File not found isn't caught, see Express unhandledRejection!
        .then (res.send (file.originalname))
        //.then (console.log (' originalname: ' + file.originalname), res.send (file.originalname))
        .catch (function (error) {
          if (error.code === "ENOENT") {
            console.log ('FILE NOT FOUND: ' + IMDB_PATH + '_xxx_' + pngname)
          } else {
            // how to break the uploading???
            // res.status (500).end () // no effect, only console log shows up, if availible:
            console.log ('\033[31m' + n_upl +': '+ file.path + ' NO WRITE PERMISSION to' + '\n' + IMDB_PATH + file.originalname + '\033[0m')
          }
        })
      })
    }
    uploadWrap ()
  })

  // ##### #8. Save the _imdb_order.txt file
  //           Called from the menu-buttons component's action.refresh
  app.post ('/saveorder/:imagedir', function (req, res, next) {
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/")
    if (show_imagedir) {
      console.log ("saveorder", req.params.imagedir, "=>", IMDB_DIR)
    }
    var file = IMDB_DIR + "_imdb_order.txt"
    //console.log (file)
    execSync ('touch ' + file) // In case not yet created
    var body = []
    setTimeout(function () {}, 200)
    req.on ('data', (chunk) => {
      //console.log(chunk)
      body.push (chunk) // body will be a Buffer array: <buffer 39 35 33 2c 30 ... >, <buf... etc.
    }).on ('end', () => {
      body = Buffer.concat (body).toString () // Concatenate; then change the Buffer into String
      // At this point, do whatever with the request body (now a string)
      //console.log("Request body =\n",body)
      fs.writeFileAsync (file, body).then (function () {
        console.log ("Saved file order ")
        //console.log ('\n'+body+'\n')
      })
      res.on('error', (err) => {
        console.error(err)
      })
      //res.connection.destroy()
      setTimeout(function () {
        res.sendFile ('index.html', {root: PWD_PATH + '/public/'}) // stay at the index.html file
      }, 200)
    })
  })

  // ##### #9. Save Xmp.dc.description and Xmp.dc.creator using exiv2
  app.post ('/savetext/:imagedir', function (req, res, next) {
    //console.log("Accessing 'app.post, savetext'")
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/")
    // The above is superfluous and has, so far, no use here, since please note:
    // The imagedir directoty path is already included in the file name here @***
    if (show_imagedir) {
      console.log ("savetext", req.params.imagedir, "=>", IMDB_DIR)
    }
    var body = []
    req.on ('data', (chunk) => {
      body.push (chunk)
    }).on ('end', () => {
      body = Buffer.concat (body).toString ()
      // Here `body` has the entire request body stored in it as a string
      var tmp = body.split ('\n')
      var fileName = tmp [0].trim () // @*** the path is included here @***
      console.log ('Xmp.dc metadata will be saved into ' + fileName)
      body = tmp [1].trim () // These trimmings are probably superfluous
      // The set_xmp_... command strings will be single quoted, avoiding
      // most Bash shell interpretation. Thus slice out 's within 's (cannot
      // be escaped just simply); makes Bash happy :) ('s = single quotes)
      body = body.replace (/'/g, "'\\''")
      //console7.log (fileName + " '" + body + "'")
      var mtime = fs.statSync (fileName).mtime // Object
      //console.log (typeof mtime, mtime)
      execSync ('set_xmp_description ' + fileName + " '" + body + "'") // for txt1
      body = tmp [2].trim () // These trimmings are probably superfluous
      body = body.replace (/'/g, "'\\''")
      //console.log (fileName + " '" + body + "'")
      execSync ('set_xmp_creator ' + fileName + " '" + body + "'") // for txt2
      var u = undefined // Restore ONLY mtime:
      Utimes.utimes (fileName, u, Number (mtime), u, function (error) {if (error) {throw error}})
    })
    res.sendFile ('index.html', {root: PWD_PATH + '/public/'}) // stay at the index.html file
  })

  // ===== U N H A N D L E D  R E J E C T I O N S
  process.on('unhandledRejection', (event) => {
    if (event.toString ().indexOf ('no such file') > 0) {
      return
    }
    console.log ('unhandledRejection, ' + event)
    return
  })

  var allfiles

  // ===== C O M M O N  F U N C T I O N S

  // ===== Check if an album/directory name can be accepted
  function acceptedDirName (name) {
    let acceptedName = 0 === name.replace (/[/\-@_.a-öA-Ö0-9]+/g, "").length
    return acceptedName && name.slice (0,1) !== "." && !name.includes ('/.')
  }

  // ===== Check if a imsge/file name can be accepted
  // Also, cf. 'acceptedFiles' in menu-buttons.hbs (for Dropbox/drop-zone)
  function acceptedFileName (name) {
    // This function must equal the acceptedFileName function in drop-zone.js
    var acceptedName = 0 === name.replace (/[-_.a-zA-Z0-9]+/g, "").length
    // Allowed file types are also set at drop-zone in the template menu-buttons.hbs
    var ftype = name.match (/\.(jpe?g|tif{1,2}|png|gif)$/i)
    var imtype = name.slice (0, 6) // System file prefix
    // Here more files may be filtered out depending on o/s needs etc.:
    return acceptedName && ftype && imtype !== '_mini_' && imtype !== '_show_' && imtype !== '_imdb_' && name.slice (0,1) !== "."
  }

  // ===== Read a directory's file content
  function findFiles (dirName) {
    return fs.readdirAsync (dirName).map (function (fileName) {
      var filepath = path.join (dirName, fileName)
      return fs.statAsync (filepath).then (function (stat) {
        if (stat.mode & 0100000) { // See 'man 2 stat': S_IFREG bitmask for 'Regular file'
          return filepath
        } else { // Non-files are returned 'fake dotted' in order to be ignored
          if (show_imagedir) {
            console.log (filepath, JSON.stringify (stat))
          }
          return path.join (path.dirname (filepath), ".ignore") // fake dotted
        }
      })
    }).reduce (function (a, b) {
      return a.concat (b)
    }, [])
  }

  // ===== Read the dir's content of sub-dirs recursively
  // findDirectories('dir/to/search/in').then (...
  //   Arg 'files' is used to propagate data of recursive calls to the initial call
  //   If you really want to, you can use arg 'files' to manually add some files to the result
  // Note: Order of results is not guaranteed due to the function's parallel nature
  findDirectories = async (dir, files = []) => {
    let items = await fs.readdirAsync (dir) // items are file || dir names
    //console.log('=====', items)
    return Promise.map (items, async (item) => {
      //item = path.resolve (dir, item) // Absolute path
      item = path.join (dir, item) // Relative path
      //console.log('~~~~~', item)
      let stat = await fs.statAsync (item)
      if (stat.isFile ()) {
        // item is file
        // do nothing
      } else if (stat.isDirectory ()) {
        // item is dir
        if (acceptedDirName (item)) {
          files.push (item)
          return findDirectories (item, files)
        }
      }
    })
    .then ( () => {
      // every task is completed, provide results
      return files
    })
    .catch ( (err) => {
      return err
    })
  }

  // ===== Remove from a directory path array each entry not pointing
  // to an album, which has to contain a file named '.imdb', and return
  // the remaining album directory list. NOTE: Both 'return's * are required!
  areAlbums = async (dirlist) => {
    //console.log('DDDDD',dirlist)
    let albums = []
    return Promise.map (dirlist, async (album) => { // *
      //console.log('AAAAA',album)
      try {
        fd = await fs.openAsync (album + '/.imdb', 'r')
        //console.log ('€fdfd',album,fd)
        await fs.closeAsync (fd)
        albums.push (album)
      } catch (err) {
        //console.log("€RRÅR", err.toString ())
      }
    }).then ( () => {
      //console.log('€€€€€',albums);
      return albums // *
    })
  }






/*
  // ===== Read the dir's content of sub-dirs recursively
  //  findDirectories('dir/to/search/in').then (...
  //    Arg 'files' is used to propagate data of recursive calls to the initial call
  //    If you really want to, you can use arg 'files' to manually add some files to the result
  // Note: Order of results is not guaranteed due to parallel nature of functions
  findDirectories = async (dir, files = []) => {
    let items = await fs.readdirAsync (dir) // items are file|dir names
    //console.log('=====', items)
    await Promise.map (items, async (item) => {
      item = path.join (dir, item) // Relative path
//console.log('~~~~~', item)
      let stat = await fs.statAsync (item)
      if (stat.isFile ()) {
        // item is file
        // do nothing
      } else if (stat.isDirectory ()) {
        // item is dir
        if (acceptedDirName (item)) {
console.log('¨¨¨¨¨', item)
          let flagFile = path.join (item, '.imdb')
          /*let fd = await fs.openAsync (flagFile, 'r')
          if (fd > -1) {
          await fs.closeAsync (fd); * /
          fs.open (flagFile, 'r', async (err, fd) => {
            if (err) {
              // no flagFile
              // not album do nothing
            } else {
console.log('-----', item, 'ok', fd)
              await fs.closeAsync (fd);
              files.push (item)
              return findDirectories (item, files)
            }
          })
        }
      }
    })
    .then ( () => {
      // every task is completed, provide results
      return files
    })
    .catch (function (error) {
      throw error
    //.catch ( () => {
      //return files
    })
  }*/

    /*return fs.readdirAsync (dir)
    .then ( (items) => { // items = files|dirs
      return Promise.map (items, (item) => {
        //item = path.resolve (dir, item) // Absolute path
        item = path.join (dir, item) // Relative path
        console.log (item)
        return fs.statAsync (item)
        .then ( (stat) => {
          if (stat.isFile ()) {
            // item is file
            //files.push (item)
          } else if (stat.isDirectory ()) {
            // item is dir
            //console.log (item)
            files.push (item)
            return findDirectories (item, files)
          }
        })
        .catch ( () => {
          return files
        })
      })*/

  // ===== Read the dir's content of sub-dirs (not recursively)
  readSubdir = async (dir, files = []) => {
    let items = await fs.readdirAsync (dir) // items are file || dir names
    //console.log('**********', items)//ok
    return Promise.map (items, async (name) => {
      if (acceptedDirName (name)) {
        //console.log('**********', name, 'ok')
        //let item = path.resolve (dir, name) // Absolute path
        let item = path.join (dir, name) // Relative path
        let stat = await fs.statAsync (item)
        if (stat.isDirectory ()) {
          let flagFile = path.join (item, '.imdb')
          let fd = await fs.openAsync (flagFile, 'r')
          if (fd > -1) {
            //console.log('**********', flagFile, fd)
            await fs.closeAsync (fd)
            files.push (name)
            //console.log('**********', files)
          }
        }
      }
    })
    .then (files, () => {
      return files
    })
    .catch ( () => {
      return files
    })
  }

  // ===== Create minifile or showfile (note: size!), if non-existing
  // origpath = the file to be resized, filepath = the resized file
  async function resizefileAsync (origpath, filepath, size) {
    // Check if the file exists, then continue, but note (!): This openAsync will
    // fail if filepath is absolute. Needs web-rel-path to work ...
    fs.openAsync (filepath, 'r').then ( () => {
      if (Number (fs.statSync (filepath).mtime) < Number (fs.statSync (origpath).mtime)) {
        rzFile (origpath, filepath, size) // cannot await here, why?
      }
    })
    .catch (function (error) {
      // Else if it doesn't exist, make the resized file:
      if (error.code === "ENOENT") {
        rzFile (origpath, filepath, size) // cannot await here, why?
      } else {
        throw error
      }
    })
  }

  // ===== Use of ImageMagick: It is no longer true that
  // '-thumbnail' stands for '-resize -strip', perhaps darkens pictures ...
  // Note: All files except GIFs are resized into JPGs and thereafter
  // 'fake typed' PNG (resize into PNG is too difficult with ImageMagick).
  // GIFs are resized into GIFs to preserve their special properties.
  // The formal file type PNG will still be kept for all resized files.
  async function rzFile (origpath, filepath, size) {
    var filepath1 = filepath // Is PNG as originally intended
    if (origpath.search (/gif$/i) > 0) {
      filepath1 = filepath.replace (/png$/i, 'gif')
    } else {
      filepath1 = filepath.replace (/png$/i, 'jpg')
    }
    var imckcmd
    imckcmd = "convert " + origpath + " -antialias -quality 80 -resize " + size + " -strip " + filepath1
    //console.log (imckcmd)
    exec (imckcmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`)
        return
      }
      if (filepath1 !== filepath) { // Rename to 'fake PNG'
        try {
          execSync ("mv " + filepath1 + " " + filepath)
        } catch (err) {
          console.log(err.stderr.toString ())
        }
      }
      console.log (' ' + filepath + ' created')
    })
    return
  }

  // ===== Get the image databases' root directory
  // The server environment should have $IMDB_HOME, else use $HOME
  function imdbHome () {
    var homeDir = execSync ("echo $IMDB_HOME").toString ().trim ()
    if (!homeDir || homeDir === "") {
      homeDir = execSync ("echo $HOME").toString ().trim ()
    }
    return homeDir
  }

  // ===== Make a package of orig, show, mini, and plain filenames, metadata, and symlink flag
  // Three async functions here:
  async function pkgfilenames (origlist) {
    if (origlist) {
      let files = origlist.split ('\n')
      allfiles = ''
      for (let file of files) {
        let pkg = await pkgonefile (file)
        allfiles += '\n' + pkg
      }
      console.log ('Showfiles•minifiles•metadata...')
      return allfiles.trim ()
    } else {
      return ''
    }
  }

  let cmdasync = async (cmd) => {return execSync (cmd)}

  function setSymlink (file) {
    return new Promise (function (resolve, reject) {
      fs.lstat (file, function (err, stats) {
        if (stats.isSymbolicLink ()) {
          resolve ('symlink')
        } else {
          resolve ('false')
        }
      })
    })
  }

  async function pkgonefile (file) {

    let origfile = file
    let symlink = await setSymlink (origfile)
    let fileObj = path.parse (file)
    let namefile = fileObj.name.trim ()
    if (namefile.length === 0) {return null}
    let showfile = path.join (fileObj.dir, '_show_' + namefile + '.png')
    let minifile = path.join (fileObj.dir, '_mini_' + namefile + '.png')
    if (symlink !== 'symlink') {
      resizefileAsync (origfile, showfile, "'640x640>'")
      .then (resizefileAsync (origfile, minifile, "'150x150>'")).then ()
    } else {
      //let linkto = await cmdasync ("readlink " + origfile).then ().toString ().trim () // NOTE: Buggy, links badly, why, wrong syntax?
      let linkto = execSync ("readlink " + origfile).toString ().trim ()
      linkto = path.dirname (linkto) // Extract path and create links:
      await cmdasync ("ln -sfn " + linkto + "/" + path.basename (showfile) + " " + showfile)
      .then (await cmdasync ("ln -sfn " + linkto + "/" + path.basename (minifile) + " " + minifile)).then ()
    }
    let cmd = []
    let tmp = '--' // Should never show up
    // Extract Xmp data with exiv2 scripts to \n-separated lines
    cmd [0] = 'xmp_description ' + origfile // for txt1
    cmd [1] = 'xmp_creator ' + origfile     // for txt2
    let txt12 = ''
    for (let _i = 0; _i< cmd.length; _i++) {
      tmp = "?" // Should never show up
      //tmp = execSync (cmd [_i])
      tmp = await cmdasync (cmd [_i])
      tmp = tmp.toString ().trim () // Formalise string
      if (tmp.length === 0) tmp = "-" // Insert fill character
      tmp = tmp.replace (/\n/g," ").trim () // Remove embedded \n(s)
      if (tmp.length === 0) tmp = "-" // Insert fill character
      txt12 = txt12 +'\n'+ tmp
    }
    setTimeout(function () {}, 2000)
    return (origfile +'\n'+ showfile +'\n'+ minifile +'\n'+ namefile +'\n'+ txt12.trim () +'\n'+ symlink).trim () // NOTE: returns 7 rows
  }

}

function pause (ms) {
  console.log('pause',ms);
  return new Promise (done => setTimeout (done, ms));
}
globalFlag = true
