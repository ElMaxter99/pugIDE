try {
  var lexer = require('pug-lexer');
  var parser = require('pug-parser');
  var load = require('pug-load');
  var link = require('pug-linker');
  self.parserBundle = { lexer: lexer, parse: parser, load: load, link: link };
} catch(e) {
  self.parserBundle = { lexer: function() { throw new Error('Parser bundle init error: ' + (e.message || e)); }, parse: function() { throw new Error('Parser bundle init error: ' + (e.message || e)); } };
}
