/**
 * Derived from Matteo Spinelli's original implementation, see LICENSE for details
 */

var Ribcage = require('ribcage-view')
	, each = require('lodash.foreach')
  , map = require('lodash.map')
  , bind = require('lodash.bind')
  , clone = require('lodash.clone')
	, Picker;

Picker = Ribcage.extend({
	cellHeight: 44
, friction: 0.003
, isOpen: false

/**
* @param {object} opts - Picker options
*   @param {object} opts.slots - The slots this picker should have
*     @param {object} opts.values - A map of the values this slot should have
*     @param {object} opts.style - The CSS style of this slot
*     @param {object} opts.defaultValue - The key of the default value this slot should have
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

      /**
      * Save the index to the slot, start the offset at 0.
      * Width will be overwritten in afterRender, once we actually
      * can figure out how wide the slot is
      */
      slot.index = i;
      slot.currentOffset = 0;
      slot.width = 0;

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
* The entire widget's markup is created with this template
*/
, template: require('./picker.hbs')

/**
* Shows the picker by sliding it in from the bottom
*/
, show: function () {
    var swWrapper = this.$('.sw-wrapper');

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
* Positions the top of the picker at the bottom of the screen.
* (This is before any transforms are applied)
*/
, repositionWidget: function (e) {
    this.$('.sw-wrapper').css('top', window.innerHeight + window.pageYOffset + 'px');
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
, calculateSlotMaxScrolls: function () {
	  var wrapHeight = this.$('.sw-slots-wrapper').height();

		each(this.slots, function (slot) {
      slot.slotMaxScroll = wrapHeight - slot.el.clientHeight - 86;
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

, afterRender: function () {
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

      // Add the default transition
      ul.style.webkitTransitionTimingFunction = 'cubic-bezier(0, 0, 0.2, 1)';

      // Align the slot at its default key
      if (this.slots[k].defaultValue) {
        this.scrollToValue(k, this.slots[k].defaultValue);
      }
    }

    /**
    * At this point the widget *should* be on the DOM, so we can calculate the
    * widths of the slots.
    */
    this.calculateSlotsWidth();

    /**
    * This widget should be "closed" by default, but we can only safely do this after
    * the widget has been added to the DOM
    */
    this.repositionWidget();
  }

/**
 * TODO: ACTUALLY GET SELECTED VALUES!
 */
, getSelectedValues: function () {
    var count
      , index
      , keys = []
      , values = [];

    this.calculateSlotsWidth();

    each(this.slots, function (slot) {
      // Remove any residual animation
      slot.el.removeEventListener('webkitTransitionEnd', slot.backWithinBoundaries, false);
      slot.el.style.webkitTransitionDuration = '0';

      if (slot.currentOffset > 0) {
        this.setPosition(i, 0);
      } else if (slot.currentOffset < slot.slotMaxScroll) {
        this.setPosition(i, slot.slotMaxScroll);
      }

      index = -Math.round(slot.currentOffset / this.cellHeight);

      count = 0;
      for (var i in this.slots[i].values) {
        if (count == index) {
          keys.push();
          values.push(slot.values[i]);
          break;
        }

        count += 1;
      }
    });

    return { 'keys': keys, 'values': values };
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
    var swFrame = this.$('.sw-frame')[0];

    this.calculateSlotMaxScrolls();

    // Find the clicked slot
    var xPos = e.targetTouches[0].clientX - this.$('.sw-slots').offset().left;  // Clicked position minus left offset (should be 11px)

    // Find tapped slot
    var slot = 0;
    for (var k in this.slots) {
      slot += this.slots[k].width;

      if (xPos < slot) {
        this.activeSlot = k;
        break;
      }
    }

    var slotObj = this.slots[this.activeSlot];
    slotObj.el.removeEventListener('webkitTransitionEnd', slotObj.backWithinBoundaries, false); // Remove transition event (if any)
    slotObj.el.style.webkitTransitionDuration = '0';    // Remove any residual transition

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

    if (this.slots[this.activeSlot].currentOffset > 0 || this.slots[this.activeSlot].currentOffset < this.slots[this.activeSlot].slotMaxScroll) {
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
      , swFrame = $('.sw-frame')[0];

    swFrame.removeEventListener('touchmove', this.scrollMove);
    swFrame.removeEventListener('touchend', this.scrollEnd);

    // If we are outside of the boundaries, let's go back to the sheepfold
    if (this.slots[this.activeSlot].currentOffset > 0 || this.slots[this.activeSlot].currentOffset < this.slots[this.activeSlot].slotMaxScroll) {
      this.scrollTo(this.activeSlot, this.slots[this.activeSlot].currentOffset > 0 ? 0 : this.slots[this.activeSlot].slotMaxScroll);
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

    var scrollDuration = e.timeStamp - this.scrollStartTime;

    var newDuration = (2 * scrollDistance / scrollDuration) / this.friction;
    var newScrollDistance = (this.friction / 2) * (newDuration * newDuration);

    if (newDuration < 0) {
      newDuration = -newDuration;
      newScrollDistance = -newScrollDistance;
    }

    var newPosition = this.slots[this.activeSlot].currentOffset + newScrollDistance;

    if (newPosition > 0) {
      // Prevent the slot to be dragged outside the visible area (top margin)
      newPosition /= 2;
      newDuration /= 3;

      if (newPosition > swSlotWrapper.height() / 4) {
        newPosition = swSlotWrapper.height() / 4;
      }
    } else if (newPosition < this.slots[this.activeSlot].slotMaxScroll) {
      // Prevent the slot to be dragged outside the visible area (bottom margin)
      newPosition = (newPosition - this.slots[this.activeSlot].slotMaxScroll) / 2 + this.slots[this.activeSlot].slotMaxScroll;
      newDuration /= 3;

      if (newPosition < this.slots[this.activeSlot].slotMaxScroll - swSlotWrapper.height() / 4) {
        newPosition = this.slots[this.activeSlot].slotMaxScroll - swSlotWrapper.height() / 4;
      }
    } else {
      newPosition = Math.round(newPosition / this.cellHeight) * this.cellHeight;
    }

    this.scrollTo(this.activeSlot, Math.round(newPosition), Math.round(newDuration) + 'ms');

    return true;
  }

, scrollTo: function (slotNum, dest, runtime) {
    this.slots[slotNum].el.style.webkitTransitionDuration = runtime ? runtime : '100ms';
    this.setPosition(slotNum, dest ? dest : 0);

    // If we are outside of the boundaries go back to the sheepfold
    if (this.slots[slotNum].currentOffset > 0 || this.slots[slotNum].currentOffset < this.slots[slotNum].slotMaxScroll) {
      this.slots[slotNum].el.addEventListener('webkitTransitionEnd', this.slots[slotNum].backWithinBoundaries, false);
    }
  }

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

, backWithinBoundaries: function (slot, key) {
    if(slot) {
      slot.el.removeEventListener('webkitTransitionEnd', slot.backWithinBoundaries, false);
    }

    this.scrollTo(key, slot.currentOffset > 0 ? 0 : slot.slotMaxScroll, '150ms');
    return false;
  }


  /**
   *
   * Buttons
   *
   */

, tapDown: function (e) {
    e.srcElement.addEventListener('touchmove', this.tapCancel, false);
    e.srcElement.addEventListener('touchend', this.tapUp, false);
  }

, tapCancel: function (e) {
    e.srcElement.removeEventListener('touchmove', this.tapCancel, false);
    e.srcElement.removeEventListener('touchend', this.tapUp, false);
  }

, tapUp: function (e) {
    this.tapCancel(e);

    if (e.srcElement.className == 'sw-cancel') {
      if(this.cancelAction)
        this.cancelAction();
    } else {
      if(this.doneAction)
        this.doneAction();
    }

    this.hide();
  }

, setCancelAction: function (action) {
    this.cancelAction = action;
  }

, setDoneAction: function (action) {
    this.doneAction = action;
  }

, cancelAction: function () {
    return false;
  }

, cancelDone: function () {
    return true;
  }
});

module.exports = Picker;
