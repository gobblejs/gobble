var $ = ( selector ) => document.querySelector( selector ),
	audio = $( 'audio' ),
	img = $( 'img' );

img.addEventListener( 'click', () => {
	reset();
	setTimeout( play );
});

audio.addEventListener( 'ended', reset );
audio.addEventListener( 'pause', reset );

function play () {
	audio.play();
	img.classList.add( 'gobbling' );
}

function reset () {
	var src = audio.src;

	img.classList.remove( 'gobbling' );
	audio.src = '';
	audio.src = src;
}
