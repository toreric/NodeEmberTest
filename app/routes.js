
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
  var bodyParser = require ('body-parser')
  app.use (bodyParser.urlencoded ( {extended: false}))
  app.use (bodyParser.json())

  //var jsdom = require('jsdom')
  //var dialog = require('nw-dialog')
  // Did never get jsdom or dialog to function

  // ----- C O M M O N S
  // ----- Upload counter
  var n_upl = 0
  // ----- Present directory
  var PWD_PATH = path.resolve ('.')
  // ----- Image data(base) directory
  var IMDB_DIR = null // Must be set in route
  // ----- Debug data(base) directories
  var show_imagedir = false
  //show_imagedir = true

  // ##### R O U T I N G  E N T R I E S
  // Remember to check 'Express route tester'!
  // ##### #0. General passing point
  app.all ('*', function (req, res, next) {
    //console.log("Accessing 'routes.js': " + req.url)
    //console.log (process.memoryUsage ())
    next () // pass control to the next handler
  })

  // ##### #0.1 Get file information
  app.get ('/filestat/:path', function (req, res) {

    var LT = "se-SV" // Language tag for dateTime, environmrnt locales are different!
    var missing = "uppgift saknas"
    var file = req.params.path.replace (/@/g, "/").trim ()
    var stat = fs.statSync (file)
    var fileStat = "<i>Filnamn</i>: " + file + "<br><br>"
    fileStat += "<i>Storlek</i>: " + stat.size/1000000 + " Mb<br>"
    var tmp = execSync ("exif_dimension " + file).toString ().trim ()
    if (tmp === "missing") {tmp = missing}
    fileStat += "<i>Dimension</i>: " + tmp + "<br><br>"
    tmp = (new Date (execSync ("exif_dateorig " + file))).toLocaleString (LT, {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'})
    if (tmp.indexOf ("Invalid") > -1) {tmp = missing}
    fileStat += "<i>Fototid</i>: " + tmp + "<br>"
    fileStat += "<i>Ändrad</i>: " + stat.mtime.toLocaleString (LT, {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'}) + "<br>"
    res.send (fileStat).end ()

  })
  // ##### #0.2 Get imdb directory list
  app.get ('/imdbdirs/:imdbroot', function (req, res) {

    var imdbRoot = req.params.imdbroot.replace (/@/g, "/").trim ()
    if (imdbRoot === "*") { // then use the default environment setting
      imdbRoot = execSync ("echo $IMDB_ROOT").toString ().trim ()
    }

    var homeDir = execSync ("echo $HOME").toString ().trim () // "/home/tore"
    var imdbLink = "imdb" // Symlink, kan ev. vara parameter efter '/imdbdirs ...'
    console.log ("Home directory: " + homeDir)
    console.log ("IMDB_ROOT:", imdbRoot)
    //execSync ("ln -sfn " + homeDir + "/" + "Pictures/Flygbildsurval" + " " + imdbLink)
    execSync ("ln -sfn " + homeDir + "/" + imdbRoot + " " + imdbLink)
    var rootDir = execSync ("readlink " + imdbLink).toString ().trim ()
    console.log ("Path in imdbLink: " + rootDir)
    findDirectories (imdbLink).then (dirlist => {
      dirlist = dirlist.sort ()
      // imdbLink is the www-imdb root, add here:
      dirlist.splice (0, 0, imdbLink + "/")
      dirlist = dirlist.join ("\n").trim ()
      // Note: rootDir = homeDir + "/" + imdbRoot, but here "@" separates them:
      dirlist = homeDir + "@" + imdbRoot  + "\n" + dirlist + "\nNodeJS " + process.version.trim ()
      res.location ('/')
      console.log("Directories:\n" + dirlist)
      res.send (dirlist).end ()
      console.log ('Directory information sent from server')
    }).catch (function (error) {
      res.location ('/')
      res.send (error + ' ')
    })
  })

  // ##### #0.3 readSubdir to select rootdir...
  app.get ('/rootdir', function (req, res) {
    var homeDir = execSync ("echo $HOME").toString ().trim () // "/home/tore"
    readSubdir (homeDir).then (dirlist => {
      dirlist = dirlist.join ('\n')
      console.log (dirlist)
      res.location ('/')
      res.send (dirlist).end ()
    }).catch (function (error) {
      res.location ('/')
      res.send (error + ' ')
    })
  })

  // ##### #1. Image list section using 'findFiles' with readdirAsync, Bluebird support
  //           Called from menu-buttons.js component
  app.get ('/imagelist/:imagedir', function (req, res) {
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
        var imtype = file.slice (0, 6)
        // File types are also set at drop-zone in the template menu-buttons.hbs
        var ftype = file.match (/\.(jpe?g|tif{1,2}|png|gif)$/i)
//console.log (file, ftype);
        // Here more files may be filtered out depending on o/s needs etc.:
        if (ftype && imtype !== '_mini_' && imtype !== '_show_' && imtype !== '_imdb_' && file.slice (0,1) !== ".") {
//console.log (file, ftype);
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
      ////////////////////////////////////////////////////////
      // pkgfilenames prints initial console.log message
      async function pkgfilenamesWrap () {
        await pkgfilenames (origlist).then ( () => {
          //console.log ("========================", allfiles.length)
          //console.log (allfiles)
          res.location ('/')
          res.send (allfiles).end ()
          console.log ('...file information sent from server') // Remaining message
        }).catch (function (error) {
          res.location ('/')
          res.send (error + ' ')
        })
      }
      pkgfilenamesWrap ();
    })
  })

  // ##### #2. Get sorted file name list
  //           Called from the menu-buttons component
  app.get ('/sortlist/:imagedir', function (req, res) {
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/")
    if (show_imagedir) {
      console.log ("sortlist", req.params.imagedir, "=>", IMDB_DIR)
    }
    var imdbtxtpath = IMDB_DIR + '_imdb_order.txt'
    try {
      execSync ('touch ' + imdbtxtpath) // In case not yet created
    } catch (err) {
      res.location ('/')
      //res.send (err).end ()
      res.send ("Error!").end ()
      console.log (IMDB_DIR + ' not found')
    }
    fs.readFileAsync (imdbtxtpath)
    .then (names => {
      //console.log (names); // <buffer>
      res.location ('/')
      res.send (names) // Sent buffer arrives as text
    }).then (console.log ('File order sent from server'))
/*    .catch (
      fs.openAsync (imdbtxtpath, 'w').then (function () {
        res.location ('/')
        res.send (' ').end ()
        console.log (" '" + imdbtxtpath + "' created")
      })
    ) */
  })

  // ##### #3. Get full-size djvu file
  app.get ('/fullsize/*?', function (req, res) {
    var fileName = req.params[0] // with path
    //console.log (fileName)
    // Make a temporary .djvu file with the mkdjvu script
    var tmpName = execSync ('mkdjvu ' + fileName)
    res.location ('/')
    res.send (tmpName).end ()
    console.log ('Fullsize image generated')
  })

  // ##### #4. Download full-size original image file: Get the host name in responseURL
  app.get ('/download/*?', function (req, res) {
    var fileName = req.params[0] // with path
    console.log ('Download of ' + fileName + " initiated")
    res.location ('/')
    res.send (fileName).end ()
  })

  // ##### #5. Delete original file and its mini and show files
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
      tmp = 'DELETED ' + fileName
    } else {
      tmp = 'UNTOUCHED ' + fileName + ', since ERROR: ' + tmp + ' !== ' + IMDB_DIR
    }
    console.log (tmp)
    res.location ('/')
    res.send (tmp).end ()
  })

  // ##### #6. = #0. S T A R T  P A G E
  app.get ('/', function (req, res) {
    res.sendFile ('index.html', {root: PWD_PATH + '/public/'}) // load our index.html file
    // path must be "absolute or specify root to res.sendFile"
  })

  // ##### #7. Image upload, using Multer multifile and Bluebird promise upload
  //           Called from the drop-zone component
  app.post ('/upload', upload.array ('files'), function (req, res, next) {
    if (!IMDB_DIR) { // If not already set: refrain
      console.log ("Image direcory missing, cannot upload")
      return
    }
    async function uploadWrap () {
      // ----- Image data base absolute path
      var IMDB_PATH = PWD_PATH + '/' + IMDB_DIR
      var fileNames = ""
      await Promise.map (req.files, function (file) {
        //console.log (JSON.stringify (file)) // the file object
        //console.log (file.originalname);
        file.originalname = file.originalname.replace (/ /g, "_") // Spaces prohibited
        //console.log (file.originalname);
        fs.readFileAsync (file.path)
        .then (contents => fs.writeFileAsync (IMDB_PATH + file.originalname, contents, 'binary'))
        .then (console.log (++n_upl +' TMP: '+ file.path + ' written to' +'\nUPLOADED: '+ IMDB_DIR + file.originalname),
        fileNames = fileNames + file.originalname)
        // Delete showfile and minifile if the main file is refreshed
        .then(pngname = path.parse (file.originalname).name + '.png')
        .then (fs.unlinkAsync (IMDB_PATH +'_mini_'+ pngname)) // File not found isn't caught, see Express unhandledRejection!
        .then (fs.unlinkAsync (IMDB_PATH +'_show_'+ pngname)) // File not found isn't caught, see Express unhandledRejection!
        .then (res.send (file.originalname).end ())
        //.then (console.log (' originalname: ' + file.originalname), res.send (file.originalname).end ())
        .catch (function (error) {
          if (error.code === "ENOENT") {
            console.log ('FILE NOT FOUND: ' + IMDB_PATH + '_xxx_' + pngname)
          } else {
            // how to break the uploading???
            // res.status (500).end () // no effect, only console log shows up, if availible:
            console.log ('\033[31m' + n_upl +': '+ file.path + ' NO WRITE PERMISSION to' + '\n' + IMDB_PATH + file.originalname + '\033[0m')
          }
        })
      }).then (null)
    }
    uploadWrap ();
    //res.send (fileNames).
    //res.sendFile ('index.html', {root: PWD_PATH + '/public/'}) // keep the index.html file
  })

  // ##### #8. Save the _imdb_order.txt file
  //           Called from the menu-buttons component's action.reFresh
  app.post ('/saveorder/:imagedir', function (req, res, next) {
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/")
    if (show_imagedir) {
      console.log ("saveorder", req.params.imagedir, "=>", IMDB_DIR)
    }
    var file = IMDB_DIR + "_imdb_order.txt"
//console.log (file);
    execSync ('touch ' + file) // In case not yet created
    var body = []
    req.on ('data', (chunk) => {
//console.log(chunk)
      body.push (chunk) // body will be a Buffer array: <buffer 39 35 33 2c 30 ... >, <buf... etc.
    }).on ('end', () => {
      body = Buffer.concat (body).toString () // Concatenate; then convert the Buffer to String
      // At this point, do whatever with the request body (now a string)
//console.log("Request body =\n",body)
      fs.writeFileAsync (file, body).then (function () {
        console.log ("Saved sort order ")
      })
      res.on('error', (err) => {
        console.error(err)
      })
      //res.connection.destroy()
      res.sendFile ('index.html', {root: PWD_PATH + '/public/'}) // stay at the index.html file
    })
  })

  // ##### #9. Save Xmp.dc.description and Xmp.dc.creator
  app.post ('/savetxt1/:imagedir', function (req, res, next) {
    //console.log("Accessing 'app.post, savetxt1'")
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/")
    // The above is superfluous and has, so far, no use here, since please note:
    // The imagedir directoty path is already included in the file name here @***
    if (show_imagedir) {
      console.log ("savetxt1", req.params.imagedir, "=>", IMDB_DIR)
    }
    var body = []
    req.on ('data', (chunk) => {
      body.push (chunk)
    }).on ('end', () => {
      body = Buffer.concat (body).toString () // character vector(?)
      // at this point, `body` has the entire request body stored in it as a string(?)
      var tmp = body.split ('\n')
      //console.log ('tmp.length=' + tmp.length)
      var fileName = tmp [0].trim () // @*** the path is included here @***
      console.log ('Xmp.dc .description and .creator will be saved into ' + fileName)
      body = tmp [1].trim () // These trimmings are probably superfluous
      // The set_xmp_... command strings will be single quoted, avoiding
      // most Bash shell interpretation. Thus slice out 's within 's (cannot
      // be escaped just simply); makes Bash happy :) ('s = single quotes)
      body = body.replace (/'/g, "'\\''")
      //console.log (fileName + " '" + body + "'")
      execSync ('set_xmp_description ' + fileName + " '" + body + "'") // for txt1
      body = tmp [2].trim () // These trimmings are probably superfluous
      body = body.replace (/'/g, "'\\''")
      //console.log (fileName + " '" + body + "'")
      execSync ('set_xmp_creator ' + fileName + " '" + body + "'") // for txt2
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

  // ===== C O M M O N  F U N C T I O N S

  // ===== Reading directory and sub-directory contents recursively
  // Use example: readDir ("./mydir").then (function (v) {console.log (v.join ("\n"))})
  /* Does not provide both directories and files: Files only! Else: Super
    function readDir (dirName) {
      return fs.readdirAsync (dirName).map (function (fileName) {
        var filepath = path.join (dirName, fileName)
        return fs.statAsync (filepath).then (function (stat) {
          stat.isDirectory () ? readDir(filepath) : filepath // isDirectory may fail
        })
      }).reduce (function (a, b) {
        return a.concat (b)
      }, [])
    } */

  // ===== Read a directory's file content
  function findFiles (dirName) {
    return fs.readdirAsync (dirName).map (function (fileName) {
      var filepath = path.join (dirName, fileName)
      return fs.statAsync (filepath).then (function (stat) {
        if (stat.mode & 0100000) { // See 'man 2 stat': S_IFREG bitmask for 'Regular file'
          return filepath
        } else { // Directories or whatever are dotted and hence ignored
          if (show_imagedir) {
            console.log (filepath, JSON.stringify (stat))
          }
          return path.join (path.dirname (filepath), ".ignore")
        }
      })
    }).reduce (function (a, b) {
      return a.concat (b)
    }, [])
  }

  // ===== Read the dir's content of sub-dirs recursively
  //  findDirectories('dir/to/search/in').then (...
  //    Arg 'files' is used to propagate data of recursive calls to the initial call
  //    If you really want to, you can use arg 'files' to manually add some files to the result
  // Note: Order of results is not guaranteed due to parallel nature of function
  findDirectories = (dir, files = []) => {
    return fs.readdirAsync (dir)
    .then ( (items) => { // items = files || dirs
      // items figures as list of tasks, settled promise means task is completed
      return Promise.map (items, (item) => {
        //item = path.resolve (dir, item) // Absolute path
        item = path.join (dir, item) // Relative path
        return fs.statAsync (item)
        .then ( (stat) => {
          if (stat.isFile ()) {
            // item is file
            //files.push (item)
          } else if (stat.isDirectory ()) {
            // item is dir
            files.push (item)
            return findDirectories (item, files)
          }
        })
      })
    })
    .then ( () => {
      // every task is completed, provide results
      return files
    })
  }

  // ===== Read the dir's content of sub-dirs (not recursively)
  readSubdir = (dir, files = []) => {
    return fs.readdirAsync (dir)
    .then ( (items) => { // items = files || dirs
      // items figures as list of tasks, settled promise means task is completed
      return Promise.map (items, (name) => {
        //item = path.resolve (dir, name) // Absolute path
        var item = path.join (dir, name) // Relative path
        return fs.statAsync (item)
        .then ( (stat) => {
          if (stat.isDirectory () && name.slice (0, 1) !== ".") {
            files.push (name)
          }
        })
      })
    })
    .then ( () => {
      // every task is completed, provide results
      return files
    })
  }

  // ===== Create minifile or showfile (note: size!), if non-existing
  // origpath = the file to be resized, filepath = the resized file
  async function resizefileAsync (origpath, filepath, size) {
   //return new Promise (resolve => {
    // Check if the file exists, then continue, but note (!): This openAsync will
    // always fail since filepath is absolute!! Needs web-rel-path to work ...
    // ImageMagick command needs the absolute path, though
    fs.openAsync (filepath, 'r').then (null)
    .catch (function (error) {
      // Else if it doesn't exist, make the resized file
      if (error.code === "ENOENT") {
        // Use ImageMagick: '-thumbnail' stands for '-resize -strip'
        // Note: GIF images are only resized and 'fake labeled' PNG
        var filepath1 = filepath
        if (origpath.search (/gif$/i) > 0) {
          filepath1 = filepath.replace (/png$/i, 'gif')
        }
        var imckcmd = "convert " + origpath + " -thumbnail " + size + " " + filepath1
        //console.log (imckcmd)
        exec (imckcmd, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`)
            return
          } else {
            if (origpath.search (/gif$/i) > 0) {
              // Rename GIF to 'fake PNG'
              execSync ("mv " + filepath1 + " " + filepath)
            }
            console.log (' ' + filepath + ' created')
          }
        })
      } else {
        throw error
      }
    })//.then (null)
    //resolve ()
   //})
  }

  var allfiles

  /*/ ===== Make a package of orig, show, mini, and plain filenames + metadata
  async function pkgfilenames (origlist) {
    return new Promise ( (resolve, reject) => {
  //console.log ('>>>>>>>>>', origlist);
      var files = origlist.split ('\n') // files is vector
      allfiles = ''
      var somefiles, some = 5
      // Allocate batches of maximum 'some' files at a time for this task:
      while (files.length > 0) {
        somefiles = files.slice (0, some)
        files.splice (0, some)

        pkgsome (somefiles).then (result => {
    //console.log (somefiles.length + " +++++++++++++\n" + result)
          allfiles = allfiles +'\n'+ result
        })
      }
      allfiles = allfiles.trim ()
    //console.log ("hallåå", allfiles.length)
      console.log ('Showfiles•minifiles•metadata...')
      resolve (allfiles)
    })
  }*/

  // ===== Make a package of orig, show, mini, and plain filenames + metadata
  async function pkgfilenames (origlist) {
  //console.log ('>>>>>>>>>', origlist);
    var files = origlist.split ('\n') // files is vector
    allfiles = ''
    var somefiles, some = 8
      // Allocate batches of maximum 'some' files at a time for this task:
    while (files.length > 0) {
      somefiles = files.slice (0, some)
      files.splice (0, some)

      await pkgsome (somefiles).then (result => {
    //console.log (somefiles.length + " +++++++++++++\n" + result)
        allfiles = allfiles +'\n'+ result
      })
    }
    allfiles = allfiles.trim ()
    //console.log ("hallåå", allfiles.length)
    console.log ('Showfiles•minifiles•metadata...')
    return allfiles
    //})
  }

  // ===== Sub-package of orig, show, mini, and plain filenames + metadata
  //       Resize into showsize and mini pictures
  //var pkgsome = async (somefiles) => {
  async function pkgsome (somefiles) {
   ///return new Promise ( (resolve, reject) => {
    var f6 = ""
    for (var i=0; i<somefiles.length; i++) {
      var file = somefiles [i]
      var origfile = file
      var fileObj = path.parse (file)
      //console.log ("fileObj:", JSON.stringify (fileObj))
      var namefile = fileObj.name.trim ()
      if (namefile.length === 0) {return null}
      //console.log (' ' + namefile)
      var showfile = path.join (fileObj.dir, '_show_' + fileObj.name + '.png')
      await resizefileAsync (file, showfile, "'640x640>'").then (null)
      var minifile = path.join (fileObj.dir, '_mini_' + fileObj.name + '.png')
      await resizefileAsync (file, minifile, "'150x150>'").then (null)
      var cmd = []
      var tmp = '--' // Should never show up
      // Extract Xmp data with exiv2 scripts to \n-separated lines
      cmd [0] = 'xmp_description ' + origfile // for txt1
      cmd [1] = 'xmp_creator ' + origfile     // for txt2
      var txt12 = ''
      //Promise.map (cmd, (command) => {
      for (var _i = 0; _i< cmd.length; _i++) {
        var command = cmd [_i]
        tmp = "?" // Should never show up
        tmp = execSync (cmd [_i])
        tmp = tmp.toString ().trim () // Formalise string
        if (tmp.length === 0) tmp = "-" // Insert fill character(s)?
        tmp = tmp.replace (/\n/g," ").trim () // Remove embedded \n(s)
        if (tmp.length === 0) tmp = "-" // Insert fill character(s)?s, maybe other(s)
        txt12 = txt12 +'\n'+ tmp
      }
  //console.log (txt12.trim (), "\n--------------------")
      f6 = f6 +'\n'+ origfile +'\n'+ showfile +'\n'+ minifile +'\n'+ namefile +'\n'+ txt12.trim ()
      //allfiles = allfiles +'\n'+ f6
    }
//console.log ("ANTAL", somefiles.length);
    //console.log (f6.trim ());
    return f6.trim ()
    ///resolve (f6.trim ())
   ///})
  }

}
