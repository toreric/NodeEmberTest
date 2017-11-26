import Ember from 'ember';

export default Ember.Component.extend({

  classNames: ['drag-box'],
  attributeBindings: ['draggable'],
  draggable: true,
  x: 0,
  y: 0,
  positionChanged: Ember.observer('x', 'y', function(){
    this.$().css({
      left: `${this.get('x')}px`,
      top: `${this.get('y')}px`,
    });
  }),
  dragStart(e) {
    var x = parseInt(this.$().css('left')) - e.originalEvent.clientX;
    var y = parseInt(this.$().css('top')) - e.originalEvent.clientY;
    e.originalEvent.dataTransfer.setData("position", `${x},${y}`);
  },
  windowDrop(e) {
    var xy = e.dataTransfer.getData("position").split(',');
    this.setProperties({
      x: `${e.originalEvent.clientX + parseInt(xy[0])}`,
      y: `${e.originalEvent.clientY + parseInt(xy[1])}`,
    });
  },
  windowDragOver(e) {
    //e.originalEvent.stopPropagation(); Ingen verkan
    e.originalEvent.preventDefault();
  },
  didRender() {
    var self = this;
    Ember.$(document)
      .on('drop', Ember.$.proxy(self.windowDrop, self))
      .on('dragover', Ember.$.proxy(self.windowDragOver, self));
  },
  didDestroyElement() {
    Ember.$(document)
      .off('drop')
      .off('dragover');
  },
  actions: {
//==================================================================================================
    showit () {
      var showpic, namepic, nodotnamepic, origpic;
      namepic = Ember.$ (".drag-box .head .name").text ();
      nodotnamepic = namepic.replace (/\./g, "\\.");
      origpic = Ember.$ ("#i" + nodotnamepic + " img").attr ('title');
      showpic = origpic.replace (/\/[^\/]*$/, '') +'/'+ '_show_' + namepic + '.png';
      //console.log (namepic +'\n'+ origpic +'\n'+ showpic);
      Ember.$ ('#backImg').text (namepic);
      // From showShow:
      Ember.$ (".img_mini img").css('border', '0.25px solid #888'); // Reset all borders
      Ember.$ ("div.img_show").hide (); // Hide in case a previous is not already hidden
      Ember.$ ("div.img_show img:first").attr ('src', showpic);
      Ember.$ ("div.img_show img:first").attr ('title', origpic);
      Ember.$ ("div.img_show .img_name").text (namepic); // Should be plain text
      Ember.$ ("div.img_show .img_txt1").html (Ember.$ ('#i' + nodotnamepic + ' .img_txt1').html ());
      Ember.$ ("div.img_show .img_txt2").html (Ember.$ ('#i' + nodotnamepic + ' .img_txt2').html ());
      Ember.$ ("div.img_show").show ();
      scrollTo (null, Ember.$ ("div.img_show img:first").offset().top - Ember.$ ("#topMargin").text ());
      //resetBorders ();
      Ember.$ (".img_mini img.left-click").css ('border', '0.25px solid #888');
      Ember.$ (".img_mini img.left-click").removeClass ("dotted");
      Ember.$ ('#i' + nodotnamepic + ".img_mini img.left-click").css ('border', '2px dotted deeppink');
      Ember.$ ('#i' + nodotnamepic + ".img_mini img.left-click").addClass ("dotted");
     },
//==================================================================================================
    hide () {
      Ember.$ (".drag-box").hide ();
      Ember.$ ('#navKeys').text ('true');
    },
//==================================================================================================
    write () {
      var namepic = Ember.$ (".drag-box .head .name").text ();
      var nodotnamepic = namepic.replace (/\./g, "\\.");
      var txt1pic = Ember.$ (".drag-box textarea.textarea1").val ().trim ();
      var txt2pic = Ember.$ (".drag-box textarea.textarea2").val ().trim ();
      var fileName = Ember.$ ("#i" + nodotnamepic + " img").attr ('title');
      Ember.$ ("#i" + nodotnamepic + " .img_txt1" ).html (txt1pic);
      Ember.$ ("#i" + nodotnamepic + " .img_txt1" ).attr ('title', txt1pic);
      Ember.$ ("#i" + nodotnamepic + " .img_txt2" ).html (txt2pic);
      Ember.$ ("#i" + nodotnamepic + " .img_txt2" ).attr ('title', txt2pic);
      if (Ember.$ ("#wrap_show .img_name").text () === namepic) {
        Ember.$ ("#wrap_show .img_txt1").html (txt1pic);
        Ember.$ ("#wrap_show .img_txt2").html (txt2pic);
      }
      var origpic = Ember.$ ("#i" + nodotnamepic + " img").attr ('title');
      if (origpic.search (/gif$/i) > 0) {return;} // Texts cannot be saved in a GIF
      // ===== XMLHttpRequest saving the text
      var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
      IMDB_DIR = IMDB_DIR.replace (/\//g, "@"); // For sub-directories
      function saveTxt1 (txt) {
        var xhr = new XMLHttpRequest ();
        xhr.open ('POST', 'savetxt1/' + IMDB_DIR); // URL matches server-side routes.js
        xhr.onload = function () {
          //fileName = Ember.$ ("#i" + nodotnamepic + " img").attr ('title');
          console.log ('Xmp.dc .description and .creator saved in ' + fileName);

          var messes = Ember.$ ("#title span.usrlg").text ().trim ().split ("•");
          if (messes.length > 4) {messes.splice (0, messes.length - 4);}
          messes.push ('TEXT written');
          messes = messes.join (" • ");
          Ember.$ ("#title span.usrlg").text (messes);

          Ember.$ (".realMessage").text ('TEXT written');
          Ember.$ (".realMessage").show ();
          setTimeout(function() {
            Ember.$ (".realMessage").hide ();
          }, 1000);

        };
        xhr.send(txt);
      }
      txt1pic = txt1pic.replace (/\n/g, " ");
      txt2pic = txt2pic.replace (/\n/g, " ");
      saveTxt1 (fileName +'\n'+ txt1pic +'\n'+ txt2pic);
    }
  }
});
