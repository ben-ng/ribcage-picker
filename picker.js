/**
 * Derived from Matteo Spinelli's original implementation, see LICENSE for details
 */

/* global WebKitCSSMatrix */

var Ribcage = require('ribcage-view')
  , each = require('lodash.foreach')
  , bind = require('lodash.bind')
  , isEqual = require('lodash.isequal')
  , clone = require('lodash.clone')
  , keys = require('lodash.keys')
  , modernizr = require('./modernizr')
  , Picker;

Picker = Ribcage.extend({
  cellHeight: 44
, friction: 0.003
, currentSelection: {}
, defaultsApplied: false
, slotMachineCapable: modernizr.csstransitions &&
                      modernizr.csstransforms &&
                      modernizr.csstransforms3d &&
                      modernizr.touch
, slotMachineOpen: false
, disableToggle: false
, events: {
    'change .js-select': 'onSelectChange'
  , 'touchend .rp-select-blocker': 'toggleSlotMachine'
  }

/**
* @param {object} opts - Picker options
*   @param {object} opts.slots - The slots this picker should have
*     @param {object} opts.values - A map of the values this slot should have
*     @param {object} opts.style - The CSS style of this slot
*     @param {object} opts.defaultKey - The key of the default value this slot should have
*/
, afterInit: function (opts) {
    var self = this
      , i = 0;

    // Clone the user's input because we're going to augment it
    this.slots = clone(opts.slots, true);

    if(opts.onChange)
      this.onChange = bind(opts.onChange, this);

    this.disableToggle = opts.disableToggle === true;

    // Everything beyond here is slotmachine stuff
    if(!this.slotMachineCapable)
      return this;
    this.offsetParent = opts.offsetParent;

    each(this.slots, function (slot, key) {
      /**
      * This function is called when a slot stops scrolling outside its valid boundaries.
      * We bind it with these values to make returnToValidRange faster and simpler.
      */
      slot.returnToValidRange = bind(self.returnToValidRange, self, slot, key);
      slot.onSlotStopsSpinning = bind(self.onSlotStopsSpinning, self, slot, key);

      /**
      * Save the index to the slot, start the offset at 0.
      * Width will be overwritten in afterRender, once we actually
      * can figure out how wide the slot is
      */
      slot.index = i;
      slot.currentOffset = 0;
      slot.width = 0;
      slot.style = slot.style == null ? 'right' : slot.style;
      slot.defaultKey = slot.defaultKey == null ? keys(slot.values)[0] : slot.defaultKey;

      self.currentSelection[key] = {
        key: slot.defaultKey
      , value: slot.values[slot.defaultKey]
      };

      ++i;
    });

    /**
    * We've got to bind these too, since they'll be called in the global context
    */
    this.onTouchStart = bind(this.onTouchStart, this);
    this.scrollStart = bind(this.scrollStart, this);
    this.scrollMove = bind(this.scrollMove, this);
    this.scrollEnd = bind(this.scrollEnd, this);
    this.returnToValidRange = bind(this.returnToValidRange, this);

    /**
    * Global events are kinda nasty, but we need to reposition the widget
    * when the orientation changes, or when the page scrolls because of some other event.
    */
    window.addEventListener('orientationchange', this.calculateSlotWidths, true);
    window.addEventListener('resize', this.calculateSlotWidths, true);
  }

, toggleSlotMachine: function () {
    if(!this.slotMachineOpen || this.disableToggle) {
      this.$('.rp-wrapper').addClass('rp-wrapper-open');
    }
    else {
      this.$('.rp-wrapper').removeClass('rp-wrapper-open');
    }
    this.slotMachineOpen = !this.slotMachineOpen;
  }

/**
* Clean up the events we added in afterInit
*/
, beforeClose: function () {
    var swFrame = this.$('.rp-frame')[0];

    window.removeEventListener('orientationchange', this.calculateSlotWidths, true);
    window.removeEventListener('resize', this.calculateSlotWidths, true);

    for (var slotKey in this.slots) {
      if(this.slots[slotKey].el) {
        this.slots[slotKey].el.removeEventListener('webkitTransitionEnd', this.slots[slotKey].returnToValidRange, false);
        this.slots[slotKey].el.removeEventListener('webkitTransitionEnd', this.slots[slotKey].onSlotStopsSpinning, false);
      }

      delete this.slots[slotKey].returnToValidRange;
      delete this.slots[slotKey].onSlotStopsSpinning;
      delete this.slots[slotKey];
    }

    if(swFrame) {
      swFrame.removeEventListener('touchstart', this.onTouchStart, false);
      swFrame.removeEventListener('touchmove', this.scrollMove, false);
      swFrame.removeEventListener('touchend', this.scrollEnd, false);
    }

    delete this.onChange;
    delete this.currentSelection;
  }

/**
* Lets the user change the values of a slot after a picker has been initialized and shown
*/
, setSlot: function (slotKey, opts) {
    var self = this;

    if(!this.slots[slotKey])
      throw new Error('setSlot can only be used to update a slot that already exists');

    this.getValues();

    this.slots[slotKey].values = clone(opts.values, true);
    this.slots[slotKey].style = opts.style == null ? this.slots[slotKey].style : opts.style;

    this.render();

    // Try our best to keep the same offset in the slot
    each(this.slots, function (slot, slotKey) {
      if(slot.values[self.currentSelection[slotKey].key] != null) {
        self.setSlotKey(slotKey, self.currentSelection[slotKey].key);
      }
      else {
        // The value doesn't exist.. try to scroll as physically close as possible
        self.scrollToSlotOffset(slotKey, slot.currentOffset);
      }
    });
  }

/**
* The entire widget's markup is created with this template
*/
, template: require('./picker.hbs')

/**
* Delegates the handling of touch gestures to
* either the scroll or dismissal handlers
*/
, onTouchStart: function (e) {
    var target = event.target || event.srcElement;
    if (target.className.indexOf('rp-frame') >= 0) {
      // Stop the screen from moving!
      e.preventDefault();
      e.stopPropagation();

      this.scrollStart(e);
    }

    // Let other events pass through
  }

/**
* Iterate through each slot and get the width of each one
*/
, calculateSlotWidths: function () {
    var div = this.$('.rp-slots').children('div')
      , i = 0;

    each(this.slots, function (slot) {
      slot.width = div[i].offsetWidth;
      i++;
    });
  }

/**
* Iterate through each slot and get the height of each one
*/
, calculateMaxOffsets: function () {
    var wrapHeight = this.$('.rp-slots-wrapper').height();

    each(this.slots, function (slot) {
      slot.maxOffset = wrapHeight - slot.el.clientHeight - 86;
    });
  }

/**
* Pass the slot object to the template so it can construct the lists
*/
, context: function () {
    return {
      slots: this.slots
    , slotMachineCapable: this.slotMachineCapable
    , slotMachineOpen: this.disableToggle ? true : this.slotMachineOpen
    };
  }

/**
* The afterRender function does the things we can't do in afterInit
* namely, getting references to the newly created DOM elements,
* setting the default transition on the slots, and scrolling them to
* their default values.
*/
, afterRender: function () {
    var self = this
      , swWrapper = this.$('.rp-wrapper')
      , isReady = swWrapper.height() > 0;

    /**
    * If no slot machine is available, this block will either
    * apply the default value or select the last selected value
    */
    if(!this.slotMachineCapable) {
      each(this.slots, function (slot, k) {
        // Align the slot at its default key if it is not already open
        if (!this.defaultsApplied && slot.defaultKey != null) {
          self.setSlotKey(k, slot.defaultKey);
        }
        else if(self.currentSelection[k]) {
          self.setSlotKey(k, self.currentSelection[k].key);
        }
      });

      this.defaultsApplied = true;

      return this;
    }

    this.activeSlot = null;

    for (var  k in this.slots) {
      /**
      * Save the jquery wrapped element to the slot
      * for convenience
      */
      var $ul = this.$('ul.picker-slot-' + k)
        , ul = $ul[0];

      this.slots[k].$el = $ul;
      this.slots[k].el = ul;

      // Listen for transitionEnd events
      ul.addEventListener('webkitTransitionEnd', this.slots[k].onSlotStopsSpinning, false);
    }

    /**
    * At this point the widget *should* be on the DOM, so we can calculate the
    * widths and heights of the slots.
    */
    this.calculateSlotWidths();
    this.calculateMaxOffsets();

    if(isReady) {
      each(this.slots, function (slot, k) {
        // Wipe out any transition
        slot.el.removeEventListener('webkitTransitionEnd', slot.returnToValidRange, false);
        slot.el.style.webkitTransitionDuration = '0';
        self.setSlotOffset(k, slot.currentOffset);

        // Add the default transition
        slot.el.style.webkitTransitionTimingFunction = 'cubic-bezier(0, 0, 0.2, 1)';
      });
    }

    /**
    * If no default has been applied yet, try to apply one
    */
    if(!this.defaultsApplied) {
      this.defaultsApplied = true;

      each(this.slots, function (slot, k) {
        // Align the slot at its default key if it is not already open
        if (slot.defaultKey != null) {
          self.setSlotKey(k, slot.defaultKey);
        }

        // Add the default transition
        slot.el.style.webkitTransitionTimingFunction = 'cubic-bezier(0, 0, 0.2, 1)';
      });
    }
    /**
    * Otherwise, restore what ever was last selected
    */
    else {
      each(this.slots, function (slot, k) {
        if(self.currentSelection[k]) {
          self.setSlotKey(k, self.currentSelection[k].key);
        }

        // Add the default transition
        slot.el.style.webkitTransitionTimingFunction = 'cubic-bezier(0, 0, 0.2, 1)';
      });
    }

    /**
    * Uses our scrolling logic when touches happen inside the picker
    */
    this.$('.rp-frame')[0].addEventListener('touchstart', this.onTouchStart, false);
  }

/**
 *
 * Rolling slots
 *
 */

, scrollStart: function (e) {
    var swFrame = this.$('.rp-frame')[0]
      , xPos
      , slot;

    /**
    * Find the clicked slot
    * Clicked position minus left offset (should be 11px)
    */
    xPos = e.targetTouches[0].clientX - this.$('.rp-slots').offset().left;

    slot = 0;

    for (var k in this.slots) {
      slot += this.slots[k].width;

      if (xPos < slot) {
        this.activeSlot = k;
        break;
      }
    }

    var slotObj = this.slots[this.activeSlot];

    // Wipe out any transition
    slotObj.el.removeEventListener('webkitTransitionEnd', slotObj.returnToValidRange, false);
    slotObj.el.style.webkitTransitionDuration = '0';

    // Stop and hold slot position
    var theTransform = window.getComputedStyle(this.slots[this.activeSlot].el).webkitTransform;
    theTransform = new WebKitCSSMatrix(theTransform).m42;
    if (theTransform != this.slots[this.activeSlot].currentOffset) {
      this.setSlotOffset(this.activeSlot, theTransform);
    }

    this.startY = e.targetTouches[0].clientY;
    this.scrollStartY = this.slots[this.activeSlot].currentOffset;
    this.scrollStartTime = e.timeStamp;

    swFrame.addEventListener('touchmove', this.scrollMove, false);
    swFrame.addEventListener('touchend', this.scrollEnd, false);

    return true;
  }

, scrollMove: function (e) {

    var topDelta = e.targetTouches[0].clientY - this.startY;

    if (this.slots[this.activeSlot].currentOffset > 0 || this.slots[this.activeSlot].currentOffset < this.slots[this.activeSlot].maxOffset) {
      topDelta /= 2;
    }

    this.setSlotOffset(this.activeSlot, this.slots[this.activeSlot].currentOffset + topDelta);
    this.startY = e.targetTouches[0].clientY;

    // Prevent slingshot effect
    if (e.timeStamp - this.scrollStartTime > 80) {
      this.scrollStartY = this.slots[this.activeSlot].currentOffset;
      this.scrollStartTime = e.timeStamp;
    }
  }

, scrollEnd: function (e) {
    var swSlotWrapper = this.$('.rp-wrapper')
      , swFrame = this.$('.rp-frame')[0]
      , scrollDuration = e.timeStamp - this.scrollStartTime
      , newDuration
      , newScrollDistance
      , newPosition;

    swFrame.removeEventListener('touchmove', this.scrollMove);
    swFrame.removeEventListener('touchend', this.scrollEnd);

    // If we are outside of the boundaries, let's go back to the sheepfold
    if (this.slots[this.activeSlot].currentOffset > 0 || this.slots[this.activeSlot].currentOffset < this.slots[this.activeSlot].maxOffset) {
      this.scrollToSlotOffset(this.activeSlot, this.slots[this.activeSlot].currentOffset > 0 ? 0 : this.slots[this.activeSlot].maxOffset);
      return false;
    }

    // Lame formula to calculate a fake deceleration
    var scrollDistance = this.slots[this.activeSlot].currentOffset - this.scrollStartY;

    // The drag session was too short
    if (scrollDistance < this.cellHeight / 1.5 && scrollDistance > -this.cellHeight / 1.5) {
      if (this.slots[this.activeSlot].currentOffset % this.cellHeight) {
        this.scrollToSlotOffset(this.activeSlot, Math.round(this.slots[this.activeSlot].currentOffset / this.cellHeight) * this.cellHeight, '100ms');
      }

      return false;
    }

    newDuration = (2 * scrollDistance / scrollDuration) / this.friction;
    newScrollDistance = (this.friction / 2) * (newDuration * newDuration);

    if (newDuration < 0) {
      newDuration = -newDuration;
      newScrollDistance = -newScrollDistance;
    }

    newPosition = this.slots[this.activeSlot].currentOffset + newScrollDistance;

    if (newPosition > 0) {
      // Prevent the slot to be dragged outside the visible area (top margin)
      newPosition /= 2;
      newDuration /= 3;

      if (newPosition > swSlotWrapper.height() / 4) {
        newPosition = swSlotWrapper.height() / 4;
      }
    } else if (newPosition < this.slots[this.activeSlot].maxOffset) {
      // Prevent the slot to be dragged outside the visible area (bottom margin)
      newPosition = (newPosition - this.slots[this.activeSlot].maxOffset) / 2 + this.slots[this.activeSlot].maxOffset;
      newDuration /= 3;

      if (newPosition < this.slots[this.activeSlot].maxOffset - swSlotWrapper.height() / 4) {
        newPosition = this.slots[this.activeSlot].maxOffset - swSlotWrapper.height() / 4;
      }
    } else {
      newPosition = Math.round(newPosition / this.cellHeight) * this.cellHeight;
    }

    this.scrollToSlotOffset(this.activeSlot, Math.round(newPosition), Math.round(newDuration) + 'ms');

    return true;
  }

/**
* Scrolls the slot to a specified offset, and attaches a handler
* that will bounce it back to the valid range if the destination
* is out of bounds.
*/
, scrollToSlotOffset: function (slotKey, dest, runtime) {
    if(!this.slotMachineCapable) {
      var valKeys = keys(this.slots[slotKey].values);

      if(dest >= valKeys.length)
        dest = valKeys.length - 1;

      if(dest < 0)
        dest = 0;

      this.setSlotKey(slotKey, valKeys[dest]);

      return this;
    }

    this.slots[slotKey].el.style.webkitTransitionDuration = runtime ? runtime : '100ms';
    this.setSlotOffset(slotKey, dest ? dest : 0);

    // If we are outside of the boundaries go back to the sheepfold
    if (this.slots[slotKey].currentOffset > 0 || this.slots[slotKey].currentOffset < this.slots[slotKey].maxOffset) {
      this.slots[slotKey].el.addEventListener('webkitTransitionEnd', this.slots[slotKey].returnToValidRange, false);
    }
  }

/**
* Given an offset, moves the slot to that offset immediately
*/
, setSlotOffset: function (slot, pos) {
    this.slots[slot].currentOffset = pos;
    this.slots[slot].el.style.webkitTransform = 'translate3d(0, ' + pos + 'px, 0)';
  }

/**
* Given a key, scrolls the slot to that cell
*/
, setSlotKey: function (slotKey, valueKey) {
    var yPos, count, i;

    this.$('.picker-select-' + slotKey).val(valueKey);

    this.currentSelection[slotKey] = {
      key: valueKey
    , value: this.slots[slotKey].values[valueKey]
    };

    if(!this.slotMachineCapable)
      return this;

    this.slots[slotKey].el.removeEventListener('webkitTransitionEnd', this.slots[slotKey].returnToValidRange, false);
    this.slots[slotKey].el.style.webkitTransitionDuration = '0';

    count = 0;
    for (i in this.slots[slotKey].values) {
      if (i == valueKey) {
        yPos = count * this.cellHeight;
        this.setSlotOffset(slotKey, yPos);
        break;
      }

      count -= 1;
    }
  }

/**
* This event handler is called when a scroll animation has ended, but
* we knew that the scroll was going out of bounds. This function
* ensures that the slot scrolls back within the valid bounds
*/
, returnToValidRange: function (slot, key) {
    if(slot) {
      slot.el.removeEventListener('webkitTransitionEnd', slot.returnToValidRange, false);
    }

    this.scrollToSlotOffset(key, slot.currentOffset > 0 ? 0 : slot.maxOffset, '150ms');
    return false;
  }

/**
* Called when a slot stops spinning, used to trigger the `change` event
*/
, onSlotStopsSpinning: function () {
    var self = this
      , newSelection = this.getValues()
      , different = false;

    each(newSelection, function (slot, slotKey) {
      if(! isEqual(newSelection[slotKey], self.currentSelection[slotKey])) {
        self.setSlotKey(slotKey, newSelection[slotKey].key);
        self.onChange(newSelection, slotKey, slot);

        different = true;
        return;
      }
    });

    if(different) {
      this.onChange(newSelection);
    }

    this.currentSelection = newSelection;
  }

/**
* Called when a <select> value is changed
*/
, onSelectChange: function (e) {
    var elem = this.$(e.target)
      , key = elem.attr('class').split('-').pop()
      , slot = this.slots[key];

    this.getValues();

    this.trigger('change:' + key, clone(this.currentSelection[key], true), slot, key);
    this.trigger('change', clone(this.currentSelection, true));
  }

, onChange: function (newSelection, slotKey, slot) {
    if(slotKey && slot) {
      this.trigger('change:' + slotKey, newSelection[slotKey], slot, slotKey);
    }
    else {
      this.trigger('change', clone(this.currentSelection, true));
    }
  }

, getValues: function () {
    var self = this
      , count
      , index
      , i
      , response = {};

    // If there is no slotmachine, read from the select input
    if(!this.slotMachineCapable) {
      each(this.slots, function (slot, key) {
        i = self.$('.picker-select-' + key).val();
        response[key] = {key: i, value: slot.values[i]};
        slot.currentOffset = keys(slot.values).indexOf(i);    // Needed for setSlot
      });

      this.currentSelection = response;

      return clone(response, true);
    }

    // Not ready! Return defaults!
    if(this.$el.width() <= 0) {
      return clone(this.currentSelection, true);
    }

    this.calculateSlotWidths();

    each(this.slots, function (slot, key) {
      // Remove any residual animation
      slot.el.removeEventListener('webkitTransitionEnd', slot.returnToValidRange, false);
      slot.el.style.webkitTransitionDuration = '0';

      if (slot.currentOffset > 0) {
        self.setSlotOffset(key, 0);
      } else if (slot.currentOffset < slot.maxOffset) {
        self.setSlotOffset(key, slot.maxOffset);
      }

      index = -Math.round(slot.currentOffset / self.cellHeight);

      count = 0;
      for (var i in slot.values) {
        if (count == index) {
          response[key] = {key: i, value: slot.values[i]};
          break;
        }

        count += 1;
      }
    });

    return response;
  }
});

module.exports = Picker;
