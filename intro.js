/* global jQuery,setInterval, clearInterval, window*/
'use strict';

(function($){
    $.introJs = function(options){
        // To avoid scope issues, use 'base' instead of 'this'
        // to reference this class from internal events and functions.
        var base = this;
        var currentStepIndex;
        var hint;
        var backdrop;
        var modal;
        // Access to jQuery and DOM versions of element

        base.init = function(){
            base.options = $.extend({},$.introJs.defaultOptions, options);
        };

        function round(boundingClientRect){
          var boundingClientRectNew = {};
          boundingClientRectNew.left = Number(boundingClientRect.left.toFixed(0));
          boundingClientRectNew.right = Number(boundingClientRect.right.toFixed(0));
          boundingClientRectNew.top = Number(boundingClientRect.top.toFixed(0));
          boundingClientRectNew.bottom = Number(boundingClientRect.bottom.toFixed(0));
          boundingClientRectNew.width = Number(boundingClientRect.width.toFixed(0));
          boundingClientRectNew.height = Number(boundingClientRect.height.toFixed(0));
          return boundingClientRectNew;
        }

        function trackElementChange(element, time){
          var boundingClientRectOld = round($(element).get(0).getBoundingClientRect());
          var interval = setInterval(function _checkForChange(){
            window.requestAnimationFrame(function(){
              var boundingClientRectNew = round($(element).get(0).getBoundingClientRect());
              if(!angular.equals(boundingClientRectOld, boundingClientRectNew)){
                $(element).trigger('changed.introjs');
              }
              boundingClientRectOld = boundingClientRectNew;
            });
          }, time || 500);
          $(element).data('introjsInterval', interval);

          return (function(interval){
            return function(){
              clearInterval(interval);
            };
          }(interval));
        }

        function untrackElementChange(element){
          clearInterval($(element).data('introjsInterval'));
        }

        function innerPositionElement(element, target, position, duration){
          var defer = jQuery.Deferred();
          var xPos = position.split(' ')[0];
          var yPos = position.split(' ')[1];
          var targetBoundingClientRect = $(target).get(0).getBoundingClientRect();
          var oldOffset = $(element).get(0).getBoundingClientRect();
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

          if(duration === 0 || ((oldOffset.left === newOffset.left) && (oldOffset.top === newOffset.top))){
            defer.resolve();
          }else{
            $(element).one('transitionend', function(){
              defer.resolve();
            });
          }

          var durationInSecs = duration / 1000;
          element.css('transition', 'left ' + durationInSecs + 's linear, top ' + durationInSecs + 's linear');
          element.offset(newOffset);

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
            offset.left = offset.left + delta - 30;
          }else if(offset.left < bodyBoundingClientRect.left){
            delta = bodyBoundingClientRect.left - offset.left;
            offset.left = offset.left + delta + 30;
          }
          return offset;
        }

        // refactor
        function outerPositionElement(element, target, position, offsetX, offsetY){
          $(element).css({
            left: 0
          });
          $(element).css({
            width: $(element).outerWidth()
          });

          var offset = convertOuterPositionToOffset(element, target, position);
          offset.left += Number(offsetX || 0);
          offset.top += Number(offsetY || 0);
          offset = fitOffsetToScreen(offset, element.outerWidth());

          $(element).css({
            left: '',
            width: ''
          });
          return element.css(offset);
        }

        function Modal(){
          var element;
          var content = '';
          var changes = {
            content: true
          };

          function createModal(){
            var element = $('<div>').addClass('intro-modal').appendTo('body');
            return element;
          }
          this.setContent = function(val){
            content = val;
            changes.content = true;
          };

          this.destroy = function(){
            $(element).remove();
            element = null;
          };

          this.render = function(){
            element = element || createModal();
            if(changes.content){
              element.html(content);
              changes.content = false;
            }
          };
        }


        function Hint(){
          var tooltip;
          var that = this;
          var targetElement;
          var tooltipPosition;
          var hintPosition;
          var wasRendered = false;
          var model = {
            visibility : true
          };

          function getTooltipArrowElement(){
            return tooltip.find('.intro-tooltip-arrow');
          }

          function createTooltip(){
            var tooltip = $('<div><div class="intro-tooltip-content"></div><div class="intro-tooltip-arrow"></div></div>')
                          .addClass('intro-tooltip');
            tooltip.hide();

            $('body').append(tooltip);
            trackElementChange(tooltip, 100);
            $(tooltip).on('changed.introjs', repositionTooltip);
            return tooltip;
          }

          function repositionTooltipArrow(){
              var tooltipArrowElement = getTooltipArrowElement();
              var elementBoundingClientRect =  targetElement.get(0).getBoundingClientRect();
              var left;
              var top;

              if(tooltipPosition === 'bottom'){
                left =  elementBoundingClientRect.left + (elementBoundingClientRect.width / 2) - (tooltipArrowElement.outerWidth() / 2);
                top = -(tooltipArrowElement.outerHeight());
                tooltipArrowElement.offset({
                  left: left
                });
                tooltipArrowElement.css({
                  top: top
                });
              }else if(tooltipPosition === 'top'){
                left =  elementBoundingClientRect.left + (elementBoundingClientRect.width / 2) - (tooltipArrowElement.outerWidth() / 2);
                top = '100%';
                tooltipArrowElement.offset({
                  left: left
                });
                tooltipArrowElement.css({
                  top: top
                });
              }else if(tooltipPosition === 'left'){
                left =  '100%';
                top = elementBoundingClientRect.top + (elementBoundingClientRect.height / 2) - (tooltipArrowElement.outerHeight() / 2);
                tooltipArrowElement.css({
                  left: left
                });
                tooltipArrowElement.offset({
                  top: top
                });
              }else if(tooltipPosition === 'right'){
                left =  -(tooltipArrowElement.outerWidth());
                top = elementBoundingClientRect.top + (elementBoundingClientRect.height / 2) - (tooltipArrowElement.outerHeight() / 2);
                tooltipArrowElement.css({
                  left: left
                });
                tooltipArrowElement.offset({
                  top: top
                });
              }
          }

          function createHint(){
            var hint = $('<div class="intro-hint"></div>');
            if (base.options.hintClass) {
              hint.addClass(base.options.hintClass);
            }
            hint.hide();
            $('body').append(hint);
            trackElementChange(hint, 1000);
            $(hint).on('changed.introjs', that.render);
            return hint;
          }

          function repositionTooltip(){
            var tooltipArrowElement = getTooltipArrowElement();
            var offsetX = 0, offsetY = 0;

            if(tooltip.css('display') === 'none'){
              tooltip.show();
            }

            if(tooltipPosition === 'top'){
              offsetY = -(tooltipArrowElement.outerHeight() + 12);
            }else if(tooltipPosition === 'bottom'){
              offsetY = tooltipArrowElement.outerHeight() + 12;
            }else if(tooltipPosition === 'right'){
              offsetX = tooltipArrowElement.outerWidth() + 12;
            }else if(tooltipPosition === 'left'){
              offsetX = -(tooltipArrowElement.outerWidth() + 12);
            }
            outerPositionElement(tooltip, targetElement, tooltipPosition, offsetX, offsetY);
            repositionTooltipArrow();
          }

          this.element =  null;

          this.hideTooltip = function(){
            tooltip.hide();
            tooltip.css('opacity', 0);
          };

          this.setTarget = function(element){
            $(targetElement).unbind('changed.introjs');
            untrackElementChange(targetElement);
            targetElement = $(element);
            $(targetElement).on('changed.introjs', that.render);
            trackElementChange(targetElement, 300);
          };

          this.setVisiblity = function(isVisible){
            model.visibility = isVisible;
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
            untrackElementChange(that.element);
            untrackElementChange(tooltip);
            this.element.remove();
            tooltip.remove();
          };

          this.isTooltipVisible = function(){
            return Number($(tooltip).css('opacity')) > 0;
          };

          this.render = function(){
            var defer = jQuery.Deferred();
            var duration = wasRendered ? 500 : 0;

            that.element.show();
            innerPositionElement(that.element, targetElement, hintPosition, duration).then(function(){
              getTooltipArrowElement().attr('position', tooltipPosition);
              repositionTooltip();

              if(model.visibility){
                that.element.removeClass('intro-hidden');
              }else{
                that.element.addClass('intro-hidden');
              }
              if(!that.isTooltipVisible()){
                tooltip.css('opacity', 0).show();
                tooltip.animate({'opacity':  1});
              }else{
                tooltip.show();
              }
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
          $(element).removeClass('intro-element-disabled');
          $(element).removeClass('intro-element-relative');
          $(element).parents('.intro-fixparent').removeClass('intro-fixparent');
          // quick hack
          $('.intro-fixparent').removeClass('intro-fixparent');
        }

        function highlightElement(element, interactive){
          $(element).addClass('intro-element');
          if(!interactive){
            $(element).addClass('intro-element-disabled');
          }
          if($(element).css('position') === 'static'){
            $(element).addClass('intro-element-relative');
          }
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
          if(_.isArray(step.highlightElements)){
            _.each(step.highlightElements, function(element){
              unhighlighElement(element);
            });
          }
          if(hint){
            hint.hideTooltip();
          }
          if(modal){
            modal.destroy();
          }
        }


        function onAfterShow(){
          if(base.currentStep && base.currentStep.onAfterShow){
            base.currentStep.onAfterShow(base.currentStep);
          }
        }

        function cleanup(){
          try {
            if(hint){
              hint.destroy();
            }
            backdrop.remove();
            if(base.currentStep.element){
              unhighlighElement(base.currentStep.element);
            }
            if(_.isArray(base.currentStep.highlightElements)){
              _.each(base.currentStep.highlightElements, function(element){
                unhighlighElement(element);
              });
            }

            if(modal){
              modal.destroy();
            }
            modal = null;
            hint = null;
            backdrop = null;
          } catch (e) {
            // silent failure
          }
        }

        function isFunction(value){
          return (typeof value)  === 'function';
        }


        function showStep(step){
          var _showStep = function(){
            var selectedElement;
            var intro;
            hint =  hint || new Hint();
            backdrop =  backdrop || createBackdrop();

            if(isFunction(step.intro)){
              intro = step.intro(step);
            }else{
              intro = step.intro;
            }

             if(step.calculatedElementSelector){
              selectedElement = $(step.calculatedElementSelector);
            }

            if(step.scrollToElement){
              $(selectedElement).get(0).scrollIntoView(false);
            }

            if(!step.modal){
              hint.setTarget(selectedElement || $('body'));
              hint.setPosition(step.hintPosition);
              hint.setTooltipPosition(step.tooltipPosition);
              hint.setVisiblity(step.showHint);
              hint.setContent(intro);
            }


            highlightElement(selectedElement, base.options.highlightInteractivity);

            if(_.isArray(step.highlightElements)){
              _.each(step.highlightElements, function(element){
                highlightElement(element, base.options.highlightInteractivity);
              });
            }

            if(step.backdrop){
              backdrop.show();
              backdrop.css({
                opacity: step.backdropOpacity
              });
            }else{
              backdrop.hide();
            }

            if(!step.modal){
              return hint.render();
            }else{
              modal = new Modal();
              modal.setContent(intro);
              modal.render();
              return jQuery.when();
            }
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
          base.goToStep(currentStepIndex + 1);
        };

        base.previousStep = function(){
          hideStep(base.currentStep);
          currentStepIndex = currentStepIndex - 1;
          showStep(base.currentStep);
        };

        base.goToStep = function(stepIndex) {
          hideStep(base.currentStep);
          currentStepIndex = stepIndex;
          showStep(base.currentStep);
        };

        base.setOption = function(option, value){
          base.options[option] = value;
        };

        base.start = function(stepIndex){
          currentStepIndex = stepIndex || 0;
          showStep(base.currentStep);
        };

        base.stop = function(){
          cleanup();
          currentStepIndex = 0;
        };

        base.hideStep = function(){
          hideStep(base.currentStep);
        };

        // Run initializer
        base.init();
    };

    $.introJs.defaultOptions = {
        exitOnOverlayClick: true,
        steps: []
    };

})(jQuery);
