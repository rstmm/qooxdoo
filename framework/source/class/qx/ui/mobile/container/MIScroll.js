/* ************************************************************************

   qooxdoo - the new era of web development

   http://qooxdoo.org

   Copyright:
     2004-2011 1&1 Internet AG, Germany, http://www.1und1.de

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Tino Butz (tbtz)

************************************************************************ */


/* ************************************************************************


************************************************************************ */

/**
 * Mixin for the {@link Scroll} container. Used when the variant
 * <code>qx.mobile.nativescroll</code> is set to "off". Uses the iScroll script to simulate
 * the CSS position:fixed style. Position fixed is not available in iOS and
 * Android < 2.2.
 *
 * @ignore(iScroll)
 * @asset(qx/mobile/js/iscroll*.js)
 */
qx.Mixin.define("qx.ui.mobile.container.MIScroll",
{

  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  construct : function()
  {
    this.__initScroll();
    this.__registerEventListeners();

    this.__currentX = this.__currentY = 0;
  },


  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __scroll : null,
    __currentX : null,
    __currentY : null,

    /**
     * Mixin method. Creates the scroll element.
     *
     * @return {Element} The scroll element
     */
    _createScrollElement : function()
    {
      var scroll = qx.dom.Element.create("div");
      qx.bom.element.Class.add(scroll,"iscroll");
      return scroll;
    },


    /**
     * Mixin method. Returns the scroll content element..
     *
     * @return {Element} The scroll content element
     */
    _getScrollContentElement : function()
    {
      return this.getContainerElement().childNodes[0];
    },



    /**
    * Returns the current scroll position
    * @return {Array} an array with the <code>[scrollLeft,scrollTop]</code>.
    */
    _getPosition : function() {
      return [this.__currentX, this.__currentY];
    },


    /**
    * Scrolls the wrapper contents to the x/y coordinates in a given period.
    *
    * @param x {Integer} X coordinate to scroll to.
    * @param y {Integer} Y coordinate to scroll to.
    * @param time {Integer} Time slice in which scrolling should
    *              be done.
    */
    _scrollTo : function(x, y, time)
    {
      if (this.__scroll && this._isScrollable()) {
        // Normalize scrollable values
        var lowerLimitY = this.getContentElement().scrollHeight - this.getContainerElement().offsetHeight;
        if (y > lowerLimitY) {
          y = lowerLimitY;
        }

        var lowerLimitX = this.getContentElement().scrollWidth - this.getContainerElement().offsetWidth;
        if (x > lowerLimitX) {
          x = lowerLimitX;
        }

        this.__scroll.scrollTo(-x, -y, time);
      }
    },


    /**
     * Loads and inits the iScroll instance.
     *
     * @ignore(iScroll)
     */
    __initScroll : function()
    {
      if (!window.iScroll)
      {
        if (qx.core.Environment.get("qx.debug"))
        {
          var resource = "qx/mobile/js/iscroll.js";
        } else {
          var resource = "qx/mobile/js/iscroll.min.js";
        }
        var path = qx.util.ResourceManager.getInstance().toUri(resource);
        if (qx.core.Environment.get("qx.debug"))
        {
          path += "?" + new Date().getTime();
        }
        var loader = new qx.bom.request.Script();
        loader.on("load", this.__onScrollLoaded, this);
        loader.open("GET", path);
        loader.send();
      } else {
        this._setScroll(this.__createScrollInstance());
      }
    },


    /**
     * Creates the iScroll instance.
     *
     * @return {Object} The iScroll instance
     * @ignore(iScroll)
     */
    __createScrollInstance : function()
    {
      var defaultScrollProperties = this._getDefaultScrollProperties();
      var customScrollProperties = {};

      if(this._scrollProperties != null) {
        customScrollProperties = this._scrollProperties;
      }

      var iScrollProperties = qx.lang.Object.mergeWith(defaultScrollProperties, customScrollProperties, true);

      return new iScroll(this.getContainerElement(), iScrollProperties);
    },


    /**
     * Returns a map with default iScroll properties for the iScroll instance.
     * @return {Object} Map with default iScroll properties
     */
    _getDefaultScrollProperties : function() {
      var container = this;

      return {
        hideScrollbar: true,
        fadeScrollbar: true,
        hScrollbar : false,
        scrollbarClass: "scrollbar",
        useTransform: true,
        onScrollEnd : function() {
          // Alert interested parties that we scrolled to end of page.
          if (qx.core.Environment.get("qx.mobile.nativescroll") == false)
          {
            container.__currentX = -this.x;
            container.__currentY = -this.y;
            if(this.y == this.maxScrollY) {
              container.fireEvent("pageEnd");
            }
          }
        },
        onScrollMove : function() {
          // Alert interested parties that we scrolled to end of page.
          if (qx.core.Environment.get("qx.mobile.nativescroll") == false)
          {
            if(this.y == this.maxScrollY) {
              container.fireEvent("pageEnd");
            }
          }
        },
        onBeforeScrollStart : function(e) {
          // QOOXDOO ENHANCEMENT: Do not prevent default for form elements
          /* When updating iScroll, please check out that doubleTapTimer is not active (commented out)
           * in code. DoubleTapTimer creates a fake click event. Android 4.1. and newer
           * is able to fire native events, which  create side effect with the fake event of iScroll. */
          var target = e.target;
          while (target.nodeType != 1) {
            target = target.parentNode;
          }

          if (target.tagName != 'SELECT' && target.tagName != 'INPUT' && target.tagName != 'TEXTAREA' && target.tagName != 'LABEL') {
            // Remove focus from input elements, so that the keyboard and the mouse cursor is hidden
            var elements = [];
            var inputElements = qx.lang.Array.cast(document.getElementsByTagName("input"), Array);
            var textAreaElements = qx.lang.Array.cast(document.getElementsByTagName("textarea"), Array);
            elements = elements.concat(inputElements);
            elements = elements.concat(textAreaElements);

            for (var i=0, length = elements.length; i < length; i++) {
              elements[i].blur();
            }

            e.preventDefault();
          }

          // we also want to alert interested parties that we are starting scrolling
          if (qx.core.Environment.get("qx.mobile.nativescroll") == false)
          {
            var iScrollStartEvent = new qx.event.message.Message('iscrollstart');
            qx.event.message.Bus.getInstance().dispatch(iScrollStartEvent);
          }
        }
      };
    },


    /**
     * Registers all needed event listener.
     */
    __registerEventListeners : function()
    {
      qx.event.Registration.addListener(window, "orientationchange", this._refresh, this);
      qx.event.Registration.addListener(window, "resize", this._refresh, this);
      this.addListener("touchmove", qx.bom.Event.stopPropagation);
      this.addListener("domupdated", this._refresh, this);
    },


    /**
     * Unregisters all needed event listener.
     */
    __unregisterEventListeners : function()
    {
      qx.event.Registration.removeListener(window, "orientationchange", this._refresh, this);
      qx.event.Registration.removeListener(window, "resize", this._refresh, this);
      this.removeListener("touchmove", qx.bom.Event.stopPropagation);
      this.removeListener("domupdated", this._refresh, this);
    },


    /**
     * Load callback. Called when the iScroll script is loaded.
     *
     * @param request {qx.bom.request.Script} The Script request object
     */
    __onScrollLoaded : function(request)
    {
      if (request.status < 400)
      {
        this._setScroll(this.__createScrollInstance());
      } else {
        if (qx.core.Environment.get("qx.debug"))
        {
          this.error("Could not load iScroll");
        }
      }
    },


    /**
     * Setter for the scroll instance.
     *
     * @param scroll {Object} iScroll instance.
     */
    _setScroll : function(scroll)
    {
      this.__scroll = scroll;
    },


    /**
     * Delegation method for iScroll. Disabled the iScroll objects.
     * Prevents any further scrolling of this container.
     */
    disable : function() {
      if(this.__scroll) {
        this.__scroll.disable();
      }
    },


    /**
     * Delegation method for iScroll. Enables the iScroll object.
     */
    enable : function() {
      if(this.__scroll) {
        this.__scroll.enable();
      }
    },


    /**
     * Calls the refresh function of iScroll. Needed to recalculate the
     * scrolling container.
     */
    _refresh : function()
    {
      if (this.__scroll) {
        this.__scroll.refresh();
      }
    }
  },




  /*
  *****************************************************************************
     DESTRUCTOR
  *****************************************************************************
  */

  destruct : function()
  {
    this.__unregisterEventListeners();

    // Cleanup iScroll
    if (this.__scroll) {
      this.__scroll.destroy();
    }
    this.__scroll = null;
  }
});
