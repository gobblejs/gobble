define([
	"./foo",
	"require",
	"ractive"
], function(
	__import0__,
	require,
	Ractive
){
var __options__ = {
	template: {v:1,t:[{t:7,e:"h1",f:["Hello ",{t:2,r:"name"},"!"]}," ",{t:7,e:"p",f:["this is a foo: ",{t:7,e:"foo"}]}]},
	css:"p{color:red}",
	components:{	foo: __import0__}
},
component={},
__prop__,
__export__;

	component.exports = {
		init: function () {
			console.log( 'initing foo' );
		}
	};

  if ( typeof component.exports === "object" ) {
    for ( __prop__ in component.exports ) {
      if ( component.exports.hasOwnProperty(__prop__) ) {
        __options__[__prop__] = component.exports[__prop__];
      }
    }
  }

  __export__ = Ractive.extend( __options__ );
return __export__;
});