/*
 RequireJS text 0.26.0 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 Available via the MIT or new BSD license.
 see: http://github.com/jrburke/requirejs for details
*/
(function () {
  var j = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'], l = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im, m = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im, n = typeof location !== 'undefined' && location.href, i = [];define(function () {
    var e, h, k;typeof window !== 'undefined' && window.navigator && window.document ? h = function (a, b) {
      var c = e.createXhr();c.open('GET', a, !0);c.onreadystatechange = function () {c.readyState === 4 && b(c.responseText);};c.send(null);
    } : typeof process !== 'undefined' && process.versions &&
process.versions.node ? (k = require.nodeRequire('fs'), h = function (a, b) {b(k.readFileSync(a, 'utf8'));}) : typeof Packages !== 'undefined' && (h = function (a, b) {

      var c = new java.io.File(a), g = java.lang.System.getProperty('line.separator'), c = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(c), 'utf-8')), d, f, e = '';try {
        d = new java.lang.StringBuffer;(f = c.readLine()) && f.length() && f.charAt(0) === 65279 && (f = f.substring(1));for (d.append(f); (f = c.readLine()) !== null;)d.append(g), d.append(f);e = String(d.toString());
      }finally {c.close();}b(e);
    });

    return e = { version: '0.26.0', strip: function (a) {
        if (a) {
          var a = a.replace(l, ''), b = a.match(m);b && (a = b[1]);
        }else a = '';return a;
      }, jsEscape: function (a) {return a.replace(/(['\\])/g, '\\$1').replace(/[\f]/g, '\\f').replace(/[\b]/g, '\\b').replace(/[\n]/g, '\\n').replace(/[\t]/g, '\\t').replace(/[\r]/g, '\\r');}, createXhr: function () {

        var a, b, c;if (typeof XMLHttpRequest !== 'undefined')return new XMLHttpRequest;else for (b = 0; b < 3; b++) {
          c = j[b];try {a = new ActiveXObject(c);}catch (e) {}if (a) {

            j = [c];break;
          }
        }if (!a)throw Error('createXhr(): XMLHttpRequest not available');

        return a;
      }, get: h, parseName: function (a) {

        var b = !1, c = a.indexOf('.'), e = a.substring(0, c), a = a.substring(c + 1, a.length), c = a.indexOf('!');c !== -1 && (b = a.substring(c + 1, a.length), b = b === 'strip', a = a.substring(0, c));return { moduleName: e, ext: a, strip: b };
      }, xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/, canUseXhr: function (a, b, c, g) {

        var d = e.xdRegExp.exec(a), f;if (!d)return !0;a = d[2];d = d[3];d = d.split(':');f = d[1];d = d[0];return (!a || a === b) && (!d || d === c) && (!f && !d || f === g);
      }, finishLoad: function (a, b, c, g, d) {

        c = b ? e.strip(c) : c;d.isBuild && d.inlineText &&
  (i[a] = c);g(c);
      }, load: function (a, b, c, g) {

        var d = e.parseName(a), f = d.moduleName + '.' + d.ext, h = b.toUrl(f);!n || e.canUseXhr(h) ? e.get(h, function (b) {e.finishLoad(a, d.strip, b, c, g);}) : b([f], function (a) {e.finishLoad(d.moduleName + '.' + d.ext, d.strip, a, c, g);});
      }, write: function (a, b, c) {if (b in i) {

          var g = e.jsEscape(i[b]);c('define(\'' + a + '!' + b + '\', function () { return \'' + g + '\';});\n');
        }}, writeFile: function (a, b, c, g, d) {

        var b = e.parseName(b), f = b.moduleName + '.' + b.ext, h = c.toUrl(b.moduleName + '.' + b.ext) + '.js';e.load(f, c, function () {e.write(a,
  f, function (a) {g(h, a);}, d);}, d);
      } };
  });
})();
