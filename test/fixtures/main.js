var Picker = require('../../picker')
  , Ribcage = require('ribcage-view')
  , Backbone = require('backbone')
  , $ = require('jquery-browserify')
  , AppView
  , App;

Backbone.$ = $;

AppView = Ribcage.extend({
  template: function () {return '<a href="#" class="pick">Open Picker</a><div class="spinholder"></div>';}
, events: {
    'click a.pick': 'openPicker'
  }
, afterRender: function () {
    var quants = {}
      , spinner;

    for(var i=1, ii=100; i<=ii; i++) {
      quants[i] = i;
    }

    spinner = new Picker({
      slots: {
        quantity: {
          values: quants
        , style: 'right'
        }
      , unit: {
          values: {
            1: 'Kg'
          , 2: 'lb'
          , 3: 'oz'
          }
        , style: 'right'
        }
      }
    });

    this.listenTo(spinner, 'change', this.pickerChange);
    this.on('openPicker', function () {
      spinner.show();
    });

    this.appendSubview(spinner, this.$('.spinholder'));

    spinner.render();
  }
, openPicker: function (e) {
    e.preventDefault();
    e.stopPropagation();

    this.trigger('openPicker');
  }
, pickerChange: function (e) {
    console.log('changed');
  }
});

App = new AppView({
  el: $('#app')
});

App.render();
