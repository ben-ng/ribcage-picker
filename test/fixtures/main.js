var Picker = require('../../picker')
  , Ribcage = require('ribcage-view')
  , Backbone = require('backbone')
  , phantom = require('phantom-limb')
  , $ = require('jquery-browserify')
  , AppView
  , App;

Backbone.$ = $;

AppView = Ribcage.extend({
  template: require('./app.hbs')
, quantity: 50
, unit: 'lb'
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
        , defaultKey: 30
        }
      , unit: {
          values: {
            Threes: 3
          , Fours: 4
          , Fives: 5
          }
        , style: 'right'
        }
      }
    });

    this.listenTo(this.picker, 'change', function () {
      var pickerVals = self.context();

      self.$('.quantity').text(pickerVals.quantity);
      self.$('.unit').text(pickerVals.unit);
    });

    this.listenTo(this.picker, 'change:unit', function (newData) {
      switch(newData.key) {
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
  }
, afterRender: function () {
    var self = this;

    this.appendSubview(this.picker, this.$('.spinholder'));

    this.picker.render();
  }
, context: function () {
    var pickerVals = this.picker.getValues();

    return {
      quantity: pickerVals.quantity.value
    , unit: pickerVals.unit.key
    };
  }
});

App = new AppView({
  el: $('#app')
});
