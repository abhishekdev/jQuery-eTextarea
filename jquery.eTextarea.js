/** @license
jQuery eTextarea - v1.0.1 - 02/Jun/2011 
Copyright (C) 2011 by Abhishek Dev
MIT License @ http://bit.ly/abhishekdevMIT-License
*/

/*!
jQuery eTextarea - v1.0.1 - 02/Jun/2011 
Copyright (C) 2011 by Abhishek Dev
MIT License @ http://bit.ly/abhishekdevMIT-License
*/

/**
* @fileoverview eTextarea Plugin
* @author      Abhishek Dev
* @date        2010-Nov-12
* @description
  <em>
  --credits     Inspired from the "elastic plugin" by Jan Jarfalk (http://unwrongest.com/projects/elastic/) 
  				and from http://scrivna.com "autoexpand function"
  --modified    2011-Jun-04 by Abhishek Dev
  --version     1.0.1
  </em>
* @requires    jQuery 1.4.2
*/


(function ($) {
	"use strict";
//'$:nomunge'; // Used by YUI compressor.
/**
* @function
* @description
  <em>
  --credits     Inspired from the "elastic plugin" by Jan Jarfalk (http://unwrongest.com/projects/elastic/) 
  				and from http://scrivna.com "autoexpand function"
  --date		2010-Nov-12
  --modified    2011-Jun-04 by Abhishek Dev
  --version     1.0.1
  --note 		Tested to work with Opera 10, Firefox 2/3, IE 7/8, Safari 5, Chrome 6
  </em>
* @requires    jQuery 1.4.2
* @description Update a normal textarea control to resize based on the text it holds. Makes it resize when the user is editing text in it. It respects the CSS max-height set on a textarea
* Improves on the code of the elastic plugin and autoexpand by making it layout independent (All trackers are placed in a single container as a direct child of body). The trackers are created on the fly only when they are needed. So no need to clean them up when textareas are ajax refreshed.
* Also supports single line textareas to emulate input textbox. and resizes even on continued keypress. The event hanlders are dynamically binded and unbinded on focus and blur events.
* @param {(string|Object)=} userOption Pass "update" manually to Update a textarea to size based on its content. max-height property is respected
* @returns {jQuery} Object jQuery object on which called
*
* @example $([selector]).eTextarea(); // to initialize
* $([selector]).eTextarea("update"); // for manual update during text injection
*/
$.fn.eTextarea = function (userOption) {

	return this.each(function (i, element) {
		var $textarea, _minHeight, _maxHeight, _lineHeight,
			copyCatID, copyCat, copyCatContainer,
			cssProperties, timeRef, updateInProgress,
			createCopyCat, destroyCopyCat, addkeyEvents, update, forceUpdate, opt, radix=10, nmsp = "eTextarea";

		// Only work on textarea
		if (element.type != 'textarea') {
			return false;
		}
		
		$textarea = $(element);
		opt = typeof userOption == "object" ? $.extend({},$.fn.eTextarea.defaults, userOption) : $.fn.eTextarea.defaults;
		applyOptions();
		
		_minHeight = parseInt($textarea.css("min-height"),radix) || parseInt($textarea.css("height"),radix); // css("height") faster than height()
		_maxHeight = parseInt($textarea.css("max-height"),radix);
		_lineHeight = parseInt($textarea.css("line-height"),radix) || parseInt($textarea.css('font-size'),radix); // Recommended to set a numeric line-height in px when single line text areas are simulated wth height.

		// Opera bug: It returns max-height = -1 if not set
		if (_maxHeight < 0) {
			_maxHeight = Number.MAX_VALUE;
		}

		$textarea.css({ overflow: 'hidden', overflowX: 'auto' });

		// Create a dummy element used to track and manage height of textarea
		createCopyCat = function () {
			copyCatID = "" + $textarea.attr("id") + "_flexi_" + Math.floor(Math.random() * 99999);
			copyCat = $("<div></div>", { id: copyCatID, "class": "eTextarea" });
			copyCatContainer = $("#eTextareaTrack");
			cssProperties = [
				'paddingTop',
				'paddingRight',
				'paddingBottom',
				'paddingLeft',
				'fontSize',
				'fontFamily',
				'fontWeight',
				'width',
				'lineHeight'];


			// Check if the div#eTextareaTrack exits else create it
			if (!copyCatContainer.length) {
				copyCatContainer = $("<div></div>", { id: "eTextareaTrack" });
				$('body').append(copyCatContainer);
			}

			// Append trackers for textareas to it
			copyCatContainer.append(copyCat);

			// Fallback if the CSS class eTextarea is not applied from file! overhead vs. robustness
			copyCat.css({ position: "absolute", top: 0, left: "-9999px", 'word-wrap': 'break-word' });

			for (var j = 0; j < cssProperties.length; ++j) {
				var prop = cssProperties[j];
				copyCat.css(prop, $textarea.css(prop));
			}
			//For IE6 compatibility use this instead to set width
			/*
			if (navigator.userAgent.indexOf('MSIE') == -1) { // For IE6
			copyCat.style.width = $textarea.css('width') + 'px';
			}
			*/

			copyCat.css("overflowX", "auto");
		};

		// Remove dummy elements and events when no longer needed
		destroyCopyCat = function () {
			$textarea.unbind('keyup.eTextarea');
			$textarea.unbind('keypress.eTextarea');
			copyCat.remove();
		};

		// Update height of textarea to match with that of the dummy div
		update = function () {
			var textContent = $textarea.val().replace(/&/g, '&amp;').replace(/  /g, '&nbsp;').replace(/<|>/g, '&gt;').replace(/\n/g, '<br />'),
					copyCatContent = copyCat.html();

			if (textContent + '&nbsp;' != copyCatContent) {
				copyCat.html(textContent + '&nbsp;');
				var _copyCatHeight = copyCat.height(),
						_elHeight = $textarea.height(),
						correctedHeight = _copyCatHeight > _lineHeight ?
											_copyCatHeight + _lineHeight : _copyCatHeight;
				/**
				* for single line textareas dont show next line, else show it.
				* This solves the glitch effect and also makes the textarea more usable my letting the user clearly see the end of content
				*/

				// if the height mismatches
				if (Math.abs(correctedHeight - _elHeight) > 3) {

					if (correctedHeight > _maxHeight) {
						setOverflowAndHeight({ x: "hidden", y: "auto" }, _maxHeight);
					}
					else if (correctedHeight <= _minHeight) {
						setOverflowAndHeight({ x: "hidden", y: "hidden" }, _minHeight);
					}
					else {
						setOverflowAndHeight({ x: "hidden", y: "hidden" }, correctedHeight);
					}
				}
			}
		};

		// Bind the needed key events only when needed
		addkeyEvents = function () {
			// Put eventListeners
			timeRef = null, updateInProgress = false;

			$textarea.unbind('keyup'+nmsp)
			.bind('keyup.eTextarea'+nmsp, function (e) {
				if (updateInProgress) return;
				clearTimeout(timeRef);
				timeRef = null;

				timeRef = setTimeout(function () {
					clearTimeout(timeRef);
					timeRef = null;
					update();
					updateInProgress = false;
				}, 150);

				updateInProgress = true;
			});

			$textarea.unbind('keypress'+nmsp)
			.bind('keypress'+nmsp, function (e) {
				if (updateInProgress) return;
				clearTimeout(timeRef);
				timeRef = null;

				timeRef = setTimeout(function () {
					clearTimeout(timeRef);
					timeRef = null;
					update();
					updateInProgress = false;
				}, 150);

				updateInProgress = true;
			});

		};

		forceUpdate = function () {
			createCopyCat();
			update();
			destroyCopyCat();
		};
		
		function applyOptions(){
			$textarea.addClass(opt["class"]); // opt.class throws error in safari
			if(opt.emulateTextbox || parseInt($textarea.attr("rows"),radix) === 1){
				$textarea.addClass(opt.oneLineClass);
			}
			if(!opt.resize){
				$textarea.addClass("noResize").css("resize","none");
			}
		}

		function init() {
			// Fix older implementations in application where it is impossible to add classes 
			applyOptions();
			forceUpdate();
			addFocusEvent();
			addBlurEvent();
			addMiscEvent();
		}

		//bind focus, which in-turn binds the other key events only when needed
		function addFocusEvent() {
			$textarea.unbind('focus'+nmsp)
			.bind('focus'+nmsp, function (e) {
				createCopyCat();
				addkeyEvents();
			});
		}

		//bind blur for clean up
		function addBlurEvent() {
			$textarea.unbind('blur'+nmsp)
			.bind('blur'+nmsp, function (e) {
				$("#status").text("blur trig");
				destroyCopyCat();
			});
		}
		
		//bind misc copy cut paste mouse based events
		function addMiscEvent() {
			$textarea.unbind('change.eTextarea cut.eTextarea input.eTextarea paste.eTextarea')
			.bind('change.eTextarea cut.eTextarea', function (e) {
				forceUpdate();
			})
			.bind('input.eTextarea paste.eTextarea',function(e){ setTimeout( forceUpdate, 250); });
		}

		// Generic function to set overflow and height
		function setOverflowAndHeight(overflow, height) {
			var correctedHeight = Math.floor(parseInt(height,radix)),
				currentHeight = $textarea.height();
				
			if (currentHeight != correctedHeight || currentHeight == _maxHeight ) {
				if (typeof overflow === "string") {
					$textarea.css({ 'overflow': overflow, 'height': correctedHeight + 'px' });
				}
				else {
					$textarea.css({ 'overflowX': overflow.x, 'overflowY': overflow.y, 'height': correctedHeight + 'px' });
				}
			}
		}

		if (userOption == "update" && forceUpdate) {
			forceUpdate();
			return;
		}

		init();
	});
	
};

$.fn.eTextarea.defaults = {
	resize  :	true, // enable/disable the default resizer on latest browsers like chrome/firefox 
	"class"	: 	"ui-eTextarea", //CSS class to apply on every textarea
	emulateTextbox: false, // textarea starts as a single line textarea just like a input textbox
	oneLineClass : 	"oneLine" // CSS class to add on single line textarea. is valid only if emulateTextbox is set to true
};

}
)(jQuery);