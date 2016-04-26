/* global jQuery*/
'use strict';

(function($){
    $.introJs = function(options){
        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;
        var currentStepIndex;
        var hint;
        var backdrop;
        // Access to jQuery and DOM versions of element

        base.init = function(){
            base.options = $.extend({},$.introJs.defaultOptions, options);
        };

        function innerPositionElement(element, target, position, duration){
          var defer = jQuery.Deferred();
          var xPos = position.split(' ')[0];
          var yPos = position.split(' ')[1];
          var targetBoundingClientRect = $(target).get(0).getBoundingClientRect();
          var newOffset = {};

          xPos = xPos || 'center';
          yPos = yPos || 'center';

          if(xPos === 'left'){
            newOffset.left = targetBoundingClientRect.left;
          }else if(xPos === 'center'){
            newOffset.left = (targetBoundingClientRect.left + (targetBoundingClientRect.width / 2)) - (element.outerWidth() / 2);
          }else if(xPos === 'right'){
            newOffset.left = targetBoundingClientRect.right - element.outerWidth();
          }

          if(yPos === 'top'){
            newOffset.top = targetBoundingClientRect.top;
          }else if(yPos === 'center'){
            newOffset.top = (targetBoundingClientRect.top + (targetBoundingClientRect.height / 2)) - (element.outerHeight() / 2);
          }else if(yPos === 'bottom'){
            newOffset.top = targetBoundingClientRect.bottom - element.outerHeight();
          }

          element.animate(newOffset, {
            duration: duration,
            complete: function(){
              defer.resolve();
            }
          });

          return defer.promise();
        }

        function convertOuterPositionToOffset(element, target, position){
          var targetBoundingClientRect = $(target).get(0).getBoundingClientRect();
          var offset = {};

          if(position === 'top'){
            offset.left = (targetBoundingClientRect.left + (targetBoundingClientRect.width / 2)) - (element.outerWidth() / 2);
            offset.top = targetBoundingClientRect.top - element.outerHeight();
          }else if(position === 'right'){
            offset.left = targetBoundingClientRect.right;
            offset.top = targetBoundingClientRect.top - (element.outerHeight() / 2) + (targetBoundingClientRect.height / 2);
          }else if(position === 'bottom'){
            offset.left = (targetBoundingClientRect.left + (targetBoundingClientRect.width / 2)) - (element.outerWidth() / 2);
            offset.top = targetBoundingClientRect.bottom;
          }else if(position === 'left'){
            offset.left = targetBoundingClientRect.left - element.outerWidth();
            offset.top = targetBoundingClientRect.top - (element.outerHeight() / 2) + (targetBoundingClientRect.height / 2);
          }
          return offset;
        }

        function fitOffsetToScreen(offset, width){
          var bodyBoundingClientRect = $('body').get(0).getBoundingClientRect();
          var delta;
          if((offset.left + width) > bodyBoundingClientRect.right){
            delta = (bodyBoundingClientRect.right - (offset.left + width));
            offset.left = offset.left + delta;
          }else if(offset.left < bodyBoundingClientRect.left){
            delta = bodyBoundingClientRect.left - offset.left;
            offset.left = offset.left + delta;
          }
          return offset;
        }

        function outerPositionElement(element, target, position){
          var offset = convertOuterPositionToOffset(element, target, position);
          offset = fitOffsetToScreen(offset, element.outerWidth());
          return element.offset(offset);
        }




        function Hint(){
          var tooltip;
          var that = this;
          var targetElement;
          var tooltipPosition;
          var hintPosition;
          var wasRendered = false;

          function getTooltipArrowElement(){
            return tooltip.find('.intro-tooltip-arrow');
          }

          function difference(a, b) {
             return Math.abs(a - b);
           }

          function createTooltip(){
            var tooltip = $('<div><div class="intro-tooltip-content"></div><div class="intro-tooltip-arrow"></div></div>')
                          .addClass('intro-tooltip');
            tooltip.hide();
            $('body').append(tooltip);
            return tooltip;
          }

          function repositionTooltipArrow(){
              var tooltipArrowElement = getTooltipArrowElement();
              tooltipArrowElement.css({'left': 0});
              var elementBoundingClientRect =  that.element.get(0).getBoundingClientRect();
              var tooltipBoundingClientRect =  tooltip.get(0).getBoundingClientRect();
              var delta = difference(elementBoundingClientRect.left, tooltipBoundingClientRect.left);

              tooltipArrowElement.css({left: delta});

          }

          function createHint(){
            var hint = $('<div class="intro-hint"><div class="intro-circle"></div></div>');
            hint.hide();
            $('body').append(hint);
            return hint;
          }

          this.element =  null;

          this.hideTooltip = function(){
            tooltip.hide();
          };

          this.setTarget = function(element){
            targetElement = $(element);
          };

          this.setPosition = function(position){
            hintPosition = position;
          };

          this.setTooltipPosition = function(position){
            tooltipPosition = position;
          };

          this.setContent = function(content){
            tooltip.find('.intro-tooltip-content').html(content);
          };

          this.destroy = function(){
            this.element.remove();
          };

          this.render = function(){
            var defer = jQuery.Deferred();
            var duration = wasRendered ? 500 : 0;

            that.element.show();
            innerPositionElement(that.element, targetElement, hintPosition, duration).then(function(){
              getTooltipArrowElement().attr('position', tooltipPosition);
              tooltip.css('opacity', 0).show();
              outerPositionElement(tooltip, that.element, tooltipPosition);
              repositionTooltipArrow();
              tooltip.animate({'opacity':  1});
              defer.resolve();
            });
            wasRendered = true;
            return defer.promise();
          };


          function init(){
            that.element = createHint();
            tooltip = createTooltip();

            $(that.element).bind('transitionend', function(){

            });
          }

          init.call(this);
        }

        function createBackdrop(){
          var backdrop = $('<div>')
                          .addClass('intro-backdrop');
          $('body').append(backdrop);
          return backdrop;
        }

        function unhighlighElement(element){
          $(element).removeClass('intro-element');
          $(element).parents('.intro-fixparent').removeClass('intro-fixparent');
        }

        function highlightElement(element){
          $(element).addClass('intro-element');
          var parentElm = $(element).parent();
          while (parentElm.length > 0) {
            if (parentElm.get(0).tagName.toLowerCase() === 'body'){
              break;
            }
            //fix The Stacking Contenxt problem.
            //More detail: https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Understanding_z_index/The_stacking_context
            var zIndex = parentElm.css('zIndex');
            var opacity = parseFloat(parentElm.css('opacity'));
            var transform = parentElm.css('transform');
            if (/[0-9]+/.test(zIndex) || opacity < 1 || (transform !== 'none' && transform !== undefined)) {
              parentElm.addClass('intro-fixparent');
            }

            parentElm = $(parentElm).parent();
          }
        }

        function hideStep(step){
          unhighlighElement(step.element);
          hint.hideTooltip();
        }


        function onAfterShow(){
          if(base.currentStep && base.currentStep.onAfterShow){
            base.currentStep.onAfterShow(base.currentStep);
          }
        }

        function cleanup(){
          hint.destroy();
          backdrop.remove();

          hint = null;
          backdrop = null;
        }

        function showStep(step){
          var _showStep = function(){
            hint =  hint || new Hint();
            backdrop =  backdrop || createBackdrop();

            hint.setTarget(step.element || $('body'));
            hint.setPosition(step.hintPosition);
            hint.setTooltipPosition(step.tooltipPosition);
            hint.setContent(step.intro);
            highlightElement(step.element);
            return hint.render();
          };

          var beforeShowCallback = step.onBeforeShow || base.options.onBeforeShow;
          if(beforeShowCallback){
            beforeShowCallback(step)
              .then(_showStep)
                .then(onAfterShow);
          }else{
            _showStep()
              .then(onAfterShow);
          }
        }

        Object.defineProperty(base, 'currentStep', {
          get: function(){
            return base.options.steps[currentStepIndex];
          }
        });

        base.nextStep = function(){
          hideStep(base.currentStep);
          currentStepIndex = currentStepIndex + 1;
          showStep(base.currentStep);
        };

        base.previousStep = function(){
          hideStep(base.currentStep);
          currentStepIndex = currentStepIndex - 1;
          showStep(base.currentStep);
        };

        base.goToStep = function(step){
        };

        base.setOption = function(option, value){
          base.options[option] = value;
        };

        base.start = function(){
          currentStepIndex = 0;
          showStep(base.currentStep);
        };

        base.stop = function(){
          currentStepIndex = 0;
          cleanup();
        };

        // Run initializer
        base.init();
    };

    $.introJs.defaultOptions = {
        exitOnOverlayClick: true,
        steps: []
    };

})(jQuery);
