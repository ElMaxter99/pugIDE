try {
  var pug = require('pug');
  self.pugBundle = pug;
} catch(e) {
  console.error('[PugBundle] Error loading pug:', e);
  self.pugBundle = { compile: function() { throw new Error('Pug bundle failed to initialize: ' + e.message); } };
}
