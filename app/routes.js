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

  // ----- C O M M O N S
  // ----- Upload counter
  var n_upl = 0
  // ----- Present directory
  var PWD_PATH = path.resolve ('.')
  // ----- Image data(base) directory
  var IMDB_DIR = null // Must be set in route
  // ----- Debug data(base) directories
  var show_imagedir = false

  // ##### R O U T I N G  E N T R I E S
  // Remember to check 'Express route tester'!
  // ##### #0. General passing point
  app.all ('*', function (req, res, next) {
    //console.log("Accessing 'routes.js': " + req.url)
    //console.log (process.memoryUsage ())
    next () // pass control to the next handler
  })

  // ##### #10. Get imdb directory list
  app.get ('/imdbdirs', function (req, res) {
    // FUNGERAR: imdbBase = path.join (process.env.HOME, "Pictures/Flygbildsurval")
    imdbBase = "imdb" // Relative path
    findDirectories (imdbBase).then (dirlist => {
      dirlist = dirlist.sort ()
      dirlist.splice (0, 0, imdbBase)
      dirlist = dirlist.join ("\n").trim ()
      dirlist = dirlist +'\n'+ process.version.trim()
      res.location ('/')
      console.log("Directories:\n" + dirlist)
      res.send (dirlist).end ()
      console.log ('Directory information sent from server')
    }).catch (function (error) {
      res.location ('/')
      res.send (error + ' ')
    })
  })

  // ##### #1. Image list section using 'findFiles' with readdirAsync, Bluebird support
  //           Called from menu-buttons.js component
  app.get ('/imagelist/:imagedir', function (req, res) {
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/") + '/'  // Has lost its terminal slash, if it ever had one.
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
        var ftype = file.match (/\.(jpe?g|tif[1,2]|png)$/i)
        console.log (file, ftype);
        // Here more files may be filtered out depending on o/s needs etc.:
        if (ftype && imtype !== '_mini_' && imtype !== '_show_' && imtype !== '_imdb_' && file.slice (0,1) !== ".") {
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
      pkgfilenames (origlist).then (allfiles => {
        console.log ("========================\n",allfiles)
        res.location ('/')
        res.send (allfiles).end ()
        console.log ('...file information sent from server') // Remaining message
      })
    }).catch (function (error) {
      res.location ('/')
      res.send (error + ' ')
    })
  })

  // ##### #2. Get sorted file name list
  //           Called from the menu-buttons component
  app.get ('/sortlist/:imagedir', function (req, res) {
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/") + '/'  // Has lost its terminal slash, if it ever had one.
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
    console.log ('Download of ' + fileName + " starting...")
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
    // ----- Image data base absolute path
    var IMDB_PATH = PWD_PATH + '/' + IMDB_DIR
    var fileNames = ""
    Promise.map (req.files, function (file) {
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
    })
    //res.send (fileNames).
    //res.sendFile ('index.html', {root: PWD_PATH + '/public/'}) // keep the index.html file
  })

  // ##### #8. Save the _imdb_order.txt file
  //           Called from the menu-buttons component's action.reFresh
  app.post ('/saveorder/:imagedir', function (req, res, next) {
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/") + '/'
    if (show_imagedir) {
      console.log ("saveorder", req.params.imagedir, "=>", IMDB_DIR)
    }
    var file = IMDB_DIR + "_imdb_order.txt"
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
    IMDB_DIR = req.params.imagedir.replace (/@/g, "/") + '/'
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
            console.log (filepath, JSON.stringify(stat))
          }
          return path.join (path.dirname (filepath), ".ignore")
        }
      })
    }).reduce (function (a, b) {
      return a.concat (b)
    }, [])
  }

  // ===== Read the dir content, of sub-dirs recursively
  //  findDirectories('dir/to/search/in').then (...
  //    Arg 'files' is used to propagate data of recursive calls to the initial call
  //    If you really want to, you can use arg 'files' to manually add some files to the result
  // Note: Order of results is not guaranteed due to parallel nature of function
  findDirectories = (dir, files = []) => {
    return fs.readdirAsync(dir)
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

  // ===== Create minifile or showfile (note: size!), if non-existing
  // origpath = the file to be resized, filepath = the resized file
  // resizefile() will be promisified to resizefileAsync(), se below
  var resizefile = function (origpath, filepath, size) {
    // Check if the file exists, then do nothing
    fs.openAsync (filepath, 'r').then (null) // Important but don't try fs.close..(?)
    .catch (function (error) {
      // Else if it doesn't exist, make the resized file
      if (error.code === "ENOENT") {
        // Use ImageMagick: '-thumbnail' stands for '-resize -strip'
        var imckcmd = "convert " + origpath + " -thumbnail " + size + " " + filepath
        //console.log (imckcmd)
        setTimeout(function () { return }, 1000) // Reserve a time slice for the command
        exec (imckcmd, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`)
            return
          }
        })
        setTimeout(function () { return }, 1000) // Reserve a time slice for the command
        console.log (' ' + filepath + ' created')
      } else {
        throw error
      }
    }).then (null)
  }
  var resizefileAsync = Promise.promisify (resizefile) // returns nothing

  // ===== Make a package of orig, show, mini, and plain filenames + metadata
  var pkgfilenames = (origlist) => {
    return new Promise ( (resolve, reject) => {
      console.log ('>>>>>>>>>', origlist);
      var files = origlist.split ('\n') // files is vector
      var allfiles = '',  somefiles, some = 7
      // Allocate bathces of maximum some files at a time for this task:
      while (files.length > 0) {
        somefiles = files.slice (0, some)
        files.splice (0, some)

        result = pkgsome (somefiles)
        allfiles = allfiles +'\n'+ result
      }
      allfiles = allfiles.trim ()
      //console.log (allfiles)
      console.log ('Showfiles•minifiles•metadata...')
      resolve (allfiles)
    })
  }

  // ===== Sub-package of orig, show, mini, and plain filenames + metadata
  var pkgsome = (somefiles) => {
    var f6 = ""
    for (var i=0; i<somefiles.length; i++) {
      var file = somefiles [i]
      var origfile = file
      var  fileObj = path.parse (file)
      //console.log ("fileObj:", JSON.stringify (fileObj))
      var namefile = fileObj.name.trim ()
      if (namefile.length === 0) {return null}
      //console.log (' ' + namefile)
      var showfile = path.join (fileObj.dir, '_show_' + fileObj.name + '.png')
      resizefileAsync (file, showfile, "'640x640>'").then(null)
      //setTimeout(function () { return }, 4000) // Reserve a time slice for the command
      var minifile = path.join (fileObj.dir, '_mini_' + fileObj.name + '.png')
      resizefileAsync (file, minifile, "'150x150>'").then(null)
      //setTimeout(function () { return }, 4000) // Reserve a time slice for the command
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
        if (tmp.length === 0) tmp = "-" // Insert fill character(s)
        tmp = tmp.replace (/\n/g," ").trim () // Remove embedded \n(s)
        if (tmp.length === 0) tmp = "-" // Insert fill character(s), maybe other(s)
        txt12 = txt12 +'\n'+ tmp
        //setTimeout (function () { return }, 4000)
      }
      console.log (txt12.trim (), "\n--------------------")
      f6 = f6 +'\n'+ origfile +'\n'+ showfile +'\n'+ minifile +'\n'+ namefile +'\n'+ txt12.trim ()
      //allfiles = allfiles +'\n'+ f6
    }
    console.log ("ANTAL", somefiles.length);
    //console.log (f6.trim ());
    return f6.trim ()
  }

}
