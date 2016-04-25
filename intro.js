/* global jQuery */
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

            // Put your initialization code here
        };

        function Hint(){
          var tooltip;
          var that = this;
          this.element =  null;

          this.hideTooltip = function(){
            tooltip.hide();
          };

          this.showTooltip = function(){
            return $.when(tooltip.show(1000));
          };

          this.setPosition = function(position){
          };

          this.setTooltipPosition = function(position){
            tooltip.attr('class', 'intro-tooltip');
            tooltip.addClass(position);
          };

          this.setContent = function(content){
            tooltip.html(content);
          }


          function init(){
            tooltip = $('<div>')
                          .addClass('intro-tooltip');
            that.element = $('<div class="intro-hint"><div class="intro-circle"></div></div>');
            that.element.append(tooltip);
          }

          init.call(this);
        }

        function createHint(){
          var hint = new Hint();
          $('body').append(hint.element);
          return hint;
        }

        function repositionElement(stepElement, targetElement){
          var targetBoundingClientRect = $(targetElement).get(0).getBoundingClientRect();

          $(stepElement).offset({
            top: targetBoundingClientRect.top + (targetBoundingClientRect.height / 2) - (stepElement.height() / 2),
            left: targetBoundingClientRect.left + (targetBoundingClientRect.width / 2) - (stepElement.width() / 2)
          });
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

        function showStep(step){
          var _showStep = function(){
            hint =  hint || createHint();
            hint.setPosition(step.hintPosition);
            hint.setTooltipPosition(step.tooltipPosition);
            hint.setContent(step.intro);
            backdrop =  backdrop || createBackdrop();

            var showPromise = hint.showTooltip();

            if(step.element){
              repositionElement(hint.element , step.element );
            }else{
              repositionElement(hint.element , $('body'));
            }
            highlightElement(step.element);

            return showPromise;
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

        // Run initializer
        base.init();
    };

    $.introJs.defaultOptions = {
        exitOnOverlayClick: true,
        steps: []
    };

})(jQuery);
