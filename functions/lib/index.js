"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "masmottFunctions", {
    enumerable: true,
    get: function() {
        return masmottFunctions;
    }
});
var _firebaseAdmin = /*#__PURE__*/ _interopRequireWildcard(require("firebase-admin"));
var _fpTs = require("fp-ts");
var _function = require("fp-ts/function");
var _masmottFirebase = require("masmott-firebase");
var _functionsJs = require("/home/aabccd021/ghq/github.com/aabccd021/masmott-firebase/node_modules/.pnpm/masmott@1.13.2_xbpvxrvmp5lyzipg7btlnwttfi/node_modules/masmott/dist/cjs/test/functions.js");
function _getRequireWildcardCache(nodeInterop) {
    if (typeof WeakMap !== "function") return null;
    var cacheBabelInterop = new WeakMap();
    var cacheNodeInterop = new WeakMap();
    return (_getRequireWildcardCache = function(nodeInterop) {
        return nodeInterop ? cacheNodeInterop : cacheBabelInterop;
    })(nodeInterop);
}
function _interopRequireWildcard(obj, nodeInterop) {
    if (!nodeInterop && obj && obj.__esModule) {
        return obj;
    }
    if (obj === null || typeof obj !== "object" && typeof obj !== "function") {
        return {
            default: obj
        };
    }
    var cache = _getRequireWildcardCache(nodeInterop);
    if (cache && cache.has(obj)) {
        return cache.get(obj);
    }
    var newObj = {};
    var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
    for(var key in obj){
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
            var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
            if (desc && (desc.get || desc.set)) {
                Object.defineProperty(newObj, key, desc);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    newObj.default = obj;
    if (cache) {
        cache.set(obj, newObj);
    }
    return newObj;
}
var readerS = _fpTs.apply.sequenceS(_fpTs.reader.Apply);
var masmottFunctions = (0, _function.pipe)({
    firebaseAdminApp: _firebaseAdmin.initializeApp({
        projectId: "demo"
    })
}, readerS({
    db: readerS(_masmottFirebase.stack.server.db)
}), _functionsJs.test3Functions, _masmottFirebase.makeFunctions);

//# sourceMappingURL=index.js.map