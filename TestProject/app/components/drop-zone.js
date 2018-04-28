/* global Dropzone*/
import Ember from 'ember';

export default Ember.Component.extend({
  classNames: ['dropzone'],

  myDropzone: document.body || undefined,

  dropzoneOptions: null,

  // Configuration Options

  url: null,
  withCredentials: null,
  method: 'POST',
  parallelUploads: 8,
  maxFilesize: null,
  filesizeBase: null,
  paramName: null,
  uploadMultiple: null,
  headers: {},
  addRemoveLinks: true,
  previewsContainer: null,
  clickable: null,
  maxThumbnailFilesize: null,
  thumbnailWidth: 100,
  thumbnailHeight: 100,
  maxFiles: null,
  createImageThumbnails: null,

  // resize: not available
  acceptedFiles: 'image/*',
  autoProcessQueue: null,
  forceFallback: null,
  previewTemplate: null,

  // Dropzone translations
  dictDefaultMessage: 'FÖR ATT LADDA UPP BILDER: SLÄPP DEM HÄR ELLER KLICKA...' ,
  dictFallbackMessage: null,
  dictFallbackText: null,
  dictInvalidFileType: null,
  dictFileTooBig: null,
  dictResponseError: "Serverrespons: Kod = {{statusCode}}",
  dictCancelUpload: null,
  dictCancelUploadConfirmation: null,
  dictRemoveFile: 'Ta bort',
  dictMaxFilesExceeded: null,
//dictDefaultMessage: "Drop files here to upload",
//dictFallbackMessage: "Your browser does not support drag'n'drop file uploads.",
//dictFallbackText: "Please use the fallback form below to upload your files like in the olden days.",
//dictFileTooBig: "File is too big ({{filesize}}MiB). Max filesize: {{maxFilesize}}MiB.",
//dictInvalidFileType: "You can't upload files of this type.",
//dictResponseError: "Server responded with {{statusCode}} code.",
//dictCancelUpload: "Cancel upload",
//dictCancelUploadConfirmation: "Are you sure you want to cancel this upload?",
//dictRemoveFile: "Remove file",
//dictRemoveFileConfirmation: null,
//dictMaxFilesExceeded: "You can not upload any more files.",

  // Bonus for full screen zones
  maxDropRegion: null,

  // Events

  // All of these receive the event as first parameter:
  drop: null,
  dragstart: null,
  dragend: null,
  dragenter: null,
  dragover: null,
  dragleave: null,

  // All of these receive the file as first parameter:
  addedfile: null,
  removedfile: null,
  thumbnail: null,
  error: null,
  processing: null,
  uploadprogress: null,
  sending: null,
  success: null,
  complete: null,
  canceled: null,
  maxfilesreached: null,
  maxfilesexceeded: null,

  // All of these receive a list of files as first parameter and are only called if the uploadMultiple option is true:
  processingmultiple: null,
  sendingmultiple: null,
  successmultiple: null,
  completemultiple: null,
  canceledmultiple: null,

  // Special events:
  totaluploadprogress: null,
  reset: null,
  queuecomplete: null,
  files: null,

  // Callback functions
  accept: null,

  setEvents() {
    let myDropzone = this.get('myDropzone');
    let events = {
      drop: this.drop,
      dragstart: this.dragstart,
      dragend: this.dragend,
      dragenter: this.dragenter,
      dragover: this.dragover,
      dragleave: this.dragleave,
      addedfile: this.addedfile,
      removedfile: this.removedfile,
      thumbnail: this.thumbnail,
      error: this.error,
      processing: this.processing,
      uploadprogress: this.uploadprogress,
      sending: this.sending,
      success: this.success,
      complete: this.complete,
      canceled: this.canceled,
      maxfilesreached: this.maxfilesreached,
      maxfilesexceeded: this.maxfilesexceeded,
      processingmultiple: this.processingmultiple,
      sendingmultiple: this.sendingmultiple,
      successmultiple: this.successmultiple,
      completemultiple: this.completemultiple,
      canceledmultiple: this.canceledmultiple,
      totaluploadprogress: this.totaluploadprogress,
      reset: this.reset,
      queuecomplete: this.queuecomplete,
      files: this.files,
      accept: this.accept,
    };

    for (let e in events) {
      if (events[e] !== null) {
        myDropzone.on(e, events[e]);
      }
    }
  },

  getDropzoneOptions() {
    const onDragEnterLeaveHandler = function(dropzoneInstance) {
      const onDrag = ( element => {
        let dragCounter = 0;

        return {
          enter(event) {
            event.preventDefault();
            dragCounter++;
            element.classList.add('dz-drag-hover');
          },
          leave() {
            dragCounter--;

            if (dragCounter === 0) {
              element.classList.remove('dz-drag-hover');
            }
          }
        };
      }).call(this, dropzoneInstance.element);

      dropzoneInstance.on('dragenter', onDrag.enter);
      dropzoneInstance.on('dragleave', onDrag.leave);
    };

    let dropzoneOptions = {};
    let dropzoneConfig = {
      url: this.url,
      withCredentials: this.withCredentials,
      method: this.method,
      parallelUploads: this.parallelUploads,
      maxFilesize: this.maxFilesize,
      filesizeBase: this.filesizeBase,
      paramName: this.paramName,
      uploadMultiple: this.uploadMultiple,
      headers: this.headers,
      addRemoveLinks: this.addRemoveLinks,
      previewsContainer: this.previewsContainer,
      clickable: this.clickable,
      maxThumbnailFilesize: this.maxThumbnailFilesize,
      thumbnailWidth: this.thumbnailWidth,
      thumbnailHeight: this.thumbnailHeight,
      maxFiles: this.maxFiles,
      createImageThumbnails: this.createImageThumbnails,

      // resize: not available
      acceptedFiles: this.acceptedFiles,
      autoProcessQueue: this.autoProcessQueue,
      forceFallback: this.forceFallback,
      previewTemplate: this.previewTemplate,

      // Dropzone translations
      dictDefaultMessage: this.dictDefaultMessage,
      dictFallbackMessage: this.dictFallbackMessage,
      dictFallbackText: this.dictFallbackText,
      dictInvalidFileType: this.dictInvalidFileType,
      dictFileTooBig: this.dictFileTooBig,
      dictResponseError: this.dictResponseError,
      dictCancelUpload: this.dictCancelUpload,
      dictCancelUploadConfirmation: this.dictCancelUploadConfirmation,
      dictRemoveFile: this.dictRemoveFile,
      dictMaxFilesExceeded: this.dictMaxFilesExceeded,

      // Fix flickering dragging over child elements: https://github.com/enyo/dropzone/issues/438
      dragenter: Ember.$.noop,
      dragleave: Ember.$.noop,
      init: function () {
        onDragEnterLeaveHandler(this);
        document.getElementById("uploadWarning").style.display = "none";
        this.on("addedfile", function(file) {
          document.getElementById("removeAll").style.display = "inline";
          document.getElementById("uploadPics").style.display = "inline";
          Ember.$ ("#uploadFinished").text ("");
          var namepic = file.name.replace (/.[^.]*$/, "");
          if (Ember.$ ("#i" + namepic).length > 0) {
            // Upload would replace an already present file, named equal
            Ember.$ ("#uploadWarning").html ("&nbsp;VARNING FÖR ÖVERSKRIVNING: Lika filnamn finns redan!&nbsp;");
            document.getElementById("uploadWarning").style.display = "inline";
            console.log(namepic, file.type, file.size, "ALREADY PRESENT");
            //console.log(file.previewElement.classList);
            file.previewElement.classList.add ("picPresent");
            //console.log(JSON.stringify (file.previewElement.classList));
            document.getElementById("removeDup").style.display = "inline";
          } else { // New file to upload
            console.log(namepic, file.type, file.size, "NEW");
          }
        });

        this.on("removedfile", function() {
          if (Ember.$ ("div.dz-preview.picPresent a.dz-remove").length < 1) {
            document.getElementById("uploadWarning").style.display = "none";
            document.getElementById("removeDup").style.display = "none";
          }
        });

        this.on("reset", function() {
          document.getElementById("uploadPics").style.display = "none";
          document.getElementById("removeAll").style.display = "none";
          document.getElementById("uploadWarning").style.display = "none";
          document.getElementById("removeDup").style.display = "none";
          Ember.$ ("#uploadFinished").text ("");
        });

        this.on("queuecomplete", function() {
          document.getElementById("uploadPics").style.display = "none";
          document.getElementById("uploadWarning").style.display = "none";
          Ember.$ ("#uploadFinished").text ("UPLADDNINGEN FÄRDIG");
          Ember.$ ("#reFresh-1").click (); // Update the page, via DOM..
        });

      }
    };

    for (let option in dropzoneConfig) {
      let data = dropzoneConfig[option];
      if (data !== null) {
        dropzoneOptions[option] = data;
      } else if (option === 'thumbnailHeight' || option === 'thumbnailWidth') {
        dropzoneOptions[option] = data;
      }
    }

    this.set('dropzoneOptions', dropzoneOptions);
  },

  createDropzone(element) {
    let region = this.get('maxDropRegion') ? document.body : element;
    this.set('myDropzone', new Dropzone(region, this.dropzoneOptions));
  },

  insertDropzone: Ember.on('didInsertElement', function() {
    let _this = this;
    this.getDropzoneOptions();
    Dropzone.autoDiscover = false;
    this.createDropzone(this.element);
    //make sure events are set before any files are added
    this.setEvents();

    //this condition requires a fully resolved array to work
    //will not work with model.get('files') as it returns promise not array hence length condition is failed
    if (this.files && this.files.length > 0) {
      this.files.map(function(file) {
        let dropfile = {
          name: file.get('name'),
          type: file.get('type'),
          size: file.get('size'),
          status: Dropzone.ADDED,
          //add support for id  in files object so that it can be access in addedFile,removedFile callbacks for files identified by id
          id: file.get('id')
        };
        let thumbnail = file.get('thumbnail');

        if (typeof (thumbnail) === 'string') {
          dropfile.thumbnail = thumbnail;
        }

        _this.myDropzone.emit('addedfile', dropfile);

        if (typeof (thumbnail) === 'string') {

          _this.myDropzone.emit('thumbnail', dropfile, thumbnail);
        }

        _this.myDropzone.emit('complete', dropfile);
        _this.myDropzone.files.push(file);
      });
    }

    return this.myDropzone;
  }),

  actions: {
    closeThis() {
      document.getElementById ("divDropbox").className = "hide-all";
    },

    removeAllFiles() {
      this.myDropzone.removeAllFiles();
      document.getElementById("removeDup").style.display = "none";
      document.getElementById("uploadWarning").style.display = "none";
    },

    removeDupFiles() {
      //this.myDropzone.removeAllFiles();
      var dupEl = Ember.$ ("div.dz-preview.picPresent a.dz-remove");
      for (var i=0; i<dupEl.length; i++) {
        dupEl [i].click ();
      }
      //this.userLog ("REMOVED", dupEl.length); unreachable!
      document.getElementById("removeDup").style.display = "none";
      document.getElementById("uploadWarning").style.display = "none";
    },

    processQueue() {
//console.log (JSON.stringify (this.myDropzone.files));
//console.log (JSON.stringify (this.myDropzone.getQueuedFiles()));
      var qlen;
      return new Ember.RSVP.Promise ( () => {
        this.myDropzone.options.autoProcessQueue = false;
        qlen = this.myDropzone.getQueuedFiles().length;
        if (qlen > 0) {
          Ember.$ (".spinner").show ();
          document.getElementById("reLd").disabled = true;
          document.getElementById("saveOrder").disabled = true;
          document.getElementById("showDropbox").disabled = true;
          this.myDropzone.options.autoProcessQueue = true;
          console.log ("drop-zone processQueue:", qlen);
          this.myDropzone.processQueue ();
          this.myDropzone.on ("queuecomplete", () => {
            Ember.run.later ( () => {
              this.myDropzone.options.autoProcessQueue = false;
              console.log ("drop-zone queuecomplete");
            }, 40);
            // Refresh after file upload
            var ms = 1000; // The interval may be a setting?
            (function (j, t) {
              setTimeout (function () {
                Ember.$ ("#refresh-1").click ();
              }, (j*t)); // Waiting time
            })(qlen, ms); //Pass into closure of self-exec anon-func
          });
        }
      }).then (null);
      /*}).then ( (qlen) => {
        var runrefresh = () => {
          setTimeout ( () => {
            Ember.$ ("#reFERRresh-1").click ();
          }, 2000); // 2 s/pic
        };
        console.log ("qlen", qlen);
        while (qlen>0) {
          qlen = qlen - 1;
          runrefresh ();
        }
      });*/
    }

  },

});
