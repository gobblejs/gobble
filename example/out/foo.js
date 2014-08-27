define([
	"require",
	"ractive"
], function(
	require,
	Ractive
){
var __options__ = {
	template: {v:1,t:[{t:7,e:"p",f:["I am a foo."]}]},
	css:"p{color:green}",
},
component={},
__prop__,
__export__;__export__ = Ractive.extend( __options__ );
return __export__;
});