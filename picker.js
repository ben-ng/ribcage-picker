/**
 * Derived from Matteo Spinelli's original implementation, see LICENSE for details
 */

var Ribcage = require('ribcage-view')
	, each = require('lodash.foreach')
  , bind = require('lodash.bind')
  , isEqual = require('lodash.isequal')
  , clone = require('lodash.clone')
	, Picker;

Picker = Ribcage.extend({
	cellHeight: 44
, friction: 0.003
, isOpen: false
, isFirstOpen: true
, currentSelection: {}

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
		this.slots = clone(opts.slots);

    each(this.slots, function (slot, key) {
      /**
      * This function is called when a slot stops scrolling outside its valid boundaries.
      * We bind it with these values to make backWithinBoundaries faster and simpler.
      */
      slot.backWithinBoundaries = bind(self.backWithinBoundaries, self, slot, key);
      slot.onTransitionEnd = bind(self.onTransitionEnd, self, slot, key);

      /**
      * Save the index to the slot, start the offset at 0.
      * Width will be overwritten in afterRender, once we actually
      * can figure out how wide the slot is
      */
      slot.index = i;
      slot.currentOffset = 0;
      slot.width = 0;
      slot.defaultKey = slot.defaultKey == null ? Object.keys(slot.values)[0] : slot.defaultKey;

      ++i;
    });

    /**
    * We've got to bind these too, since they'll be called in the global context
    */
    this.tapCancel = bind(this.tapCancel, this);
    this.tapUp = bind(this.tapUp, this);
    this.onTouchStart = bind(this.onTouchStart, this);
    this.onOrientationChange = bind(this.onOrientationChange, this);
    this.repositionWidget = bind(this.repositionWidget, this);
		this.scrollStart = bind(this.scrollStart, this);
		this.scrollMove = bind(this.scrollMove, this);
		this.scrollEnd = bind(this.scrollEnd, this);
    this.backWithinBoundaries = bind(this.backWithinBoundaries, this);
	}

/**
* Lets the user change the values of a slot after a picker has been initialized and shown
*/
, setSlot: function (slotKey, opts) {
    if(!this.slots[slotKey])
      throw new Error('setSlot can only be used to update a slot that already exists');

    this.slots[slotKey].values = clone(opts.values);

    this.render();

    // Try our best to keep the same offset in the slot
    if(this.slots[slotKey].values[this.currentSelection[slotKey].value] != null) {
      this.scrollToValue(slotKey, this.currentSelection[slotKey].key);
    }
    else {
      // The value doesn't exist.. try to scroll as close as possible
      this.scrollTo(slotKey, this.slots[slotKey].currentOffset);
    }
  }

/**
* The entire widget's markup is created with this template
*/
, template: require('./picker.hbs')

/**
* Shows the picker by sliding it in from the bottom
*/
, show: function () {
    var self = this
      , swWrapper = this.$('.sw-wrapper');

    this.isOpen = true;

    if(this.isFirstOpen) {
      this.isFirstOpen = false;

      each(this.slots, function (slot, k) {
        // Align the slot at its default key if it is not already open
        if (slot.defaultKey != null) {
          self.scrollToValue(k, slot.defaultKey);
        }

        // Add the default transition
        slot.el.style.webkitTransitionTimingFunction = 'cubic-bezier(0, 0, 0.2, 1)';
      });
    }

    /**
    * This stops the picker from "sliding around"
    * after an orientation change or scroll event.
    * It'll just snap to the correct location.
    */
    swWrapper.one('webkitTransitionEnd', function () {
      swWrapper.css({
        webkitTransitionDuration: '0ms'
      });
    });

    /**
    * Opens up the wrapper with a transform
    */
    swWrapper.css({
      webkitTransitionTimingFunction: 'ease-out'
    , webkitTransitionDuration: '400ms'
    , webkitTransform:'translate3d(0, -260px, 0)'
    });

    /**
    * Disables all scrolling outside of the wrapper until it is dismissed
    * and uses our scrolling logic when touches happen inside the picker
    */
    document.addEventListener('touchstart', this.onTouchStart, false);

    /**
    * Global events are kinda nasty, but we need to reposition the widget
    * when the orientation changes, or when the page scrolls because of some other event.
    */
    window.addEventListener('orientationchange', this.onOrientationChange, true);
    window.addEventListener('scroll', this.repositionWidget, true);
  }

/**
* Hides the picker by sliding it down and out
*/
, hide: function () {
    var swWrapper = this.$('.sw-wrapper');

    this.isOpen = false;

    /**
    * Removes any residual transition
    */
    swWrapper.one('webkitTransitionEnd', function () {
      swWrapper.css({
        webkitTransitionDuration: '0ms'
      });
    });

    /**
    * Closes the wrapper with a transform
    */
    swWrapper.css({
      webkitTransitionTimingFunction: 'ease-in'
    , webkitTransitionDuration: '400ms'
    , webkitTransform:'translate3d(0, 0, 0)'
    });

    /**
    * Enable all scrolling and tapping again
    */
    document.removeEventListener('touchstart', this.onTouchStart, false);
    window.removeEventListener('orientationchange', this.onOrientationChange, true);
    window.removeEventListener('scroll', this.repositionWidget, true);
  }

/**
* Delegates the handling of touch gestures to
* either the scroll or dismissal handlers
*/
, onTouchStart: function (e) {
    // Stop the screen from moving!
    e.preventDefault();
    e.stopPropagation();

    if (e.srcElement.className == 'sw-cancel' || e.srcElement.className == 'sw-done') {
      this.tapDown(e);
    } else if (e.srcElement.className == 'sw-frame') {
      this.scrollStart(e);
    }
  }

/**
* Iterate through each slot and get the width of each one
*/
, calculateSlotsWidth: function () {
    var div = this.$('.sw-slots').children('div')
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
	  var wrapHeight = this.$('.sw-slots-wrapper').height();

		each(this.slots, function (slot) {
      slot.maxOffset = wrapHeight - slot.el.clientHeight - 86;
		})
	}

/**
* Pass the slot object to the template so it can construct the lists
*/
, context: function () {
    return {
      slots: this.slots
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
      , swWrapper = this.$('.sw-wrapper')
      , isReady = swWrapper.height() > 0;

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
      ul.addEventListener('webkitTransitionEnd', this.slots[k].onTransitionEnd, false);
    }

    /**
    * At this point the widget *should* be on the DOM, so we can calculate the
    * widths and heights of the slots.
    */
    this.calculateSlotsWidth();
    this.calculateMaxOffsets();

    /**
    * This widget should be "closed" by default, but we can only safely do this after
    * the widget has been added to the DOM
    */
    this.repositionWidget();

    if(isReady && !this.isFirstOpen) {
      each(this.slots, function (slot, k) {
        // Wipe out any transition
        slot.el.removeEventListener('webkitTransitionEnd', slot.backWithinBoundaries, false);
        slot.el.style.webkitTransitionDuration = '0';
        self.setPosition(k, slot.currentOffset);

        // Add the default transition
        slot.el.style.webkitTransitionTimingFunction = 'cubic-bezier(0, 0, 0.2, 1)';
      });
    }

    /**
    * This handles the case where the picker is rendered by its parent view while
    * it is still open
    */
    if(this.isOpen) {
      /**
      * Opens up the wrapper without a transform
      */
      swWrapper.css({
        webkitTransitionTimingFunction: 'ease-out'
      , webkitTransitionDuration: '0ms'
      , webkitTransform:'translate3d(0, -260px, 0)'
      });
    }
  }

/**
 *
 * Rolling slots
 *
 */

, setPosition: function (slot, pos) {
    this.slots[slot].currentOffset = pos;
    this.slots[slot].el.style.webkitTransform = 'translate3d(0, ' + pos + 'px, 0)';
  }

, scrollStart: function (e) {
    var swFrame = this.$('.sw-frame')[0]
      , xPos
      , slot;

    /**
    * Find the clicked slot
    * Clicked position minus left offset (should be 11px)
    */
    xPos = e.targetTouches[0].clientX - this.$('.sw-slots').offset().left;

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
    slotObj.el.removeEventListener('webkitTransitionEnd', slotObj.backWithinBoundaries, false);
    slotObj.el.style.webkitTransitionDuration = '0';

    // Stop and hold slot position
    var theTransform = window.getComputedStyle(this.slots[this.activeSlot].el).webkitTransform;
    theTransform = new WebKitCSSMatrix(theTransform).m42;
    if (theTransform != this.slots[this.activeSlot].currentOffset) {
      this.setPosition(this.activeSlot, theTransform);
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

    this.setPosition(this.activeSlot, this.slots[this.activeSlot].currentOffset + topDelta);
    this.startY = e.targetTouches[0].clientY;

    // Prevent slingshot effect
    if (e.timeStamp - this.scrollStartTime > 80) {
      this.scrollStartY = this.slots[this.activeSlot].currentOffset;
      this.scrollStartTime = e.timeStamp;
    }
  }

, scrollEnd: function (e) {
		var swSlotWrapper = this.$('.sw-wrapper')
      , swFrame = $('.sw-frame')[0]
      , scrollDuration = e.timeStamp - this.scrollStartTime
      , newDuration
      , newScrollDistance
      , newPosition;

    swFrame.removeEventListener('touchmove', this.scrollMove);
    swFrame.removeEventListener('touchend', this.scrollEnd);

    // If we are outside of the boundaries, let's go back to the sheepfold
    if (this.slots[this.activeSlot].currentOffset > 0 || this.slots[this.activeSlot].currentOffset < this.slots[this.activeSlot].maxOffset) {
      this.scrollTo(this.activeSlot, this.slots[this.activeSlot].currentOffset > 0 ? 0 : this.slots[this.activeSlot].maxOffset);
      return false;
    }

    // Lame formula to calculate a fake deceleration
    var scrollDistance = this.slots[this.activeSlot].currentOffset - this.scrollStartY;

    // The drag session was too short
    if (scrollDistance < this.cellHeight / 1.5 && scrollDistance > -this.cellHeight / 1.5) {
      if (this.slots[this.activeSlot].currentOffset % this.cellHeight) {
        this.scrollTo(this.activeSlot, Math.round(this.slots[this.activeSlot].currentOffset / this.cellHeight) * this.cellHeight, '100ms');
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

    this.scrollTo(this.activeSlot, Math.round(newPosition), Math.round(newDuration) + 'ms');

    return true;
  }

/**
* Scrolls the slot to a specified offset, and attaches a handler
* that will bounce it back to the valid range if the destination
* is out of bounds.
*/
, scrollTo: function (slotNum, dest, runtime) {
    this.slots[slotNum].el.style.webkitTransitionDuration = runtime ? runtime : '100ms';
    this.setPosition(slotNum, dest ? dest : 0);

    // If we are outside of the boundaries go back to the sheepfold
    if (this.slots[slotNum].currentOffset > 0 || this.slots[slotNum].currentOffset < this.slots[slotNum].maxOffset) {
      this.slots[slotNum].el.addEventListener('webkitTransitionEnd', this.slots[slotNum].backWithinBoundaries, false);
    }
  }

/**
* Given a key, scrolls the slot to that cell
*/
, scrollToValue: function (slot, value) {
    var yPos, count, i;

    this.slots[slot].el.removeEventListener('webkitTransitionEnd', this.slots[slot].backWithinBoundaries, false);
    this.slots[slot].el.style.webkitTransitionDuration = '0';

    count = 0;
    for (i in this.slots[slot].values) {
      if (i == value) {
        yPos = count * this.cellHeight;
        this.setPosition(slot, yPos);
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
, backWithinBoundaries: function (slot, key) {
    if(slot) {
      slot.el.removeEventListener('webkitTransitionEnd', slot.backWithinBoundaries, false);
    }

    this.scrollTo(key, slot.currentOffset > 0 ? 0 : slot.maxOffset, '150ms');
    return false;
  }

/**
* Called when a slot stops spinning, used to trigger the `change` event
*/
, onTransitionEnd: function (slot, key) {
    var self = this
      , newSelection = this.getValues()
      , different = false;

    each(newSelection, function (slot) {
      if(! isEqual(newSelection[key], self.currentSelection[key])) {
        self.currentSelection[key] = newSelection[key];

        self.trigger('change:' + key, newSelection[key], slot, key);

        different = true;
        return;
      }
    });

    if(different) {
      this.trigger('change', newSelection);
    }

    this.currentSelection = newSelection;
  }

, getValues: function () {
    var self = this
      , count
      , index
      , response = {};


    if(this.isFirstOpen) {
      // We're not ready yet, so just return the defaults
      each(this.slots, function (slot, key) {
        response[key] = {key: slot.defaultKey, value: slot.values[slot.defaultKey]}
      });

      return response;
    }

    this.calculateSlotsWidth();

    each(this.slots, function (slot, key) {
      // Remove any residual animation
      slot.el.removeEventListener('webkitTransitionEnd', slot.backWithinBoundaries, false);
      slot.el.style.webkitTransitionDuration = '0';

      if (slot.currentOffset > 0) {
        self.setPosition(key, 0);
      } else if (slot.currentOffset < slot.maxOffset) {
        self.setPosition(key, slot.maxOffset);
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

/**
* Positions the top of the picker at the bottom of the screen.
* (This is before any transforms are applied)
*/
, repositionWidget: function (e) {
    this.$('.sw-wrapper').css('top', window.innerHeight + window.pageYOffset + 'px');
  }

/**
* On an orientation change, the window should be scrolled back to the top,
* the widget should be aligned at the bottom of the screen,
* and the column widths needs to be recalculated
*/
, onOrientationChange: function (e) {
    window.scrollTo(0, 0);
    this.repositionWidget();
    this.calculateSlotsWidth();
  }

/**
 * Called when a touch starts on either the cancel or done buttons
 */
, tapDown: function (e) {
    /**
    * Bind the move and end events once a touch starts
    */
    e.srcElement.addEventListener('touchmove', this.tapCancel, false);
    e.srcElement.addEventListener('touchend', this.tapUp, false);
  }

/**
* If a finger moves while its on a button, we should interpret that
* as a "cancelled" touch, and remove the event listners
*/
, tapCancel: function (e) {
    e.srcElement.removeEventListener('touchmove', this.tapCancel, false);
    e.srcElement.removeEventListener('touchend', this.tapUp, false);
  }

/**
* If this event handler is called, it means that a finger touched and
* lifted off a button without moving. This should be interpreted as
* a button push.
*/
, tapUp: function (e) {
    // Remove the event listeners from the button
    this.tapCancel(e);

    // Fire off the correct callback
    if (e.srcElement.className == 'sw-cancel') {
      if(this.cancelAction)
        this.cancelAction();
    } else {
      if(this.doneAction)
        this.doneAction();
    }

    // Slide the picker widget out of view
    this.hide();
  }

, setCancelAction: function (action) {
    this.cancelAction = action;
  }

, setDoneAction: function (action) {
    this.doneAction = action;
  }
});

module.exports = Picker;
