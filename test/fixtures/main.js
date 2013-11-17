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
    var quants = {};

    for(var i=1, ii=100; i<=ii; i++) {
      quants[i] = i;
    }

    this.picker = new Picker({
      slots: {
        quantity: {
          values: quants
        , style: 'right'
        , defaultKey: '50'
        }
      , unit: {
          values: {
            '1': 'Kg'
          , '2': 'lb'
          , '3': 'oz'
          }
        , style: 'right'
        }
      }
    });
  }
, afterRender: function () {
    this.appendSubview(this.picker, this.$('.spinholder'));
    this.listenTo(this.picker, 'change', function () {
      this.render();
    })
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
