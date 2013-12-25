var Picker = require('../../picker')
  , Ribcage = require('ribcage-view')
  , AppView
  , App;

// require('phantom-limb');

AppView = Ribcage.extend({
  template: require('./app.hbs')
, quantity: 50
, unit: 'lb'
, afterInit: function () {
    var i
      , ii
      , threes = {}
      , fours = {}
      , fives = {};

    for(i=1, ii=100; i<=ii; i++) {
      threes[i * 3] = i * 3;
    }

    for(i=1, ii=100; i<=ii; i++) {
      fours[i * 4] = i * 4;
    }

    for(i=1, ii=50; i<=ii; i++) {
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
  }
, afterRender: function () {
    var self = this;

    this.stopListening(this.picker);

    this.appendSubview(this.picker, this.$('.spinholder'));

    this.picker.render();
    this.picker.delegateEvents();

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
, context: function () {
    var pickerVals = this.picker.getValues();

    return {
      quantity: pickerVals.quantity.value
    , unit: pickerVals.unit.key
    };
  }
});

App = new AppView();
document.body.appendChild(App.el);
App.el.id = 'app';
App.render();
