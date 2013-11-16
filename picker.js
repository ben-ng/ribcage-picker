/**
 *
 * Find more about the Spinning Wheel function at
 * http://cubiq.org/spinning-wheel-on-webkit-for-iphone-ipod-touch/11
 *
 * Copyright (c) 2009 Matteo Spinelli, http://cubiq.org/
 * Released under MIT license
 * http://cubiq.org/dropbox/mit-license.txt
 *
 * Version 1.4 - Last updated: 2009.07.09
 *
 */

var Ribcage = require('ribcage-view')
	, each = require('lodash.foreach')
  , map = require('lodash.map')
  , bind = require('lodash.bind')
	, Picker;

Picker = Ribcage.extend({
	cellHeight: 44
, friction: 0.003
, slotData: []

, events: {
    'touchstart .sw-frame': 'scrollStart'
  }

, afterInit: function (opts) {
		var self = this;

		this.slots = opts.slots;

    each(this.slots, function (slot, key) {
      slot.backWithinBoundaries = bind(self.backWithinBoundaries, self, slot, key);
    });

		this.onTouchMove = bind(this.onTouchMove, this);
		this.scrollStart = bind(this.scrollStart, this);
		this.scrollMove = bind(this.scrollMove, this);
		this.scrollEnd = bind(this.scrollEnd, this);
		this.backWithinBoundaries = bind(this.backWithinBoundaries, this);
	}

/**
* TODO: Pull these out of the events hash?
*/

, template: require('./picker.hbs')

/**
* Global Events
*/

, bindGlobalEvents: function () {
    // Global events
    if(!this.eventsAreBound) {
    	this.eventsAreBound = true;
	    window.addEventListener('orientationchange', this.onOrientationChange, true);   // Optimize SW on orientation change
	    window.addEventListener('scroll', this.onScroll, true);        // Reposition SW on page scroll
    }
	}

, onTouchMove: function (e) {
	  this.lockScreen(e);

	  if (e.srcElement.className == 'sw-cancel' || e.srcElement.className == 'sw-done') {
	    this.tapCancel(e);
	  } else if (e.srcElement.className == 'sw-frame') {
	    this.scrollMove(e);
	  }
	}

, onOrientationChange: function (e) {
    window.scrollTo(0, 0);
    this.$('.sw-wrapper').css('top', window.innerHeight + window.pageYOffset + 'px');
    this.calculateSlotsWidth();
  }

, onScroll: function (e) {
    this.$('.sw-wrapper').css('top', window.innerHeight + window.pageYOffset + 'px');
  }

, lockScreen: function (e) {
    e.preventDefault();
    e.stopPropagation();
  }

, calculateSlotsWidth: function () {
    var div = this.$('.sw-slots').children('div')
      , i = 0;

    each(this.slots, function (slot) {
      slot.slotWidth = div[i].offsetWidth;
      i++;
    });
  }

, calculateSlotMaxScrolls: function () {
	  var wrapHeight = this.$('.sw-slots-wrapper').height();

		each(this.slots, function (slot) {
      slot.slotMaxScroll = wrapHeight - slot.el.clientHeight - 86;
		})
	}

, context: function () {
    return {
      slots: this.slots
    };
  }

, afterRender: function () {
    var i = 0;

    this.activeSlot = null;

    // Create HTML slot elements
    for (var  k in this.slots) {
      var $ul = this.$('ul.picker-slot-' + k)
        , ul = $ul[0];

      this.slots[k].slotPosition = i;      // Save the slot position inside the wrapper
      this.slots[k].slotYPosition = 0;
      this.slots[k].slotWidth = 0;
      this.slots[k].$el = $ul;
      this.slots[k].el = ul;

      ul.style.webkitTransitionTimingFunction = 'cubic-bezier(0, 0, 0.2, 1)';   // Add default transition

      // Place the slot to its default position (if other than 0)
      if (this.slots[k].defaultValue) {
        this.scrollToValue(k, this.slots[k].defaultValue);
      }

      ++i;
    }

    this.calculateSlotsWidth();

    this.bindGlobalEvents();
  }

  /**
   *
   * Generic methods
   *
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

      if (slot.slotYPosition > 0) {
        this.setPosition(i, 0);
      } else if (slot.slotYPosition < slot.slotMaxScroll) {
        this.setPosition(i, slot.slotMaxScroll);
      }

      index = -Math.round(slot.slotYPosition / this.cellHeight);

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
    this.slots[slot].slotYPosition = pos;
    this.slots[slot].el.style.webkitTransform = 'translate3d(0, ' + pos + 'px, 0)';
  }

, scrollStart: function (e) {
    e = e.originalEvent;

    this.lockScreen(e);

    this.calculateSlotMaxScrolls();

    // Find the clicked slot
    var xPos = e.targetTouches[0].clientX - this.$('.sw-slots').offset().left;  // Clicked position minus left offset (should be 11px)

    // Find tapped slot
    var slot = 0;
    for (var k in this.slots) {
      slot += this.slots[k].slotWidth;

      if (xPos < slot) {
        this.activeSlot = k;
        break;
      }
    }

    // If slot is readonly do nothing
    if (this.slots[this.activeSlot].readonly) {
	    this.$('.sw-frame').off('touchmove', this.scrollMove);
	    this.$('.sw-frame').off('touchend', this.scrollEnd);
      return false;
    }

    var slotObj = this.slots[this.activeSlot];
    slotObj.el.removeEventListener('webkitTransitionEnd', slotObj.backWithinBoundaries, false); // Remove transition event (if any)
    slotObj.el.style.webkitTransitionDuration = '0';    // Remove any residual transition

    // Stop and hold slot position
    var theTransform = window.getComputedStyle(this.slots[this.activeSlot].el).webkitTransform;
    theTransform = new WebKitCSSMatrix(theTransform).m42;
    if (theTransform != this.slots[this.activeSlot].slotYPosition) {
      this.setPosition(this.activeSlot, theTransform);
    }

    this.startY = e.targetTouches[0].clientY;
    this.scrollStartY = this.slots[this.activeSlot].slotYPosition;
    this.scrollStartTime = e.timeStamp;

    this.$('.sw-frame').on('touchmove', this.scrollMove);
    this.$('.sw-frame').on('touchend', this.scrollEnd);

    return true;
  }

, scrollMove: function (e) {
		e = e.originalEvent;

    var topDelta = e.targetTouches[0].clientY - this.startY;

    if (this.slots[this.activeSlot].slotYPosition > 0 || this.slots[this.activeSlot].slotYPosition < this.slots[this.activeSlot].slotMaxScroll) {
      topDelta /= 2;
    }

    this.setPosition(this.activeSlot, this.slots[this.activeSlot].slotYPosition + topDelta);
    this.startY = e.targetTouches[0].clientY;

    // Prevent slingshot effect
    if (e.timeStamp - this.scrollStartTime > 80) {
      this.scrollStartY = this.slots[this.activeSlot].slotYPosition;
      this.scrollStartTime = e.timeStamp;
    }
  }

, scrollEnd: function (e) {
		var swSlotWrapper = this.$('.sw-wrapper');

		e = e.originalEvent;

    this.$('.sw-frame').off('touchmove', this.scrollMove);
    this.$('.sw-frame').off('touchend', this.scrollEnd);

    // If we are outside of the boundaries, let's go back to the sheepfold
    if (this.slots[this.activeSlot].slotYPosition > 0 || this.slots[this.activeSlot].slotYPosition < this.slots[this.activeSlot].slotMaxScroll) {
      this.scrollTo(this.activeSlot, this.slots[this.activeSlot].slotYPosition > 0 ? 0 : this.slots[this.activeSlot].slotMaxScroll);
      return false;
    }

    // Lame formula to calculate a fake deceleration
    var scrollDistance = this.slots[this.activeSlot].slotYPosition - this.scrollStartY;

    // The drag session was too short
    if (scrollDistance < this.cellHeight / 1.5 && scrollDistance > -this.cellHeight / 1.5) {
      if (this.slots[this.activeSlot].slotYPosition % this.cellHeight) {
        this.scrollTo(this.activeSlot, Math.round(this.slots[this.activeSlot].slotYPosition / this.cellHeight) * this.cellHeight, '100ms');
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

    var newPosition = this.slots[this.activeSlot].slotYPosition + newScrollDistance;

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
    if (this.slots[slotNum].slotYPosition > 0 || this.slots[slotNum].slotYPosition < this.slots[slotNum].slotMaxScroll) {
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

    this.scrollTo(key, slot.slotYPosition > 0 ? 0 : slot.slotMaxScroll, '150ms');
    return false;
  },


  /**
   *
   * Buttons
   *
   */

  tapDown: function (e) {
    e.currentTarget.addEventListener('touchmove', this, false);
    e.currentTarget.addEventListener('touchend', this, false);
    e.currentTarget.className = 'sw-pressed';
  }

, tapCancel: function (e) {
    e.currentTarget.removeEventListener('touchmove', this, false);
    e.currentTarget.removeEventListener('touchend', this, false);
    e.currentTarget.className = '';
  }

, tapUp: function (e) {
    this.tapCancel(e);

    if ($(e.currentTarget).hasClass('sw-cancel')) {
      this.cancelAction();
    } else {
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
