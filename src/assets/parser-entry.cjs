try {
  var lexer = require('pug-lexer');
  var parser = require('pug-parser');
  self.parserBundle = { lexer: lexer, parse: parser };
} catch(e) {
  self.parserBundle = { lexer: function() { throw new Error('Parser bundle init error: ' + (e.message || e)); }, parse: function() { throw new Error('Parser bundle init error: ' + (e.message || e)); } };
}
