var Picker = require('../../picker')
  , Ribcage = require('ribcage-view')
  , Backbone = require('backbone')
  , $ = require('jquery-browserify')
  , AppView
  , App;

Backbone.$ = $;

AppView = Ribcage.extend({
  template: require('./app.hbs')
, quantity: 50
, unit: 'lb'
, events: {
    'click a.pick': 'openPicker'
  }
, afterInit: function () {
    var self = this
      , threes = {}
      , fours = {}
      , fives = {};

    for(var i=1, ii=100; i<=ii; i++) {
      threes[i * 3] = i * 3;
    }

    for(var i=1, ii=100; i<=ii; i++) {
      fours[i * 4] = i * 4;
    }

    for(var i=1, ii=50; i<=ii; i++) {
      fives[i * 5] = i * 5;
    }

    this.quants = {
      threes: threes
    , fours: fours
    , fives: fives
    };

    this.picker = new Picker({
      slots: {
        quantity: {
          values: threes
        , style: 'right'
        , defaultKey: '30'
        }
      , unit: {
          values: {
            '1': 'Threes'
          , '2': 'Fours'
          , '3': 'Fives'
          }
        , style: 'right'
        }
      }
    });
  }
, afterRender: function () {
    var self = this;

    this.appendSubview(this.picker, this.$('.spinholder'));

    this.listenTo(this.picker, 'change', function () {
      this.render();
    })

    this.listenTo(this.picker, 'change:unit', function (newData) {
      switch(newData.value) {
        case 'Threes':
          self.picker.setSlot('quantity', {values: self.quants.threes});
        break;
        case 'Fours':
          self.picker.setSlot('quantity', {values: self.quants.fours});
        break;
        case 'Fives':
          self.picker.setSlot('quantity', {values: self.quants.fives});
        break;
      }
    });

    this.picker.render();
  }
, context: function () {
    var pickerVals = this.picker.getValues();

    return {
      quantity: pickerVals.quantity.value
    , unit: pickerVals.unit.value
    };
  }
, openPicker: function (e) {
    e.preventDefault();
    e.stopPropagation();
    this.picker.show();
  }
});

App = new AppView({
  el: $('#app')
});
