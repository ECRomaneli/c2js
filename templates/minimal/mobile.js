$(() => $('[c2js] [c2-custom=menu]').click(function () {
	let $aux = $(this);

	for (let tryout = 0; tryout < 10; tryout++) {
		if ($aux[0].hasAttribute('c2js')) {break; }
		$aux = $aux.parent();
	}

	$aux.find('.c2-container').toggleClass('actived');
}));
