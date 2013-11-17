ribcage-picker
==============

This is a widget that mimics the native "slot-machine" style pickers now ubiquitious on our mobile devices.

`ribcage-picker` is a [Backbone](http://backbonejs.org/) view, best served with the other great components in the [ribcage-ui](https://github.com/Techwraith/ribcage-ui) collection.

Usage
-----

#### Creating A Picker

```js
var Picker = require('ribcage-picker')
  , picker;

picker = new Picker({
  slots: {
    quantity: {
      values: {1: .5, 2: 1, 3: 1.5, 4: 2}
    , defaultKey: 5
    }
  , unit: {
      values: {
        kilograms: 'kg'
      , pounds: 'lb'
      }
    , style: 'left'
    }
  }
});
```

#### Changing Slot Values

What if we wanted the quantity slot to change in response to the selected unit? Imperial units usually have fractional quantities, while Metric units have decimal quantities.

We can use `.setSlot` for this.

```js
picker.setSlot('quantity', {
  values: {
    1: '1/2'
  , 2: '1'
  , 3: '1-1/2'
  , 4: '2'
  }
, style: 'left' // You can also change the style if you'd like
                // But you can't change the defaultKey anymore
                // After all, it only makes sense to use it the first time the picker is opened
});
```

When `setSlot` is used, `ribcage-picker` will attempt to scroll the slot to a value with the same key. If it can't find a matching key, it will try to scroll the slot as close as possible to the physical location of the last selected row.

In this example, switching between the fractional and decimal units will be seamless, because the keys correspond to equivalent values.

#### Listening For Changes

Pickers emit `change` events. You can listen for a specific slot with `change:<slot>`.

```js
// Render your view when the picker changes in value
this.listenTo(picker, 'change', this.render);

// Change one slot in response to another one changing
this.listenTo(picker, 'change:unit', function (selection) {
  // Selection is {key: <something>, value: <something>}
  switch(selection.value) {
    'lb':
      this.picker.setSlot('quantity', {values: fractionalValues});
      break;

    'kg':
      this.picker.setSlot('quantity', {values: decimalValues});
      break;
  }
});
```

Limitations
-----------

This widget will **only** work on iOS and Android devices. While you can use it standalone just fine, I intended it to be a building block of more robust, responsive widgets that work on all devices.

Is `ribcage-picker` missing a feature you need? Send me a PR!

License & Acknowledgements
--------------------------

The first version of this widget was written over four years ago by the amazing [Matteo Spinelli](http://cubiq.org/spinning-wheel-on-webkit-for-iphone-ipod-touch).

Without the original project, `ribcage-picker` would have been significantly harder to put together.

A shoutout to @techwraith, without whom `ribcage-ui` and this widget wouldn't have happened.


Copyright (c) 2013 Ben Ng, http://benng.me & Matteo Spinelli, http://cubiq.org/

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
