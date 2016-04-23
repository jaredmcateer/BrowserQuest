/* Simple JavaScript Inheritance for ES 5.1
 * based on http://ejohn.org/blog/simple-javascript-inheritance/
 *  (inspired by base2 and Prototype)
 * MIT Licensed.
 */
(function () {
  'use strict';
  let fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

  // The base Class implementation (does nothing)
  function BaseClass(){}

  // Create a new Class that inherits from this class
  BaseClass.extend = function(props) {
    let _super = this.prototype;

    // Set up the prototype to inherit from the base class
    // (but without running the init constructor)
    let proto = Object.create(_super);

    // Copy the properties over onto the new prototype
    for (let name in props) {
      // Check if we're overwriting an existing function
      if (typeof props[name] === 'function'
          && typeof _super[name] == 'function'
          && fnTest.test(props[name])
      ) {
        proto[name] = (function(name, fn){
          return function() {
            let tmp = this._super;

            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];

            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            let ret = fn.apply(this, arguments);
            this._super = tmp;

            return ret;
          };
        }(name, props[name]));
      } else {
        proto[name] = props[name];
      }
    }

    let newClass;
    if (typeof proto.init === 'function') {
      if (proto.hasOwnProperty('init')) {
        newClass = proto.init;
      } else {
        newClass = function SubClass(){ _super.init.apply(this, arguments); };
      }
    } else {
      newClass = function EmptyClass() {};
    }

    // Populate our constructed prototype object
    newClass.prototype = proto;

    // Enforce the constructor to be what we expect
    proto.constructor = newClass;

    // And make this class extendable
    newClass.extend = BaseClass.extend;

    return newClass;
  };

  if(!(typeof exports === 'undefined')) {
    module.exports = BaseClass;
  }
}(this));

