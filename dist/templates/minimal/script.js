c2js.ready(function (c2) {
	var $media = c2.$media,
		$button = c2.$root.custom('menu'),
		$menu = c2.$root.findOne('.mm-container'),
		toggleVisibility = function () {
			$menu.toggleClass('actived');
		};

	$media.on('click', toggleVisibility);
	$button.on('click', toggleVisibility);
});