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
      var showpic, namepic, origpic;
      namepic = Ember.$ (".drag-box .head .name").text ();
      origpic = Ember.$ ("#i" + namepic + " img").attr ('title');
      showpic = origpic.replace (/\/[^\/]*$/, '') +'/'+ '_show_' + namepic + '.png';
      //console.log (namepic +'\n'+ origpic +'\n'+ showpic);
      Ember.$ ('#backImg').text (namepic);
      // From showShow:
      Ember.$ (".img_mini img").css('border', '0.25px solid #888'); // Reset all borders
      Ember.$ ("div.img_show").hide (); // Hide in case a previous is not already hidden
      Ember.$ ("div.img_show img:first").attr ('src', showpic);
      Ember.$ ("div.img_show img:first").attr ('title', origpic);
      Ember.$ ("div.img_show .img_name").text (namepic); // Should be plain text
      Ember.$ ("div.img_show .img_txt1").html (Ember.$ ('#i' + namepic + ' .img_txt1').html ());
      Ember.$ ("div.img_show .img_txt2").html (Ember.$ ('#i' + namepic + ' .img_txt2').html ());
      Ember.$ ("div.img_show").show ();
      scrollTo (null, Ember.$ ("div.img_show img:first").offset().top - Ember.$ ("#topMargin").text ());
     },
//==================================================================================================
    hide () {
      Ember.$ (".drag-box").hide ();
      Ember.$ ('#navKeys').text ('true');
    },
//==================================================================================================
    write () {
      var namepic = Ember.$ (".drag-box .head .name").text ();
      var txt1pic = Ember.$ (".drag-box textarea.textarea1").val ().trim ();
      var txt2pic = Ember.$ (".drag-box textarea.textarea2").val ().trim ();
      Ember.$ ("#i" + namepic + " .img_txt1" ).html (txt1pic);
      Ember.$ ("#i" + namepic + " .img_txt1" ).attr ('title', txt1pic);
      Ember.$ ("#i" + namepic + " .img_txt2" ).html (txt2pic);
      Ember.$ ("#i" + namepic + " .img_txt2" ).attr ('title', txt2pic);
      if (Ember.$ ("#wrap_show .img_name").text () === namepic) {
        Ember.$ ("#wrap_show .img_txt1").html (txt1pic);
        Ember.$ ("#wrap_show .img_txt2").html (txt2pic);
      }
      // ===== XMLHttpRequest saving the text
      var IMDB_DIR =  Ember.$ ('#imdbDir').text ();
      function saveTxt1 (txt) {
        var xhr = new XMLHttpRequest ();
        xhr.open ('POST', 'savetxt1/' + IMDB_DIR + '/'); // URL matches server-side routes.js
        xhr.onload = function () {
          console.log ('Xmp.dc .description and .creator saved in ' + fileName);

          var messes = Ember.$ ("#title span").text ().trim ().split ("•");
          if (messes.length > 4) {messes.splice (0, messes.length - 4);}
          messes.push ('TEXT written');
          messes = messes.join (" • ");
          Ember.$ ("#title span").text (messes);

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
      var fileName = Ember.$ ("#i" + namepic + " img").attr ('title');
      saveTxt1 (fileName +'\n'+ txt1pic +'\n'+ txt2pic);
    }
  }
});
