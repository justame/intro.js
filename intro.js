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

        function createHint(){
          var hint = $('<div>')
                        .addClass('intro-hint');
          $('body').append(hint);
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
          //clean parent
        }

        function showStep(step){
          var _showStep = function(){
            hint =  hint || createHint();
            backdrop =  backdrop || createBackdrop();
            repositionElement(hint, step.element);
            highlightElement(step.element);
          };

          if(base.options.onBeforeShow){
            base.options.onBeforeShow(step)
              .then(_showStep);
          }else{
            _showStep();
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

        };

        base.goToStep = function(step){
        };

        base.setOptions = function(option, value){
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
