/**
 *  Element#contains(@element, pattern) -> Boolean
 *  - @element(Element): element which content will be tested
 *  - pattern(String|RegExp): pattern to test element's content against
 *  
 *  Tests whether element's content contains specified string (or matches agains regular expression)
 *  
 *      $("myElement").contains("some text...");
 *      $("otherElement").contains(/(foo|bar)/i)
 **/ 
Element.Methods.contains = function(element, pattern) { 
  element = $(element);
  if (!pattern) return false;
  pattern = pattern.constructor == RegExp ? pattern : RegExp.escape(pattern);
  return !!element.innerHTML.stripTags().match(pattern);
}


/**
 *  Array#namespace(parrent=window) -> Array
 *  - parent(Object): top level object to start injection from
 *  
 *  Creates a nested chain of objects, based on the value of array items
 *  
 *      ['foo', 'bar', 'baz'].namespace();
 *      typeof foo.bar.baz; // => 'object'
 *      ['util', 'DOM', 'dimensions'].namespace(Prototype);
 *      typeof Prototype.util.DOM.dimensions; // => 'object'
 **/
Array.prototype.namespace = function(parent) {
  this.inject(parent || window, function(object, property) {
    return object[property] = object[property] || { };
  })
};

/**
 * Returns negated function
 * 
 * e.g. Find all hidden elements:
 * 
 * $$('*').findAll(function(element) { return !element.visible() }); // old way
 * $$('*').findAll(Element.visible.negate()); // using negate
 *
 */
Function.prototype.negate = function() {
  var f = this;
  return function() {
    return !f.apply(f, arguments);
  }
};

/**
 * Calls and returns function
 *
 * myElement.toggle();
 * input.observe('change', myElement.toggle); // old way
 * 
 * input.observe('change', myElement.toggle.invoke()); // using invoke
 */
Function.prototype.invoke = function() {
  this.apply(this, $A(arguments)); return this;
};


/**
 * Preventing IE from caching Ajax requests
 *
 */
Ajax.Responders.register({
  onCreate: function(req) {
    req.url += (/\?/.test(req.url) ? '&' : '?') + '_token=' + Date.now();
  }
});

/**
 * Removes element from the document, returning it's HTML representation
 *
 */
Element.Methods.toTemplate = function(element) {
  if (!(element = $(element))) return null;
  return element.wrap().show().up().remove().innerHTML;
};


/**
 * Are any of the form fields empty?
 *
 */
Field.Methods.isEmpty = function(element) {
  return $(element).getElements().any(Element.present);
};


/**
 * Little helper to change element's attribute given pattern and replacement (RegExp object)
 * Encapsulates verbose el.writeAttribute(attr, el.readAttribute(attr))
 *
 */ 
Element.Methods.replaceAttribute = function(element, attr, pattern, replacement) {
  element = $(element);
  return el.writeAttribute(attr, element.readAttribute(attr)
    .replace(new RegExp(pattern), replacement)
  )
};


/**
 * Replaces innerHTML of an element given pattern and replacement
 *
 */
Element.Methods.replaceHTML = function(element, pattern, replacement) {
  element = $(element);
  return element.update(
    element.innerHTML.replace(new RegExp(pattern), replacement)
  );
};


Element.Methods.toHTML = function(element) {
  element = $(element);
  try {
    var xmlSerializer = new XMLSerializer();
    return element.nodeType == 4
      ? element.nodeValue
      : xmlSerializer.serializeToString(element);
  } catch(e) {
    return (element.xml 
      || element.outerHTML
      || element.cloneNode(true).wrap().innerHTML);
  }
};


(function(){
  Prototype.Q = {}
  for (var method in Element.methods) {
    Prototype.Q[method] = function(){ return Prototype.Q }
  }
  $ = $.wrap(function(){
    var args = $A(arguments), proceed = args.shift();
    return proceed.apply(proceed, args) || Prototype.Q;
  })
})();


/*

Label support in Safari 2


document.observe('click', function(e) {
  var target = e.findElement('label[for]');
  if (!target) return;
  var input = $(target.readAttribute('for'));
  if (!input) return;
  input.focus();
  if (input.type && (/radio|checkbox/).test(input.type)) {
    input.click();
  }
})

*/


/**
 * Boosts Field#present to work somewhat more reasonably 
 * with any form control (element with type attribute)
 * 
 * - "reset, submit, button and hidden" always return true
 * - "text, password and file" return true if value attribute is anything but whitespace
 * - "checkbox" return true if checked attribute is not false
 * - "radio" return true if either checked attribute is not false 
 *   or any of the input elements with the same name have checked attribute and it's not false
 * - "select" return true if selectedIndex attribute is not -1
 *
 */
Field.Methods.present = function(element) {
  if (!(element = $(element)) && !element.type) return;
  var t = element.type;
  return ((/text|password|file/.test(t) && !element.value.blank()) ||
    /reset|submit|button|hidden/.test(t) ||
    (t == 'checkbox' && element.checked) ||
    (t == 'radio' && (element.checked || $$('input[name=' + element.name + ']:checked').length))
    (/select-one|select-multiple/.test(t) && element.selectedIndex != -1));
};

/**
 * Change Element#observe to imlicitly stop event when executing event handler
 *
 * $(someLink)._observe('click', function(e) { ... }) // <= event is stopped automatically
 */
Element.addMethods({
  _observe: Element.observe.wrap(function(proceed, element, eventName, handler) {
    return proceed.call(proceed, element, eventName, function(e) {
      Event.stop(e); handler.call(e.target, e);
    })
  })
});

/**
 * Simple helpers for injecting script/link elements into the document
 *
 */ 
Prototype.addScript = function(url) {
  // caching head element as a function property
  (arguments.callee._head = arguments.callee._head || $$('head')[0])
    .insert(new Element('script', { type: 'text/javascript', src: url }))
};

Prototype.addStylesheet = function() {
  // caching head element as a function property
  (arguments.callee._head = arguments.callee._head || $$('head')[0])
    .insert(new Element('style', { type: 'text/css', rel: 'stylesheet', href: url }))
};

Function.prototype._new = function() {
  var __method = this, args = arguments;
  function C() { return __method.apply(this, args); };
  C.prototype = __method.prototype;
  return new C;
};

/** 
 *  Object._isFunction(object) -> Boolean
 *  - object(Any): an object to test against
 *  Tests whether an object is a Function object.
 *  
 *  As per ECMA-262, ed3; 15.3.4.2: "The toString function is not generic; 
 *  it throws a TypeError exception if its this value is not a Function object..."
 *  
 *  
 **/
Object._isFunction = function(o) {
  try {
    Function.prototype.toString.call(o);
  } catch(e) {
    return false;
  };
  return true;
};

// Experimental
Object._isFunction2 = function(o) {
  return Object.prototype.toString
    .call(o).indexOf('Function') != -1;
}

/**
 * Form#unserialize(@element, source) -> Element
 * - @element(FormElement): Form element to fill with values
 * - source(Object | String): Source object where field values are taken from
 *
 * Fills form with values of a given object `source`. 
 * Each propertie name of `source` is compared to name attribute of a form element.
 *
 *    $('myForm').unserialize()
 *
 **/
Form.Methods.unserialize = function(element, source) {
  if (!(element = $(element)))
    throw new Error('DOMElement is required');
  
  source = Object.isString(source) 
    ? source.toQueryParams() 
    : source;
  
  element.getElements().each(function(element) {
    for (var name in source) {
      if (name == element.name)
        element.setValue(source[name]);
    }
  })
  return element;
}

/**
 * Element.addHoverClassName(@element, className) -> @element
 * 
 * Observes element's mouseover/mouseout to add/remove specified className respectively
 *
 *    $('foo').addHoverClassName('over);
 *
 **/
Form.Methods.addHoverClassName = function(element, className) {
  return $(element).observe('mouseover', Element.addClassName.curry(element, className))
    .observe('mouseout', Element.removeClassName.curry(element, className));
}

/**
 * Element.setProperty(@element, name, value) => @element
 *
 * - @element(Element): Element which property is to be set to a value
 * - name(String): Name of a property
 * - value(Any): Value of a property
 *
 * Dead simple helper for setting specified property of an element to a specified value.
 * This might seem like an overkill, but it's quite useful in conjunction with #invoke,
 * when modifying native properties of an element or creating new ones (a.k.a. expandos) in a batch.
 * This method is somewhat similar to writeAttribute, but is intended to operate on properties, rather than attributes.
 *
 *
 *    // An example of dropdown elements "bound" to each other
 *    // (i.e. changing value of one element results in other ones "changed" to the same value)
 *
 *    var dropdowns = $$('select');
 *    dropdowns.invoke('observe', 'change', function(e) {
 *      var index = e.element().selectedIndex;
 *      dropdowns.invoke('setProperty', 'selectedIndex', index);
 *    })
 *
 *
 **/
Element.Methods.setProperty = function(element, name, value) {
  if (!(element = $(element))) return;
  element[name] = value;
  return element;
}

Element.addMethods();